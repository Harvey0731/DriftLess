import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://driftless.app'
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to check and create subscription
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── RATE LIMITING ──
    // Limit trial activation to 5 attempts per hour per user to prevent abuse.
    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc('increment_rate_limit', {
        p_user_id: user.id,
        p_max_count: 5,
        p_window_seconds: 3600,
      })

    if (rateLimitError) {
      console.error('Rate limit error:', rateLimitError)
      return new Response(
        JSON.stringify({ error: 'internal_error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (rateLimitResult === false) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SEC-07: Atomic trial activation — use a single UPDATE with CAS guard
    // to prevent TOCTOU race conditions (double-tap creating multiple trials).
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 7) // 7-day trial
    const now = new Date().toISOString()

    // Attempt to update ONLY if the current status is NOT active/trialing.
    // This is atomic — no race window between check and update.
    const { data: updated, error: updateError } = await serviceClient
      .from('subscriptions')
      .update({
        status: 'trialing',
        plan: 'trial',
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: now,
        current_period_ends: trialEnd.toISOString(),
        updated_at: now,
      })
      .eq('user_id', user.id)
      .not('status', 'in', '("active","trialing")')
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('Trial activation error:', updateError)
      return new Response(
        JSON.stringify({ error: 'internal_error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no rows updated, user already has an active/trialing subscription
    // OR the subscription row doesn't exist yet.
    let subscription = updated
    if (!updated) {
      // Check if subscription row exists with active/trialing status
      const { data: existing } = await serviceClient
        .from('subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'already_subscribed', message: 'You already have an active subscription.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Row doesn't exist — insert fresh (signup trigger may not have fired yet)
      const { data: inserted, error: insertError } = await serviceClient
        .from('subscriptions')
        .insert({
          user_id: user.id,
          status: 'trialing',
          plan: 'trial',
          trial_ends_at: trialEnd.toISOString(),
          current_period_start: now,
          current_period_ends: trialEnd.toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('Trial insert error:', insertError)
        return new Response(
          JSON.stringify({ error: 'internal_error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      subscription = inserted
    }

    return new Response(
      JSON.stringify({ success: true, subscription }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Activate trial error:', error)
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
