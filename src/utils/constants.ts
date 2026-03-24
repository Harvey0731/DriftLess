export const APP_NAME = 'Driftless'
export const APP_TAGLINE = 'Stop putting it off. Actually start.'

// Timer defaults
export const DEFAULT_SESSION_MINUTES = 25
export const SESSION_DURATIONS = [15, 25, 50] as const
export const MIN_CUSTOM_DURATION = 5
export const MAX_CUSTOM_DURATION = 180

// Rate limiting
export const CHAT_RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// Streak
export const STREAK_SHIELD_MAX = 3
export const STREAK_SHIELD_EARN_DAYS = 7

// Promise
export const MAX_PROMISES_PER_DAY = 1

// Trust score weights
export const TRUST_SCORE_WEIGHTS = {
  keptRatio: 0.6,
  streak: 0.2,
  activity30d: 0.2,
} as const

// Trust score labels
export const TRUST_LABELS = [
  { min: 0, max: 30, label: 'Rebuilding', color: '#F59E0B' },
  { min: 31, max: 60, label: 'Growing', color: '#FBBF24' },
  { min: 61, max: 80, label: 'Strong', color: '#10B981' },
  { min: 81, max: 100, label: 'Rock Solid', color: '#8B5CF6' },
] as const

// Energy levels
export const ENERGY_LEVELS = [
  { value: 4, label: 'Good', description: 'Ready to focus', color: '#10B981', bgColor: '#ECFDF5' },
  {
    value: 3,
    label: 'Meh',
    description: 'Could go either way',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  { value: 2, label: 'Low', description: 'Running on empty', color: '#F97316', bgColor: '#FFF7ED' },
  {
    value: 1,
    label: 'Need a Break',
    description: 'Not today',
    color: '#6366F1',
    bgColor: '#EEF2FF',
  },
] as const

// Session ratings
export const SESSION_RATINGS = [
  { value: 4, label: 'Nailed it', description: 'Crushed it', color: '#10B981' },
  { value: 3, label: 'Solid', description: 'Solid session', color: '#3B82F6' },
  { value: 2, label: 'Got started', description: 'You got going', color: '#F59E0B' },
  { value: 1, label: 'Showed up anyway', description: 'And that matters', color: '#F97316' },
] as const

// Celebration styles (capitalized to match DB and settings UI)
export const CELEBRATION_STYLES = ['Enthusiastic', 'Moderate', 'Minimal'] as const

// Themes (capitalized to match DB and settings UI)
export const THEMES = ['Light', 'Dark', 'Auto'] as const

// Notification time presets
export const NOTIFICATION_PRESETS = [
  { label: 'Morning', hour: 8, description: '8:00 AM' },
  { label: 'Midday', hour: 12, description: '12:00 PM' },
  { label: 'Afternoon', hour: 15, description: '3:00 PM' },
  { label: 'Evening', hour: 19, description: '7:00 PM' },
] as const

// Bad Day Toolbox categories and actions
export const BAD_DAY_CATEGORIES = ['Physical', 'Work', 'Comfort', 'Tomorrow'] as const

export const DEFAULT_BAD_DAY_ACTIONS = {
  Physical: [
    {
      title: 'Take a short walk',
      description: 'Just around the block or your room',
      time: '5 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Stretch for 2 minutes',
      description: 'Arms above head, touch your toes',
      time: '2 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Wash your face',
      description: 'Cool water can help reset',
      time: '1 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Make tea or coffee',
      description: 'A small ritual to ground yourself',
      time: '5 min',
      difficulty: 'Easy' as const,
    },
  ],
  Work: [
    {
      title: 'Open your project file',
      description: 'Just open it. Nothing else required.',
      time: '1 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Write one sentence',
      description: 'Anything related to your goal',
      time: '2 min',
      difficulty: 'Easy' as const,
    },
    {
      title: 'Organize your desk',
      description: 'Clear the space, clear the mind',
      time: '5 min',
      difficulty: 'Easy' as const,
    },
    {
      title: 'Reply to one email',
      description: 'Pick the easiest one',
      time: '3 min',
      difficulty: 'Medium' as const,
    },
  ],
  Comfort: [
    {
      title: 'Put on cozy clothes',
      description: 'Comfort matters',
      time: '2 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Listen to a favorite song',
      description: 'One song. Let it play.',
      time: '4 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Watch something funny',
      description: 'Just 5 minutes of something light',
      time: '5 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Text someone you like',
      description: 'Connection helps',
      time: '2 min',
      difficulty: 'Easy' as const,
    },
  ],
  Tomorrow: [
    {
      title: "Set out tomorrow's clothes",
      description: 'One less decision in the morning',
      time: '3 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: "Write tomorrow's first task",
      description: 'Just one thing to start with',
      time: '2 min',
      difficulty: 'Easy' as const,
    },
    {
      title: 'Set an alarm',
      description: 'Give yourself a fresh start',
      time: '1 min',
      difficulty: 'Very Easy' as const,
    },
    {
      title: 'Pack your bag',
      description: 'Get ready for tomorrow now',
      time: '5 min',
      difficulty: 'Easy' as const,
    },
  ],
} as const

// Shame detection patterns
export const SHAME_PATTERNS = [
  "i'm lazy",
  "i'm broken",
  "i'm a failure",
  "i'm worthless",
  "i can't do anything",
  "what's wrong with me",
  "i'm useless",
  "i'm pathetic",
  'i hate myself',
  'i always fail',
  'i never finish',
  "i'm so stupid",
] as const

// Milestone definitions
export const MILESTONES = [
  {
    type: 'first_session',
    label: 'First Session',
    description: 'Completed your first focus session',
  },
  { type: 'sessions_10', label: '10 Sessions', description: 'Double digits of focused sessions' },
  { type: 'streak_7', label: '7-Day Streak', description: 'Focused for 7 days in a row' },
  { type: 'streak_30', label: '30-Day Streak', description: 'An incredible month of consistency' },
  { type: 'hours_10', label: '10 Hours', description: 'Invested 10 hours of focused time' },
  { type: 'hours_50', label: '50 Hours', description: 'Half a hundred hours of focus' },
  { type: 'sessions_25', label: '25 Sessions', description: 'A quarter century of sessions' },
  { type: 'sessions_100', label: '100 Sessions', description: 'One hundred focused sessions' },
  { type: 'promises_10', label: '10 Promises Kept', description: 'Built real self-trust' },
  {
    type: 'best_comeback',
    label: 'Best Comeback',
    description: 'Completed a session after 5+ days away',
  },
] as const
