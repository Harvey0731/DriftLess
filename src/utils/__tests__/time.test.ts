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

describe('formatTimer', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTimer(0)).toBe('00:00')
  })

  it('formats 59 seconds as 00:59', () => {
    expect(formatTimer(59)).toBe('00:59')
  })

  it('formats 60 seconds as 01:00', () => {
    expect(formatTimer(60)).toBe('01:00')
  })

  it('formats 3661 seconds as 01:01:01', () => {
    expect(formatTimer(3661)).toBe('01:01:01')
  })

  it('treats negative input as 0', () => {
    expect(formatTimer(-10)).toBe('00:00')
  })

  it('floors fractional seconds', () => {
    expect(formatTimer(59.9)).toBe('00:59')
  })
})

describe('formatDuration', () => {
  it('formats minutes under 60 as "N min"', () => {
    expect(formatDuration(25)).toBe('25 min')
  })

  it('formats 0 minutes', () => {
    expect(formatDuration(0)).toBe('0 min')
  })

  it('formats exactly 60 minutes as "1h"', () => {
    expect(formatDuration(60)).toBe('1h')
  })

  it('formats 90 minutes as "1h 30m"', () => {
    expect(formatDuration(90)).toBe('1h 30m')
  })

  it('formats 120 minutes as "2h"', () => {
    expect(formatDuration(120)).toBe('2h')
  })
})

describe('getRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "Just now" for timestamps less than 60 seconds ago', () => {
    const date = new Date('2026-03-15T11:59:30Z').toISOString()
    expect(getRelativeTime(date)).toBe('Just now')
  })

  it('returns minutes ago for timestamps under an hour', () => {
    const date = new Date('2026-03-15T11:30:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('30m ago')
  })

  it('returns hours ago for timestamps under a day', () => {
    const date = new Date('2026-03-15T09:00:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('3h ago')
  })

  it('returns "Yesterday" for 1 day ago', () => {
    const date = new Date('2026-03-14T12:00:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('Yesterday')
  })

  it('returns days ago for 2-6 days', () => {
    const date = new Date('2026-03-12T12:00:00Z').toISOString()
    expect(getRelativeTime(date)).toBe('3d ago')
  })

  it('returns formatted date for 7+ days ago', () => {
    const date = new Date('2026-03-01T12:00:00Z').toISOString()
    const result = getRelativeTime(date)
    expect(result).toContain('Mar')
  })

  it('returns "Unknown" for invalid date string', () => {
    expect(getRelativeTime('not-a-date')).toBe('Unknown')
  })

  it('returns "Unknown" for empty string', () => {
    expect(getRelativeTime('')).toBe('Unknown')
  })
})

describe('getGreeting', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "Good morning" before noon', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T08:00:00'))
    expect(getGreeting()).toBe('Good morning')
  })

  it('returns "Good afternoon" between 12 and 17', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T14:00:00'))
    expect(getGreeting()).toBe('Good afternoon')
  })

  it('returns "Good evening" between 17 and 21', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T19:00:00'))
    expect(getGreeting()).toBe('Good evening')
  })

  it('returns "Good night" after 21', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T22:00:00'))
    expect(getGreeting()).toBe('Good night')
  })
})

describe('getTimeOfDay', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "morning" before noon', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T09:00:00'))
    expect(getTimeOfDay()).toBe('morning')
  })

  it('returns "afternoon" between 12 and 17', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T14:00:00'))
    expect(getTimeOfDay()).toBe('afternoon')
  })

  it('returns "evening" between 17 and 21', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T19:00:00'))
    expect(getTimeOfDay()).toBe('evening')
  })

  it('returns "night" after 21', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T23:00:00'))
    expect(getTimeOfDay()).toBe('night')
  })
})

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2026-03-15')
    expect(result).toContain('Mar')
    expect(result).toContain('15')
  })

  it('returns "Invalid date" for an invalid date string', () => {
    const result = formatDate('not-a-date')
    expect(result).toBe('Invalid date')
  })
})

describe('isToday', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns true for today', () => {
    expect(isToday('2026-03-15T08:00:00')).toBe(true)
  })

  it('returns false for yesterday', () => {
    expect(isToday('2026-03-14T08:00:00')).toBe(false)
  })
})

describe('getTodayDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00Z'))
    expect(getTodayDateString()).toBe('2026-03-15')
    jest.useRealTimers()
  })
})
