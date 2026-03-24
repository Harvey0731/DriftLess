import {
  APP_NAME,
  APP_TAGLINE,
  DEFAULT_SESSION_MINUTES,
  SESSION_DURATIONS,
  MIN_CUSTOM_DURATION,
  MAX_CUSTOM_DURATION,
  CHAT_RATE_WINDOW_MS,
  STREAK_SHIELD_MAX,
  STREAK_SHIELD_EARN_DAYS,
  MAX_PROMISES_PER_DAY,
  TRUST_SCORE_WEIGHTS,
  TRUST_LABELS,
  ENERGY_LEVELS,
  SESSION_RATINGS,
  CELEBRATION_STYLES,
  THEMES,
  NOTIFICATION_PRESETS,
  SHAME_PATTERNS,
  MILESTONES,
} from '../constants'

describe('App identity constants', () => {
  it('exports APP_NAME as a non-empty string', () => {
    expect(typeof APP_NAME).toBe('string')
    expect(APP_NAME.length).toBeGreaterThan(0)
  })

  it('exports APP_TAGLINE as a non-empty string', () => {
    expect(typeof APP_TAGLINE).toBe('string')
    expect(APP_TAGLINE.length).toBeGreaterThan(0)
  })
})

describe('Timer constants', () => {
  it('DEFAULT_SESSION_MINUTES is 25', () => {
    expect(DEFAULT_SESSION_MINUTES).toBe(25)
  })

  it('SESSION_DURATIONS contains expected preset values', () => {
    expect(SESSION_DURATIONS).toContain(15)
    expect(SESSION_DURATIONS).toContain(25)
    expect(SESSION_DURATIONS).toContain(50)
    expect(SESSION_DURATIONS).toHaveLength(3)
  })

  it('MIN_CUSTOM_DURATION is less than MAX_CUSTOM_DURATION', () => {
    expect(MIN_CUSTOM_DURATION).toBeLessThan(MAX_CUSTOM_DURATION)
  })

  it('MAX_CUSTOM_DURATION is 180', () => {
    expect(MAX_CUSTOM_DURATION).toBe(180)
  })
})

describe('Rate limiting constants', () => {
  it('CHAT_RATE_WINDOW_MS is 1 hour in milliseconds', () => {
    expect(CHAT_RATE_WINDOW_MS).toBe(3600000)
  })
})

describe('Streak constants', () => {
  it('STREAK_SHIELD_MAX is 3', () => {
    expect(STREAK_SHIELD_MAX).toBe(3)
  })

  it('STREAK_SHIELD_EARN_DAYS is 7', () => {
    expect(STREAK_SHIELD_EARN_DAYS).toBe(7)
  })
})

describe('Promise constants', () => {
  it('MAX_PROMISES_PER_DAY is 1', () => {
    expect(MAX_PROMISES_PER_DAY).toBe(1)
  })
})

describe('TRUST_SCORE_WEIGHTS', () => {
  it('weights sum to 1.0', () => {
    const sum =
      TRUST_SCORE_WEIGHTS.keptRatio + TRUST_SCORE_WEIGHTS.streak + TRUST_SCORE_WEIGHTS.activity30d
    expect(sum).toBeCloseTo(1.0)
  })

  it('keptRatio weight is 0.6', () => {
    expect(TRUST_SCORE_WEIGHTS.keptRatio).toBe(0.6)
  })
})

describe('TRUST_LABELS', () => {
  it('has 4 entries', () => {
    expect(TRUST_LABELS).toHaveLength(4)
  })

  it('each entry has min, max, label, and color', () => {
    for (const entry of TRUST_LABELS) {
      expect(entry).toHaveProperty('min')
      expect(entry).toHaveProperty('max')
      expect(entry).toHaveProperty('label')
      expect(entry).toHaveProperty('color')
    }
  })

  it('covers the full 0-100 range', () => {
    expect(TRUST_LABELS[0].min).toBe(0)
    expect(TRUST_LABELS[TRUST_LABELS.length - 1].max).toBe(100)
  })
})

describe('ENERGY_LEVELS', () => {
  it('has 4 entries', () => {
    expect(ENERGY_LEVELS).toHaveLength(4)
  })

  it('each entry has value, label, description, color, and bgColor', () => {
    for (const level of ENERGY_LEVELS) {
      expect(level).toHaveProperty('value')
      expect(level).toHaveProperty('label')
      expect(level).toHaveProperty('description')
      expect(level).toHaveProperty('color')
      expect(level).toHaveProperty('bgColor')
      expect(typeof level.value).toBe('number')
    }
  })
})

describe('SESSION_RATINGS', () => {
  it('has 4 entries', () => {
    expect(SESSION_RATINGS).toHaveLength(4)
  })
})

describe('THEMES', () => {
  it('includes Light, Dark, and Auto', () => {
    expect(THEMES).toContain('Light')
    expect(THEMES).toContain('Dark')
    expect(THEMES).toContain('Auto')
  })
})

describe('NOTIFICATION_PRESETS', () => {
  it('each preset has label, hour, and description', () => {
    for (const preset of NOTIFICATION_PRESETS) {
      expect(preset).toHaveProperty('label')
      expect(preset).toHaveProperty('hour')
      expect(preset).toHaveProperty('description')
      expect(preset.hour).toBeGreaterThanOrEqual(0)
      expect(preset.hour).toBeLessThan(24)
    }
  })
})

describe('SHAME_PATTERNS', () => {
  it('is a non-empty array of strings', () => {
    expect(SHAME_PATTERNS.length).toBeGreaterThan(0)
    for (const pattern of SHAME_PATTERNS) {
      expect(typeof pattern).toBe('string')
    }
  })
})

describe('MILESTONES', () => {
  it('each milestone has type, label, and description', () => {
    for (const milestone of MILESTONES) {
      expect(milestone).toHaveProperty('type')
      expect(milestone).toHaveProperty('label')
      expect(milestone).toHaveProperty('description')
    }
  })

  it('includes first_session milestone', () => {
    const first = MILESTONES.find((m) => m.type === 'first_session')
    expect(first).toBeDefined()
  })
})
