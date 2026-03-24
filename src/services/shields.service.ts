import { supabase } from '../lib/supabase'
import { captureError } from '../lib/sentry'

const SHIELD_MAX = 3
const SHIELD_EARN_DAYS = 7

/**
 * C5: Award a shield atomically if streak is a multiple of 7 and shields < max.
 * Uses a conditional UPDATE with .eq('streak_shields', currentShields) so that
 * concurrent requests cannot double-increment. If 0 rows are updated, another
 * request already incremented the shield count.
 */
export async function checkAndAwardShield(
  userId: string,
  currentStreak: number,
  currentShields: number,
): Promise<number> {
  if (currentStreak > 0 && currentStreak % SHIELD_EARN_DAYS === 0 && currentShields < SHIELD_MAX) {
    const newShields = Math.min(currentShields + 1, SHIELD_MAX)
    const { data, error } = await supabase
      .from('profiles')
      .update({ streak_shields: newShields })
      .eq('id', userId)
      .eq('streak_shields', currentShields)
      .lt('streak_shields', SHIELD_MAX)
      .select('streak_shields')
    if (error) {
      captureError(new Error(`Shield award failed: ${error.message}`), {
        context: 'shields.checkAndAwardShield',
        userId,
        currentStreak,
        currentShields,
      })
      return currentShields
    }
    // If 0 rows updated, another request already incremented — return current value
    if (!data || data.length === 0) return currentShields
    return newShields
  }
  return currentShields
}

/**
 * C6: Use a shield atomically to protect streak on a skip day.
 * Uses a conditional UPDATE with .eq('streak_shields', currentShields) so that
 * concurrent requests cannot double-decrement. If 0 rows are updated, the shield
 * was already consumed by another request.
 */
export async function consumeShield(userId: string, currentShields: number): Promise<boolean> {
  if (currentShields <= 0) return false
  const { data, error } = await supabase
    .from('profiles')
    .update({ streak_shields: currentShields - 1 })
    .eq('id', userId)
    .eq('streak_shields', currentShields)
    .gt('streak_shields', 0)
    .select('streak_shields')
  if (error) throw new Error(`Failed to use shield: ${error.message}`)
  // If 0 rows updated, shield was already consumed by a concurrent request
  return (data?.length ?? 0) > 0
}

/** Get current shield count */
export async function getShieldCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('streak_shields')
    .eq('id', userId)
    .single()
  if (error) throw new Error(`Failed to get shields: ${error.message}`)
  return data?.streak_shields ?? 0
}
