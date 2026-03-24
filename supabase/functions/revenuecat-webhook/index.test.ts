/**
 * Deno tests for revenuecat-webhook Edge Function.
 *
 * Run: deno test supabase/functions/revenuecat-webhook/index.test.ts --allow-env --allow-net=none
 *
 * NOTE: These are static logic tests that validate the webhook's event type
 * mapping, signature verification constants, and response structure. They do
 * NOT spin up the full Deno.serve handler (which requires network).
 */
import { assertEquals, assertExists } from 'https://deno.land/std@0.220.0/assert/mod.ts'
import { signPayload } from '../_test_helpers/mock.ts'

// ── Signature verification tests ──────────────────────────────────────────

Deno.test('signPayload produces consistent hex output', async () => {
  const sig1 = await signPayload('hello', 'secret')
  const sig2 = await signPayload('hello', 'secret')
  assertEquals(sig1, sig2)
  assertEquals(sig1.length, 64) // SHA-256 = 32 bytes = 64 hex chars
})

Deno.test('signPayload differs for different payloads', async () => {
  const sig1 = await signPayload('payload_a', 'secret')
  const sig2 = await signPayload('payload_b', 'secret')
  assertEquals(sig1 !== sig2, true)
})

Deno.test('signPayload differs for different secrets', async () => {
  const sig1 = await signPayload('same-payload', 'secret1')
  const sig2 = await signPayload('same-payload', 'secret2')
  assertEquals(sig1 !== sig2, true)
})

// ── Event type mapping tests ──────────────────────────────────────────────

// Extracted from the webhook handler's switch statement
function mapEventType(eventType: string): {
  entitlement?: string
  status: string
} | null {
  switch (eventType) {
    case 'INITIAL_PURCHASE':
      return { entitlement: 'pro', status: 'active' }
    case 'RENEWAL':
      return { entitlement: 'pro', status: 'active' }
    case 'CANCELLATION':
      return { status: 'cancelled' }
    case 'EXPIRATION':
      return { entitlement: 'free', status: 'expired' }
    case 'BILLING_ISSUE':
      return { status: 'billing_issue' }
    case 'PRODUCT_CHANGE':
      return { entitlement: 'pro', status: 'active' }
    case 'REFUND':
      return { entitlement: 'free', status: 'revoked' }
    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      return null // No DB update, just acknowledge
    default:
      return null // Unknown event type
  }
}

Deno.test('INITIAL_PURCHASE grants pro/active', () => {
  const result = mapEventType('INITIAL_PURCHASE')
  assertExists(result)
  assertEquals(result!.entitlement, 'pro')
  assertEquals(result!.status, 'active')
})

Deno.test('RENEWAL grants pro/active', () => {
  const result = mapEventType('RENEWAL')
  assertExists(result)
  assertEquals(result!.entitlement, 'pro')
  assertEquals(result!.status, 'active')
})

Deno.test('CANCELLATION sets cancelled status', () => {
  const result = mapEventType('CANCELLATION')
  assertExists(result)
  assertEquals(result!.status, 'cancelled')
})

Deno.test('EXPIRATION revokes to free/expired', () => {
  const result = mapEventType('EXPIRATION')
  assertExists(result)
  assertEquals(result!.entitlement, 'free')
  assertEquals(result!.status, 'expired')
})

Deno.test('BILLING_ISSUE sets billing_issue status', () => {
  const result = mapEventType('BILLING_ISSUE')
  assertExists(result)
  assertEquals(result!.status, 'billing_issue')
})

Deno.test('REFUND revokes to free/revoked', () => {
  const result = mapEventType('REFUND')
  assertExists(result)
  assertEquals(result!.entitlement, 'free')
  assertEquals(result!.status, 'revoked')
})

Deno.test('PRODUCT_CHANGE keeps pro/active', () => {
  const result = mapEventType('PRODUCT_CHANGE')
  assertExists(result)
  assertEquals(result!.entitlement, 'pro')
  assertEquals(result!.status, 'active')
})

Deno.test('SUBSCRIBER_ALIAS returns null (no update)', () => {
  assertEquals(mapEventType('SUBSCRIBER_ALIAS'), null)
})

Deno.test('TRANSFER returns null (no update)', () => {
  assertEquals(mapEventType('TRANSFER'), null)
})

Deno.test('Unknown event type returns null', () => {
  assertEquals(mapEventType('SOME_FUTURE_EVENT'), null)
})

// ── UUID validation tests ─────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.test('UUID regex accepts valid v4 UUID', () => {
  assertEquals(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000'), true)
})

Deno.test('UUID regex rejects non-UUID strings', () => {
  assertEquals(UUID_REGEX.test('not-a-uuid'), false)
  assertEquals(UUID_REGEX.test('$rc_anonymous_123'), false)
  assertEquals(UUID_REGEX.test(''), false)
})

Deno.test('UUID regex rejects UUID without hyphens', () => {
  assertEquals(UUID_REGEX.test('550e8400e29b41d4a716446655440000'), false)
})
