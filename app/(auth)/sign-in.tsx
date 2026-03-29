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
import { supabase } from '@/src/lib/supabase'

export default function SignInScreen() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          {/* Header bar: Driftless + Help */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#4C54BB', letterSpacing: -1 }}>
              Driftless
            </Text>
            <TouchableOpacity accessibilityLabel="Help">
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#4C54BB' }}>Help</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center px-6 py-6">
            {/* Heading */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 34, fontWeight: '700', color: '#323331', letterSpacing: -0.5, lineHeight: 40, marginBottom: 10 }}>
                Welcome back to Driftless.
              </Text>
              <Text style={{ fontSize: 17, color: '#5f5f5d' }}>
                Your sanctuary of calm is waiting for you.
              </Text>
            </View>

            {/* Card shell — tonal layering, no borders */}
            <View style={{ backgroundColor: '#F6F3F1', borderRadius: 16, padding: 28 }}>
              {/* Email */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#5f5f5d', marginBottom: 8, marginLeft: 4 }}>
                  Email
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 16 }}>
                  <MaterialIcons name="mail-outline" size={20} color="#B3B2AF" style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 15, fontSize: 15, color: '#323331' }}
                    placeholder="name@example.com"
                    placeholderTextColor="#B3B2AF"
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
              </View>

              {/* Password */}
              <View style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#5f5f5d' }}>
                    Password
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    accessibilityRole="link"
                    accessibilityLabel="Forgot password"
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C54BB' }}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 16 }}>
                  <MaterialIcons name="lock-outline" size={20} color="#B3B2AF" style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 15, fontSize: 15, color: '#323331' }}
                    placeholder="••••••••"
                    placeholderTextColor="#B3B2AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    maxLength={72}
                    autoCapitalize="none"
                    autoComplete="password"
                    accessibilityLabel="Password input"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color="#B3B2AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error */}
              {error && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
                  <MaterialIcons name="info-outline" size={16} color="#AC3149" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#AC3149', flex: 1 }}>{error}</Text>
                </View>
              )}

              {/* Sign In button — gradient */}
              <TouchableOpacity
                onPress={handleSignIn}
                disabled={loading}
                style={{ marginTop: 20, borderRadius: 999, overflow: 'hidden' }}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#4C54BB', '#B8BCFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
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
                    <Text style={{ color: '#FBF8FF', fontSize: 16, fontWeight: '700' }}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider: Or continue with */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(179, 178, 175, 0.15)' }} />
                <Text style={{ fontSize: 10, color: '#B3B2AF', letterSpacing: 2, textTransform: 'uppercase', marginHorizontal: 12 }}>
                  Or continue with
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(179, 178, 175, 0.15)' }} />
              </View>

              {/* Social buttons */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 999,
                    paddingVertical: 13,
                    gap: 10,
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16 }}>G</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#323331' }}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 999,
                    paddingVertical: 13,
                    gap: 10,
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="apple" size={20} color="#323331" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#323331' }}>Apple</Text>
                </TouchableOpacity>
              </View>

              {/* Sign up link */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                <Text style={{ fontSize: 13, color: '#5f5f5d' }}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/sign-up')}
                  accessibilityRole="link"
                  accessibilityLabel="Sign up"
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#4C54BB' }}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reflection pill */}
            <View
              style={{
                backgroundColor: '#8EF4E9',
                borderRadius: 16,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginTop: 32,
              }}
            >
              <MaterialIcons name="auto-awesome" size={22} color="#006B64" style={{ marginRight: 14, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#006B64', fontWeight: '500', fontSize: 14, lineHeight: 22, fontStyle: 'italic' }}>
                  "The best time to plant a tree was 20 years ago. The second best time is now."
                </Text>
                <Text style={{ color: 'rgba(0, 107, 100, 0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 8 }}>
                  — Chinese Proverb
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
