import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../authStore'

// Reset the store before each test
beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  })
})

describe('authStore initial state', () => {
  it('starts with no user', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
  })

  it('starts with no session', () => {
    const state = useAuthStore.getState()
    expect(state.session).toBeNull()
  })

  it('starts with no profile', () => {
    const state = useAuthStore.getState()
    expect(state.profile).toBeNull()
  })

  it('starts not authenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('starts with isLoading true', () => {
    const state = useAuthStore.getState()
    expect(state.isLoading).toBe(true)
  })
})

describe('authStore.signIn', () => {
  it('sets isLoading true then false', async () => {
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u1' }, session: {} },
      error: null,
    })

    const promise = useAuthStore.getState().signIn('test@example.com', 'pass')
    // isLoading should be true during the call
    expect(useAuthStore.getState().isLoading).toBe(true)

    await promise
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('throws and sets isLoading false on error', async () => {
    ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    })

    await expect(useAuthStore.getState().signIn('test@example.com', 'wrong')).rejects.toBeDefined()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

describe('authStore.signOut', () => {
  it('clears user, session, and profile on success', async () => {
    // Set up some state first
    useAuthStore.setState({
      user: { id: 'u1' } as any,
      session: { access_token: 'tok' } as any,
      profile: { id: 'u1' } as any,
      isAuthenticated: true,
    })

    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null })

    await useAuthStore.getState().signOut()
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.profile).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('throws on error but still sets isLoading false', async () => {
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: { message: 'Network error' },
    })

    await expect(useAuthStore.getState().signOut()).rejects.toBeDefined()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

describe('authStore.resetPassword', () => {
  it('calls supabase resetPasswordForEmail', async () => {
    ;(supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null })

    await useAuthStore.getState().resetPassword('test@example.com')
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('throws on error', async () => {
    ;(supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      error: { message: 'User not found' },
    })

    await expect(useAuthStore.getState().resetPassword('bad@example.com')).rejects.toBeDefined()
  })
})

describe('authStore.fetchProfile', () => {
  it('does nothing when no user is set', async () => {
    useAuthStore.setState({ user: null })

    await useAuthStore.getState().fetchProfile()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('fetches and sets profile when user exists', async () => {
    useAuthStore.setState({ user: { id: 'u1' } as any })

    const mockProfile = { id: 'u1', display_name: 'Alice' }
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useAuthStore.getState().fetchProfile()
    expect(useAuthStore.getState().profile).toEqual(mockProfile)
  })
})

describe('authStore.updateProfile', () => {
  it('throws when not authenticated', async () => {
    useAuthStore.setState({ user: null })
    await expect(
      useAuthStore.getState().updateProfile({ display_name: 'X' } as any),
    ).rejects.toThrow('Not authenticated')
  })

  it('updates profile in store on success', async () => {
    useAuthStore.setState({ user: { id: 'u1' } as any })

    const mockUpdated = { id: 'u1', display_name: 'Updated' }
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useAuthStore.getState().updateProfile({ display_name: 'Updated' } as any)
    expect(useAuthStore.getState().profile).toEqual(mockUpdated)
  })
})

describe('authStore.signUp', () => {
  it('sets isLoading true then false on success', async () => {
    ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'new-u1' }, session: {} },
      error: null,
    })

    // Mock the profile insert that auth.service.signUp performs
    const mockInsertChain = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockInsertChain)

    const promise = useAuthStore.getState().signUp('new@example.com', 'securepass')
    expect(useAuthStore.getState().isLoading).toBe(true)

    await promise
    expect(useAuthStore.getState().isLoading).toBe(false)
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'securepass',
      options: undefined,
    })
    // Verify profile row creation was attempted
    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('throws and sets isLoading false on error', async () => {
    ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' },
    })

    await expect(
      useAuthStore.getState().signUp('existing@example.com', 'pass'),
    ).rejects.toBeDefined()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('resets isLoading even when supabase rejects', async () => {
    ;(supabase.auth.signUp as jest.Mock).mockRejectedValue(new Error('Network failure'))

    await expect(useAuthStore.getState().signUp('test@example.com', 'pass')).rejects.toThrow(
      'Network failure',
    )
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})

describe('authStore.initialize', () => {
  it('returns an object with unsubscribe function', () => {
    const result = useAuthStore.getState().initialize()
    expect(result).toHaveProperty('unsubscribe')
    expect(typeof result.unsubscribe).toBe('function')
  })
})
