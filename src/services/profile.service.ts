import { supabase } from '../lib/supabase'
import type { Database, Profile } from '../types/database'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// H3: Restrict updateProfile to only allow safe user-editable fields.
// Fields like trust_score, current_streak, streak_shields, onboarding_done, etc.
// must NOT be settable via the generic updateProfile endpoint.
type ProfileUserUpdate = Partial<
  Pick<
    Profile,
    'display_name' | 'notification_hour' | 'celebration_style' | 'theme' | 'procrastination_type'
  >
>

/**
 * Fetch a user's profile by their ID.
 */
export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw new Error(`Failed to fetch profile: ${error.message}`)
  return data as unknown as Profile
}

/**
 * Partially update a user's profile. Only safe, user-editable fields are accepted.
 */
export async function updateProfile(userId: string, updates: ProfileUserUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() } as ProfileUpdate)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to update profile: ${error.message}`)
  return data as unknown as Profile
}

/**
 * Mark onboarding complete, setting the user's initial goal and notification hour.
 * M2: Idempotent — if onboarding is already done, skip goal insertion.
 */
export async function completeOnboarding(
  userId: string,
  goalTitle: string,
  notificationHour: number,
  procrastinationType?: string,
): Promise<void> {
  // Atomic onboarding: CAS guard + goal creation in a single DB transaction.
  // Prevents double-tap races and orphaned onboarding-without-goal states.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: completed, error: rpcError } = await (supabase.rpc as any)('complete_onboarding', {
    p_user_id: userId,
    p_goal_title: goalTitle,
    p_notification_hour: notificationHour,
    p_procrastination_type: procrastinationType ?? null,
  })

  if (rpcError) throw new Error(`Failed to complete onboarding: ${rpcError.message}`)

  // completed === false means onboarding was already done (CAS guard)
  if (!completed) return
}

/**
 * Soft-delete an account by setting a deleted_at timestamp (30-day retention).
 * The user's auth account is NOT removed here; a backend job handles permanent deletion.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const deletedAt = new Date().toISOString()
  // H4: Write deleted_at (not updated_at) to mark the account for deletion.
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: deletedAt } as ProfileUpdate)
    .eq('id', userId)
  if (error) throw new Error(`Failed to soft-delete account: ${error.message}`)

  // Sign out the user after marking account for deletion
  await supabase.auth.signOut()
}
