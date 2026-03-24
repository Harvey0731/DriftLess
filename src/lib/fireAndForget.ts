import { captureError } from './sentry'

/**
 * Execute a promise in the background without awaiting it.
 * Any rejection is automatically reported to Sentry with the given context.
 *
 * Usage:
 *   fireAndForget(supabase.from('foo').update(...).eq('id', id), 'SessionStore.updatePauses')
 */
export function fireAndForget(promise: PromiseLike<unknown>, context: string): void {
  Promise.resolve(promise).catch((err) => {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      context: `fireAndForget.${context}`,
    })
  })
}
