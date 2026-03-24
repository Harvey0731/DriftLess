import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import MessageBubble, { type ChatBubbleMessage } from '@/src/components/chat/MessageBubble'
import QuickActions from '@/src/components/chat/QuickActions'
import TypingIndicator from '@/src/components/shared/TypingIndicator'
import { supabase } from '@/src/lib/supabase'
import { useAuthStore } from '@/src/stores/authStore'
import { getMessages, deleteMessage } from '@/src/services/chat.service'
import { captureError } from '@/src/lib/sentry'

const PAGE_SIZE = 20
const MAX_MESSAGE_LENGTH = 2000

const WELCOME_CONTENT = "Hey — I know starting is the hard part. What's been on your list?"

export default function ChatScreen() {
  const params = useLocalSearchParams<{ prefill?: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  // M15: Create WELCOME_MESSAGE lazily inside the component to avoid stale created_at
  const WELCOME_MESSAGE = useMemo<ChatBubbleMessage>(
    () => ({
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_CONTENT,
      created_at: new Date().toISOString(),
    }),
    [],
  )

  const [messages, setMessages] = useState<ChatBubbleMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null)
  const prefillApplied = useRef(false)
  const offsetRef = useRef(0)

  // Map DB ChatBubbleMessage to local ChatBubbleMessage for MessageBubble
  const mapDbMessage = useCallback(
    (msg: {
      id: string
      role: string
      content: string
      created_at: string
    }): ChatBubbleMessage => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      created_at: msg.created_at,
    }),
    [],
  )

  // Load initial chat history on mount
  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    async function loadHistory() {
      try {
        const dbMessages = await getMessages(user?.id ?? '', PAGE_SIZE, 0)
        if (cancelled) return

        if (dbMessages.length === 0) {
          setMessages([WELCOME_MESSAGE])
          setHasMore(false)
        } else {
          // Filter out system messages - MessageBubble only handles user/assistant
          const mapped = dbMessages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map(mapDbMessage)
          setMessages(mapped)
          offsetRef.current = dbMessages.length
          setHasMore(dbMessages.length >= PAGE_SIZE)
        }
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          context: 'ChatScreen.loadHistory',
        })
        // On error, show welcome message as fallback
        if (!cancelled) {
          setMessages([WELCOME_MESSAGE])
          setHasMore(false)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [user?.id, mapDbMessage, WELCOME_MESSAGE])

  // TIMER-08: Read prefill param and populate input
  useEffect(() => {
    if (params.prefill && !prefillApplied.current) {
      prefillApplied.current = true
      setInputText(params.prefill)
    }
  }, [params.prefill])

  // Send message via ai-chat Edge Function
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim()
    if (!trimmed || !user?.id) return
    if (isTyping) return // Prevent double-send while waiting
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setRateLimitMessage(`Message too long (max ${MAX_MESSAGE_LENGTH} characters).`)
      setTimeout(() => setRateLimitMessage(null), 5000)
      return
    }

    // Clear any previous rate limit message
    setRateLimitMessage(null)

    // Optimistically add user message to UI
    const optimisticUserMsg: ChatBubbleMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [optimisticUserMsg, ...prev])
    setInputText('')
    setIsTyping(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: trimmed },
      })

      // Handle rate limit (Edge Function returns 429 with error field)
      if (error) {
        // Check if it's a rate limit from the function response
        if (data?.error === 'rate_limited' || data?.content) {
          setRateLimitMessage(
            data.content || "You're sending messages too quickly. Please wait a moment.",
          )
          // Remove the optimistic user message since it wasn't persisted
          setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id))
          setIsTyping(false)
          setTimeout(() => setRateLimitMessage(null), 5000)
          return
        }
        throw error
      }

      // Check for rate_limited in data even without error
      if (data?.error === 'rate_limited') {
        setRateLimitMessage(
          data.content || "You're sending messages too quickly. Please wait a moment.",
        )
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id))
        setIsTyping(false)
        setTimeout(() => setRateLimitMessage(null), 5000)
        return
      }

      const shameDetected: boolean = data?.shame_detected ?? false

      // The Edge Function persists both user and assistant messages to DB.
      // Reload latest messages from DB to get the real IDs.
      const dbMessages = await getMessages(user.id, PAGE_SIZE, 0)
      const mapped = dbMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map(mapDbMessage)
      setMessages(mapped.length > 0 ? mapped : [WELCOME_MESSAGE])
      offsetRef.current = dbMessages.length
      setHasMore(dbMessages.length >= PAGE_SIZE)

      // Handle shame detection
      if (shameDetected) {
        router.push('/shame-emergency')
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'ChatScreen.handleSend',
      })
      // On error, add an error message from the assistant
      const errorMsg: ChatBubbleMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [errorMsg, ...prev])
    } finally {
      setIsTyping(false)
    }
  }, [inputText, user?.id, isTyping, mapDbMessage, router, WELCOME_MESSAGE])

  // Quick action populates input
  const handleQuickAction = useCallback((action: string) => {
    setInputText(action)
  }, [])

  // Delete message from DB and local state
  const handleDeleteMessage = useCallback(
    async (id: string) => {
      // Remove from local state immediately
      setMessages((prev) => prev.filter((m) => m.id !== id))

      // If it's a real DB message (not temp/welcome/error), delete from DB
      if (!id.startsWith('temp-') && !id.startsWith('error-') && id !== 'welcome') {
        if (!user?.id) return
        try {
          await deleteMessage(id, user.id)
        } catch (err) {
          captureError(err instanceof Error ? err : new Error(String(err)), {
            context: 'ChatScreen.deleteMessage',
          })
        }
      }
    },
    [user?.id],
  )

  // Load older messages (pull-down / scroll to end in inverted list)
  const handleLoadMore = useCallback(async () => {
    if (!user?.id || !hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const olderMessages = await getMessages(user.id, PAGE_SIZE, offsetRef.current)
      if (olderMessages.length === 0) {
        setHasMore(false)
      } else {
        const mapped = olderMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map(mapDbMessage)
        setMessages((prev) => [...prev, ...mapped])
        offsetRef.current += olderMessages.length
        setHasMore(olderMessages.length >= PAGE_SIZE)
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'ChatScreen.handleLoadMore',
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [user?.id, hasMore, isLoadingMore, mapDbMessage])

  // Show loading spinner while fetching initial history
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-textSecondary mt-3">Loading chat...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 py-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-text">Drift</Text>
        <Text className="text-sm text-textSecondary mt-0.5">Your personal coach</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} onDelete={handleDeleteMessage} />}
          inverted
          contentContainerStyle={{ paddingVertical: 16 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
            ) : null
          }
        />

        {rateLimitMessage && (
          <View className="px-4 py-2 bg-warmBg mx-4 rounded-xl">
            <Text className="text-sm text-warning text-center">{rateLimitMessage}</Text>
          </View>
        )}

        <View className="border-t border-gray-100">
          <QuickActions onSelectAction={handleQuickAction} />

          <View className="flex-row items-end px-4 pb-4 pt-2 gap-3">
            <TextInput
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base text-text min-h-[44px] max-h-[120px]"
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              maxLength={MAX_MESSAGE_LENGTH}
              multiline
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isTyping}
              accessibilityLabel="Message input"
              accessibilityHint="Type a message to send to your coach"
            />
            <Pressable
              onPress={handleSend}
              disabled={isTyping || !inputText.trim()}
              className={`w-11 h-11 rounded-full items-center justify-center active:opacity-80 ${
                isTyping || !inputText.trim() ? 'bg-gray-300' : 'bg-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: isTyping || !inputText.trim() }}
            >
              <Text className="text-white text-lg font-bold">{'\u2191'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
