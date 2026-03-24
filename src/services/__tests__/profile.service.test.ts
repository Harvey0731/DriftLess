import { supabase } from '../../lib/supabase'
import { getProfile, updateProfile, completeOnboarding, deleteAccount } from '../profile.service'

describe('getProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the user profile', async () => {
    const mockProfile = { id: 'u1', display_name: 'Alice', onboarding_done: true }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await getProfile('u1')
    expect(result).toEqual(mockProfile)
    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('throws when profile not found', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await expect(getProfile('unknown')).rejects.toThrow('Failed to fetch profile')
  })
})

describe('updateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates allowed fields', async () => {
    const mockUpdated = { id: 'u1', display_name: 'Bob', theme: 'dark' }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    const result = await updateProfile('u1', { display_name: 'Bob', theme: 'dark' })
    expect(result.display_name).toBe('Bob')
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Bob', theme: 'dark' }),
    )
  })

  it('includes updated_at timestamp', async () => {
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'u1' }, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await updateProfile('u1', { display_name: 'Test' })
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) }),
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

    await expect(updateProfile('u1', { display_name: 'X' })).rejects.toThrow(
      'Failed to update profile',
    )
  })
})

describe('completeOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls complete_onboarding RPC with correct params', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null })

    await completeOnboarding('u1', 'My Goal', 9, 'too_big')
    expect(supabase.rpc).toHaveBeenCalledWith('complete_onboarding', {
      p_user_id: 'u1',
      p_goal_title: 'My Goal',
      p_notification_hour: 9,
      p_procrastination_type: 'too_big',
    })
  })

  it('is idempotent when already onboarded (RPC returns false)', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null })

    // Should not throw — silently returns
    await completeOnboarding('u1', 'My Goal', 9)
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })

  it('throws if RPC fails', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'RPC failed' },
    })

    await expect(completeOnboarding('u1', 'Goal', 9)).rejects.toThrow(
      'Failed to complete onboarding',
    )
  })
})

describe('deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets deleted_at and signs out', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(updateChain)
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })

    await deleteAccount('u1')
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    )
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('throws if soft-delete fails', async () => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'Permission denied' } }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(updateChain)

    await expect(deleteAccount('u1')).rejects.toThrow('Failed to soft-delete account')
  })
})
