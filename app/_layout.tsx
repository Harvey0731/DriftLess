import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments, router as expoRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import 'react-native-reanimated'
import '../global.css'

import { useColorScheme } from '@/components/useColorScheme'
import { ErrorBoundary } from '@/src/components/ErrorBoundary'
import { supabase } from '@/src/lib/supabase'
import { setLastActivity, getLastActivity, clearLastActivity } from '@/src/lib/mmkv'
import { initSentry, setSentryUser, captureError } from '@/src/lib/sentry'
import type { Session } from '@supabase/supabase-js'

// Initialize error monitoring
initSentry()

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()

const DriftlessLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8B5CF6',
    background: '#FAF5FF',
    card: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
    notification: '#10B981',
  },
}

const DriftlessDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#8B5CF6',
    background: '#1F1B2E',
    card: '#2D2640',
    text: '#F9FAFB',
    border: '#374151',
    notification: '#10B981',
  },
}

function useProtectedRoute(session: Session | null, isLoading: boolean) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, segments, isLoading, router])
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return
        if (session) {
          const lastActivity = getLastActivity()
          if (lastActivity && Date.now() - lastActivity > THIRTY_DAYS_MS) {
            await supabase.auth.signOut()
            clearLastActivity()
            if (!mounted) return
            setSession(null)
            setIsLoading(false)
            return
          }
          setLastActivity()
        }
        setSession(session)
        setIsLoading(false)
      })
      .catch((err) => {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          context: 'RootLayout.getSession',
        })
        if (!mounted) return
        setSession(null)
        setIsLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setSentryUser(session?.user?.id ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the password reset link — navigate to the reset screen
        // Use a short delay so the router is ready
        setTimeout(() => {
          try {
            expoRouter.push('/(auth)/reset-password')
          } catch {
            // Router not ready yet — will be handled by route protection
          }
        }, 100)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setLastActivity()
        supabase.auth.startAutoRefresh()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync()
    }
  }, [loaded, isLoading])

  if (!loaded || isLoading) {
    return null
  }

  return <RootLayoutNav session={session} isLoading={isLoading} />
}

function RootLayoutNav({ session, isLoading }: { session: Session | null; isLoading: boolean }) {
  const colorScheme = useColorScheme()
  useProtectedRoute(session, isLoading)

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DriftlessDarkTheme : DriftlessLightTheme}>
      <ErrorBoundary>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="check-in"
            options={{
              headerShown: true,
              title: 'Daily Check-In',
              headerStyle: { backgroundColor: '#FAF5FF' },
              headerTintColor: '#8B5CF6',
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="timer"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="session-rating"
            options={{
              headerShown: true,
              title: 'Rate Your Session',
              headerStyle: { backgroundColor: '#FAF5FF' },
              headerTintColor: '#8B5CF6',
              presentation: 'modal',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="shame-emergency"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="bad-day-toolbox"
            options={{
              headerShown: true,
              title: 'Bad Day Toolbox',
              headerStyle: { backgroundColor: '#FAF5FF' },
              headerTintColor: '#8B5CF6',
            }}
          />
          <Stack.Screen
            name="promises"
            options={{
              headerShown: true,
              title: 'Promises to Yourself',
              headerStyle: { backgroundColor: '#FAF5FF' },
              headerTintColor: '#8B5CF6',
            }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              headerShown: true,
              title: 'Edit Profile',
              headerStyle: { backgroundColor: '#FAF5FF' },
              headerTintColor: '#8B5CF6',
            }}
          />
          <Stack.Screen
            name="data-export"
            options={{
              headerShown: true,
              title: 'Export Data',
              headerStyle: { backgroundColor: '#FAF5FF' },
              headerTintColor: '#8B5CF6',
            }}
          />
          <Stack.Screen
            name="delete-account"
            options={{
              headerShown: true,
              title: 'Delete Account',
              headerStyle: { backgroundColor: '#FAF5FF' },
              headerTintColor: '#EF4444',
            }}
          />
        </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
