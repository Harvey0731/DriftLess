import { supabase } from '../../lib/supabase'
import { sendMessage, getMessages, deleteMessage, clearHistory } from '../chat.service'

describe('sendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends message via edge function and returns response', async () => {
    const mockResponse = {
      message: { id: 'm1', content: 'Hello back!', role: 'assistant' },
      tokensUsed: 150,
    }
    ;(supabase.functions as any).invoke = jest.fn().mockResolvedValue({
      data: mockResponse,
      error: null,
    })

    const result = await sendMessage('u1', 'Hello!', 'home')
    expect(result).toEqual(mockResponse)
    // SEC: user_id is derived from JWT server-side, NOT passed in body
    expect((supabase.functions as any).invoke).toHaveBeenCalledWith('ai-chat', {
      body: { message: 'Hello!', context: 'home' },
    })
  })

  it('throws on edge function error', async () => {
    ;(supabase.functions as any).invoke = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Rate limited' },
    })

    await expect(sendMessage('u1', 'Hello!', 'home')).rejects.toThrow('Failed to send message')
  })
})

describe('getMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns paginated messages', async () => {
    const mockMessages = [
      { id: 'm1', content: 'Hi', role: 'user' },
      { id: 'm2', content: 'Hello!', role: 'assistant' },
    ]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getMessages('u1', 20, 0)
    expect(result).toEqual(mockMessages)
    expect(mockChain.range).toHaveBeenCalledWith(0, 19)
  })

  it('handles offset correctly', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await getMessages('u1', 10, 20)
    expect(mockChain.range).toHaveBeenCalledWith(20, 29)
  })

  it('throws on error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getMessages('u1', 20, 0)).rejects.toThrow('Failed to fetch messages')
  })
})

describe('deleteMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deletes message requiring userId for security', async () => {
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    // Last eq in chain resolves
    let eqCallCount = 0
    mockChain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount === 2) return Promise.resolve({ error: null })
      return mockChain
    })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await deleteMessage('m1', 'u1')
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'm1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('throws on error', async () => {
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    let eqCallCount = 0
    mockChain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount === 2) return Promise.resolve({ error: { message: 'Not found' } })
      return mockChain
    })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(deleteMessage('m1', 'u1')).rejects.toThrow('Failed to delete message')
  })
})

describe('clearHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deletes all messages for a user', async () => {
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await clearHistory('u1')
    expect(supabase.from).toHaveBeenCalledWith('chat_messages')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })
})
