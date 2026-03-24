// The global MMKV mock from jest.setup.js doesn't include getNumber/getBoolean.
// Add them before importing the module.
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(() => false),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}))

import {
  storage,
  getTimerState,
  setTimerState,
  clearTimerState,
  setLastActivity,
  getLastActivity,
  clearLastActivity,
  type TimerState,
} from '../mmkv'

describe('mmkv - Timer state', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getTimerState', () => {
    it('returns null when no timer state is stored', () => {
      ;(storage.getString as jest.Mock).mockReturnValue(undefined)
      expect(getTimerState()).toBeNull()
    })

    it('returns parsed timer state when valid JSON is stored', () => {
      const timerState: TimerState = {
        sessionId: 's1',
        startedAt: 1700000000000,
        elapsedSecsBeforePause: 120,
        pausedAt: null,
        status: 'running',
      }
      ;(storage.getString as jest.Mock).mockReturnValue(JSON.stringify(timerState))

      const result = getTimerState()
      expect(result).toEqual(timerState)
    })

    it('returns null when stored value is invalid JSON', () => {
      ;(storage.getString as jest.Mock).mockReturnValue('not valid json {{{')

      const result = getTimerState()
      expect(result).toBeNull()
    })

    it('returns null when stored value is empty string', () => {
      ;(storage.getString as jest.Mock).mockReturnValue('')

      // Empty string is falsy, so it returns null before parsing
      const result = getTimerState()
      expect(result).toBeNull()
    })

    it('reads from the correct key', () => {
      ;(storage.getString as jest.Mock).mockReturnValue(undefined)
      getTimerState()
      expect(storage.getString).toHaveBeenCalledWith('timer_state')
    })
  })

  describe('setTimerState', () => {
    it('stores timer state as JSON string', () => {
      const timerState: TimerState = {
        sessionId: 's1',
        startedAt: 1700000000000,
        elapsedSecsBeforePause: 0,
        pausedAt: null,
        status: 'running',
      }

      setTimerState(timerState)
      expect(storage.set).toHaveBeenCalledWith('timer_state', JSON.stringify(timerState))
    })

    it('stores paused timer state correctly', () => {
      const timerState: TimerState = {
        sessionId: 's2',
        startedAt: 1700000000000,
        elapsedSecsBeforePause: 300,
        pausedAt: 1700000300000,
        status: 'paused',
      }

      setTimerState(timerState)
      const storedValue = (storage.set as jest.Mock).mock.calls[0][1]
      const parsed = JSON.parse(storedValue)
      expect(parsed.status).toBe('paused')
      expect(parsed.pausedAt).toBe(1700000300000)
    })

    it('stores stopped timer state correctly', () => {
      const timerState: TimerState = {
        sessionId: 's3',
        startedAt: 1700000000000,
        elapsedSecsBeforePause: 600,
        pausedAt: null,
        status: 'stopped',
      }

      setTimerState(timerState)
      const storedValue = (storage.set as jest.Mock).mock.calls[0][1]
      const parsed = JSON.parse(storedValue)
      expect(parsed.status).toBe('stopped')
    })
  })

  describe('clearTimerState', () => {
    it('deletes the timer_state key', () => {
      clearTimerState()
      expect(storage.delete).toHaveBeenCalledWith('timer_state')
    })
  })

  describe('roundtrip: set then get', () => {
    it('can store and retrieve timer state', () => {
      const timerState: TimerState = {
        sessionId: 's1',
        startedAt: 1700000000000,
        elapsedSecsBeforePause: 45,
        pausedAt: 1700000045000,
        status: 'paused',
      }

      // Capture the stored value
      let stored: string | undefined
      ;(storage.set as jest.Mock).mockImplementation((_key: string, value: string) => {
        stored = value
      })
      ;(storage.getString as jest.Mock).mockImplementation(() => stored)

      setTimerState(timerState)
      const result = getTimerState()
      expect(result).toEqual(timerState)
    })
  })
})

describe('mmkv - Last activity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('setLastActivity', () => {
    it('stores current timestamp as number', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))

      setLastActivity()
      expect(storage.set).toHaveBeenCalledWith('last_activity', expect.any(Number))

      const storedValue = (storage.set as jest.Mock).mock.calls[0][1]
      expect(storedValue).toBe(Date.now())

      jest.useRealTimers()
    })

    it('uses the correct key', () => {
      setLastActivity()
      expect(storage.set).toHaveBeenCalledWith('last_activity', expect.anything())
    })
  })

  describe('getLastActivity', () => {
    it('returns timestamp when stored', () => {
      const timestamp = 1700000000000
      ;(storage.getNumber as jest.Mock).mockReturnValue(timestamp)

      const result = getLastActivity()
      expect(result).toBe(timestamp)
    })

    it('returns null when no activity stored', () => {
      ;(storage.getNumber as jest.Mock).mockReturnValue(undefined)

      const result = getLastActivity()
      expect(result).toBeNull()
    })

    it('reads from the correct key', () => {
      ;(storage.getNumber as jest.Mock).mockReturnValue(undefined)
      getLastActivity()
      expect(storage.getNumber).toHaveBeenCalledWith('last_activity')
    })
  })

  describe('clearLastActivity', () => {
    it('deletes the last_activity key', () => {
      clearLastActivity()
      expect(storage.delete).toHaveBeenCalledWith('last_activity')
    })
  })
})
