import { create } from 'zustand'

// ─── Types ──────────────────────────────────────────────────────────────────

type Entitlement = 'free' | 'pro'
type SubscriptionStatusValue = 'active' | 'trialing' | 'expired' | 'cancelled' | 'unknown'

interface SubscriptionState {
  isInitialized: boolean
  customerInfo: null
  isPro: boolean
  isTrialActive: boolean
  currentOffering: null
  isPurchasing: boolean
  isRestoring: boolean
  entitlement: Entitlement
  trialEndsAt: string | null
  daysLeftInTrial: number
  status: SubscriptionStatusValue
}

interface SubscriptionActions {
  initialize: () => Promise<void>
  checkEntitlement: () => Promise<void>
  fetchOfferings: () => Promise<void>
  purchasePackage: (
    pkg: unknown,
  ) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>
  restorePurchases: () => Promise<{ success: boolean; isPro?: boolean; error?: string }>
}

type SubscriptionStore = SubscriptionState & SubscriptionActions

// ─── Stub Store (RevenueCat removed for Expo Go compatibility) ───────────

export const useSubscriptionStore = create<SubscriptionStore>()((set) => ({
  isInitialized: false,
  customerInfo: null,
  isPro: false,
  isTrialActive: false,
  currentOffering: null,
  isPurchasing: false,
  isRestoring: false,
  entitlement: 'free',
  trialEndsAt: null,
  daysLeftInTrial: 0,
  status: 'unknown',

  initialize: async () => {
    console.warn('[Subscriptions] RevenueCat removed — subscription features disabled')
    set({ isInitialized: true })
  },

  checkEntitlement: async () => {
    // no-op
  },

  fetchOfferings: async () => {
    // no-op
  },

  purchasePackage: async () => {
    return { success: false, error: 'Purchases not available in Expo Go' }
  },

  restorePurchases: async () => {
    return { success: false, error: 'Purchases not available in Expo Go' }
  },
}))
