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
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { signUp } from '@/src/services/auth.service'

export default function SignUpScreen() {
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordValid = password.length >= 8

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
      setError("Let's try that again. Please check your password confirmation.")
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#FCF9F7' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header: back arrow + Driftless centered */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }}
              accessibilityLabel="Go back"
            >
              <MaterialIcons name="arrow-back" size={24} color="#323331" />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#4C54BB', letterSpacing: -1 }}>
              Driftless
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
            {/* Heading */}
            <View style={{ marginBottom: 28 }}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: '#323331', letterSpacing: -0.5, lineHeight: 40, marginBottom: 10 }}>
                Your shame-free journey starts here.
              </Text>
              <Text style={{ fontSize: 17, color: '#5f5f5d', lineHeight: 24 }}>
                A gentle space to grow, breathe, and find your center.
              </Text>
            </View>

            {/* Error banner */}
            {error && (
              <View style={{
                backgroundColor: '#F76A80',
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
                borderLeftWidth: 4,
                borderLeftColor: '#AC3149',
              }}>
                <MaterialIcons name="error" size={20} color="#FFF7F7" style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#FFF7F7', flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Display Name */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#5f5f5d', marginBottom: 8, marginLeft: 4 }}>
                Display Name
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F6F3F1',
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: 20,
                  fontSize: 15,
                  color: '#323331',
                }}
                placeholder="What should we call you?"
                placeholderTextColor="rgba(123, 123, 120, 0.6)"
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={50}
                autoCapitalize="words"
                autoComplete="name"
                accessibilityLabel="Display name input"
              />
            </View>

            {/* Email */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#5f5f5d', marginBottom: 8, marginLeft: 4 }}>
                Email
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F6F3F1',
                  borderRadius: 12,
                  height: 56,
                  paddingHorizontal: 20,
                  fontSize: 15,
                  color: '#323331',
                }}
                placeholder="email@example.com"
                placeholderTextColor="rgba(123, 123, 120, 0.6)"
                value={email}
                onChangeText={setEmail}
                maxLength={254}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email input"
              />
            </View>

            {/* Password */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#5f5f5d', marginBottom: 8, marginLeft: 4 }}>
                Password
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F6F3F1',
                borderRadius: 12,
                height: 56,
                paddingHorizontal: 20,
              }}>
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: '#323331' }}
                  placeholder="At least 8 characters"
                  placeholderTextColor="rgba(123, 123, 120, 0.6)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  maxLength={72}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={22}
                    color="#7B7B78"
                  />
                </TouchableOpacity>
              </View>
              {/* Inline password validation */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 4 }}>
                <MaterialIcons
                  name="check-circle"
                  size={16}
                  color={passwordValid ? '#006B64' : '#B3B2AF'}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#5f5f5d' }}>
                  Must be at least 8 characters
                </Text>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#5f5f5d', marginBottom: 8, marginLeft: 4 }}>
                Confirm Password
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F6F3F1',
                borderRadius: 12,
                height: 56,
                paddingHorizontal: 20,
              }}>
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: '#323331' }}
                  placeholder="Repeat your password"
                  placeholderTextColor="rgba(123, 123, 120, 0.6)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  maxLength={72}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  accessibilityLabel="Confirm password input"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={22}
                    color="#7B7B78"
                  />
                </TouchableOpacity>
              </View>
              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 4 }}>
                  <MaterialIcons
                    name={password === confirmPassword ? 'check-circle' : 'cancel'}
                    size={16}
                    color={password === confirmPassword ? '#006B64' : '#AC3149'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '500', color: password === confirmPassword ? '#006B64' : '#AC3149' }}>
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>

            {/* Create Account button — gradient pill */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              style={{ borderRadius: 999, overflow: 'hidden' }}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#4C54BB', '#B8BCFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 60,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#4C54BB',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FBF8FF" />
                ) : (
                  <Text style={{ color: '#FBF8FF', fontSize: 17, fontWeight: '700' }}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign in redirect */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#5f5f5d' }}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-in')}
                accessibilityRole="link"
                accessibilityLabel="Sign in"
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4C54BB' }}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Quote card */}
            <View style={{
              backgroundColor: '#F6F3F1',
              borderRadius: 16,
              padding: 20,
              marginTop: 36,
            }}>
              <Text style={{ fontSize: 14, fontStyle: 'italic', color: '#323331', lineHeight: 22 }}>
                "The first step towards change is awareness. The second step is acceptance."
              </Text>
            </View>

            {/* Footer icons */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32, gap: 28 }}>
              <MaterialIcons name="spa" size={20} color="#B3B2AF" />
              <MaterialIcons name="eco" size={20} color="#B3B2AF" />
              <MaterialIcons name="self-improvement" size={20} color="#B3B2AF" />
            </View>
            <Text style={{ fontSize: 10, color: '#7B7B78', textAlign: 'center', marginTop: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
              © 2024 Driftless Sanctuary
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
