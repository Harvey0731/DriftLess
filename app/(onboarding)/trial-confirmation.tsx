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
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '@/src/lib/supabase'
import { completeOnboarding } from '@/src/services/profile.service'
import { useAuthStore } from '@/src/stores/authStore'

type ProcrastinationType = 'too_big' | 'fear_of_failure' | 'unclear_start' | 'low_motivation'

interface ProcrastinationOption {
  key: ProcrastinationType
  label: string
  description: string
  icon: string
  iconBgColor: string
}

const PROCRASTINATION_OPTIONS: ProcrastinationOption[] = [
  {
    key: 'too_big',
    label: 'It feels too big',
    description: "The scope is overwhelming and I don't see the finish line.",
    icon: '🏔',
    iconBgColor: '#DBEAFE',
  },
  {
    key: 'fear_of_failure',
    label: "I'm scared of doing it wrong",
    description: "If it isn't perfect, I'd rather not do it at all right now.",
    icon: '💎',
    iconBgColor: '#CCFBF1',
  },
  {
    key: 'unclear_start',
    label: "I don't know where to start",
    description: "I'm paralyzed by the very first step of the process.",
    icon: '🧭',
    iconBgColor: '#FFEDD5',
  },
  {
    key: 'low_motivation',
    label: "I just can't make myself care",
    description: 'The task feels meaningless or disconnected from my goals.',
    icon: '😔',
    iconBgColor: '#FCE7F3',
  },
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

      // Activate trial via server-side edge function (best-effort, don't block onboarding)
      try {
        await supabase.functions.invoke('activate-trial')
      } catch {
        // Trial activation is non-critical — user can still use the app
        console.warn('Trial activation skipped — edge function not available')
      }
    }

    // Refresh the authStore profile so the route guard sees onboarding_done: true
    // before we navigate — otherwise the stale cache would bounce us back to onboarding
    await useAuthStore.getState().fetchProfile().catch(() => {})
    setLoading(false)
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAF8F5]">
      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
          accessibilityLabel="Go back"
        >
          <Text className="text-xl text-gray-800">←</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-base font-semibold text-primary">Driftless</Text>
        </View>
        <View className="w-10" />
      </View>

      {/* Progress bar */}
      <View className="px-6 mb-4">
        <View className="h-1 rounded-full bg-gray-200">
          <View className="h-1 rounded-full bg-primary" style={{ width: '66%' }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 pb-8">
          {/* Heading */}
          <View className="items-center mb-2 mt-2">
            <Text className="text-[28px] font-bold text-gray-900 text-center leading-[34px]">
              Let's find out why you actually get stuck.
            </Text>
          </View>
          <Text className="text-base text-gray-500 text-center mt-2 mb-8 leading-6">
            Be honest with yourself. There are no wrong answers in this sanctuary.
          </Text>

          {/* Procrastination type options */}
          <View style={{ gap: 12, marginBottom: 24 }}>
            {PROCRASTINATION_OPTIONS.map((option) => {
              const isSelected = selectedType === option.key
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setSelectedType(option.key)}
                  className={`p-4 rounded-2xl border-2 bg-white ${
                    isSelected ? 'border-primary' : 'border-transparent'
                  }`}
                  style={
                    !isSelected
                      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }
                      : { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 }
                  }
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: option.iconBgColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text className="text-lg">{option.icon}</Text>
                  </View>
                  <Text className="text-base font-bold text-gray-900 mb-1">
                    {option.label}
                  </Text>
                  <Text className="text-sm text-gray-500 leading-5">
                    {option.description}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Motivational quote */}
          <LinearGradient
            colors={['#C4B5FD', '#93C5FD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, padding: 20, marginBottom: 32 }}
          >
            <View className="flex-row items-start">
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  marginTop: 2,
                }}
              >
                <Text style={{ fontSize: 14 }}>💡</Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14,
                  lineHeight: 20,
                  fontStyle: 'italic',
                }}
              >
                "Understanding the 'why' is the first step to unlocking the 'how'."
              </Text>
            </View>
          </LinearGradient>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Start button */}
          <TouchableOpacity
            onPress={handleStart}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Start using Driftless"
            accessibilityState={{ disabled: loading }}
          >
            <LinearGradient
              colors={loading ? ['#C4B5FD', '#A78BFA'] : ['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', borderRadius: 16, paddingVertical: 18, alignItems: 'center' }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-bold">
                  Start — let's figure this out.
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text className="text-xs text-gray-400 text-center mt-4 tracking-[1px]">
            STEP 4 OF 6
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
