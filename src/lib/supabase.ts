import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import type { Database } from '@/src/types/database'

let ExpoSecureStoreAdapter: {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

if (Platform.OS !== 'web') {
  // Native: use expo-secure-store with MMKV fallback for unsigned simulator builds
  // where the Keychain entitlement is unavailable
  const SecureStore = require('expo-secure-store')
  const { storage: mmkv } = require('./mmkv')
  const AUTH_PREFIX = '__supabase_auth_'

  ExpoSecureStoreAdapter = {
    getItem: async (key: string) => {
      try {
        return await SecureStore.getItemAsync(key)
      } catch {
        // Keychain unavailable (unsigned simulator build) — fall back to MMKV
        return mmkv.getString(AUTH_PREFIX + key) ?? null
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await SecureStore.setItemAsync(key, value)
      } catch {
        mmkv.set(AUTH_PREFIX + key, value)
      }
    },
    removeItem: async (key: string) => {
      try {
        await SecureStore.deleteItemAsync(key)
      } catch {
        mmkv.delete(AUTH_PREFIX + key)
      }
    },
  }
} else {
  // Web: use localStorage with SSR-safe fallback
  const storage =
    typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined
  ExpoSecureStoreAdapter = {
    getItem: async (key: string) => storage?.getItem(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage?.setItem(key, value)
    },
    removeItem: async (key: string) => {
      storage?.removeItem(key)
    },
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
