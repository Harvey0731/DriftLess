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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/src/lib/supabase'

export default function ForgotPasswordScreen() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Please enter your email address.')
      return
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'driftless://reset-password',
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSuccess(true)
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
            {/* Header */}
            <View className="mb-10">
              <Text className="text-3xl font-bold text-text mb-2">Reset Password</Text>
              <Text className="text-base text-textSecondary">
                Enter your email and we'll send you a link to reset your password.
              </Text>
            </View>

            {success ? (
              /* Success state */
              <View className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <Text className="text-accent text-base font-semibold text-center mb-2">
                  Check your email
                </Text>
                <Text className="text-textSecondary text-sm text-center">
                  We've sent a password reset link to {email}. Please check your inbox and follow
                  the instructions.
                </Text>
              </View>
            ) : (
              /* Email form */
              <>
                <View className="mb-6">
                  <Text className="text-sm font-medium text-text mb-1.5 ml-1">Email</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text focus:border-primary focus:bg-white"
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    maxLength={254}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email address to receive a reset link"
                  />
                </View>

                {/* Error display */}
                {error && (
                  <View className="mb-4 p-3 bg-red-50 rounded-xl">
                    <Text className="text-danger text-sm text-center">{error}</Text>
                  </View>
                )}

                {/* Send reset link button */}
                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={loading}
                  className={`w-full rounded-xl py-4 items-center shadow-sm ${
                    loading ? 'bg-primary/70' : 'bg-primary'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel="Send reset link"
                  accessibilityState={{ disabled: loading }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-base font-semibold">Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Back to sign in */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/sign-in')}
              className="mt-8 self-center"
              accessibilityRole="link"
              accessibilityLabel="Back to sign in"
            >
              <Text className="text-primary text-sm font-semibold">Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
