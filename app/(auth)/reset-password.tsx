import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/src/lib/supabase'

export default function ResetPasswordScreen() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdatePassword = async () => {
    if (!password.trim()) {
      setError('Please enter a new password.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    Alert.alert('Password Updated', 'Your password has been successfully reset.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)') },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-6 py-8">
            <View className="mb-10">
              <Text className="text-3xl font-bold text-text mb-2">Set New Password</Text>
              <Text className="text-base text-textSecondary">Enter your new password below.</Text>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-text mb-1.5 ml-1">New Password</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text"
                placeholder="At least 8 characters"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={72}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="New password input"
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-text mb-1.5 ml-1">Confirm Password</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text"
                placeholder="Re-enter your new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                maxLength={72}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="Confirm password input"
              />
            </View>

            {error && (
              <View className="mb-4 p-3 bg-red-50 rounded-xl">
                <Text className="text-danger text-sm text-center">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleUpdatePassword}
              disabled={loading}
              className={`w-full rounded-xl py-4 items-center shadow-sm ${
                loading ? 'bg-primary/70' : 'bg-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Update password"
              accessibilityState={{ disabled: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
