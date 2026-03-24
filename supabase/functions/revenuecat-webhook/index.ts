import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// HMAC-SHA256 signature verification
// ---------------------------------------------------------------------------

async function verifySignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )

    const sig = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payload),
    )

    const computedHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Constant-time comparison
    if (computedHex.length !== signatureHeader.length) return false
    let mismatch = 0
    for (let i = 0; i < computedHex.length; i++) {
      mismatch |= computedHex.charCodeAt(i) ^ signatureHeader.charCodeAt(i)
    }
    return mismatch === 0
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://driftless.app'
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-revenuecat-webhook-signature',
  }

  // Server-to-server webhook responses only need Content-Type, not CORS headers
  const webhookHeaders = {
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---- Service role client for all DB operations ----
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // C1: Fail-closed — if the webhook secret is missing, reject immediately.
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? ''
    if (!webhookSecret) {
      console.error('REVENUECAT_WEBHOOK_SECRET is not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: webhookHeaders },
      )
    }

    // ---- Parse and verify ----
    const rawBody = await req.text()
    const signature = req.headers.get('X-RevenueCat-Webhook-Signature')

    const valid = await verifySignature(rawBody, signature, webhookSecret)
    if (!valid) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: webhookHeaders },
      )
    }

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Invalid JSON payload:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: webhookHeaders }
      )
    }
    const event = payload.event

    // ---- Validate event structure ----
    if (!event || typeof event !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid event data' }),
        { status: 400, headers: webhookHeaders },
      )
    }

    const eventType: string = event.type
    const eventId: string = event.id ?? `${eventType}_${Date.now()}`
    const appUserId: string = event.app_user_id
    const productId: string | undefined = event.product_id
    const periodType: string | undefined = event.period_type
    const expirationAt: string | undefined = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : undefined

    if (!appUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing app_user_id' }),
        { status: 400, headers: webhookHeaders },
      )
    }

    // Validate that appUserId is a valid UUID before using as user_id
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(appUserId)) {
      console.error('Invalid appUserId (not a UUID):', appUserId)
      return new Response(
        JSON.stringify({ error: 'Invalid app_user_id format — expected UUID' }),
        { status: 400, headers: webhookHeaders }
      )
    }

    console.log(
      `[RevenueCat Webhook] type=${eventType} event_id=${eventId} user=${appUserId}`,
    )

    // SEC-06: Idempotency via last_webhook_event_id stored on the subscription row.
    // This is more robust than a time-window check — it prevents replay of the exact
    // same event regardless of timing.
    const { data: existingEvent } = await supabase
      .from('subscriptions')
      .select('id, updated_at, last_webhook_event_id')
      .eq('user_id', appUserId)
      .maybeSingle()

    if (existingEvent?.last_webhook_event_id === eventId) {
      console.log(`[RevenueCat Webhook] Duplicate event ${eventId} for user ${appUserId}, skipping`)
      return new Response(
        JSON.stringify({ received: true, deduplicated: true }),
        { status: 200, headers: webhookHeaders },
      )
    }

    // ---- Map event type to subscription update ----
    const baseData: Record<string, unknown> = {
      revenuecat_user_id: appUserId,
      product_id: productId ?? null,
      period: periodType ?? null,
      updated_at: new Date().toISOString(),
      last_webhook_event_id: eventId,
    }

    let updateData: Record<string, unknown>

    switch (eventType) {
      case 'INITIAL_PURCHASE':
        updateData = {
          ...baseData,
          entitlement: 'pro',
          status: 'active',
          current_period_ends: expirationAt ?? null,
        }
        break

      case 'RENEWAL':
        updateData = {
          ...baseData,
          entitlement: 'pro',
          status: 'active',
          current_period_ends: expirationAt ?? null,
        }
        break

      case 'CANCELLATION':
        updateData = {
          ...baseData,
          status: 'cancelled',
        }
        break

      case 'EXPIRATION':
        updateData = {
          ...baseData,
          entitlement: 'free',
          status: 'expired',
        }
        break

      case 'BILLING_ISSUE':
        // C8: 'billing_issue' is not in the TS union type defined in database.ts.
        // This is intentional for the Deno webhook runtime. The TypeScript fix
        // (adding 'billing_issue' to the SubscriptionStatus union) belongs in
        // src/types/database.ts and is handled separately.
        updateData = {
          ...baseData,
          status: 'billing_issue',
        }
        break

      case 'SUBSCRIBER_ALIAS':
        // Alias events don't change subscription state — acknowledge and skip.
        console.log(`[RevenueCat Webhook] Alias event for user ${appUserId}, no action needed`)
        return new Response(
          JSON.stringify({ received: true }),
          { status: 200, headers: webhookHeaders },
        )

      case 'TRANSFER':
        // Transfer events move a subscription between users. Log but don't act —
        // RevenueCat will send new INITIAL_PURCHASE / EXPIRATION events for
        // the gaining / losing user respectively.
        console.log(`[RevenueCat Webhook] Transfer event for user ${appUserId}, awaiting follow-up events`)
        return new Response(
          JSON.stringify({ received: true }),
          { status: 200, headers: webhookHeaders },
        )

      case 'PRODUCT_CHANGE':
        // User changed their subscription plan (upgrade/downgrade). Keep pro
        // entitlement active — the new product will take effect at next renewal.
        updateData = {
          ...baseData,
          entitlement: 'pro',
          status: 'active',
          product_id: productId ?? null,
        }
        break

      case 'REFUND':
        // Apple/Google processed a refund — revoke pro access immediately.
        updateData = {
          ...baseData,
          entitlement: 'free',
          status: 'revoked',
        }
        break

      default:
        console.log(`[RevenueCat Webhook] Unhandled event type: ${eventType}`)
        return new Response(
          JSON.stringify({ received: true }),
          { status: 200, headers: webhookHeaders },
        )
    }

    // ---- Update subscriptions table using service role ----
    if (existingEvent) {
      // Update existing subscription row
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', existingEvent.id)

      if (updateError) {
        console.error('Subscription update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update subscription' }),
          { status: 500, headers: webhookHeaders },
        )
      }
    } else {
      // Try to find by user_id (appUserId might be a Supabase auth UUID)
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: appUserId,
            ...updateData,
          },
          { onConflict: 'user_id' },
        )

      if (upsertError) {
        console.error('Subscription upsert error:', upsertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create/update subscription' }),
          { status: 500, headers: webhookHeaders },
        )
      }
    }

    console.log(
      `[RevenueCat Webhook] Processed ${eventType} for user ${appUserId}`,
    )

    // ---- Return 200 immediately ----
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: webhookHeaders },
    )
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: webhookHeaders },
    )
  }
})
