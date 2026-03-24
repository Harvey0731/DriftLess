import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { signUp as signUpService } from '../services/auth.service'
import { updateProfile as updateProfileService } from '../services/profile.service'
import { captureError } from '../lib/sentry'
import type { Profile } from '../types/database'
import type { User, Session } from '@supabase/supabase-js'

// H-01: Restrict updateProfile to safe user-editable fields only
type SafeProfileUpdate = Partial<
  Pick<
    Profile,
    'display_name' | 'notification_hour' | 'celebration_style' | 'theme' | 'procrastination_type'
  >
>

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  /** Derived — true when both session and user are present. */
  isAuthenticated: boolean
}

interface AuthActions {
  /** Subscribe to Supabase auth state changes. Call once at app root. */
  initialize: () => { unsubscribe: () => void }
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (updates: SafeProfileUpdate) => Promise<void>
}

type AuthStore = AuthState & AuthActions

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveAuth(
  user: User | null,
  session: Session | null,
): { user: User | null; session: Session | null; isAuthenticated: boolean } {
  return { user, session, isAuthenticated: !!(user && session) }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()((set, get) => ({
  // state
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  // actions

  initialize: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authFields = deriveAuth(session?.user ?? null, session)
      set({ ...authFields, isLoading: false })

      if (session?.user) {
        // Fire-and-forget profile fetch so we don't block the listener.
        get()
          .fetchProfile()
          .catch((err) =>
            captureError(err instanceof Error ? err : new Error(String(err)), {
              context: 'authStore.initialize.fetchProfile',
            }),
          )
      } else {
        set({ profile: null })
      }
    })

    return { unsubscribe: () => subscription.unsubscribe() }
  },

  signUp: async (email, password) => {
    set({ isLoading: true })
    try {
      // Delegate to auth service which also creates the profile row
      await signUpService(email, password)
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ ...deriveAuth(null, null), profile: null })
    } finally {
      set({ isLoading: false })
    }
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  },

  fetchProfile: async () => {
    const userId = get().user?.id
    if (!userId) return

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (error) throw error
    set({ profile: data as unknown as Profile })
  },

  updateProfile: async (updates) => {
    const userId = get().user?.id
    if (!userId) throw new Error('Not authenticated')

    // H-01: Delegate to profile service which enforces safe field whitelist
    const updatedProfile = await updateProfileService(userId, updates)
    set({ profile: updatedProfile })
  },
}))
