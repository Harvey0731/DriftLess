import { Platform } from 'react-native'

export interface MMKVStorage {
  getString(key: string): string | undefined
  set(key: string, value: string | number | boolean): void
  getNumber(key: string): number | undefined
  getBoolean(key: string): boolean | undefined
  delete(key: string): void
  contains(key: string): boolean
  getAllKeys(): string[]
}

/** In-memory store used on web / Expo Go where native MMKV is unavailable */
function createMemoryStorage(): MMKVStorage {
  const map = new Map<string, string>()
  return {
    getString: (key) => map.get(key),
    set: (key, value) => map.set(key, String(value)),
    getNumber: (key) => {
      const v = map.get(key)
      return v != null ? Number(v) : undefined
    },
    getBoolean: (key) => {
      const v = map.get(key)
      return v != null ? v === 'true' : undefined
    },
    delete: (key) => {
      map.delete(key)
    },
    contains: (key) => map.has(key),
    getAllKeys: () => Array.from(map.keys()),
  }
}

function createStorage(): MMKVStorage {
  if (Platform.OS === 'web') {
    return createMemoryStorage()
  }

  // Native: try react-native-mmkv, fall back to in-memory if unavailable (Expo Go)
  try {
    const { MMKV } = require('react-native-mmkv')
    return new MMKV({ id: 'driftless' })
  } catch {
    // react-native-mmkv is not available (e.g. Expo Go)
    return createMemoryStorage()
  }
}

export const storage: MMKVStorage = createStorage()

/* ------------------------------------------------------------------ */
/*  Timer state persistence                                           */
/* ------------------------------------------------------------------ */

export interface TimerState {
  sessionId: string
  startedAt: number
  elapsedSecsBeforePause: number
  pausedAt: number | null
  status: 'running' | 'paused' | 'stopped'
}

const TIMER_KEY = 'timer_state'

export function getTimerState(): TimerState | null {
  const raw = storage.getString(TIMER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as TimerState
  } catch {
    return null
  }
}

export function setTimerState(state: TimerState): void {
  storage.set(TIMER_KEY, JSON.stringify(state))
}

export function clearTimerState(): void {
  storage.delete(TIMER_KEY)
}

/* ------------------------------------------------------------------ */
/*  Last-activity tracking (inactivity auto-logout)                    */
/* ------------------------------------------------------------------ */

const LAST_ACTIVITY_KEY = 'last_activity'

export function setLastActivity(): void {
  storage.set(LAST_ACTIVITY_KEY, Date.now())
}

export function getLastActivity(): number | null {
  const val = storage.getNumber(LAST_ACTIVITY_KEY)
  return val ?? null
}

export function clearLastActivity(): void {
  storage.delete(LAST_ACTIVITY_KEY)
}
