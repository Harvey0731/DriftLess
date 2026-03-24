import { supabase } from '../../lib/supabase'
import { useSessionStore } from '../sessionStore'
import { useAuthStore } from '../authStore'
import { clearTimerState, getTimerState } from '../../lib/mmkv'
import type { TimerState } from '../../lib/mmkv'

jest.mock('../../lib/mmkv', () => ({
  getTimerState: jest.fn(),
  setTimerState: jest.fn(),
  clearTimerState: jest.fn(),
}))

const mockGetTimerState = getTimerState as jest.Mock

function mockSupabaseSessionQuery(data: any, error: any = null) {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  }
  ;(supabase.from as jest.Mock).mockReturnValue(mockChain)
  return mockChain
}

beforeEach(() => {
  jest.clearAllMocks()
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

describe('sessionStore.restoreTimerFromMMKV', () => {
  // Branch 1: No stored timer state (MMKV returns null)
  it('clears state when no timer is stored in MMKV', async () => {
    mockGetTimerState.mockReturnValue(null)

    await useSessionStore.getState().restoreTimerFromMMKV()

    const state = useSessionStore.getState()
    expect(state.currentSession).toBeNull()
    expect(state.timerState).toBeNull()
    expect(state.isTimerRunning).toBe(false)
    expect(state.elapsedSeconds).toBe(0)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  // Branch 2: Timer status is 'stopped'
  it('clears state when timer status is stopped', async () => {
    mockGetTimerState.mockReturnValue({
      sessionId: 's1',
      startedAt: Date.now(),
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'stopped',
    } as TimerState)

    await useSessionStore.getState().restoreTimerFromMMKV()

    const state = useSessionStore.getState()
    expect(state.currentSession).toBeNull()
    expect(state.timerState).toBeNull()
    expect(state.isTimerRunning).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  // Branch 3: Supabase fetch error — stale timer cleanup
  it('clears timer when Supabase returns an error', async () => {
    mockGetTimerState.mockReturnValue({
      sessionId: 's1',
      startedAt: Date.now() - 60000,
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'running',
    } as TimerState)

    mockSupabaseSessionQuery(null, { message: 'DB error' })

    await useSessionStore.getState().restoreTimerFromMMKV()

    expect(clearTimerState).toHaveBeenCalled()
    const state = useSessionStore.getState()
    expect(state.currentSession).toBeNull()
    expect(state.timerState).toBeNull()
  })

  // Branch 4: Session not found in DB (null data)
  it('clears timer when session row is not found', async () => {
    mockGetTimerState.mockReturnValue({
      sessionId: 's-missing',
      startedAt: Date.now() - 60000,
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'running',
    } as TimerState)

    mockSupabaseSessionQuery(null)

    await useSessionStore.getState().restoreTimerFromMMKV()

    expect(clearTimerState).toHaveBeenCalled()
    const state = useSessionStore.getState()
    expect(state.currentSession).toBeNull()
  })

  // Branch 5: Session status is 'completed' — stale, cleanup
  it('clears timer when session is already completed', async () => {
    mockGetTimerState.mockReturnValue({
      sessionId: 's1',
      startedAt: Date.now() - 60000,
      elapsedSecsBeforePause: 30,
      pausedAt: null,
      status: 'running',
    } as TimerState)

    mockSupabaseSessionQuery({
      id: 's1',
      user_id: 'u1',
      status: 'completed',
      planned_mins: 25,
    })

    await useSessionStore.getState().restoreTimerFromMMKV()

    expect(clearTimerState).toHaveBeenCalled()
    const state = useSessionStore.getState()
    expect(state.currentSession).toBeNull()
    expect(state.isTimerRunning).toBe(false)
  })

  // Branch 6: Session status is 'abandoned' — stale, cleanup
  it('clears timer when session is abandoned', async () => {
    mockGetTimerState.mockReturnValue({
      sessionId: 's1',
      startedAt: Date.now() - 60000,
      elapsedSecsBeforePause: 10,
      pausedAt: null,
      status: 'running',
    } as TimerState)

    mockSupabaseSessionQuery({
      id: 's1',
      user_id: 'u1',
      status: 'abandoned',
      planned_mins: 25,
    })

    await useSessionStore.getState().restoreTimerFromMMKV()

    expect(clearTimerState).toHaveBeenCalled()
    expect(useSessionStore.getState().currentSession).toBeNull()
  })

  // Branch 7: Valid running session — full restore
  it('restores a valid running session', async () => {
    const startedAt = Date.now() - 30000 // 30 seconds ago
    const timer: TimerState = {
      sessionId: 's1',
      startedAt,
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'running',
    }
    mockGetTimerState.mockReturnValue(timer)

    const sessionRow = {
      id: 's1',
      user_id: 'u1',
      status: 'active',
      planned_mins: 25,
      task_id: 't1',
    }
    mockSupabaseSessionQuery(sessionRow)

    await useSessionStore.getState().restoreTimerFromMMKV()

    const state = useSessionStore.getState()
    expect(state.currentSession).toEqual(sessionRow)
    expect(state.timerState).toEqual(timer)
    expect(state.isTimerRunning).toBe(true)
    expect(state.elapsedSeconds).toBeGreaterThanOrEqual(29)
    expect(clearTimerState).not.toHaveBeenCalled()
  })

  // Branch 8: Valid paused session — restore in paused state
  it('restores a valid paused session', async () => {
    const now = Date.now()
    const timer: TimerState = {
      sessionId: 's1',
      startedAt: now - 60000,
      elapsedSecsBeforePause: 45,
      pausedAt: now - 5000,
      status: 'paused',
    }
    mockGetTimerState.mockReturnValue(timer)

    const sessionRow = {
      id: 's1',
      user_id: 'u1',
      status: 'paused',
      planned_mins: 50,
      task_id: 't1',
    }
    mockSupabaseSessionQuery(sessionRow)

    await useSessionStore.getState().restoreTimerFromMMKV()

    const state = useSessionStore.getState()
    expect(state.currentSession).toEqual(sessionRow)
    expect(state.isTimerRunning).toBe(false)
    expect(state.elapsedSeconds).toBe(45)
  })

  // Branch 9: No authenticated user — userId is undefined
  it('handles missing user gracefully (userId undefined)', async () => {
    useAuthStore.setState({ user: null } as any)

    const timer: TimerState = {
      sessionId: 's1',
      startedAt: Date.now() - 10000,
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'running',
    }
    mockGetTimerState.mockReturnValue(timer)

    // The eq('user_id', '') will match nothing
    mockSupabaseSessionQuery(null)

    await useSessionStore.getState().restoreTimerFromMMKV()

    expect(clearTimerState).toHaveBeenCalled()
    expect(useSessionStore.getState().currentSession).toBeNull()
  })
})
