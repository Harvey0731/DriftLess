import { supabase } from '../../lib/supabase'
import {
  createSession,
  endSession,
  getRecentSessions,
  getSessionStats,
  updateSession,
} from '../sessions.service'

describe('createSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a new session with correct fields', async () => {
    const mockSession = {
      id: 's1',
      user_id: 'u1',
      task_id: 't1',
      check_in_id: 'ci1',
      planned_mins: 25,
      actual_secs: 0,
      status: 'active',
    }
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await createSession('u1', 't1', 'ci1', 25)
    expect(result).toEqual(mockSession)
    expect(supabase.from).toHaveBeenCalledWith('focus_sessions')
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        task_id: 't1',
        planned_mins: 25,
        status: 'active',
      }),
    )
  })

  it('throws on database error', async () => {
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(createSession('u1', 't1', 'ci1', 25)).rejects.toThrow('Failed to create session')
  })
})

describe('endSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates status to completed with actual_secs and rating', async () => {
    const mockSession = {
      id: 's1',
      status: 'completed',
      actual_secs: 1500,
      rating: 4,
      rating_label: 'Great',
    }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await endSession('s1', 1500, 4, 'Great', 'u1', 'Good focus')
    expect(result.status).toBe('completed')
    expect(result.actual_secs).toBe(1500)
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        actual_secs: 1500,
        rating: 4,
        rating_label: 'Great',
        status: 'completed',
      }),
    )
  })

  it('throws on error', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(endSession('s1', 1500, 4, 'Great', 'u1')).rejects.toThrow('Failed to end session')
  })
})

describe('updateSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('partially updates session fields', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 's1', pauses: 2, status: 'paused' },
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await updateSession('s1', { pauses: 2, status: 'paused' } as any, 'user-123')
    expect(result.pauses).toBe(2)
  })
})

describe('getRecentSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('filters by completed status only', async () => {
    const mockSessions = [{ id: 's1', status: 'completed' }]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getRecentSessions('u1', 10)
    expect(result).toEqual(mockSessions)
    // Verify eq was called with status 'completed'
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'completed')
  })

  it('throws on error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getRecentSessions('u1', 10)).rejects.toThrow('Failed to fetch recent sessions')
  })
})

describe('getSessionStats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calculates aggregate stats correctly', async () => {
    const mockData = [
      { actual_secs: 1500, rating: 4 },
      { actual_secs: 3000, rating: 3 },
      { actual_secs: 900, rating: 4 },
    ]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const stats = await getSessionStats('u1')
    expect(stats.totalSessions).toBe(3)
    expect(stats.totalTimeSecs).toBe(5400)
    expect(stats.avgDurationSecs).toBe(1800)
    expect(stats.ratingDistribution).toEqual({ 3: 1, 4: 2 })
  })

  it('returns zeros for no sessions', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const stats = await getSessionStats('u1')
    expect(stats.totalSessions).toBe(0)
    expect(stats.totalTimeSecs).toBe(0)
    expect(stats.avgDurationSecs).toBe(0)
    expect(stats.ratingDistribution).toEqual({})
  })

  it('applies 1000 limit to prevent unbounded queries', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await getSessionStats('u1')
    expect(mockChain.limit).toHaveBeenCalledWith(1000)
  })

  it('handles null ratings in distribution', async () => {
    const mockData = [
      { actual_secs: 1500, rating: null },
      { actual_secs: 900, rating: 3 },
    ]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const stats = await getSessionStats('u1')
    expect(stats.ratingDistribution).toEqual({ 3: 1 })
  })
})
