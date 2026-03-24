/**
 * Sentry stubs — no-op replacements so all call-sites compile
 * without the native @sentry/react-native package.
 */

export function initSentry() {
  // no-op
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error.message, context)
}

export function setSentryUser(_userId: string | null) {
  // no-op
}

export function addBreadcrumb(
  _category: string,
  _message: string,
  _level: string = 'info',
) {
  // no-op
}

export function setSentryEnabled(_enabled: boolean) {
  // no-op
}

export const Sentry = null
