/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject
 * within `ms` milliseconds, the returned promise rejects with a TimeoutError.
 *
 * Usage:
 *   const data = await withTimeout(supabase.from('foo').select(), 10_000)
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** Default timeout for Supabase queries (10 seconds). */
export const DEFAULT_TIMEOUT_MS = 10_000
