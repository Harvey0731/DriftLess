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

export default function SignInScreen() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
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
            {/* Logo and tagline */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 rounded-2xl bg-primary items-center justify-center mb-4">
                <Text className="text-white text-3xl font-bold">D</Text>
              </View>
              <Text className="text-3xl font-bold text-text mb-2">Driftless</Text>
              <Text className="text-base text-textSecondary text-center">
                The app that gets you off the starting line.
              </Text>
            </View>

            {/* Form */}
            <View className="mb-6">
              <Text
                className="text-sm font-medium text-text mb-1.5 ml-1"
                accessibilityLabel="Email address"
              >
                Email
              </Text>
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

            <View className="mb-4">
              <Text
                className="text-sm font-medium text-text mb-1.5 ml-1"
                accessibilityLabel="Password"
              >
                Password
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text focus:border-primary focus:bg-white"
                placeholder="Your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={72}
                autoCapitalize="none"
                autoComplete="password"
                accessibilityLabel="Password input"
                accessibilityHint="Enter your password"
              />
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              className="self-end mb-6"
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
            >
              <Text className="text-primary text-sm font-medium">Forgot Password?</Text>
            </TouchableOpacity>

            {/* Error display */}
            {error && (
              <View className="mb-4 p-3 bg-red-50 rounded-xl">
                <Text className="text-danger text-sm text-center">{error}</Text>
              </View>
            )}

            {/* Sign in button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              className={`w-full rounded-xl py-4 items-center shadow-sm ${
                loading ? 'bg-primary/70' : 'bg-primary'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Sign up link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-textSecondary text-sm">Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-up')}
                accessibilityRole="link"
                accessibilityLabel="Sign up"
              >
                <Text className="text-primary text-sm font-semibold">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
