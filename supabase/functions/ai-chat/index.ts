import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const RATE_LIMIT_MAX = 100 // messages per hour

/** Sanitize user input for safe inclusion in AI prompts */
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML-like tags
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
    .replace(/[^\x20-\x7E\s\u00A0-\u024F]/g, '') // Keep only printable chars + common Unicode
    .replace(/\b(system|assistant|INST|<<SYS>>|<\|im_start\||<\|im_end\|)\b/gi, '') // Strip common prompt injection markers
    .trim()
}

// ---------------------------------------------------------------------------
// Shame language detection
// ---------------------------------------------------------------------------

const SHAME_PATTERNS = [
  "i'm lazy",
  "i'm so lazy",
  "i'm broken",
  "i'm a failure",
  "i'm worthless",
  "i can't do anything",
  "i can't do anything right",
  "what's wrong with me",
  "whats wrong with me",
  "i'm useless",
  "i'm pathetic",
  "i always fail",
  "i never finish anything",
  "i'm not good enough",
  "i'm such a mess",
  "i'm hopeless",
  "i suck",
  "i hate myself",
  "everyone else can",
  "why can't i",
]

function detectShameLanguage(message: string): boolean {
  const lower = message.toLowerCase()
  return SHAME_PATTERNS.some((pattern) => lower.includes(pattern))
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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

    // ---- Service role client for DB operations ----
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ---- Parse body ----
    const body = (await req.json()) as { message: string; timezone?: string }
    const { message } = body

    // M-03: Validate timezone length to prevent oversized payloads (max IANA tz is ~32 chars)
    const rawTimezone = typeof body.timezone === 'string' ? body.timezone.slice(0, 64) : ''
    const timezone = rawTimezone || 'UTC'
    // Calculate user's local date
    function getUserLocalDate(tz: string): string {
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
        return formatter.format(new Date()) // Returns YYYY-MM-DD
      } catch {
        return new Date().toISOString().split('T')[0] // Fallback to UTC
      }
    }
    const today = getUserLocalDate(timezone)

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // M7: Validate message length
    if (message.length > 4000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 4000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── ATOMIC RATE LIMITING ──
    // Uses PostgreSQL function for true atomic check-and-increment.
    // No TOCTOU race condition — everything happens in a single transaction.
    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc('increment_rate_limit', {
        p_user_id: userId,
        p_max_count: RATE_LIMIT_MAX,
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
        JSON.stringify({
          error: 'rate_limited',
          content:
            "You've been chatting a lot this hour -- that's great energy! Take a breather and come back in a bit. Your messages will reset soon. You're doing fine.",
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Detect shame language ----
    const shameDetected = detectShameLanguage(message)

    // ---- Fetch context ----
    const [profileRes, goalRes, checkInRes, sessionsRes, promiseRes] =
      await Promise.all([
        serviceClient
          .from('profiles')
          .select('display_name, current_streak, celebration_style, trust_score, procrastination_type')
          .eq('id', userId)
          .single(),
        serviceClient
          .from('goals')
          .select('id, title, description')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
        serviceClient
          .from('daily_check_ins')
          .select('energy_level, mood_note, today_goal_text, completed')
          .eq('user_id', userId)
          .eq('check_in_date', today)
          .maybeSingle(),
        serviceClient
          .from('focus_sessions')
          .select('planned_mins, actual_secs, rating, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),
        serviceClient
          .from('promises')
          .select('text, kept')
          .eq('user_id', userId)
          .eq('promise_date', today)
          .maybeSingle(),
      ])

    const profile = profileRes.data
    const activeGoal = goalRes.data
    const todayCheckIn = checkInRes.data
    const recentSessions = sessionsRes.data ?? []
    const todayPromise = promiseRes.data

    // H2: Sanitize user-controlled data injected into system prompt.
    // These values come from user input and must be truncated.
    const safeGoalTitle = activeGoal?.title ? sanitizeForPrompt(activeGoal.title.slice(0, 200)) : null
    const safePromiseText = todayPromise?.text ? sanitizeForPrompt(todayPromise.text.slice(0, 200)) : null

    // ---- Build system prompt ----
    const shameInstruction = shameDetected
      ? `\n\nIMPORTANT: The user just expressed self-criticism or shame. Respond with extra gentleness. Do NOT agree with their negative self-assessment. Gently reframe their perspective without dismissing their feelings. Remind them that struggling with focus doesn't define them as a person.`
      : ''

    const systemPrompt = `You are Drift, Driftless's AI coach — a warm and supportive accountability companion. You help people who struggle with focus, procrastination, or motivation -- especially those with ADHD, anxiety, or depression.

PERSONA:
- Speak like a kind, understanding friend, not a coach or therapist
- Be genuinely curious about how the user is feeling
- Celebrate small wins warmly (style: "${profile?.celebration_style ?? 'moderate'}")
- Never compare the user to others or to their past performance

FORBIDDEN PATTERNS (never use these under any circumstances):
- "you should"
- "you haven't"
- "you need to"
- "just" (when minimising difficulty, e.g. "just do it", "just focus")
- Comparative language ("most people", "normally", "you used to", "others can")
- "why didn't you"
- Unsolicited references to streaks or missed days
- Any phrasing that implies laziness, failure, or inadequacy

REQUIRED PATTERNS:
- Acknowledge the user's current state and energy
- Use present-moment framing ("What feels doable right now?", "Right now...")
- Suggest one small step rather than an overwhelming plan
- Never assume why sessions were missed${shameInstruction}

CONTEXT:
- User: ${profile?.display_name ?? 'friend'}
- Active goal: ${safeGoalTitle ? `"${safeGoalTitle}"` : 'None set'}
- Today's check-in: ${todayCheckIn ? `energy ${todayCheckIn.energy_level}/5, ${todayCheckIn.completed ? 'completed' : 'in progress'}` : 'Not checked in yet'}
- Today's promise: ${safePromiseText ? `"${safePromiseText}" (${todayPromise?.kept ? 'kept' : 'pending'})` : 'None'}
- Recent sessions: ${JSON.stringify(recentSessions.map((s: any) => ({ rating: s.rating, actual_secs: s.actual_secs, planned_mins: s.planned_mins, status: s.status, note: s.note ? sanitizeForPrompt(String(s.note)).slice(0, 200) : null })))}
- Trust score: ${profile?.trust_score ?? 50}/100
- Procrastination type: ${profile?.procrastination_type ?? 'unknown'}${profile?.procrastination_type === 'too_big' ? '\n  → Prioritise extreme specificity. Help break things into the smallest possible next action.' : ''}${profile?.procrastination_type === 'fear_of_failure' ? '\n  → Emphasise that done > perfect. Normalise imperfect output. Ask "what would good enough look like?"' : ''}${profile?.procrastination_type === 'unclear_start' ? '\n  → Help identify a concrete first step. Ask "what\'s the very first physical action?"' : ''}${profile?.procrastination_type === 'low_motivation' ? '\n  → Connect the task to something they care about. Use "just 5 minutes" framing.' : ''}

Keep responses concise: 2-5 sentences. Be helpful, not verbose.`

    // ---- H11: Call OpenAI with AbortController timeout ----
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    let openaiRes: Response
    try {
      const openaiKey = Deno.env.get('OPENAI_API_KEY') || req.headers.get('x-openai-key') || ''
      openaiRes = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 2000,
          temperature: 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: sanitizeForPrompt(message) },
          ],
        }),
        signal: controller.signal,
      })
    } catch (fetchErr) {
      if ((fetchErr as Error).name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'AI request timed out' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      throw fetchErr
    } finally {
      clearTimeout(timeout)
    }

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI error:', errText)
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const openaiData = await openaiRes.json()
    const assistantContent: string =
      openaiData.choices?.[0]?.message?.content ?? ''
    const tokensUsed: number = openaiData.usage?.total_tokens ?? 0

    // ---- Save both user and assistant messages to chat_messages ----
    const { error: insertError } = await serviceClient.from('chat_messages').insert([
      {
        user_id: userId,
        role: 'user',
        content: message,
        tokens_used: 0,
      },
      {
        user_id: userId,
        role: 'assistant',
        content: assistantContent,
        context: {
          shame_detected: shameDetected,
          goal_id: activeGoal?.id ?? null,
        },
        tokens_used: tokensUsed,
      },
    ])
    if (insertError) {
      console.error('Failed to save chat messages:', insertError)
    }

    // ---- Return response ----
    return new Response(
      JSON.stringify({
        content: assistantContent,
        shame_detected: shameDetected,
        tokens_used: tokensUsed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
