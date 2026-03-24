import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/src/lib/supabase'
import { completeOnboarding } from '@/src/services/profile.service'

type ProcrastinationType = 'too_big' | 'fear_of_failure' | 'unclear_start' | 'low_motivation'

interface ProcrastinationOption {
  key: ProcrastinationType
  label: string
}

const PROCRASTINATION_OPTIONS: ProcrastinationOption[] = [
  { key: 'too_big', label: 'It feels too big' },
  { key: 'fear_of_failure', label: "I'm scared of doing it wrong" },
  { key: 'unclear_start', label: "Don't know where to start" },
  { key: 'low_motivation', label: "Just can't make myself care" },
]

export default function TrialConfirmationScreen() {
  const router = useRouter()
  const { goal, notificationHour } = useLocalSearchParams<{ goal: string; notificationHour: string }>()
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<ProcrastinationType | null>(null)

  const handleStart = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await completeOnboarding(
        user.id,
        goal ?? '',
        Number(notificationHour ?? 8),
        selectedType ?? undefined,
      )

      // Activate trial via server-side edge function (prevents client-side forgery)
      const { error } = await supabase.functions.invoke('activate-trial')
      if (error) {
        setLoading(false)
        Alert.alert('Error', 'Failed to activate trial. Please try again.')
        return
      }
    }

    setLoading(false)
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 py-8">
          {/* Progress indicator */}
          <View className="flex-row items-center mb-8">
            <View className="flex-1 h-1.5 rounded-full bg-primary mr-2" />
            <View className="flex-1 h-1.5 rounded-full bg-primary mr-2" />
            <View className="flex-1 h-1.5 rounded-full bg-primary" />
          </View>
          <Text className="text-xs text-textSecondary text-center mb-6">
            Step 3 of 3
          </Text>

          {/* Header */}
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-text mb-2 text-center">
              Let's find out why you actually get stuck
            </Text>
            <Text className="text-base text-textSecondary text-center mt-2">
              This helps us tailor your experience. Pick the one that fits best.
            </Text>
          </View>

          {/* Procrastination type options */}
          <View className="gap-3 mb-8">
            {PROCRASTINATION_OPTIONS.map((option) => {
              const isSelected = selectedType === option.key
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setSelectedType(option.key)}
                  className={`p-4 rounded-xl border-2 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-base font-medium flex-1 ${
                        isSelected ? 'text-primary' : 'text-text'
                      }`}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <View className="w-6 h-6 rounded-full bg-primary items-center justify-center ml-3">
                        <Text className="text-white text-xs font-bold">
                          {'\u2713'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Start button */}
          <TouchableOpacity
            onPress={handleStart}
            disabled={loading}
            className={`w-full rounded-xl py-4 items-center shadow-sm ${
              loading ? 'bg-accent/70' : 'bg-accent'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Start using Driftless"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Start — let's figure this out
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
