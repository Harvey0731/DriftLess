import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { captureError } from '../lib/sentry'
import { getTimerState, setTimerState, clearTimerState, type TimerState } from '../lib/mmkv'
import type { FocusSession } from '../types/database'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SessionState {
  currentSession: FocusSession | null
  timerState: TimerState | null
  isTimerRunning: boolean
  elapsedSeconds: number
}

interface SessionActions {
  startSession: (taskId: string, plannedMins: number, checkInId?: string) => Promise<void>
  pauseSession: () => void
  resumeSession: () => void
  endSession: (rating: number, ratingLabel: string, note?: string) => Promise<void>
  /** Restore timer from MMKV on app cold-start. */
  restoreTimerFromMMKV: () => Promise<void>
  /** Recalculate elapsed from MMKV epoch — call on each tick. */
  updateElapsed: () => void
}

type SessionStore = SessionState & SessionActions

// ─── Constants ───────────────────────────────────────────────────────────────

/** BUG-04: Maximum session duration (8 hours) to prevent runaway timers. */
export const MAX_SESSION_SECS = 8 * 60 * 60

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute total elapsed seconds from a TimerState using epoch timestamps.
 * Accounts for time already accumulated before the last pause.
 * Capped at MAX_SESSION_SECS to prevent runaway timers.
 */
function computeElapsed(ts: TimerState): number {
  const now = Date.now()

  let raw: number

  if (ts.status === 'paused' && ts.pausedAt !== null) {
    raw = ts.elapsedSecsBeforePause
  } else if (ts.status === 'running') {
    const runningMs = now - ts.startedAt
    raw = ts.elapsedSecsBeforePause + Math.floor(runningMs / 1000)
  } else {
    raw = ts.elapsedSecsBeforePause
  }

  return Math.min(raw, MAX_SESSION_SECS)
}

/** Get cached user ID from authStore (no network call). */
function getCachedUserId(): string {
  const userId = useAuthStore.getState().user?.id
  if (!userId) throw new Error('Not authenticated')
  return userId
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>()((set, get) => ({
  // state
  currentSession: null,
  timerState: null,
  isTimerRunning: false,
  elapsedSeconds: 0,

  // actions

  startSession: async (taskId, plannedMins, checkInId?: string) => {
    const userId = getCachedUserId()

    const insertData = {
      user_id: userId,
      task_id: taskId,
      check_in_id: checkInId ?? null,
      started_at: new Date().toISOString(),
      planned_mins: plannedMins,
      actual_secs: 0,
      pauses: 0,
      status: 'active' as const,
      ended_at: null,
      rating: null,
      rating_label: null,
      note: null,
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select()
      .single()

    if (error) throw error
    const typedData = data as unknown as FocusSession

    const timer: TimerState = {
      sessionId: typedData.id,
      startedAt: Date.now(),
      elapsedSecsBeforePause: 0,
      pausedAt: null,
      status: 'running',
    }

    setTimerState(timer)

    set({
      currentSession: typedData,
      timerState: timer,
      isTimerRunning: true,
      elapsedSeconds: 0,
    })
  },

  pauseSession: () => {
    const { timerState, currentSession } = get()
    if (!timerState || timerState.status !== 'running') return

    const now = Date.now()
    const runningMs = now - timerState.startedAt
    const totalElapsed = timerState.elapsedSecsBeforePause + Math.floor(runningMs / 1000)

    const updated: TimerState = {
      ...timerState,
      pausedAt: now,
      elapsedSecsBeforePause: totalElapsed,
      status: 'paused',
    }

    setTimerState(updated)

    // Compute new pause count once to keep DB and local state consistent
    const newPauseCount = (currentSession?.pauses ?? 0) + 1

    // Update pause count in Supabase (fire-and-forget).
    if (currentSession) {
      const userId = useAuthStore.getState().user?.id
      Promise.resolve(
        supabase
          .from('focus_sessions')
          .update({
            status: 'paused' as const,
            pauses: newPauseCount,
          })
          .eq('id', currentSession.id)
          .eq('user_id', userId ?? ''),
      )
        .then(({ error }) => {
          if (error)
            captureError(new Error(`Session update failed: ${error.message}`), {
              context: 'sessionStore.pauseSession',
            })
        })
        .catch((err: unknown) => {
          captureError(err instanceof Error ? err : new Error(String(err)), {
            context: 'sessionStore.pauseSession',
          })
        })
    }

    set({
      timerState: updated,
      isTimerRunning: false,
      elapsedSeconds: totalElapsed,
      currentSession: currentSession
        ? {
            ...currentSession,
            status: 'paused',
            pauses: newPauseCount,
          }
        : null,
    })
  },

  resumeSession: () => {
    const { timerState, currentSession } = get()
    if (!timerState || timerState.status !== 'paused') return

    const updated: TimerState = {
      ...timerState,
      startedAt: Date.now(),
      pausedAt: null,
      status: 'running',
    }

    setTimerState(updated)

    if (currentSession) {
      const resumeUserId = useAuthStore.getState().user?.id
      Promise.resolve(
        supabase
          .from('focus_sessions')
          .update({ status: 'active' as const })
          .eq('id', currentSession.id)
          .eq('user_id', resumeUserId ?? ''),
      )
        .then(({ error }) => {
          if (error)
            captureError(new Error(`Session update failed: ${error.message}`), {
              context: 'sessionStore.resumeSession',
            })
        })
        .catch((err: unknown) => {
          captureError(err instanceof Error ? err : new Error(String(err)), {
            context: 'sessionStore.resumeSession',
          })
        })
    }

    set({
      timerState: updated,
      isTimerRunning: true,
      currentSession: currentSession ? { ...currentSession, status: 'active' } : null,
    })
  },

  endSession: async (rating, ratingLabel, note) => {
    const { timerState, currentSession } = get()
    if (!currentSession) throw new Error('No active session to end')

    const userId = getCachedUserId()

    // Final elapsed calculation
    const elapsed = timerState ? computeElapsed(timerState) : 0

    const { error } = await supabase
      .from('focus_sessions')
      .update({
        status: 'completed' as const,
        actual_secs: elapsed,
        ended_at: new Date().toISOString(),
        rating,
        rating_label: ratingLabel,
        note: note ?? null,
      })
      .eq('id', currentSession.id)
      .eq('user_id', userId)

    if (error) throw error

    clearTimerState()

    set({
      currentSession: null,
      timerState: null,
      isTimerRunning: false,
      elapsedSeconds: 0,
    })
  },

  restoreTimerFromMMKV: async () => {
    const timer = getTimerState()
    if (!timer || timer.status === 'stopped') {
      set({
        timerState: null,
        isTimerRunning: false,
        elapsedSeconds: 0,
        currentSession: null,
      })
      return
    }

    // Fetch the session row from Supabase with ownership check.
    const userId = useAuthStore.getState().user?.id
    if (!userId) {
      clearTimerState()
      set({ timerState: null, isTimerRunning: false, elapsedSeconds: 0, currentSession: null })
      return
    }
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('id', timer.sessionId)
      .eq('user_id', userId)
      .maybeSingle()

    const sessionData = data as unknown as FocusSession | null
    if (
      error ||
      !sessionData ||
      sessionData.status === 'completed' ||
      sessionData.status === 'abandoned'
    ) {
      // Stale timer — clean up.
      clearTimerState()
      set({
        timerState: null,
        isTimerRunning: false,
        elapsedSeconds: 0,
        currentSession: null,
      })
      return
    }

    const elapsed = computeElapsed(timer)

    set({
      currentSession: sessionData,
      timerState: timer,
      isTimerRunning: timer.status === 'running',
      elapsedSeconds: elapsed,
    })
  },

  updateElapsed: () => {
    const { timerState } = get()
    if (!timerState) return

    const elapsed = computeElapsed(timerState)
    set({ elapsedSeconds: elapsed })
  },
}))
