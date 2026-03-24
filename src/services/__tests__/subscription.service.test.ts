import { supabase } from '../../lib/supabase'
import { getSubscription, updateSubscription, checkTrialStatus } from '../subscription.service'

describe('getSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns subscription when found', async () => {
    const mockSub = {
      id: 's1',
      user_id: 'u1',
      status: 'active',
      entitlement: 'pro',
    }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getSubscription('u1')
    expect(result).toEqual(mockSub)
    expect(supabase.from).toHaveBeenCalledWith('subscriptions')
  })

  it('returns null when no subscription exists', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getSubscription('u1')
    expect(result).toBeNull()
  })

  it('throws on database error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getSubscription('u1')).rejects.toThrow(
      'Failed to fetch subscription: Connection failed',
    )
  })
})

describe('updateSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates and returns the subscription', async () => {
    const updatedSub = {
      id: 's1',
      user_id: 'u1',
      status: 'active',
      entitlement: 'pro',
    }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: updatedSub, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await updateSubscription('u1', { status: 'active' } as any)
    expect(result).toEqual(updatedSub)
    expect(supabase.from).toHaveBeenCalledWith('subscriptions')
    expect(mockChain.update).toHaveBeenCalled()
  })

  it('throws on update error', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(updateSubscription('u1', { status: 'active' } as any)).rejects.toThrow(
      'Failed to update subscription: Update failed',
    )
  })
})

describe('checkTrialStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns active trial with days remaining', async () => {
    const mockSub = {
      id: 's1',
      user_id: 'u1',
      status: 'trialing',
      trial_ends_at: '2026-03-20T12:00:00Z',
    }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkTrialStatus('u1')
    expect(result.isTrialing).toBe(true)
    expect(result.daysLeft).toBe(5)
    expect(result.trialEndsAt).toEqual(new Date('2026-03-20T12:00:00Z'))
  })

  it('returns expired trial (trial end date in past)', async () => {
    const mockSub = {
      id: 's1',
      user_id: 'u1',
      status: 'trialing',
      trial_ends_at: '2026-03-10T12:00:00Z',
    }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkTrialStatus('u1')
    expect(result.isTrialing).toBe(false)
    expect(result.daysLeft).toBe(0)
  })

  it('returns no trial when subscription is null', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkTrialStatus('u1')
    expect(result.isTrialing).toBe(false)
    expect(result.daysLeft).toBe(0)
    expect(result.trialEndsAt).toBeNull()
  })

  it('returns no trial when status is not "trialing"', async () => {
    const mockSub = {
      id: 's1',
      user_id: 'u1',
      status: 'active',
      trial_ends_at: '2026-03-20T12:00:00Z',
    }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkTrialStatus('u1')
    expect(result.isTrialing).toBe(false)
    expect(result.daysLeft).toBe(0)
    expect(result.trialEndsAt).toBeNull()
  })

  it('returns no trial when trial_ends_at is null', async () => {
    const mockSub = {
      id: 's1',
      user_id: 'u1',
      status: 'trialing',
      trial_ends_at: null,
    }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkTrialStatus('u1')
    expect(result.isTrialing).toBe(false)
    expect(result.daysLeft).toBe(0)
    expect(result.trialEndsAt).toBeNull()
  })

  it('returns 1 day left when trial ends within 24 hours', async () => {
    const mockSub = {
      id: 's1',
      user_id: 'u1',
      status: 'trialing',
      trial_ends_at: '2026-03-16T06:00:00Z', // 18 hours from now
    }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await checkTrialStatus('u1')
    expect(result.isTrialing).toBe(true)
    expect(result.daysLeft).toBe(1) // Math.ceil rounds up
  })

  it('throws when getSubscription encounters a database error', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(checkTrialStatus('u1')).rejects.toThrow('Failed to fetch subscription')
  })
})
