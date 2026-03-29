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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
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
          {/* Header bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#4C54BB', letterSpacing: -1 }}>
              Driftless
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Back"
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialIcons name="arrow-back" size={18} color="#4C54BB" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#4C54BB' }}>Back</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center px-6 py-6">
            {/* Heading */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 34, fontWeight: '700', color: '#323331', letterSpacing: -0.5, lineHeight: 40, marginBottom: 10 }}>
                Reset your password.
              </Text>
              <Text style={{ fontSize: 17, color: '#5f5f5d' }}>
                Enter your email and we'll send you a link to get back in.
              </Text>
            </View>

            {/* Card shell */}
            <View style={{ backgroundColor: '#F6F3F1', borderRadius: 16, padding: 28 }}>
              {success ? (
                /* Success state */
                <View>
                  <View style={{
                    backgroundColor: '#8EF4E9',
                    borderRadius: 16,
                    padding: 24,
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                    <MaterialIcons name="mark-email-read" size={40} color="#006B64" style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#006B64', textAlign: 'center', marginBottom: 8 }}>
                      Check your email
                    </Text>
                    <Text style={{ fontSize: 14, color: '#006B64', textAlign: 'center', lineHeight: 20 }}>
                      We've sent a password reset link to{' '}
                      <Text style={{ fontWeight: '700' }}>{email}</Text>. Check your inbox and follow the instructions.
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/sign-in')}
                    style={{ borderRadius: 999, overflow: 'hidden' }}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#4C54BB', '#B8BCFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingVertical: 16, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#FBF8FF', fontSize: 16, fontWeight: '700' }}>Back to Sign In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Email field */}
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

                  {/* Error */}
                  {error && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                      <MaterialIcons name="info-outline" size={16} color="#AC3149" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#AC3149', flex: 1 }}>{error}</Text>
                    </View>
                  )}

                  {/* Send reset link button */}
                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={loading}
                    style={{ borderRadius: 999, overflow: 'hidden' }}
                    accessibilityRole="button"
                    accessibilityLabel="Send reset link"
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
                        <Text style={{ color: '#FBF8FF', fontSize: 16, fontWeight: '700' }}>Send Reset Link</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Back to sign in */}
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/sign-in')}
                    style={{ alignSelf: 'center', marginTop: 24 }}
                    accessibilityRole="link"
                    accessibilityLabel="Back to sign in"
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#4C54BB' }}>Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              )}
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
                  "Every moment is a fresh beginning."
                </Text>
                <Text style={{ color: 'rgba(0, 107, 100, 0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 8 }}>
                  — T.S. Eliot
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
