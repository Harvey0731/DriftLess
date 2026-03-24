/**
 * Shared mock infrastructure for Deno Edge Function tests.
 *
 * Usage: import { createMockSupabase, createMockRequest } from './_test_helpers/mock.ts'
 *
 * Run all tests: deno test supabase/functions/ --allow-env --allow-net=none
 */

export interface MockChainResult {
  data: unknown
  error: { message: string } | null
}

export interface MockRpcResult {
  data: unknown
  error: { message: string } | null
}

export function createMockSupabaseClient(overrides: {
  from?: Record<string, MockChainResult>
  rpc?: Record<string, MockRpcResult>
  auth?: {
    getUser?: () => Promise<{ data: { user: any }; error: any }>
  }
} = {}) {
  const fromResults = overrides.from ?? {}
  const rpcResults = overrides.rpc ?? {}

  return {
    auth: {
      getUser: overrides.auth?.getUser ?? (async () => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    from: (table: string) => {
      const result = fromResults[table] ?? { data: null, error: null }
      return {
        select: () => ({
          eq: (..._args: any[]) => ({
            eq: (..._args2: any[]) => ({
              maybeSingle: async () => result,
              single: async () => result,
            }),
            maybeSingle: async () => result,
            single: async () => result,
            order: () => ({
              limit: () => ({
                then: (fn: any) => fn(result),
              }),
            }),
          }),
        }),
        insert: (data: any) => ({
          select: () => ({
            single: async () => ({ data: { id: 'new-id', ...data }, error: null }),
          }),
          then: (fn: any) => fn({ error: null }),
        }),
        update: (data: any) => ({
          eq: (..._args: any[]) => ({
            eq: (..._args2: any[]) => ({
              then: (fn: any) => fn({ error: null }),
              select: () => ({
                single: async () => ({ data: { ...data }, error: null }),
              }),
            }),
            then: (fn: any) => fn({ error: null }),
          }),
        }),
        upsert: (data: any, _opts?: any) => ({
          then: (fn: any) => fn({ error: null }),
        }),
      }
    },
    rpc: (name: string, params: any) => {
      const result = rpcResults[name] ?? { data: true, error: null }
      return Promise.resolve(result)
    },
  }
}

export function createMockRequest(options: {
  method?: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
}): Request {
  const method = options.method ?? 'POST'
  const headers = new Headers(options.headers ?? {})
  const body = options.body ? JSON.stringify(options.body) : undefined

  return new Request('http://localhost/test', {
    method,
    headers,
    body,
  })
}

/**
 * Create a valid HMAC-SHA256 signature for testing webhook verification.
 */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
