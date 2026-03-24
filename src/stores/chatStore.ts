import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { withTimeout } from '../lib/timeout'
import type { ChatMessage } from '../types/database'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RateLimit {
  /** Number of messages sent in the current window. */
  count: number
  /** Epoch ms when the current rate-limit window started. */
  windowStart: number
}

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  rateLimit: RateLimit
}

interface ChatActions {
  fetchMessages: (limit?: number, offset?: number) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearHistory: () => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  /** Check whether the user is within rate limits. Returns true if allowed. */
  checkRateLimit: () => boolean
}

type ChatStore = ChatState & ChatActions

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_FETCH_LIMIT = 50
// H5/M27: Client-side rate limit is a UX-only hint to avoid unnecessary server
// round-trips. The real rate limit is enforced server-side in the ai-chat Edge Function.
const RATE_LIMIT_MAX = 100 // match server-side limit
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const AI_CHAT_TIMEOUT_MS = 30_000 // 30s timeout for AI chat Edge Function

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a unique ID for optimistic messages to prevent collisions. */
let _msgCounter = 0
function generateMsgId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++_msgCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** Get cached user ID from authStore (no network call). */
function getCachedUserId(): string {
  const userId = useAuthStore.getState().user?.id
  if (!userId) throw new Error('Not authenticated')
  return userId
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatStore>()((set, get) => ({
  // state
  messages: [],
  isLoading: false,
  isStreaming: false,
  rateLimit: { count: 0, windowStart: Date.now() },

  // actions

  fetchMessages: async (limit = DEFAULT_FETCH_LIMIT, offset = 0) => {
    set({ isLoading: true })
    try {
      const userId = getCachedUserId()

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) throw error

      const typedData = (data ?? []) as unknown as ChatMessage[]
      if (offset === 0) {
        set({ messages: typedData })
      } else {
        // Append older messages when paginating.
        const existing = get().messages
        const existingIds = new Set(existing.map((m) => m.id))
        const newMessages = typedData.filter((m) => !existingIds.has(m.id))
        set({ messages: [...newMessages, ...existing] })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  sendMessage: async (content) => {
    if (!get().checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before sending more messages.')
    }

    const userId = getCachedUserId()

    // Optimistically add the user message.
    const optimisticMsg: ChatMessage = {
      id: generateMsgId('temp'),
      user_id: userId,
      role: 'user',
      content,
      context: null,
      tokens_used: null,
      created_at: new Date().toISOString(),
    }

    set((state) => ({
      messages: [...state.messages, optimisticMsg],
      isStreaming: true,
    }))

    try {
      // Route through ai-chat Edge Function for server-side rate limiting
      // and AI response generation. The Edge Function persists both the user
      // message and the assistant reply to chat_messages.
      // M28: Wrap in timeout to prevent isStreaming from getting stuck indefinitely
      const { data, error } = await withTimeout(
        supabase.functions.invoke('ai-chat', {
          body: { message: content },
        }),
        AI_CHAT_TIMEOUT_MS,
      )

      if (error) throw error

      // Refetch the latest messages from DB to reconcile optimistic IDs
      // with server-generated IDs from the Edge Function insert.
      const { data: freshMessages, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (!fetchError && freshMessages) {
        set({ messages: freshMessages as unknown as ChatMessage[] })
      } else {
        // Fallback: keep optimistic state but use response content
        const assistantMsg: ChatMessage = {
          id: generateMsgId('assistant'),
          user_id: userId,
          role: 'assistant',
          content: data?.content ?? '',
          context: null,
          tokens_used: data?.tokens_used ?? null,
          created_at: new Date().toISOString(),
        }

        set((state) => ({
          messages: [
            ...state.messages.filter((m) => m.id !== optimisticMsg.id),
            { ...optimisticMsg, id: generateMsgId('confirmed') },
            assistantMsg,
          ],
        }))
      }

      // Bump rate limit counter.
      set((state) => ({
        rateLimit: {
          ...state.rateLimit,
          count: state.rateLimit.count + 1,
        },
      }))
    } catch (err) {
      // Remove optimistic message on failure.
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== optimisticMsg.id),
      }))
      throw err
    } finally {
      set({ isStreaming: false })
    }
  },

  clearHistory: async () => {
    const userId = getCachedUserId()
    set({ isLoading: true })
    try {
      const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId)

      if (error) throw error
      set({ messages: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteMessage: async (id) => {
    const prev = get().messages

    // Optimistic removal.
    set({ messages: prev.filter((m) => m.id !== id) })

    // H-04: Add user_id filter to prevent cross-user message deletion
    const userId = getCachedUserId()
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      // Revert on failure.
      set({ messages: prev })
      throw error
    }
  },

  checkRateLimit: () => {
    const { rateLimit } = get()
    const now = Date.now()

    // Reset window if expired.
    if (now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
      set({ rateLimit: { count: 0, windowStart: now } })
      return true
    }

    return rateLimit.count < RATE_LIMIT_MAX
  },
}))
