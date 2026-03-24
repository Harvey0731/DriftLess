import { supabase } from '../lib/supabase'
import { captureError } from '../lib/sentry'
import { getTodayDateString } from '../utils/time'
import type { DailyCheckIn } from '../types/database'

/**
 * Get today's check-in for the user (if one exists).
 */
export async function getTodayCheckIn(userId: string): Promise<DailyCheckIn | null> {
  const today = getTodayDateString()
  const { data, error } = await supabase
    .from('daily_check_ins')
    .select('*')
    .eq('user_id', userId)
    .eq('check_in_date', today)
    .maybeSingle()
  if (error) throw new Error(`Failed to fetch today's check-in: ${error.message}`)
  return data as unknown as DailyCheckIn | null
}

/**
 * Start a new check-in by calling the /ai-checkin Edge Function.
 * The Edge Function creates the check-in row and generates AI-suggested tasks.
 */
export async function startCheckIn(
  userId: string,
  energyLevel: number,
  goalId: string,
): Promise<DailyCheckIn> {
  // SEC: user_id is derived from the JWT server-side, NOT passed in the body.
  const { data, error } = await supabase.functions.invoke('ai-checkin', {
    body: {
      energyLevel,
      goalId,
    },
  })
  if (error) throw new Error(`Check-in failed: ${error.message}`)

  // C13: Update streak after successful check-in
  // BUG-01: Don't silently swallow streak RPC errors — report to Sentry
  // but don't block the check-in (streak is non-critical).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: streakError } = await (supabase.rpc as any)('update_streak', {
      p_user_id: userId,
    })
    if (streakError) {
      captureError(new Error(`Streak update failed: ${streakError.message}`), {
        userId,
        rpcFunction: 'update_streak',
      })
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      userId,
      rpcFunction: 'update_streak',
    })
  }

  return data as DailyCheckIn
}

/**
 * Get the user's recent check-ins within the last N days.
 */
export async function getRecentCheckIns(userId: string, days: number): Promise<DailyCheckIn[]> {
  // M4: Cap unbounded days parameter to prevent excessive queries
  const safeDays = Math.min(days, 90)
  const since = new Date()
  since.setDate(since.getDate() - safeDays)
  const sinceYear = since.getFullYear()
  const sinceMonth = String(since.getMonth() + 1).padStart(2, '0')
  const sinceDay = String(since.getDate()).padStart(2, '0')
  const sinceDate = `${sinceYear}-${sinceMonth}-${sinceDay}`

  const { data, error } = await supabase
    .from('daily_check_ins')
    .select('*')
    .eq('user_id', userId)
    .gte('check_in_date', sinceDate)
    .order('check_in_date', { ascending: false })
  if (error) throw new Error(`Failed to fetch recent check-ins: ${error.message}`)
  return data as unknown as DailyCheckIn[]
}
