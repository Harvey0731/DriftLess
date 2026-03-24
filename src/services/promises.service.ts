import { supabase } from '../lib/supabase'
import { captureError } from '../lib/sentry'
import { getTodayDateString } from '../utils/time'
import type { PromiseRecord as PromiseRow } from '../types/database'

/**
 * Get today's promise for the user (if one exists).
 */
export async function getTodayPromise(userId: string): Promise<PromiseRow | null> {
  const today = getTodayDateString()
  const { data, error } = await supabase
    .from('promises')
    .select('*')
    .eq('user_id', userId)
    .eq('promise_date', today)
    .maybeSingle()
  if (error) throw new Error(`Failed to fetch today's promise: ${error.message}`)
  return data as unknown as PromiseRow | null
}

/**
 * Create a new daily promise.
 */
export async function createPromise(userId: string, text: string): Promise<PromiseRow> {
  const today = getTodayDateString()
  const { data, error } = await supabase
    .from('promises')
    .insert({
      user_id: userId,
      promise_date: today,
      text,
      kept: null,
      kept_at: null,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create promise: ${error.message}`)
  return data as unknown as PromiseRow
}

/**
 * Mark a promise as kept or broken.
 */
export async function updatePromise(
  promiseId: string,
  kept: boolean,
  userId: string,
  reason?: string,
): Promise<PromiseRow> {
  const updatePayload: Record<string, unknown> = {
    kept,
    kept_at: new Date().toISOString(),
  }
  if (reason) {
    updatePayload.reason = reason
  }
  const { data, error } = await supabase
    .from('promises')
    .update(updatePayload)
    .eq('id', promiseId)
    .eq('user_id', userId) // H-security: Ensure ownership check
    .select()
    .single()
  if (error) throw new Error(`Failed to update promise: ${error.message}`)
  return data as unknown as PromiseRow
}

/**
 * Get promise history for the last N days.
 */
export async function getPromiseHistory(userId: string, days: number): Promise<PromiseRow[]> {
  // M4: Clamp days to valid range [1, 90] to prevent excessive or negative queries
  const safeDays = Math.max(1, Math.min(days, 90))
  const since = new Date()
  since.setDate(since.getDate() - safeDays)
  const sinceYear = since.getFullYear()
  const sinceMonth = String(since.getMonth() + 1).padStart(2, '0')
  const sinceDay = String(since.getDate()).padStart(2, '0')
  const sinceDate = `${sinceYear}-${sinceMonth}-${sinceDay}`

  const { data, error } = await supabase
    .from('promises')
    .select('*')
    .eq('user_id', userId)
    .gte('promise_date', sinceDate)
    .order('promise_date', { ascending: false })
  if (error) throw new Error(`Failed to fetch promise history: ${error.message}`)
  return data as unknown as PromiseRow[]
}

export interface TrustScore {
  score: number
  keptRatio: number
  streakBonus: number
  activityBonus: number
}

/**
 * Calculate the user's trust score using an EMA-based formula:
 *   60% kept ratio + 20% streak bonus + 20% 30-day activity bonus
 *
 * Scores are 0-100.
 */
export async function calculateTrustScore(userId: string): Promise<TrustScore> {
  const history = await getPromiseHistory(userId, 30)

  // -- Kept ratio (out of resolved promises) --
  const resolved = history.filter((p) => p.kept !== null)
  const kept = resolved.filter((p) => p.kept === true)
  const keptRatio = resolved.length > 0 ? kept.length / resolved.length : 0.5

  // -- Current streak of consecutively kept promises --
  let streak = 0
  const sorted = [...history]
    .filter((p) => p.kept !== null)
    .sort((a, b) => b.promise_date.localeCompare(a.promise_date))
  for (const p of sorted) {
    if (p.kept) {
      streak++
    } else {
      break
    }
  }
  // Normalize streak: cap at 30 days for a perfect 100% contribution
  const streakBonus = Math.min(streak / 30, 1)

  // -- 30-day activity: ratio of days with a promise --
  const activityBonus = Math.min(history.length / 30, 1)

  const score = Math.round(keptRatio * 60 + streakBonus * 20 + activityBonus * 20)

  const finalScore = Math.max(0, Math.min(100, score))

  // M3: Persist trust score to the user's profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ trust_score: finalScore })
    .eq('id', userId)
  if (updateError) {
    captureError(new Error(`Failed to persist trust score: ${updateError.message}`), {
      userId,
      finalScore,
    })
  }

  return {
    score: finalScore,
    keptRatio: Math.round(keptRatio * 100),
    streakBonus: Math.round(streakBonus * 100),
    activityBonus: Math.round(activityBonus * 100),
  }
}
