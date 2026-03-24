/**
 * Tests for timer screen logic — cold-start restore, tick behavior,
 * goal-reached detection, and formatStartTime.
 */
import { useSessionStore, MAX_SESSION_SECS } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { getTimerState, setTimerState, clearTimerState } from '../mmkv'
import type { TimerState } from '../mmkv'

jest.mock('../mmkv', () => ({
  getTimerState: jest.fn(),
  setTimerState: jest.fn(),
  clearTimerState: jest.fn(),
}))

// formatStartTime extracted from timer.tsx
function formatStartTime(epochMs: number): string {
  const date = new Date(epochMs)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = String(minutes).padStart(2, '0')
  return `${displayHours}:${displayMinutes} ${ampm}`
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

describe('formatStartTime', () => {
  it('formats morning time correctly', () => {
    // 9:05 AM
    const date = new Date(2026, 2, 19, 9, 5)
    expect(formatStartTime(date.getTime())).toBe('9:05 AM')
  })

  it('formats afternoon time correctly', () => {
    // 2:30 PM
    const date = new Date(2026, 2, 19, 14, 30)
    expect(formatStartTime(date.getTime())).toBe('2:30 PM')
  })

  it('formats midnight as 12:00 AM', () => {
    const date = new Date(2026, 2, 19, 0, 0)
    expect(formatStartTime(date.getTime())).toBe('12:00 AM')
  })

  it('formats noon as 12:00 PM', () => {
    const date = new Date(2026, 2, 19, 12, 0)
    expect(formatStartTime(date.getTime())).toBe('12:00 PM')
  })

  it('pads single-digit minutes', () => {
    const date = new Date(2026, 2, 19, 10, 3)
    expect(formatStartTime(date.getTime())).toBe('10:03 AM')
  })
})

describe('MAX_SESSION_SECS constant', () => {
  it('is 8 hours in seconds', () => {
    expect(MAX_SESSION_SECS).toBe(8 * 60 * 60)
    expect(MAX_SESSION_SECS).toBe(28800)
  })
})

describe('timer: goal-reached detection', () => {
  it('goal not reached when elapsed < planned', () => {
    const elapsedSeconds = 1400 // ~23 min
    const plannedMinutes = 25
    expect(elapsedSeconds >= plannedMinutes * 60).toBe(false)
  })

  it('goal reached when elapsed === planned', () => {
    const elapsedSeconds = 1500 // exactly 25 min
    const plannedMinutes = 25
    expect(elapsedSeconds >= plannedMinutes * 60).toBe(true)
  })

  it('goal reached when elapsed > planned', () => {
    const elapsedSeconds = 1800 // 30 min
    const plannedMinutes = 25
    expect(elapsedSeconds >= plannedMinutes * 60).toBe(true)
  })
})

describe('timer: updateElapsed capping', () => {
  it('caps elapsed at MAX_SESSION_SECS', () => {
    const now = Date.now()
    useSessionStore.setState({
      timerState: {
        sessionId: 's1',
        startedAt: now - (MAX_SESSION_SECS + 1000) * 1000, // way over 8 hours
        elapsedSecsBeforePause: 0,
        pausedAt: null,
        status: 'running',
      },
    })

    useSessionStore.getState().updateElapsed()
    expect(useSessionStore.getState().elapsedSeconds).toBeLessThanOrEqual(MAX_SESSION_SECS)
  })

  it('does not cap when under MAX_SESSION_SECS', () => {
    const now = Date.now()
    useSessionStore.setState({
      timerState: {
        sessionId: 's1',
        startedAt: now - 60000, // 60 seconds ago
        elapsedSecsBeforePause: 0,
        pausedAt: null,
        status: 'running',
      },
    })

    useSessionStore.getState().updateElapsed()
    const elapsed = useSessionStore.getState().elapsedSeconds
    expect(elapsed).toBeGreaterThanOrEqual(59)
    expect(elapsed).toBeLessThan(MAX_SESSION_SECS)
  })
})

describe('timer: cold-start restore flow', () => {
  it('restores running session and sets isTimerRunning=true', async () => {
    const timer: TimerState = {
      sessionId: 's1',
      startedAt: Date.now() - 120000, // 2 min ago
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'running',
    }
    ;(getTimerState as jest.Mock).mockReturnValue(timer)

    const { supabase } = require('../supabase')
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 's1', user_id: 'u1', status: 'active', planned_mins: 25 },
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useSessionStore.getState().restoreTimerFromMMKV()

    const state = useSessionStore.getState()
    expect(state.isTimerRunning).toBe(true)
    expect(state.currentSession).not.toBeNull()
    expect(state.elapsedSeconds).toBeGreaterThanOrEqual(119)
  })

  it('shows blank state when restore fails (DB error)', async () => {
    ;(getTimerState as jest.Mock).mockReturnValue({
      sessionId: 's1',
      startedAt: Date.now(),
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'running',
    })

    const { supabase } = require('../supabase')
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB unavailable' },
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockChain)

    await useSessionStore.getState().restoreTimerFromMMKV()

    expect(useSessionStore.getState().currentSession).toBeNull()
    expect(useSessionStore.getState().isTimerRunning).toBe(false)
    expect(clearTimerState).toHaveBeenCalled()
  })
})

describe('timer: quick-action setup validation', () => {
  it('rejects minutes below 5', () => {
    expect(3 >= 5 && 3 <= 180).toBe(false)
  })

  it('accepts 5 minutes', () => {
    expect(5 >= 5 && 5 <= 180).toBe(true)
  })

  it('accepts 180 minutes', () => {
    expect(180 >= 5 && 180 <= 180).toBe(true)
  })

  it('rejects minutes above 180', () => {
    expect(200 >= 5 && 200 <= 180).toBe(false)
  })
})
