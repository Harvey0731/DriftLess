import { supabase } from '../lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

/**
 * Create a new account and insert a corresponding profile row.
 */
export async function signUp(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  })
  if (error) throw new Error(`Sign-up failed: ${error.message}`)

  // Create the initial profile row keyed to the new user
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: displayName ?? null,
      onboarding_done: false,
      notification_hour: 9,
      celebration_style: 'confetti',
      theme: 'system',
      streak_shields: 0,
      current_streak: 0,
      longest_streak: 0,
      trust_score: 50,
    })
    if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`)
  }

  return data
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw new Error(`Sign-in failed: ${error.message}`)
  return data
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`Sign-out failed: ${error.message}`)
}

/**
 * Send a password-reset email.
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw new Error(`Password reset failed: ${error.message}`)
}

/**
 * Return the current session or null.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(`Failed to get session: ${error.message}`)
  return data.session
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return data.subscription
}
