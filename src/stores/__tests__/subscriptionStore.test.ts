import Purchases from 'react-native-purchases'
import { useSubscriptionStore } from '../subscriptionStore'
import { useAuthStore } from '../authStore'

// jest.setup.js mocks react-native-purchases with { default: { configure, ... } }
// The default import resolves to that mock object.
const mockPurchases = Purchases as unknown as Record<string, jest.Mock>

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({
    user: { id: 'u1' } as any,
    session: null,
    profile: null,
    isLoading: false,
    isAuthenticated: true,
  })
  useSubscriptionStore.setState({
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
  })
})

// ─── Initial State ───────────────────────────────────────────────────────────

describe('subscriptionStore initial state', () => {
  it('starts not initialized', () => {
    expect(useSubscriptionStore.getState().isInitialized).toBe(false)
  })

  it('starts as free entitlement', () => {
    expect(useSubscriptionStore.getState().entitlement).toBe('free')
  })

  it('starts with isPro false', () => {
    expect(useSubscriptionStore.getState().isPro).toBe(false)
  })

  it('starts with status unknown', () => {
    expect(useSubscriptionStore.getState().status).toBe('unknown')
  })

  it('starts not purchasing', () => {
    expect(useSubscriptionStore.getState().isPurchasing).toBe(false)
  })

  it('starts not restoring', () => {
    expect(useSubscriptionStore.getState().isRestoring).toBe(false)
  })
})

// ─── initialize ─────────────────────────────────────────────────────────────

describe('subscriptionStore.initialize', () => {
  it('sets isInitialized true even when no API key', async () => {
    const originalIos = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    const originalAndroid = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY

    await useSubscriptionStore.getState().initialize()

    expect(useSubscriptionStore.getState().isInitialized).toBe(true)
    // Without API key, Purchases.configure should not be called.
    // The mock is on the default export object, so verify via the mock property.
    if (typeof mockPurchases.configure === 'function') {
      expect(mockPurchases.configure).not.toHaveBeenCalled()
    }

    // Restore
    if (originalIos) process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = originalIos
    if (originalAndroid) process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = originalAndroid
  })

  it('sets isInitialized true on error (does not block app)', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test-key'
    mockPurchases.configure = jest.fn().mockRejectedValue(new Error('RC init failed'))

    await useSubscriptionStore.getState().initialize()

    expect(useSubscriptionStore.getState().isInitialized).toBe(true)

    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
  })
})

// ─── checkEntitlement ───────────────────────────────────────────────────────

describe('subscriptionStore.checkEntitlement', () => {
  it('updates state from customer info with pro entitlement', async () => {
    const mockInfo = {
      entitlements: {
        active: {
          pro: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDate: null,
            unsubscribeDetectedAt: null,
          },
        },
      },
    }
    mockPurchases.getCustomerInfo = jest.fn().mockResolvedValue(mockInfo)

    await useSubscriptionStore.getState().checkEntitlement()

    const state = useSubscriptionStore.getState()
    expect(state.isPro).toBe(true)
    expect(state.entitlement).toBe('pro')
    expect(state.status).toBe('active')
  })

  it('sets free when no pro entitlement', async () => {
    const mockInfo = {
      entitlements: { active: {} },
    }
    mockPurchases.getCustomerInfo = jest.fn().mockResolvedValue(mockInfo)

    await useSubscriptionStore.getState().checkEntitlement()

    const state = useSubscriptionStore.getState()
    expect(state.isPro).toBe(false)
    expect(state.entitlement).toBe('free')
    expect(state.status).toBe('expired')
  })

  it('detects trial status', async () => {
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString() // 3 days from now
    const mockInfo = {
      entitlements: {
        active: {
          pro: {
            isActive: true,
            periodType: 'TRIAL',
            expirationDate: futureDate,
            unsubscribeDetectedAt: null,
          },
        },
      },
    }
    mockPurchases.getCustomerInfo = jest.fn().mockResolvedValue(mockInfo)

    await useSubscriptionStore.getState().checkEntitlement()

    const state = useSubscriptionStore.getState()
    expect(state.isPro).toBe(true)
    expect(state.isTrialActive).toBe(true)
    expect(state.status).toBe('trialing')
    expect(state.daysLeftInTrial).toBeGreaterThanOrEqual(2)
    expect(state.daysLeftInTrial).toBeLessThanOrEqual(4)
    expect(state.trialEndsAt).toBe(futureDate)
  })

  it('keeps existing state on transient error', async () => {
    useSubscriptionStore.setState({ isPro: true, entitlement: 'pro' })
    mockPurchases.getCustomerInfo = jest.fn().mockRejectedValue(new Error('Network'))

    await useSubscriptionStore.getState().checkEntitlement()

    // Should NOT have reset to free
    expect(useSubscriptionStore.getState().isPro).toBe(true)
  })
})

// ─── fetchOfferings ─────────────────────────────────────────────────────────

describe('subscriptionStore.fetchOfferings', () => {
  it('sets current offering', async () => {
    const mockOffering = { identifier: 'default', availablePackages: [] }
    mockPurchases.getOfferings = jest.fn().mockResolvedValue({
      current: mockOffering,
    })

    await useSubscriptionStore.getState().fetchOfferings()

    expect(useSubscriptionStore.getState().currentOffering).toEqual(mockOffering)
  })

  it('does not update when no current offering', async () => {
    mockPurchases.getOfferings = jest.fn().mockResolvedValue({
      current: null,
    })

    await useSubscriptionStore.getState().fetchOfferings()

    expect(useSubscriptionStore.getState().currentOffering).toBeNull()
  })

  it('does not throw on error', async () => {
    mockPurchases.getOfferings = jest.fn().mockRejectedValue(new Error('Offline'))

    // Should not throw — silently captures error
    await expect(useSubscriptionStore.getState().fetchOfferings()).resolves.toBeUndefined()
  })
})

// ─── purchasePackage ────────────────────────────────────────────────────────

describe('subscriptionStore.purchasePackage', () => {
  const mockPkg = { identifier: 'monthly' } as any

  it('returns success and updates state on purchase', async () => {
    const mockInfo = {
      entitlements: {
        active: {
          pro: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDate: null,
            unsubscribeDetectedAt: null,
          },
        },
      },
    }
    mockPurchases.purchasePackage = jest.fn().mockResolvedValue({ customerInfo: mockInfo })

    const result = await useSubscriptionStore.getState().purchasePackage(mockPkg)

    expect(result).toEqual({ success: true })
    expect(useSubscriptionStore.getState().isPro).toBe(true)
    expect(useSubscriptionStore.getState().isPurchasing).toBe(false)
  })

  it('sets isPurchasing during purchase', async () => {
    let resolveP: any
    mockPurchases.purchasePackage = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveP = resolve
      }),
    )

    const promise = useSubscriptionStore.getState().purchasePackage(mockPkg)
    expect(useSubscriptionStore.getState().isPurchasing).toBe(true)

    resolveP({
      customerInfo: { entitlements: { active: {} } },
    })
    await promise

    expect(useSubscriptionStore.getState().isPurchasing).toBe(false)
  })

  it('handles user cancellation', async () => {
    mockPurchases.purchasePackage = jest.fn().mockRejectedValue({ userCancelled: true })

    const result = await useSubscriptionStore.getState().purchasePackage(mockPkg)

    expect(result).toEqual({ success: false, cancelled: true })
    expect(useSubscriptionStore.getState().isPurchasing).toBe(false)
  })

  it('returns error on failure', async () => {
    mockPurchases.purchasePackage = jest.fn().mockRejectedValue({
      userCancelled: false,
      message: 'Payment failed',
    })

    const result = await useSubscriptionStore.getState().purchasePackage(mockPkg)

    expect(result).toEqual({ success: false, error: 'Payment failed' })
    expect(useSubscriptionStore.getState().isPurchasing).toBe(false)
  })
})

// ─── restorePurchases ───────────────────────────────────────────────────────

describe('subscriptionStore.restorePurchases', () => {
  it('restores and returns isPro true when pro entitlement exists', async () => {
    const mockInfo = {
      entitlements: {
        active: {
          pro: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDate: null,
            unsubscribeDetectedAt: null,
          },
        },
      },
    }
    mockPurchases.restorePurchases = jest.fn().mockResolvedValue(mockInfo)

    const result = await useSubscriptionStore.getState().restorePurchases()

    expect(result).toEqual({ success: true, isPro: true })
    expect(useSubscriptionStore.getState().isPro).toBe(true)
    expect(useSubscriptionStore.getState().isRestoring).toBe(false)
  })

  it('restores and returns isPro false when no pro entitlement', async () => {
    const mockInfo = {
      entitlements: { active: {} },
    }
    mockPurchases.restorePurchases = jest.fn().mockResolvedValue(mockInfo)

    const result = await useSubscriptionStore.getState().restorePurchases()

    expect(result).toEqual({ success: true, isPro: false })
    expect(useSubscriptionStore.getState().isPro).toBe(false)
  })

  it('sets isRestoring during restore', async () => {
    let resolveR: any
    mockPurchases.restorePurchases = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveR = resolve
      }),
    )

    const promise = useSubscriptionStore.getState().restorePurchases()
    expect(useSubscriptionStore.getState().isRestoring).toBe(true)

    resolveR({ entitlements: { active: {} } })
    await promise

    expect(useSubscriptionStore.getState().isRestoring).toBe(false)
  })

  it('returns error on failure', async () => {
    mockPurchases.restorePurchases = jest.fn().mockRejectedValue({
      message: 'Network error',
    })

    const result = await useSubscriptionStore.getState().restorePurchases()

    expect(result).toEqual({ success: false, error: 'Network error' })
    expect(useSubscriptionStore.getState().isRestoring).toBe(false)
  })
})
