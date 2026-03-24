import { supabase } from '../../lib/supabase'
import {
  getTodayPromise,
  createPromise,
  updatePromise,
  getPromiseHistory,
  calculateTrustScore,
} from '../promises.service'

describe('getTodayPromise', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the promise for today', async () => {
    const mockPromise = { id: 'p1', text: 'Write 500 words', kept: null }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockPromise, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTodayPromise('u1')
    expect(result).toEqual(mockPromise)
  })

  it('returns null when no promise exists', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTodayPromise('u1')
    expect(result).toBeNull()
  })
})

describe('createPromise', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a new promise for today', async () => {
    const mockPromise = { id: 'p1', text: 'Exercise 30 min', kept: null }
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPromise, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await createPromise('u1', 'Exercise 30 min')
    expect(result).toEqual(mockPromise)
    expect(supabase.from).toHaveBeenCalledWith('promises')
  })

  it('throws on error', async () => {
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(createPromise('u1', 'Test')).rejects.toThrow('Failed to create promise')
  })
})

describe('updatePromise', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('marks promise as kept', async () => {
    const mockPromise = { id: 'p1', kept: true, kept_at: '2026-03-15T18:00:00Z' }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPromise, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await updatePromise('p1', true, 'user-123')
    expect(result.kept).toBe(true)
  })

  it('marks promise as broken', async () => {
    const mockPromise = { id: 'p1', kept: false, kept_at: '2026-03-15T18:00:00Z' }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockPromise, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await updatePromise('p1', false, 'user-123')
    expect(result.kept).toBe(false)
  })
})

describe('getPromiseHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns promises within the day range', async () => {
    const mockData = [{ id: 'p1' }, { id: 'p2' }]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getPromiseHistory('u1', 30)
    expect(result).toEqual(mockData)
  })
})

describe('calculateTrustScore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function mockHistoryAndProfile(history: any[]) {
    // getPromiseHistory call
    const historyChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: history, error: null }),
    }
    // update trust_score call
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }

    let fromCallCount = 0
    ;(supabase.from as jest.Mock).mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) return historyChain
      return updateChain
    })
  }

  it('calculates 100% score when all promises are kept with full streak', async () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      kept: true,
      kept_at: '2026-03-15',
      promise_date: `2026-03-${String(15 - i).padStart(2, '0')}`,
    }))
    mockHistoryAndProfile(history)

    const result = await calculateTrustScore('u1')
    // 60% * 1.0 + 20% * 1.0 + 20% * 1.0 = 100
    expect(result.score).toBe(100)
    expect(result.keptRatio).toBe(100)
  })

  it('calculates 0% kept ratio when all promises are broken', async () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      kept: false,
      kept_at: '2026-03-15',
      promise_date: `2026-03-${String(15 - i).padStart(2, '0')}`,
    }))
    mockHistoryAndProfile(history)

    const result = await calculateTrustScore('u1')
    expect(result.keptRatio).toBe(0)
    // Streak bonus = 0, activity = 5/30
    expect(result.score).toBeLessThanOrEqual(10)
  })

  it('returns default 50% kept ratio when no resolved promises exist', async () => {
    // All promises are still pending (kept = null)
    const history = [{ id: 'p1', kept: null, kept_at: null, promise_date: '2026-03-15' }]
    mockHistoryAndProfile(history)

    const result = await calculateTrustScore('u1')
    // keptRatio defaults to 0.5 when no resolved promises
    expect(result.keptRatio).toBe(50)
  })

  it('calculates mixed results correctly', async () => {
    const history = [
      { id: 'p1', kept: true, kept_at: '2026-03-15', promise_date: '2026-03-15' },
      { id: 'p2', kept: false, kept_at: '2026-03-14', promise_date: '2026-03-14' },
      { id: 'p3', kept: true, kept_at: '2026-03-13', promise_date: '2026-03-13' },
      { id: 'p4', kept: true, kept_at: '2026-03-12', promise_date: '2026-03-12' },
    ]
    mockHistoryAndProfile(history)

    const result = await calculateTrustScore('u1')
    // 3/4 kept = 75%, streak = 1 (only most recent is kept, then broken), activity = 4/30
    expect(result.keptRatio).toBe(75)
    expect(result.streakBonus).toBe(3) // 1/30 ~ 3%
    expect(result.activityBonus).toBe(13) // 4/30 ~ 13%
  })

  it('handles empty history', async () => {
    mockHistoryAndProfile([])

    const result = await calculateTrustScore('u1')
    // No resolved => keptRatio = 0.5, streak = 0, activity = 0
    // 0.5 * 60 + 0 + 0 = 30
    expect(result.score).toBe(30)
  })

  it('persists trust score to the profile', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    const historyChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    let fromCallCount = 0
    ;(supabase.from as jest.Mock).mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) return historyChain
      return updateChain
    })

    await calculateTrustScore('u1')
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ trust_score: expect.any(Number) }),
    )
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'u1')
  })
})
