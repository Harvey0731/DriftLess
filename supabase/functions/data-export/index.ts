import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Maximum rows per table to prevent unbounded memory usage
const MAX_ROWS_PER_TABLE = 10_000

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://driftless.app'
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
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
        JSON.stringify({ error: 'Missing authorization header' }),
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

    const userId = user.id

    // ---- Service role client to bypass RLS ----
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ---- Rate limiting: max 3 exports per hour per user ----
    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc('increment_rate_limit', {
        p_user_id: userId,
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

    if (rateLimitResult === -1 || rateLimitResult === false) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Too many export requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Query all user tables (with row limits to prevent OOM) ----
    const [
      profileRes,
      goalsRes,
      checkInsRes,
      tasksRes,
      sessionsRes,
      chatRes,
      promisesRes,
      milestonesRes,
      badDayRes,
    ] = await Promise.all([
      serviceClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      serviceClient
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS_PER_TABLE),
      serviceClient
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('check_in_date', { ascending: false })
        .limit(MAX_ROWS_PER_TABLE),
      serviceClient
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS_PER_TABLE),
      serviceClient
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS_PER_TABLE),
      serviceClient
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS_PER_TABLE),
      serviceClient
        .from('promises')
        .select('*')
        .eq('user_id', userId)
        .order('promise_date', { ascending: false })
        .limit(MAX_ROWS_PER_TABLE),
      serviceClient
        .from('milestones')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false })
        .limit(MAX_ROWS_PER_TABLE),
      serviceClient
        .from('bad_day_actions')
        .select('*')
        .eq('user_id', userId)
        .limit(MAX_ROWS_PER_TABLE),
    ])

    // ---- Build structured JSON export ----
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: user.email,
        format_version: '1.0',
        max_rows_per_table: MAX_ROWS_PER_TABLE,
        description:
          'Complete data export for your Driftless account per GDPR Article 20 (Right to Data Portability).',
      },
      profile: profileRes.data ?? null,
      goals: goalsRes.data ?? [],
      daily_check_ins: checkInsRes.data ?? [],
      tasks: tasksRes.data ?? [],
      focus_sessions: sessionsRes.data ?? [],
      chat_messages: chatRes.data ?? [],
      promises: promisesRes.data ?? [],
      milestones: milestonesRes.data ?? [],
      bad_day_actions: badDayRes.data ?? [],
      summary: {
        total_goals: (goalsRes.data ?? []).length,
        total_check_ins: (checkInsRes.data ?? []).length,
        total_tasks: (tasksRes.data ?? []).length,
        total_focus_sessions: (sessionsRes.data ?? []).length,
        total_chat_messages: (chatRes.data ?? []).length,
        total_promises: (promisesRes.data ?? []).length,
        total_milestones: (milestonesRes.data ?? []).length,
        total_bad_day_actions: (badDayRes.data ?? []).length,
      },
    }

    // ---- Return as JSON (in production this would email a ZIP) ----
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="driftless-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
