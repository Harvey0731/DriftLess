/**
 * Tests for the route protection logic extracted from app/_layout.tsx.
 * We test the pure decision logic (useProtectedRoute behavior) without
 * rendering React components, since @testing-library/react-native is not set up.
 */

// Route protection decision logic (mirrors useProtectedRoute in _layout.tsx)
function routeDecision(
  session: { user: { id: string } } | null,
  isLoading: boolean,
  segments: string[],
): 'stay' | 'redirect-to-signin' | 'redirect-to-tabs' {
  if (isLoading) return 'stay'

  const inAuthGroup = segments[0] === '(auth)'

  if (!session && !inAuthGroup) {
    return 'redirect-to-signin'
  } else if (session && inAuthGroup) {
    return 'redirect-to-tabs'
  }
  return 'stay'
}

// Inactivity auto-logout logic (mirrors _layout.tsx)
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function shouldForceLogout(lastActivityMs: number | null, nowMs: number): boolean {
  if (lastActivityMs === null) return false
  return nowMs - lastActivityMs > THIRTY_DAYS_MS
}

describe('routeProtection decision logic', () => {
  it('does nothing while loading', () => {
    expect(routeDecision(null, true, ['(tabs)'])).toBe('stay')
    expect(routeDecision({ user: { id: 'u1' } }, true, ['(auth)'])).toBe('stay')
  })

  it('redirects unauthenticated user from tabs to sign-in', () => {
    expect(routeDecision(null, false, ['(tabs)'])).toBe('redirect-to-signin')
  })

  it('redirects unauthenticated user from protected screens to sign-in', () => {
    expect(routeDecision(null, false, ['timer'])).toBe('redirect-to-signin')
    expect(routeDecision(null, false, ['check-in'])).toBe('redirect-to-signin')
    expect(routeDecision(null, false, ['session-rating'])).toBe('redirect-to-signin')
    expect(routeDecision(null, false, ['paywall'])).toBe('redirect-to-signin')
  })

  it('lets unauthenticated user stay in auth group', () => {
    expect(routeDecision(null, false, ['(auth)'])).toBe('stay')
  })

  it('redirects authenticated user from auth to tabs', () => {
    const session = { user: { id: 'u1' } }
    expect(routeDecision(session, false, ['(auth)'])).toBe('redirect-to-tabs')
  })

  it('lets authenticated user stay in tabs', () => {
    const session = { user: { id: 'u1' } }
    expect(routeDecision(session, false, ['(tabs)'])).toBe('stay')
  })

  it('lets authenticated user stay on protected screens', () => {
    const session = { user: { id: 'u1' } }
    expect(routeDecision(session, false, ['timer'])).toBe('stay')
    expect(routeDecision(session, false, ['check-in'])).toBe('stay')
    expect(routeDecision(session, false, ['session-rating'])).toBe('stay')
  })
})

describe('inactivity auto-logout', () => {
  it('does not force logout when no last activity stored', () => {
    expect(shouldForceLogout(null, Date.now())).toBe(false)
  })

  it('does not force logout within 30 days', () => {
    const now = Date.now()
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000
    expect(shouldForceLogout(tenDaysAgo, now)).toBe(false)
  })

  it('does not force logout at exactly 30 days', () => {
    const now = Date.now()
    const exactly30 = now - THIRTY_DAYS_MS
    expect(shouldForceLogout(exactly30, now)).toBe(false)
  })

  it('forces logout after 30 days', () => {
    const now = Date.now()
    const thirtyOneDaysAgo = now - (THIRTY_DAYS_MS + 1)
    expect(shouldForceLogout(thirtyOneDaysAgo, now)).toBe(true)
  })

  it('forces logout after 60 days', () => {
    const now = Date.now()
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000
    expect(shouldForceLogout(sixtyDaysAgo, now)).toBe(true)
  })
})
