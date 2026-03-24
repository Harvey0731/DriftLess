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
import { signUp } from '@/src/services/auth.service'

export default function SignUpScreen() {
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignUp = async () => {
    setError(null)

    if (!displayName.trim()) {
      setError('Please enter your display name.')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.')
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

    try {
      await signUp(email.trim(), password, displayName.trim())
      router.push('/(onboarding)/goal-setup')
    } catch (signUpError: unknown) {
      setError(
        signUpError instanceof Error ? signUpError.message : 'Sign-up failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
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
              <Text className="text-3xl font-bold text-text mb-2">Create Account</Text>
              <Text className="text-base text-textSecondary">Start your shame-free journey</Text>
            </View>

            {/* Display name */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-text mb-1.5 ml-1">Display Name</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text focus:border-primary focus:bg-white"
                placeholder="What should we call you?"
                placeholderTextColor="#9CA3AF"
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={50}
                autoCapitalize="words"
                autoComplete="name"
                accessibilityLabel="Display name input"
                accessibilityHint="Enter the name you want to be called"
              />
            </View>

            {/* Email */}
            <View className="mb-5">
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
                accessibilityHint="Enter your email address"
              />
            </View>

            {/* Password */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-text mb-1.5 ml-1">Password</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text focus:border-primary focus:bg-white"
                placeholder="Create a password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={72}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="Password input"
                accessibilityHint="Create a password with at least 8 characters"
              />
              <Text className="text-xs text-textSecondary mt-1.5 ml-1">
                Must be at least 8 characters
              </Text>
            </View>

            {/* Confirm password */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-text mb-1.5 ml-1">Confirm Password</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text focus:border-primary focus:bg-white"
                placeholder="Confirm your password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                maxLength={72}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="Confirm password input"
                accessibilityHint="Re-enter your password to confirm"
              />
            </View>

            {/* Error display */}
            {error && (
              <View className="mb-4 p-3 bg-red-50 rounded-xl">
                <Text className="text-danger text-sm text-center">{error}</Text>
              </View>
            )}

            {/* Create account button */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              className={`w-full rounded-xl py-4 items-center shadow-sm ${
                loading ? 'bg-primary/70' : 'bg-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign in link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-textSecondary text-sm">Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-in')}
                accessibilityRole="link"
                accessibilityLabel="Sign in"
              >
                <Text className="text-primary text-sm font-semibold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
