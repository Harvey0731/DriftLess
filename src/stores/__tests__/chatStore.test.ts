import { supabase } from '../../lib/supabase'
import { useChatStore } from '../chatStore'
import { useAuthStore } from '../authStore'

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({
    user: { id: 'u1' } as any,
    session: null,
    profile: null,
    isLoading: false,
    isAuthenticated: true,
  })
  useChatStore.setState({
    messages: [],
    isLoading: false,
    isStreaming: false,
    rateLimit: { count: 0, windowStart: Date.now() },
  })
})

// ─── Initial State ───────────────────────────────────────────────────────────

describe('chatStore initial state', () => {
  it('starts with empty messages', () => {
    expect(useChatStore.getState().messages).toEqual([])
  })

  it('starts with isLoading false', () => {
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('starts with isStreaming false', () => {
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('starts with rate limit count 0', () => {
    expect(useChatStore.getState().rateLimit.count).toBe(0)
  })
})

// ─── fetchMessages ──────────────────────────────────────────────────────────

describe('chatStore.fetchMessages', () => {
  it('fetches and sets messages', async () => {
    const mockMessages = [
      { id: 'm1', user_id: 'u1', role: 'user', content: 'hello', context: null, tokens_used: null, created_at: '2024-01-01T00:00:00Z' },
      { id: 'm2', user_id: 'u1', role: 'assistant', content: 'hi', context: null, tokens_used: 10, created_at: '2024-01-01T00:00:01Z' },
    ]

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useChatStore.getState().fetchMessages()

    expect(supabase.from).toHaveBeenCalledWith('chat_messages')
    expect(useChatStore.getState().messages).toEqual(mockMessages)
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('sets isLoading true during fetch then false after', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const promise = useChatStore.getState().fetchMessages()
    expect(useChatStore.getState().isLoading).toBe(true)
    await promise
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('appends new messages when paginating with offset', async () => {
    useChatStore.setState({
      messages: [
        { id: 'm3', user_id: 'u1', role: 'user', content: 'later', context: null, tokens_used: null, created_at: '2024-01-01T00:00:02Z' },
      ] as any,
    })

    const olderMessages = [
      { id: 'm1', user_id: 'u1', role: 'user', content: 'earlier', context: null, tokens_used: null, created_at: '2024-01-01T00:00:00Z' },
    ]

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: olderMessages, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useChatStore.getState().fetchMessages(50, 50)

    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(2)
    expect(messages[0].id).toBe('m1')
    expect(messages[1].id).toBe('m3')
  })

  it('deduplicates messages when paginating', async () => {
    useChatStore.setState({
      messages: [
        { id: 'm1', user_id: 'u1', role: 'user', content: 'hello', context: null, tokens_used: null, created_at: '2024-01-01T00:00:00Z' },
      ] as any,
    })

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [{ id: 'm1', user_id: 'u1', role: 'user', content: 'hello', context: null, tokens_used: null, created_at: '2024-01-01T00:00:00Z' }],
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useChatStore.getState().fetchMessages(50, 50)
    expect(useChatStore.getState().messages).toHaveLength(1)
  })

  it('throws when not authenticated', async () => {
    useAuthStore.setState({ user: null } as any)
    await expect(useChatStore.getState().fetchMessages()).rejects.toThrow('Not authenticated')
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('throws on supabase error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(useChatStore.getState().fetchMessages()).rejects.toBeDefined()
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('handles null data gracefully', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useChatStore.getState().fetchMessages()
    expect(useChatStore.getState().messages).toEqual([])
  })
})

// ─── sendMessage ────────────────────────────────────────────────────────────

describe('chatStore.sendMessage', () => {
  it('adds optimistic message, calls edge function, and adds assistant reply', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { content: 'AI reply', tokens_used: 42 },
      error: null,
    })

    await useChatStore.getState().sendMessage('hello')

    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('hello')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBe('AI reply')
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('sets isStreaming during send', async () => {
    let resolveInvoke: any
    ;(supabase.functions.invoke as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveInvoke = resolve
      }),
    )

    const promise = useChatStore.getState().sendMessage('test')
    expect(useChatStore.getState().isStreaming).toBe(true)

    resolveInvoke({ data: { content: 'reply' }, error: null })
    await promise

    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('removes optimistic message on error', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Server error' },
    })

    await expect(useChatStore.getState().sendMessage('fail')).rejects.toBeDefined()
    expect(useChatStore.getState().messages).toEqual([])
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('increments rate limit counter on success', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { content: 'reply' },
      error: null,
    })

    expect(useChatStore.getState().rateLimit.count).toBe(0)
    await useChatStore.getState().sendMessage('msg')
    expect(useChatStore.getState().rateLimit.count).toBe(1)
  })

  it('throws when rate limit exceeded', async () => {
    useChatStore.setState({
      rateLimit: { count: 100, windowStart: Date.now() },
    })

    await expect(useChatStore.getState().sendMessage('blocked')).rejects.toThrow('Rate limit exceeded')
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('throws when not authenticated', async () => {
    useAuthStore.setState({ user: null } as any)
    await expect(useChatStore.getState().sendMessage('test')).rejects.toThrow('Not authenticated')
  })

  it('handles null content in AI response', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { content: null, tokens_used: null },
      error: null,
    })

    await useChatStore.getState().sendMessage('test')
    const messages = useChatStore.getState().messages
    expect(messages[1].content).toBe('')
  })
})

// ─── clearHistory ───────────────────────────────────────────────────────────

describe('chatStore.clearHistory', () => {
  it('deletes all messages and clears state', async () => {
    useChatStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'test' }] as any,
    })

    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useChatStore.getState().clearHistory()

    expect(supabase.from).toHaveBeenCalledWith('chat_messages')
    expect(useChatStore.getState().messages).toEqual([])
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('sets isLoading true during clear then false after', async () => {
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const promise = useChatStore.getState().clearHistory()
    expect(useChatStore.getState().isLoading).toBe(true)
    await promise
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('throws on supabase error', async () => {
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(useChatStore.getState().clearHistory()).rejects.toBeDefined()
    expect(useChatStore.getState().isLoading).toBe(false)
  })

  it('throws when not authenticated', async () => {
    useAuthStore.setState({ user: null } as any)
    await expect(useChatStore.getState().clearHistory()).rejects.toThrow('Not authenticated')
  })
})

// ─── deleteMessage ──────────────────────────────────────────────────────────

describe('chatStore.deleteMessage', () => {
  it('optimistically removes message then confirms', async () => {
    useChatStore.setState({
      messages: [
        { id: 'm1', role: 'user', content: 'a' },
        { id: 'm2', role: 'assistant', content: 'b' },
      ] as any,
    })

    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    // The second .eq() call is the final one that returns the promise
    mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useChatStore.getState().deleteMessage('m1')

    expect(useChatStore.getState().messages).toHaveLength(1)
    expect(useChatStore.getState().messages[0].id).toBe('m2')
  })

  it('reverts on supabase error', async () => {
    const original = [
      { id: 'm1', role: 'user', content: 'a' },
      { id: 'm2', role: 'assistant', content: 'b' },
    ] as any
    useChatStore.setState({ messages: original })

    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: { message: 'Delete failed' } })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(useChatStore.getState().deleteMessage('m1')).rejects.toBeDefined()
    expect(useChatStore.getState().messages).toHaveLength(2)
  })

  it('includes user_id filter for security', async () => {
    useChatStore.setState({
      messages: [{ id: 'm1', role: 'user', content: 'a' }] as any,
    })

    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useChatStore.getState().deleteMessage('m1')

    // Verify both .eq() calls: one for id, one for user_id
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'm1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })
})

// ─── checkRateLimit ─────────────────────────────────────────────────────────

describe('chatStore.checkRateLimit', () => {
  it('returns true when under limit', () => {
    useChatStore.setState({
      rateLimit: { count: 50, windowStart: Date.now() },
    })
    expect(useChatStore.getState().checkRateLimit()).toBe(true)
  })

  it('returns false when at limit', () => {
    useChatStore.setState({
      rateLimit: { count: 100, windowStart: Date.now() },
    })
    expect(useChatStore.getState().checkRateLimit()).toBe(false)
  })

  it('resets window when expired and returns true', () => {
    const oneHourAgo = Date.now() - 3600001
    useChatStore.setState({
      rateLimit: { count: 100, windowStart: oneHourAgo },
    })

    const result = useChatStore.getState().checkRateLimit()
    expect(result).toBe(true)
    expect(useChatStore.getState().rateLimit.count).toBe(0)
  })

  it('returns true when count is 99 (one below limit)', () => {
    useChatStore.setState({
      rateLimit: { count: 99, windowStart: Date.now() },
    })
    expect(useChatStore.getState().checkRateLimit()).toBe(true)
  })
})
