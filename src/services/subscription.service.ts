import { supabase } from '../lib/supabase'
import type { Database, Subscription } from '../types/database'

type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

// SEC-02: Safe field whitelist — prevent clients from setting entitlement, status, or isPro directly.
// Only the RevenueCat webhook (server-side) should modify these fields.
type SafeSubscriptionUpdate = Partial<Pick<Subscription, 'product_id' | 'cancel_at_period_end'>>

/**
 * Get the user's subscription record.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to fetch subscription: ${error.message}`)
  return data as unknown as Subscription | null
}

/**
 * Update subscription data (typically called after a RevenueCat webhook).
 */
export async function updateSubscription(
  userId: string,
  updates: SafeSubscriptionUpdate,
): Promise<Subscription> {
  // SEC-02: Only allow safe client-editable fields. Dangerous fields like
  // entitlement, status, plan, trial_ends_at are set server-side only (webhook).
  const safeFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (updates.product_id !== undefined) safeFields.product_id = updates.product_id
  if (updates.cancel_at_period_end !== undefined)
    safeFields.cancel_at_period_end = updates.cancel_at_period_end

  const { data, error } = await supabase
    .from('subscriptions')
    .update(safeFields as SubscriptionUpdate)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw new Error(`Failed to update subscription: ${error.message}`)
  return data as unknown as Subscription
}

export interface TrialStatus {
  isTrialing: boolean
  daysLeft: number
  trialEndsAt: Date | null
}

/**
 * Check whether the user is currently in a free trial and how many days remain.
 */
export async function checkTrialStatus(userId: string): Promise<TrialStatus> {
  const subscription = await getSubscription(userId)

  if (!subscription || subscription.status !== 'trialing' || !subscription.trial_ends_at) {
    return { isTrialing: false, daysLeft: 0, trialEndsAt: null }
  }

  const trialEndsAt = new Date(subscription.trial_ends_at)
  const now = new Date()
  const diffMs = trialEndsAt.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  return {
    isTrialing: daysLeft > 0,
    daysLeft,
    trialEndsAt,
  }
}
