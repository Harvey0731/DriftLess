import { supabase } from '../lib/supabase'
import type { Database, FocusSession } from '../types/database'

type FocusSessionUpdate = Database['public']['Tables']['focus_sessions']['Update']

/**
 * Create a new focus session.
 */
export async function createSession(
  userId: string,
  taskId: string,
  checkInId: string,
  plannedMins: number,
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      task_id: taskId,
      check_in_id: checkInId,
      started_at: new Date().toISOString(),
      ended_at: null,
      planned_mins: plannedMins,
      actual_secs: 0,
      pauses: 0,
      rating: null,
      rating_label: null,
      note: null,
      status: 'active' as const,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return data as unknown as FocusSession
}

// H-SEC: Whitelist of fields callers may update on focus_sessions
type SafeSessionUpdate = Partial<
  Pick<
    FocusSession,
    'status' | 'pauses' | 'actual_secs' | 'ended_at' | 'rating' | 'rating_label' | 'note'
  >
>

/**
 * Partially update a focus session (e.g. pause count, status).
 * Requires userId for ownership verification.
 */
export async function updateSession(
  sessionId: string,
  updates: SafeSessionUpdate,
  userId: string,
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .update(updates as FocusSessionUpdate)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to update session: ${error.message}`)
  return data as unknown as FocusSession
}

/**
 * End a focus session with final stats and rating.
 */
export async function endSession(
  sessionId: string,
  actualSecs: number,
  rating: number,
  ratingLabel: string,
  userId: string,
  note?: string,
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      ended_at: new Date().toISOString(),
      actual_secs: actualSecs,
      rating,
      rating_label: ratingLabel,
      note: note ?? null,
      status: 'completed' as const,
    } as FocusSessionUpdate)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to end session: ${error.message}`)
  return data as unknown as FocusSession
}

/**
 * Get recent completed sessions for a user, with task title joined in.
 */
export async function getRecentSessions(
  userId: string,
  limit: number,
): Promise<(FocusSession & { taskName?: string })[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*, tasks(title)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Failed to fetch recent sessions: ${error.message}`)
  return ((data ?? []) as unknown as (FocusSession & { tasks?: { title: string } | null })[]).map(
    (s) => ({ ...s, taskName: s.tasks?.title ?? undefined }),
  )
}

export interface SessionStats {
  totalSessions: number
  totalTimeSecs: number
  avgDurationSecs: number
  ratingDistribution: Record<number, number>
}

/**
 * Calculate aggregate session stats for a user.
 */
export async function getSessionStats(userId: string): Promise<SessionStats> {
  // H8: Cap at 1000 rows to prevent OOM on large datasets.
  // TODO: Migrate to a Supabase RPC / Postgres function for server-side aggregation.
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('actual_secs, rating')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw new Error(`Failed to fetch session stats: ${error.message}`)

  const sessions = data ?? []
  const totalSessions = sessions.length
  const totalTimeSecs = sessions.reduce((sum, s) => sum + (s.actual_secs ?? 0), 0)
  const avgDurationSecs = totalSessions > 0 ? Math.round(totalTimeSecs / totalSessions) : 0

  const ratingDistribution: Record<number, number> = {}
  for (const s of sessions) {
    if (s.rating !== null) {
      ratingDistribution[s.rating] = (ratingDistribution[s.rating] ?? 0) + 1
    }
  }

  return { totalSessions, totalTimeSecs, avgDurationSecs, ratingDistribution }
}
