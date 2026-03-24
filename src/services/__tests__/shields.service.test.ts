import { supabase } from '../../lib/supabase'
import { checkAndAwardShield, consumeShield, getShieldCount } from '../shields.service'

describe('checkAndAwardShield', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('awards a shield when streak is multiple of 7 and shields below max', async () => {
    // Mock the chained query returning data with 1 row (row was updated)
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ streak_shields: 1 }] }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkAndAwardShield('user1', 7, 0)
    expect(result).toBe(1)
  })

  it('returns current shields when already at max (3)', async () => {
    const result = await checkAndAwardShield('user1', 7, 3)
    expect(result).toBe(3)
    // Should not attempt any DB call
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns current shields when streak is not a multiple of 7', async () => {
    const result = await checkAndAwardShield('user1', 5, 1)
    expect(result).toBe(1)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns current shields on CAS failure (count = 0)', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [] }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkAndAwardShield('user1', 14, 1)
    expect(result).toBe(1)
  })

  it('returns current shields when streak is 0', async () => {
    const result = await checkAndAwardShield('user1', 0, 0)
    expect(result).toBe(0)
  })

  it('caps shield at max when shields are 2', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ streak_shields: 3 }] }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkAndAwardShield('user1', 21, 2)
    expect(result).toBe(3)
  })
})

describe('consumeShield', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns true on successful shield use', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ streak_shields: 1 }], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await consumeShield('user1', 2)
    expect(result).toBe(true)
  })

  it('returns false when shields are zero', async () => {
    const result = await consumeShield('user1', 0)
    expect(result).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns false on CAS failure (concurrent use)', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await consumeShield('user1', 1)
    expect(result).toBe(false)
  })

  it('throws on database error', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(consumeShield('user1', 1)).rejects.toThrow('Failed to use shield')
  })
})

describe('getShieldCount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns shield count from profile', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { streak_shields: 2 }, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getShieldCount('user1')
    expect(result).toBe(2)
  })

  it('returns 0 when streak_shields is null', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { streak_shields: null }, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getShieldCount('user1')
    expect(result).toBe(0)
  })

  it('throws on error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getShieldCount('user1')).rejects.toThrow('Failed to get shields')
  })
})
