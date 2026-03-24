import { supabase } from '../../lib/supabase'
import { useSessionStore } from '../sessionStore'
import { useAuthStore } from '../authStore'
import { clearTimerState, setTimerState, getTimerState } from '../../lib/mmkv'

jest.mock('../../lib/mmkv', () => ({
  getTimerState: jest.fn(),
  setTimerState: jest.fn(),
  clearTimerState: jest.fn(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  // Mock authStore with authenticated user
  useAuthStore.setState({
    user: { id: 'u1' } as any,
    session: null,
    profile: null,
    isLoading: false,
    isAuthenticated: true,
  })
  useSessionStore.setState({
    currentSession: null,
    timerState: null,
    isTimerRunning: false,
    elapsedSeconds: 0,
  })
})

describe('sessionStore initial state', () => {
  it('starts with no current session', () => {
    expect(useSessionStore.getState().currentSession).toBeNull()
  })

  it('starts with timer not running', () => {
    expect(useSessionStore.getState().isTimerRunning).toBe(false)
  })

  it('starts with zero elapsed seconds', () => {
    expect(useSessionStore.getState().elapsedSeconds).toBe(0)
  })
})

describe('sessionStore.startSession', () => {
  it('creates session and starts timer', async () => {
    const mockSession = { id: 's1', status: 'active', planned_mins: 25 }

    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u1' } },
    })

    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useSessionStore.getState().startSession('t1', 25)
    const state = useSessionStore.getState()
    expect(state.currentSession).toEqual(mockSession)
    expect(state.isTimerRunning).toBe(true)
    expect(state.elapsedSeconds).toBe(0)
    expect(setTimerState).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 's1', status: 'running' }),
    )
  })

  it('throws when not authenticated', async () => {
    // Clear the auth state to simulate unauthenticated user
    useAuthStore.setState({ user: null } as any)

    await expect(useSessionStore.getState().startSession('t1', 25)).rejects.toThrow(
      'Not authenticated',
    )
  })
})

describe('sessionStore.pauseSession', () => {
  it('pauses the running timer', () => {
    const now = Date.now()
    useSessionStore.setState({
      currentSession: { id: 's1', pauses: 0 } as any,
      timerState: {
        sessionId: 's1',
        startedAt: now - 10000, // 10 seconds ago
        elapsedSecsBeforePause: 0,
        pausedAt: null,
        status: 'running',
      },
      isTimerRunning: true,
    })

    // Mock the supabase update (fire-and-forget)
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockReturnValue({ catch: jest.fn() }),
    }
    mockChain.then.mockImplementation((cb) => { cb({ error: null }); return { catch: jest.fn() } })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    useSessionStore.getState().pauseSession()
    const state = useSessionStore.getState()
    expect(state.isTimerRunning).toBe(false)
    expect(state.timerState?.status).toBe('paused')
    expect(state.timerState?.pausedAt).toBeDefined()
    expect(state.elapsedSeconds).toBeGreaterThanOrEqual(9)
    expect(setTimerState).toHaveBeenCalled()
  })

  it('does nothing when not running', () => {
    useSessionStore.setState({ timerState: null })
    useSessionStore.getState().pauseSession()
    expect(setTimerState).not.toHaveBeenCalled()
  })

  it('does nothing when already paused', () => {
    useSessionStore.setState({
      timerState: {
        sessionId: 's1',
        startedAt: Date.now(),
        elapsedSecsBeforePause: 10,
        pausedAt: Date.now(),
        status: 'paused',
      },
    })
    useSessionStore.getState().pauseSession()
    expect(setTimerState).not.toHaveBeenCalled()
  })
})

describe('sessionStore.resumeSession', () => {
  it('resumes from paused state', () => {
    useSessionStore.setState({
      currentSession: { id: 's1' } as any,
      timerState: {
        sessionId: 's1',
        startedAt: Date.now() - 20000,
        elapsedSecsBeforePause: 10,
        pausedAt: Date.now() - 5000,
        status: 'paused',
      },
      isTimerRunning: false,
    })

    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockReturnValue({ catch: jest.fn() }),
    }
    mockChain.then.mockImplementation((cb) => { cb({ error: null }); return { catch: jest.fn() } })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    useSessionStore.getState().resumeSession()
    const state = useSessionStore.getState()
    expect(state.isTimerRunning).toBe(true)
    expect(state.timerState?.status).toBe('running')
    expect(state.timerState?.pausedAt).toBeNull()
    expect(setTimerState).toHaveBeenCalled()
  })

  it('does nothing when not paused', () => {
    useSessionStore.setState({ timerState: null })
    useSessionStore.getState().resumeSession()
    expect(setTimerState).not.toHaveBeenCalled()
  })
})

describe('sessionStore.endSession', () => {
  it('ends session and clears timer state', async () => {
    useSessionStore.setState({
      currentSession: { id: 's1' } as any,
      timerState: {
        sessionId: 's1',
        startedAt: Date.now() - 60000,
        elapsedSecsBeforePause: 0,
        pausedAt: null,
        status: 'running',
      },
      isTimerRunning: true,
    })

    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    // Second .eq('user_id', userId) resolves the promise
    let eqCallCount = 0
    mockChain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount >= 2) return Promise.resolve({ error: null })
      return mockChain
    })
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useSessionStore.getState().endSession(4, 'Great', 'Nice session')
    const state = useSessionStore.getState()
    expect(state.currentSession).toBeNull()
    expect(state.timerState).toBeNull()
    expect(state.isTimerRunning).toBe(false)
    expect(state.elapsedSeconds).toBe(0)
    expect(clearTimerState).toHaveBeenCalled()
  })

  it('throws when no active session', async () => {
    useSessionStore.setState({ currentSession: null })
    await expect(useSessionStore.getState().endSession(4, 'Great')).rejects.toThrow(
      'No active session to end',
    )
  })
})

describe('sessionStore.updateElapsed', () => {
  it('recalculates elapsed from timer state', () => {
    const now = Date.now()
    useSessionStore.setState({
      timerState: {
        sessionId: 's1',
        startedAt: now - 5000, // 5 seconds ago
        elapsedSecsBeforePause: 10,
        pausedAt: null,
        status: 'running',
      },
    })

    useSessionStore.getState().updateElapsed()
    expect(useSessionStore.getState().elapsedSeconds).toBeGreaterThanOrEqual(14)
  })

  it('does nothing when no timer state', () => {
    useSessionStore.setState({ timerState: null, elapsedSeconds: 0 })
    useSessionStore.getState().updateElapsed()
    expect(useSessionStore.getState().elapsedSeconds).toBe(0)
  })

  it('returns elapsedSecsBeforePause when paused', () => {
    useSessionStore.setState({
      timerState: {
        sessionId: 's1',
        startedAt: Date.now() - 60000,
        elapsedSecsBeforePause: 42,
        pausedAt: Date.now() - 5000,
        status: 'paused',
      },
    })

    useSessionStore.getState().updateElapsed()
    expect(useSessionStore.getState().elapsedSeconds).toBe(42)
  })
})
