import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { useAuthStore } from '@/src/stores/authStore'
import { useSubscriptionStore } from '@/src/stores/subscriptionStore'
import { captureError, setSentryEnabled } from '@/src/lib/sentry'
import { storage } from '@/src/lib/mmkv'

// --- Types ---

type SessionLength = 15 | 25 | 50 | 'custom'
type CelebrationStyle = 'Enthusiastic' | 'Moderate' | 'Minimal'
type ThemeSetting = 'Light' | 'Dark' | 'Auto'

// --- Components ---

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl mx-5 mb-4 overflow-hidden">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
          {title}
        </Text>
      </View>
      {children}
    </View>
  )
}

function SettingRow({
  label,
  value,
  onPress,
  showChevron = true,
  danger = false,
}: {
  label: string
  value?: string
  onPress?: () => void
  showChevron?: boolean
  danger?: boolean
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      className="flex-row items-center justify-between px-4 py-3.5 border-b border-gray-50"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className={`text-sm ${danger ? 'text-danger font-medium' : 'text-text'}`}>{label}</Text>
      <View className="flex-row items-center">
        {value ? <Text className="text-sm text-textSecondary mr-2">{value}</Text> : null}
        {showChevron ? <Text className="text-textSecondary text-sm">{'>'}</Text> : null}
      </View>
    </TouchableOpacity>
  )
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-gray-50">
      <Text className="text-sm text-text">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
        accessibilityRole="switch"
      />
    </View>
  )
}

function DropdownPicker<T extends string | number>({
  options,
  selected,
  onSelect,
  visible,
  onClose,
  formatLabel,
}: {
  options: T[]
  selected: T
  onSelect: (v: T) => void
  visible: boolean
  onClose: () => void
  formatLabel?: (v: T) => string
}) {
  if (!visible) return null

  return (
    <View className="bg-gray-50 mx-4 mb-2 rounded-xl overflow-hidden">
      {options.map((opt) => (
        <TouchableOpacity
          key={String(opt)}
          onPress={() => {
            onSelect(opt)
            onClose()
          }}
          className={`px-4 py-3 border-b border-gray-100 ${
            selected === opt ? 'bg-primary/10' : ''
          }`}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-sm ${selected === opt ? 'text-primary font-semibold' : 'text-text'}`}
            >
              {formatLabel ? formatLabel(opt) : String(opt)}
            </Text>
            {selected === opt ? <Text className="text-primary text-sm font-bold">*</Text> : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// --- Main Screen ---

export default function SettingsScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  // Profile — real data from auth store
  const userName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User'
  const userEmail = user?.email ?? ''
  const userInitials =
    userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  // Preferences — initialized from profile, persisted on change
  const notificationHour = profile?.notification_hour ?? 9
  const notificationTime = `${notificationHour % 12 || 12}:00 ${notificationHour >= 12 ? 'PM' : 'AM'}`
  const [sessionLength, setSessionLength] = useState<SessionLength>(() => {
    const stored = storage.getString('prefs.sessionLength')
    if (stored === 'custom') return 'custom'
    const num = stored ? parseInt(stored, 10) : NaN
    return num === 15 || num === 25 || num === 50 ? num : 25
  })
  const [showSessionPicker, setShowSessionPicker] = useState(false)

  const handleSessionLengthChange = (value: SessionLength) => {
    setSessionLength(value)
    storage.set('prefs.sessionLength', String(value))
  }
  const [celebrationStyle, setCelebrationStyle] = useState<CelebrationStyle>(
    (profile?.celebration_style as CelebrationStyle) ?? 'Moderate',
  )
  const [showCelebrationPicker, setShowCelebrationPicker] = useState(false)
  const [theme, setTheme] = useState<ThemeSetting>((profile?.theme as ThemeSetting) ?? 'Auto')
  const [showThemePicker, setShowThemePicker] = useState(false)

  // Persist celebration style changes to profile
  const handleCelebrationChange = async (value: CelebrationStyle) => {
    setCelebrationStyle(value)
    try {
      await useAuthStore.getState().updateProfile({ celebration_style: value })
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'settings.handleCelebrationChange',
      })
    }
  }

  // Persist theme changes to profile
  const handleThemeChange = async (value: ThemeSetting) => {
    setTheme(value)
    try {
      await useAuthStore.getState().updateProfile({ theme: value })
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'settings.handleThemeChange',
      })
    }
  }

  // Privacy — persisted in MMKV
  const [anonymousSharing, setAnonymousSharing] = useState(() => {
    const stored = storage.getBoolean('privacy.anonymousSharing')
    return stored !== undefined ? stored : true
  })
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => {
    const stored = storage.getBoolean('privacy.analyticsEnabled')
    return stored !== undefined ? stored : true
  })

  // Persist privacy toggle changes to MMKV and apply side effects
  const handleAnonymousSharingChange = (value: boolean) => {
    setAnonymousSharing(value)
    storage.set('privacy.anonymousSharing', value)
  }

  const handleAnalyticsChange = (value: boolean) => {
    setAnalyticsEnabled(value)
    storage.set('privacy.analyticsEnabled', value)
    setSentryEnabled(value)
  }

  // Subscription — use selectors to avoid unnecessary re-renders
  const isTrialActive = useSubscriptionStore((s) => s.isTrialActive)
  const subStatus = useSubscriptionStore((s) => s.status)
  const trialEndsAt = useSubscriptionStore((s) => s.trialEndsAt)
  const entitlement = useSubscriptionStore((s) => s.entitlement)
  const isSubscribed = entitlement === 'pro' && (subStatus === 'active' || subStatus === 'trialing')
  const currentPlan = isSubscribed ? (isTrialActive ? 'Free Trial' : 'Pro') : 'Free'
  const renewalDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const formatSessionLength = (v: SessionLength): string => {
    if (v === 'custom') return 'Custom'
    return `${v} min`
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-text mx-5 mt-4 mb-4">Settings</Text>

        {/* Profile Section */}
        <SectionCard title="Profile">
          <View className="flex-row items-center px-4 py-4">
            <View className="w-14 h-14 rounded-full bg-primary items-center justify-center mr-3">
              <Text className="text-lg font-bold text-white">{userInitials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-text">{userName}</Text>
              <Text className="text-sm text-textSecondary mt-0.5">{userEmail}</Text>
            </View>
          </View>
          <SettingRow label="Edit Profile" onPress={() => router.push('/edit-profile')} />
        </SectionCard>

        {/* Preferences Section */}
        <SectionCard title="Preferences">
          {/* H27: Notification time — configured during onboarding */}
          <SettingRow label="Notification Time" value={notificationTime} showChevron={false} />
          <SettingRow
            label="Default Session Length"
            value={formatSessionLength(sessionLength)}
            onPress={() => setShowSessionPicker(!showSessionPicker)}
          />
          <DropdownPicker
            options={[15, 25, 50, 'custom'] as SessionLength[]}
            selected={sessionLength}
            onSelect={handleSessionLengthChange}
            visible={showSessionPicker}
            onClose={() => setShowSessionPicker(false)}
            formatLabel={formatSessionLength}
          />
          <SettingRow
            label="How should I celebrate with you?"
            value={celebrationStyle}
            onPress={() => setShowCelebrationPicker(!showCelebrationPicker)}
          />
          <DropdownPicker
            options={['Enthusiastic', 'Moderate', 'Minimal'] as CelebrationStyle[]}
            selected={celebrationStyle}
            onSelect={handleCelebrationChange}
            visible={showCelebrationPicker}
            onClose={() => setShowCelebrationPicker(false)}
          />
          <SettingRow
            label="Theme"
            value={theme}
            onPress={() => setShowThemePicker(!showThemePicker)}
          />
          <DropdownPicker
            options={['Light', 'Dark', 'Auto'] as ThemeSetting[]}
            selected={theme}
            onSelect={handleThemeChange}
            visible={showThemePicker}
            onClose={() => setShowThemePicker(false)}
          />
        </SectionCard>

        {/* Privacy Section */}
        <SectionCard title="Privacy">
          <ToggleRow
            label="Anonymous Sharing"
            value={anonymousSharing}
            onValueChange={handleAnonymousSharingChange}
          />
          <ToggleRow
            label="Analytics"
            value={analyticsEnabled}
            onValueChange={handleAnalyticsChange}
          />
        </SectionCard>

        {/* Subscription Section */}
        <SectionCard title="Subscription">
          <View className="px-4 py-3.5 border-b border-gray-50">
            <View className="flex-row items-center">
              <Text className="text-sm text-text mr-2">Current Plan</Text>
              <View
                className={`px-2.5 py-1 rounded-full ${
                  isSubscribed ? 'bg-primary' : 'bg-secondary/30'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSubscribed ? 'text-white' : 'text-primary'
                  }`}
                >
                  {currentPlan}
                </Text>
              </View>
            </View>
          </View>
          {isSubscribed ? (
            <>
              {renewalDate && (
                <View className="px-4 py-3.5 border-b border-gray-50">
                  <Text className="text-sm text-textSecondary">
                    {isTrialActive ? 'Trial ends' : 'Renews on'} {renewalDate}
                  </Text>
                </View>
              )}
              {/* H28: Open App Store subscription management */}
              <SettingRow
                label="Manage Subscription"
                onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
              />
            </>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/paywall')}
              className="mx-4 my-3 bg-accent py-3.5 rounded-xl items-center"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro"
            >
              <Text className="text-white font-semibold text-sm">Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Data Section */}
        <SectionCard title="Data">
          <SettingRow label="Export My Data" onPress={() => router.push('/data-export')} />
        </SectionCard>

        {/* Other */}
        <SectionCard title="Other">
          {/* H29: Restore purchases via RevenueCat */}
          <SettingRow
            label="Restore Purchases"
            showChevron={false}
            onPress={async () => {
              const result = await useSubscriptionStore.getState().restorePurchases()
              if (result.success) {
                if (result.isPro) {
                  Alert.alert('Restored', 'Your purchases have been restored successfully.')
                } else {
                  Alert.alert(
                    'No Purchases Found',
                    'We could not find any previous purchases to restore.',
                  )
                }
              } else {
                Alert.alert(
                  'Restore Failed',
                  result.error ?? 'An unknown error occurred. Please try again.',
                )
              }
            }}
          />
        </SectionCard>

        {/* Sign Out */}
        <TouchableOpacity
          className="mx-5 mb-4 py-3.5 rounded-xl border border-primary items-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() =>
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                  await useAuthStore.getState().signOut()
                },
              },
            ])
          }
        >
          <Text className="text-primary font-semibold text-sm">Sign Out</Text>
        </TouchableOpacity>

        {/* Delete Account — intentionally separated from other actions */}
        <TouchableOpacity
          className="mx-5 mb-4 py-3.5 rounded-xl items-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          onPress={() => router.push('/delete-account')}
        >
          <Text className="text-danger font-medium text-sm">Delete Account</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text className="text-xs text-textSecondary text-center mb-8">
          Driftless v{Constants.expoConfig?.version ?? '1.0.0'} (Build{' '}
          {(
            Constants.expoConfig?.ios?.buildNumber ||
            Constants.expoConfig?.android?.versionCode ||
            '1'
          ).toString()}
          )
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
