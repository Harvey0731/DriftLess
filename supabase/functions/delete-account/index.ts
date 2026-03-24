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
    // ---- Auth: extract user from JWT ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Soft-delete profile (30-day recovery window) ----
    // NOTE: We intentionally do NOT call auth.admin.deleteUser() here because
    // auth.users has ON DELETE CASCADE on all tables, which would immediately
    // and irreversibly destroy all user data. Instead we:
    // 1. Soft-delete the profile (set deleted_at)
    // 2. Sign out the user (invalidates current session)
    // A scheduled backend job should hard-delete accounts after 30 days.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── RATE LIMITING ──
    // Limit delete-account to 3 attempts per hour per user to prevent abuse.
    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc('increment_rate_limit', {
        p_user_id: user.id,
        p_max_count: 3,
        p_window_seconds: 3600,
      })

    if (rateLimitError) {
      console.error('Rate limit error:', rateLimitError)
      return new Response(
        JSON.stringify({ error: 'internal_error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (rateLimitResult === false) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const now = new Date().toISOString()

    // Mark profile as deleted (enables 30-day recovery window)
    const { error: softDeleteError } = await serviceClient
      .from('profiles')
      .update({
        display_name: '[deleted]',
        deleted_at: now,
        updated_at: now,
      })
      .eq('id', user.id)

    if (softDeleteError) {
      console.error('Failed to soft-delete profile:', softDeleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete account. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Sign out the user to invalidate the current session
    try {
      await serviceClient.auth.admin.signOut(user.id, 'global')
    } catch (signOutErr) {
      // Non-critical — the soft-delete already succeeded
      console.error('Sign-out after deletion failed:', signOutErr)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account scheduled for deletion. You have 30 days to recover it by signing back in.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Delete account error:', error)
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
