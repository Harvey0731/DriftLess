import { useColorScheme as useColorSchemeCore } from 'react-native'
import { useAuthStore } from '@/src/stores/authStore'

/**
 * Returns the effective color scheme for the app.
 * Reads the user's profile.theme preference ('Light' | 'Dark' | 'Auto')
 * and falls back to the OS-level scheme when 'Auto' or unset.
 */
export const useColorScheme = (): 'light' | 'dark' => {
  const osScheme = useColorSchemeCore()
  const profileTheme = useAuthStore((s) => s.profile?.theme)

  // User explicitly set a theme preference
  if (profileTheme === 'Light' || profileTheme === 'light') return 'light'
  if (profileTheme === 'Dark' || profileTheme === 'dark') return 'dark'

  // 'Auto', 'system', or unset — follow OS
  return osScheme === 'dark' ? 'dark' : 'light'
}
