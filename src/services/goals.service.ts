import { supabase } from '../lib/supabase'
import type { Goal } from '../types/database'

/**
 * Get the user's currently active goal.
 */
export async function getActiveGoal(userId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Failed to fetch active goal: ${error.message}`)
  return data as unknown as Goal | null
}

/**
 * Create a new goal for the user. Deactivates any currently active goal first.
 * Attempts atomic swap_active_goal RPC first, falls back to sequential operations.
 */
export async function createGoal(
  userId: string,
  title: string,
  description?: string,
): Promise<Goal> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc('swap_active_goal', {
    p_user_id: userId,
    p_title: title,
    p_description: description ?? null,
  })

  if (!rpcError && rpcData) {
    // RPC returns the full goal row as JSONB
    return rpcData as unknown as Goal
  }

  // Fallback: sequential deactivate + insert (if RPC not deployed yet)
  const { error: deactivateError } = await supabase
    .from('goals')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
  if (deactivateError)
    throw new Error(`Failed to deactivate existing goals: ${deactivateError.message}`)

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title,
      description: description ?? null,
      is_active: true,
      archived_at: null,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create goal: ${error.message}`)
  return data as unknown as Goal
}

/**
 * Archive a goal by setting archived_at and marking it inactive.
 * H7: Requires userId to prevent users from archiving other users' goals.
 */
export async function archiveGoal(goalId: string, userId: string): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to archive goal: ${error.message}`)
  return data as unknown as Goal
}

/**
 * Get all goals for a user, optionally including archived ones.
 */
export async function getGoals(userId: string, includeArchived = false): Promise<Goal[]> {
  let query = supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch goals: ${error.message}`)
  return data as unknown as Goal[]
}
