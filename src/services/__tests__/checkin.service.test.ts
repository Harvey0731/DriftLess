import { supabase } from '../../lib/supabase'
import { getTodayCheckIn, startCheckIn, getRecentCheckIns } from '../checkin.service'

describe('getTodayCheckIn', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the check-in for today', async () => {
    const mockCheckIn = { id: 'ci1', user_id: 'u1', check_in_date: '2026-03-15', energy_level: 3 }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockCheckIn, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTodayCheckIn('u1')
    expect(result).toEqual(mockCheckIn)
    expect(supabase.from).toHaveBeenCalledWith('daily_check_ins')
  })

  it('returns null when no check-in exists', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getTodayCheckIn('u1')
    expect(result).toBeNull()
  })

  it('throws on database error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Connection failed' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getTodayCheckIn('u1')).rejects.toThrow("Failed to fetch today's check-in")
  })
})

describe('startCheckIn', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('invokes the ai-checkin edge function and updates streak', async () => {
    const mockResponse = { id: 'ci2', tasks: [] }
    ;(supabase.functions as any).invoke = jest.fn().mockResolvedValue({
      data: mockResponse,
      error: null,
    })
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ error: null })

    const result = await startCheckIn('u1', 3, 'goal1')
    expect(result).toEqual(mockResponse)
    // SEC: user_id is derived from JWT server-side, NOT passed in body
    expect((supabase.functions as any).invoke).toHaveBeenCalledWith('ai-checkin', {
      body: { energyLevel: 3, goalId: 'goal1' },
    })
    expect(supabase.rpc).toHaveBeenCalledWith('update_streak', { p_user_id: 'u1' })
  })

  it('throws when edge function returns error', async () => {
    ;(supabase.functions as any).invoke = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Edge function timeout' },
    })

    await expect(startCheckIn('u1', 3, 'goal1')).rejects.toThrow('Check-in failed')
  })
})

describe('getRecentCheckIns', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns check-ins within the given day range', async () => {
    const mockData = [
      { id: 'ci1', check_in_date: '2026-03-14' },
      { id: 'ci2', check_in_date: '2026-03-13' },
    ]
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getRecentCheckIns('u1', 7)
    expect(result).toEqual(mockData)
  })

  it('caps days parameter at 90', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await getRecentCheckIns('u1', 365)
    // The gte call should use a date 90 days back, not 365
    expect(mockChain.gte).toHaveBeenCalled()
  })

  it('throws on database error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getRecentCheckIns('u1', 7)).rejects.toThrow('Failed to fetch recent check-ins')
  })
})
