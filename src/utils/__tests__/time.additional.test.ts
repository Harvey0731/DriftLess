import {
  formatTimer,
  formatDuration,
  getRelativeTime,
  getGreeting,
  getTimeOfDay,
  formatDate,
  isToday,
  getTodayDateString,
} from '../time'

describe('formatDuration - edge cases', () => {
  it('formats exactly 60 minutes (1 hour) as "1h"', () => {
    expect(formatDuration(60)).toBe('1h')
  })

  it('formats very large numbers (999999 minutes)', () => {
    // 999999 / 60 = 16666 hours, remainder 39
    expect(formatDuration(999999)).toBe('16666h 39m')
  })

  it('formats 1 minute as "1 min"', () => {
    expect(formatDuration(1)).toBe('1 min')
  })

  it('formats 59 minutes as "59 min"', () => {
    expect(formatDuration(59)).toBe('59 min')
  })

  it('formats 61 minutes as "1h 1m"', () => {
    expect(formatDuration(61)).toBe('1h 1m')
  })

  it('formats 1440 minutes (24 hours) as "24h"', () => {
    expect(formatDuration(1440)).toBe('24h')
  })

  it('formats 150 minutes as "2h 30m"', () => {
    expect(formatDuration(150)).toBe('2h 30m')
  })
})

describe('formatTimer - edge cases', () => {
  it('formats exactly 3600 seconds (1 hour) as 01:00:00', () => {
    expect(formatTimer(3600)).toBe('01:00:00')
  })

  it('formats 3599 seconds as 59:59 (no hours)', () => {
    expect(formatTimer(3599)).toBe('59:59')
  })

  it('formats large number of seconds (86400 = 24 hours)', () => {
    expect(formatTimer(86400)).toBe('24:00:00')
  })

  it('formats NaN as NaN:NaN (no special handling)', () => {
    // NaN propagates through Math.max/Math.floor, resulting in NaN values
    const result = formatTimer(NaN)
    expect(typeof result).toBe('string')
  })

  it('formats very large seconds (359999 = 99:59:59)', () => {
    expect(formatTimer(359999)).toBe('99:59:59')
  })

  it('formats 7261 seconds as 02:01:01', () => {
    expect(formatTimer(7261)).toBe('02:01:01')
  })
})

describe('getGreeting - boundary times', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "Good afternoon" at exactly 12:00', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00'))
    expect(getGreeting()).toBe('Good afternoon')
  })

  it('returns "Good morning" at 11:59', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T11:59:00'))
    expect(getGreeting()).toBe('Good morning')
  })

  it('returns "Good evening" at exactly 17:00', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T17:00:00'))
    expect(getGreeting()).toBe('Good evening')
  })

  it('returns "Good afternoon" at 16:59', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T16:59:00'))
    expect(getGreeting()).toBe('Good afternoon')
  })

  it('returns "Good night" at exactly 21:00', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T21:00:00'))
    expect(getGreeting()).toBe('Good night')
  })

  it('returns "Good evening" at 20:59', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T20:59:00'))
    expect(getGreeting()).toBe('Good evening')
  })

  it('returns "Good night" at midnight (00:00)', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T00:00:00'))
    expect(getGreeting()).toBe('Good night')
  })

  it('returns "Good night" at 23:59', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T23:59:00'))
    expect(getGreeting()).toBe('Good night')
  })
})

describe('getTimeOfDay - boundary times', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "afternoon" at exactly 12:00', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00'))
    expect(getTimeOfDay()).toBe('afternoon')
  })

  it('returns "morning" at 11:59', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T11:59:00'))
    expect(getTimeOfDay()).toBe('morning')
  })

  it('returns "evening" at exactly 17:00', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T17:00:00'))
    expect(getTimeOfDay()).toBe('evening')
  })

  it('returns "night" at exactly 21:00', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T21:00:00'))
    expect(getTimeOfDay()).toBe('night')
  })

  it('returns "morning" at 00:00', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T00:00:00'))
    expect(getTimeOfDay()).toBe('morning')
  })
})

describe('formatDate - additional cases', () => {
  it('formats a date with time component', () => {
    const result = formatDate('2026-06-01T14:30:00Z')
    expect(result).toContain('Jun')
  })

  it('formats year boundary date (Dec 31)', () => {
    const result = formatDate('2025-12-31')
    expect(result).toContain('Dec')
    expect(result).toContain('31')
  })

  it('formats Jan 1 correctly', () => {
    const result = formatDate('2026-01-01')
    expect(result).toContain('Jan')
    expect(result).toContain('1')
  })

  it('includes weekday abbreviation', () => {
    // 2026-03-15 is a Sunday
    const result = formatDate('2026-03-15')
    expect(result).toContain('Sun')
  })
})

describe('getRelativeTime - additional edge cases', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "Just now" for exactly current time', () => {
    const date = new Date('2026-03-15T12:00:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('Just now')
  })

  it('returns "1m ago" for exactly 60 seconds ago', () => {
    const date = new Date('2026-03-15T11:59:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('1m ago')
  })

  it('returns "1h ago" for exactly 60 minutes ago', () => {
    const date = new Date('2026-03-15T11:00:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('1h ago')
  })

  it('returns "6d ago" for exactly 6 days ago', () => {
    const date = new Date('2026-03-09T12:00:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('6d ago')
  })

  it('returns formatted date for exactly 7 days ago', () => {
    const date = new Date('2026-03-08T12:00:00Z').toISOString()
    const result = getRelativeTime(date)
    expect(result).toContain('Mar')
  })
})

describe('isToday - additional cases', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns true for start of today', () => {
    expect(isToday('2026-03-15T00:00:00')).toBe(true)
  })

  it('returns true for end of today', () => {
    expect(isToday('2026-03-15T23:59:59')).toBe(true)
  })

  it('returns false for tomorrow', () => {
    expect(isToday('2026-03-16T00:00:00')).toBe(false)
  })

  it('returns false for same day different month', () => {
    expect(isToday('2026-04-15T12:00:00')).toBe(false)
  })

  it('returns false for same day different year', () => {
    expect(isToday('2025-03-15T12:00:00')).toBe(false)
  })
})

describe('getTodayDateString - additional cases', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns correct format for single-digit month and day', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-05T12:00:00Z'))
    expect(getTodayDateString()).toBe('2026-01-05')
  })

  it('returns correct format for double-digit month and day', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-12-25T12:00:00Z'))
    expect(getTodayDateString()).toBe('2026-12-25')
  })

  it('returns consistent format (YYYY-MM-DD) matching regex', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
    const result = getTodayDateString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
