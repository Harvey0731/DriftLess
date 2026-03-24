import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/src/stores/authStore'
import { supabase } from '@/src/lib/supabase'
import { getActiveGoal } from '@/src/services/goals.service'
import { captureError } from '@/src/lib/sentry'

export default function EditProfileScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  // Profile fields — initialized from real data
  const [displayName, setDisplayName] = useState('')
  const [mainGoal, setMainGoal] = useState('')
  const [goalId, setGoalId] = useState<string | null>(null)
  const [procrastinationType, setProcrastinationType] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Password fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Populate fields from real data
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
    if (profile?.procrastination_type) {
      setProcrastinationType(profile.procrastination_type)
    }
    if (user?.id) {
      getActiveGoal(user.id)
        .then((goal) => {
          if (goal) {
            setMainGoal(goal.title)
            setGoalId(goal.id)
          }
        })
        .catch((err) => {
          captureError(err instanceof Error ? err : new Error(String(err)), {
            context: 'EditProfile.getActiveGoal',
          })
        })
    }
  }, [profile?.display_name, profile?.procrastination_type, user?.id])

  async function handleSaveProfile() {
    if (displayName.trim().length === 0) {
      Alert.alert('Missing Info', 'Please enter a display name.')
      return
    }
    if (!user?.id || isSaving) return

    setIsSaving(true)
    try {
      // Update display name and procrastination type in profile
      await useAuthStore.getState().updateProfile({
        display_name: displayName.trim(),
        ...(procrastinationType ? { procrastination_type: procrastinationType } : {}),
      })

      // Update goal title if changed and goal exists (with ownership check)
      if (goalId && mainGoal.trim().length > 0) {
        const { error: goalError } = await supabase
          .from('goals')
          .update({ title: mainGoal.trim() })
          .eq('id', goalId)
          .eq('user_id', user.id)
        if (goalError) throw new Error(`Failed to update goal: ${goalError.message}`)
      }

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'EditProfile.handleSaveProfile',
      })
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      Alert.alert('Error', message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Too Short', 'Password must be at least 8 characters.')
      return
    }
    if (isChangingPassword) return

    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      Alert.alert('Password Updated', 'Your password has been changed.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'EditProfile.handleChangePassword',
      })
      const message = err instanceof Error ? err.message : 'Failed to update password'
      Alert.alert('Error', message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile fields */}
          <View className="px-6 pt-6">
            <Text className="text-sm font-medium text-gray-500 mb-2">Display Name</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-4"
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
              autoCapitalize="words"
              accessibilityLabel="Display Name"
            />

            <Text className="text-sm font-medium text-gray-500 mb-2">Email</Text>
            <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-1">
              <Text className="text-base text-gray-500">{user?.email ?? ''}</Text>
            </View>
            <Text className="text-xs text-gray-400 mb-4">Email cannot be changed here.</Text>

            <Text className="text-sm font-medium text-gray-500 mb-2">Main Goal</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 min-h-[100px] mb-6"
              placeholder="What are you working towards?"
              placeholderTextColor="#9CA3AF"
              value={mainGoal}
              onChangeText={setMainGoal}
              multiline
              maxLength={300}
              textAlignVertical="top"
              accessibilityLabel="Main Goal"
            />

            <Text className="text-sm font-medium text-gray-500 mb-2">My main blocker</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {[
                { key: 'too_big', label: 'It feels too big' },
                { key: 'fear_of_failure', label: 'Scared of doing it wrong' },
                { key: 'unclear_start', label: "Don't know where to start" },
                { key: 'low_motivation', label: "Can't make myself care" },
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setProcrastinationType(opt.key)}
                  className={`rounded-xl px-4 py-2.5 border ${
                    procrastinationType === opt.key
                      ? 'bg-purple-50 border-purple-400'
                      : 'bg-white border-gray-200'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: procrastinationType === opt.key }}
                  accessibilityLabel={opt.label}
                >
                  <Text
                    className={`text-sm ${
                      procrastinationType === opt.key
                        ? 'text-purple-600 font-semibold'
                        : 'text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleSaveProfile}
              disabled={isSaving}
              className={`rounded-2xl py-4 items-center active:opacity-80 ${
                isSaving ? 'bg-purple-300' : 'bg-purple-500'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Save Changes"
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-lg font-bold">Save Changes</Text>
              )}
            </Pressable>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mx-6 my-8" />

          {/* Change Password section */}
          <View className="px-6">
            <Text className="text-lg font-bold text-gray-800 mb-4">Change Password</Text>

            <Text className="text-sm font-medium text-gray-500 mb-2">New Password</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-4"
              placeholder="At least 8 characters"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              maxLength={72}
              autoCapitalize="none"
              accessibilityLabel="New Password"
            />

            <Text className="text-sm font-medium text-gray-500 mb-2">Confirm New Password</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-6"
              placeholder="Re-enter new password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              maxLength={72}
              autoCapitalize="none"
              accessibilityLabel="Confirm New Password"
            />

            <Pressable
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              className={`rounded-2xl py-4 items-center active:opacity-80 ${
                isChangingPassword ? 'bg-gray-400' : 'bg-gray-800'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Update Password"
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">Update Password</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
