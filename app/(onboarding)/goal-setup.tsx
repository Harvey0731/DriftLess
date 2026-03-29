import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const EXAMPLE_GOALS = [
  'Write my thesis',
  'Launch a side project',
  'Study for exams',
  'Build a habit',
]

const MIN_CHARS = 10
const MAX_CHARS = 500

export default function GoalSetupScreen() {
  const router = useRouter()
  const [goal, setGoal] = useState('')

  const charCount = goal.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS

  const handleChipPress = (text: string) => {
    setGoal(text)
  }

  const handleContinue = () => {
    router.push({ pathname: '/(onboarding)/notification-time', params: { goal } })
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#FCF9F7' }}>
      {/* Header: back + Driftless centered */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color="#323331" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#8B93FF', letterSpacing: -1 }}>
          Driftless
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
            {/* Heading */}
            <Text style={{ fontSize: 34, fontWeight: '800', color: '#323331', letterSpacing: -0.5, lineHeight: 40, marginBottom: 12 }}>
              What keeps ending up on tomorrow's list?
            </Text>
            <Text style={{ fontSize: 17, color: '#5f5f5d', lineHeight: 24, marginBottom: 36, maxWidth: 340 }}>
              Give that one recurring weight a name. Let's break the cycle today.
            </Text>

            {/* Goal text area */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  backgroundColor: '#F6F3F1',
                  borderRadius: 16,
                  padding: 24,
                  minHeight: 180,
                  borderWidth: 1,
                  borderColor: goal.length > 0 ? 'rgba(76, 84, 187, 0.2)' : 'rgba(179, 178, 175, 0.15)',
                }}
              >
                <TextInput
                  style={{
                    fontSize: 18,
                    fontWeight: '500',
                    color: '#323331',
                    minHeight: 120,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Enter your goal..."
                  placeholderTextColor="rgba(123, 123, 120, 0.6)"
                  value={goal}
                  onChangeText={(text) => {
                    if (text.length <= MAX_CHARS) setGoal(text)
                  }}
                  maxLength={500}
                  multiline
                  accessibilityLabel="Goal description"
                />
                {/* Character counter + status dot */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#7B7B78', marginRight: 8 }}>
                    {charCount} / {MAX_CHARS}
                  </Text>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: charCount >= MIN_CHARS ? '#006B64' : '#B3B2AF',
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Quick Starts */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#5f5f5d', letterSpacing: 3, marginBottom: 14, marginLeft: 2, textTransform: 'uppercase' }}>
                Quick Starts
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {EXAMPLE_GOALS.map((example) => (
                  <TouchableOpacity
                    key={example}
                    onPress={() => handleChipPress(example)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 999,
                      backgroundColor: goal === example ? 'rgba(76, 84, 187, 0.12)' : '#EAE8E5',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set goal to: ${example}`}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: goal === example ? '#4C54BB' : '#323331' }}>
                      {example}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Continue button */}
            <View style={{ paddingTop: 24 }}>
              <TouchableOpacity
                onPress={handleContinue}
                disabled={!isValid}
                style={{
                  borderRadius: 999,
                  overflow: 'hidden',
                  opacity: isValid ? 1 : 0.5,
                }}
                accessibilityRole="button"
                accessibilityLabel="Continue to next step"
                accessibilityState={{ disabled: !isValid }}
                activeOpacity={0.9}
              >
                {isValid ? (
                  <LinearGradient
                    colors={['#4C54BB', '#B8BCFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#FBF8FF', marginRight: 8 }}>
                      Continue
                    </Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#FBF8FF" />
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      backgroundColor: '#E4E2DF',
                      paddingVertical: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#7B7B78', marginRight: 8 }}>
                      Continue
                    </Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#7B7B78" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={{ textAlign: 'center', marginTop: 16, fontSize: 13, fontWeight: '500', color: 'rgba(95, 95, 93, 0.6)' }}>
                Minimum 10 characters to proceed
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
