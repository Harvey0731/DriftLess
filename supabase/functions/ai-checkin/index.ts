import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

/** Sanitize user input for safe inclusion in AI prompts */
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML-like tags
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
    .replace(/[^\x20-\x7E\s\u00A0-\u024F]/g, '') // Keep only printable chars + common Unicode
    .trim()
}

// ---------------------------------------------------------------------------
// Shame-free system prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  profile: Record<string, unknown>,
  goal: Record<string, unknown> | null,
  recentSessions: Record<string, unknown>[],
  energyLevel: number,
  hardReason?: string,
): string {
  const hour = new Date().getHours()
  const timeOfDay =
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const sessionSummaries = recentSessions
    .map((s) => {
      const mins = s.actual_secs
        ? Math.round((s.actual_secs as number) / 60)
        : s.planned_mins
      const rating = s.rating ? ` (rated ${s.rating}/4)` : ''
      const noteSnippet = s.note ? `: ${sanitizeForPrompt(String(s.note)).slice(0, 200)}` : ''
      return `- ${mins ?? '?'} min session${rating}${noteSnippet}`
    })
    .join('\n')

  return `You are Drift, Driftless's AI coach — a warm and supportive ADHD-aware focus companion.

PERSONA: You are a kind friend who genuinely understands that focus is hard. You celebrate effort, not perfection.

FORBIDDEN PATTERNS (never use these under any circumstances):
- "you should"
- "you haven't"
- "you need to"
- "just" (when minimising difficulty, e.g. "just do it", "just focus")
- Comparative language ("others can", "most people", "normally", "you used to")
- "why didn't you"
- Unsolicited streak references (only mention streak if the user brings it up first)
- Any phrasing that implies laziness, failure, or inadequacy

REQUIRED in every response:
1. Acknowledge the user's current energy level (${energyLevel}/5) genuinely.
2. Use present-moment framing ("Right now...", "Today...", "This moment...").
3. Offer ONE small, concrete next-step suggestion that matches their energy.

CONTEXT:
- User name: ${(profile.display_name as string) ? sanitizeForPrompt(profile.display_name as string) : 'friend'}
- Celebration style: ${(profile.celebration_style as string) || 'moderate'}
- Current streak: ${profile.current_streak ?? 0} days
- Energy level: ${energyLevel}/5
- Time of day: ${timeOfDay}
${goal ? `- Active goal: "${sanitizeForPrompt(goal.title as string)}"${goal.description ? ` — ${sanitizeForPrompt(goal.description as string)}` : ''}` : '- No active goal set'}
${sessionSummaries ? `- Recent sessions:\n${sessionSummaries}` : '- No recent sessions'}
${hardReason ? `- What's making it hard today: "${sanitizeForPrompt(hardReason)}"` : ''}
- Procrastination type: ${(profile.procrastination_type as string) ?? 'unknown'}${(profile.procrastination_type as string) === 'too_big' ? '\n  → Prioritise extreme specificity. Break tasks into the smallest possible steps.' : ''}${(profile.procrastination_type as string) === 'fear_of_failure' ? '\n  → Emphasise done > perfect. Suggest "good enough" versions of tasks.' : ''}${(profile.procrastination_type as string) === 'unclear_start' ? '\n  → Make first tasks have ultra-clear starting actions.' : ''}${(profile.procrastination_type as string) === 'low_motivation' ? '\n  → Keep first task under 5 minutes. Use "just start" framing.' : ''}

VAGUE GOAL DETECTION:
If the user's goal is too vague (e.g., single word, under 10 characters, no specific action like "study" or "work"), respond with ONLY a JSON object: {"clarification": "your clarifying question here"} instead of generating tasks. Ask ONE specific question to help narrow down what they want to accomplish.

TASK BREAKDOWN INSTRUCTIONS:
Return your response as a JSON block fenced with \`\`\`json ... \`\`\` containing:
{
  "message": "<your conversational check-in message>",
  "tasks": [
    { "title": "<task title>", "estimated_mins": <number>, "difficulty": "<easy|medium|hard>" }
  ],
  "rationale": "<brief explanation of why the tasks are ordered this way>"
}

Rules for tasks:
- Return 2-5 tasks.
- Scale difficulty and count to the energy level: energy 1-2 = 2-3 easy/short tasks; energy 4-5 = up to 5 tasks, can include medium/hard.
- Each task should be concrete and achievable in one sitting.
- If no goal is set, suggest general-purpose focus tasks (e.g. "Pick one thing to work on for 10 min").
- estimated_mins should be between 5 and 45.
- Always make the first task the easiest to build momentum.
- The "rationale" field should explain why tasks are ordered this way (e.g. momentum building, dependency order, energy matching).

Respond ONLY with the JSON block described above. Do not include anything outside it.`
}

// ---------------------------------------------------------------------------
// Parse the AI response
// ---------------------------------------------------------------------------

interface TaskItem {
  title: string
  estimated_mins: number
  difficulty: string
}

interface AiResponse {
  message: string
  tasks: TaskItem[]
  rationale: string
  clarification?: string
}

function parseAiResponse(raw: string): AiResponse {
  // Try to extract JSON from fenced block first
  const fenced = raw.match(/```json\s*([\s\S]*?)```/)
  const jsonStr = fenced ? fenced[1].trim() : raw.trim()

  try {
    const parsed = JSON.parse(jsonStr) as AiResponse

    // Handle clarification response (vague goal)
    if (parsed.clarification) {
      return {
        message: '',
        tasks: [],
        rationale: '',
        clarification: parsed.clarification,
      }
    }

    return {
      message: parsed.message || '',
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      rationale: parsed.rationale || '',
    }
  } catch {
    // Fallback: treat entire response as the message with no tasks
    return { message: raw.trim(), tasks: [], rationale: '' }
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
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // CORS preflight
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

    // ---- Rate limiting: max 10 check-ins per hour per user ----
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc('increment_rate_limit', {
        p_user_id: user.id,
        p_max_count: 10,
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
        JSON.stringify({ error: 'rate_limited', message: 'Too many check-in requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Parse body ----
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const energyLevel = typeof body.energyLevel === 'number' ? body.energyLevel : undefined
    // H-VAL: Cap message length to prevent prompt injection via oversized payloads
    const rawMessage = typeof body.message === 'string' ? body.message : undefined
    const message = rawMessage && rawMessage.trim().length > 0 ? rawMessage.slice(0, 2000) : undefined
    // hardReason: why the user is finding it hard today (from check-in UI)
    const rawHardReason = typeof body.hardReason === 'string' ? body.hardReason : undefined
    const hardReason = rawHardReason && rawHardReason.trim().length > 0 ? rawHardReason.slice(0, 500) : undefined

    const timezone = (typeof body.timezone === 'string' ? body.timezone : 'UTC').slice(0, 100)
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

    if (!energyLevel || energyLevel < 1 || energyLevel > 5) {
      return new Response(
        JSON.stringify({ error: 'energyLevel must be 1-5' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Fetch context (reuse service client from rate-limit check) ----
    const [profileRes, goalRes, sessionsRes] = await Promise.all([
      serviceClient.from('profiles').select('*').eq('id', user.id).single(),
      serviceClient
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      serviceClient
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7),
    ])

    const profile = profileRes.data ?? {}
    const goal = goalRes.data
    const recentSessions = sessionsRes.data ?? []

    // ---- Build prompt & call OpenAI ----
    const systemPrompt = buildSystemPrompt(
      profile,
      goal,
      recentSessions,
      energyLevel,
      hardReason,
    )

    const userMessage =
      message || `Energy level: ${energyLevel}/5. Help me plan my focus session.`

    // H11: AbortController with 15s timeout for OpenAI fetch
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
            { role: 'user', content: userMessage },
          ],
        }),
        signal: controller.signal,
      })
    } catch (fetchErr) {
      clearTimeout(timeout)
      if ((fetchErr as Error).name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'AI request timed out' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      throw fetchErr
    }
    clearTimeout(timeout)

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text()
      console.error('OpenAI error:', openaiRes.status, errBody)
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const openaiData = await openaiRes.json()
    const rawContent: string =
      openaiData.choices?.[0]?.message?.content ?? ''
    const tokensUsed: number = openaiData.usage?.total_tokens ?? 0

    // ---- Parse AI response ----
    const parsed = parseAiResponse(rawContent)

    // ---- Handle vague goal clarification ----
    if (parsed.clarification) {
      return new Response(
        JSON.stringify({
          clarification: parsed.clarification,
          tokens_used: tokensUsed,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // ---- Write daily_check_ins row to DB ----
    const { data: checkIn, error: checkInError } = await serviceClient
      .from('daily_check_ins')
      .upsert(
        {
          user_id: user.id,
          goal_id: goal?.id ?? null,
          check_in_date: today, // Uses user's local timezone
          energy_level: energyLevel,
          mood_note: message ?? null,
          hard_reason: hardReason ?? null,
          today_goal_text: goal?.title ?? null,
          // H10: Only store user and assistant messages, not the full system prompt
          ai_messages: {
            user: userMessage,
            assistant: parsed.message,
          },
        },
        { onConflict: 'user_id,check_in_date' },
      )
      .select()
      .single()

    // H9: If check-in fails, return 500 immediately to avoid orphaned tasks
    if (checkInError) {
      console.error('Check-in upsert error:', checkInError)
      return new Response(
        JSON.stringify({ error: 'Failed to save check-in' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Write task rows to DB ----
    if (!checkIn?.id) {
      console.error('Check-in ID missing after successful upsert')
      return new Response(
        JSON.stringify({ error: 'Check-in ID missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const taskRows = parsed.tasks.map((t, i) => ({
      user_id: user.id,
      check_in_id: checkIn.id,
      title: t.title,
      estimated_mins: t.estimated_mins,
      order_index: i,
    }))

    let savedTasks: Record<string, unknown>[] = []
    if (taskRows.length > 0) {
      const { data: insertedTasks, error: taskError } = await serviceClient
        .from('tasks')
        .insert(taskRows)
        .select()

      if (taskError) {
        console.error('Task insert error:', taskError)
        // Return the check-in but indicate task creation failed
        return new Response(
          JSON.stringify({
            checkIn: { id: checkIn.id, date: checkIn.check_in_date },
            tasks: [],
            taskError: 'Tasks could not be saved. Please try regenerating.',
            aiResponse: parsed,
          }),
          { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      } else {
        savedTasks = insertedTasks ?? []
      }
    }

    // ---- Return structured JSON response ----
    return new Response(
      JSON.stringify({
        message: parsed.message,
        tasks: savedTasks.map((t) => ({
          id: t.id,
          title: t.title,
          estimated_mins: t.estimated_mins,
          difficulty: parsed.tasks.find((pt) => pt.title === t.title)?.difficulty ?? 'medium',
          order_index: t.order_index,
          completed: false,
        })),
        check_in_id: checkIn?.id ?? null,
        rationale: parsed.rationale,
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
