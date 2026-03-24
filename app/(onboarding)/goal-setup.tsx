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
          <View className="flex-1 px-6 py-8">
            {/* Progress indicator */}
            <View className="flex-row items-center mb-8">
              <View className="flex-1 h-1.5 rounded-full bg-primary mr-2" />
              <View className="flex-1 h-1.5 rounded-full bg-gray-200 mr-2" />
              <View className="flex-1 h-1.5 rounded-full bg-gray-200" />
            </View>
            <Text className="text-xs text-textSecondary text-center mb-6">Step 1 of 3</Text>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-2xl font-bold text-text mb-3">
                What keeps ending up on tomorrow's list?
              </Text>
              <Text className="text-base text-textSecondary leading-6">
                Most people have one thing that keeps getting pushed. Name it.
              </Text>
            </View>

            {/* Goal text area */}
            <View className="mb-4">
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-text min-h-[120px] focus:border-primary focus:bg-white"
                placeholder="Describe your goal..."
                placeholderTextColor="#9CA3AF"
                value={goal}
                onChangeText={(text) => {
                  if (text.length <= MAX_CHARS) {
                    setGoal(text)
                  }
                }}
                maxLength={500}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Goal description"
                accessibilityHint="Enter a description of your main goal, between 10 and 500 characters"
              />
              <Text
                className={`text-xs mt-1.5 ml-1 ${
                  charCount > MAX_CHARS
                    ? 'text-danger'
                    : charCount >= MIN_CHARS
                      ? 'text-accent'
                      : 'text-textSecondary'
                }`}
              >
                {charCount}/{MAX_CHARS} characters
                {charCount > 0 && charCount < MIN_CHARS && (
                  <Text className="text-textSecondary"> (minimum {MIN_CHARS})</Text>
                )}
              </Text>
            </View>

            {/* Example prompts */}
            <View className="mb-8">
              <Text className="text-sm text-textSecondary mb-3 ml-1">Or start with an idea:</Text>
              <View className="flex-row flex-wrap gap-2">
                {EXAMPLE_GOALS.map((example) => (
                  <TouchableOpacity
                    key={example}
                    onPress={() => handleChipPress(example)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      goal === example
                        ? 'bg-primary/10 border-primary'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Set goal to: ${example}`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        goal === example ? 'text-primary' : 'text-text'
                      }`}
                    >
                      {example}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Spacer */}
            <View className="flex-1" />

            {/* Continue button */}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={!isValid}
              className={`w-full rounded-xl py-4 items-center shadow-sm ${
                isValid ? 'bg-primary' : 'bg-gray-300'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Continue to next step"
              accessibilityState={{ disabled: !isValid }}
            >
              <Text
                className={`text-base font-semibold ${isValid ? 'text-white' : 'text-gray-500'}`}
              >
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
