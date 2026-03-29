import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'

type TimeOption = {
  label: string
  description: string
  subtext: string
  hour: number
  icon: string
}

const PRESET_TIMES: TimeOption[] = [
  { label: 'Morning', description: '8:00 AM', subtext: "We'll check in before the avoidance kicks in.", hour: 8, icon: '🌅' },
  { label: 'Midday', description: '12:00 PM', subtext: 'A midday reset to realign your focus.', hour: 12, icon: '☀️' },
  { label: 'Afternoon', description: '3:00 PM', subtext: 'Catch the post-lunch energy dip.', hour: 15, icon: '🌤' },
  { label: 'Evening', description: '7:00 PM', subtext: 'Wind-down planning for tomorrow.', hour: 19, icon: '🌙' },
]

const CUSTOM_HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i >= 12 ? 'PM' : 'AM'
  const displayHour = i % 12 || 12
  return { hour: i, label: `${displayHour}:00 ${ampm}` }
})

export default function NotificationTimeScreen() {
  const router = useRouter()
  const { goal } = useLocalSearchParams<{ goal: string }>()

  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [customHour, setCustomHour] = useState<number | null>(null)
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const hasSelection = selectedPreset !== null || (isCustom && customHour !== null)

  const handlePresetPress = (index: number) => {
    setSelectedPreset(index)
    setIsCustom(false)
    setShowCustomPicker(false)
  }

  const handleCustomPress = () => {
    setSelectedPreset(null)
    setIsCustom(true)
    setShowCustomPicker(true)
  }

  const handleCustomHourSelect = (hour: number) => {
    setCustomHour(hour)
  }

  const getCustomTimeLabel = (): string => {
    if (customHour === null) return ''
    const match = CUSTOM_HOURS.find((h) => h.hour === customHour)
    return match?.label ?? ''
  }

  const handleContinue = () => {
    const notificationHour = isCustom ? (customHour ?? 8) : PRESET_TIMES[selectedPreset ?? 0].hour
    router.push({
      pathname: '/(onboarding)/trial-confirmation',
      params: { goal, notificationHour: String(notificationHour) },
    })
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
          <View className="h-1 rounded-full bg-primary" style={{ width: '33%' }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">
          {/* Heading */}
          <View className="mb-8">
            <Text className="text-[28px] font-bold text-gray-900 leading-[34px] mb-2">
              When do you usually intend to start — but don't?
            </Text>
            <Text className="text-base text-gray-500 leading-6">
              We'll check in before the avoidance kicks in. One gentle nudge per day.
            </Text>
          </View>

          {/* Preset time options - 2x2 grid */}
          <View style={{ gap: 12, marginBottom: 16 }}>
            <View className="flex-row" style={{ gap: 12 }}>
              {PRESET_TIMES.slice(0, 2).map((option, index) => {
                const isSelected = selectedPreset === index && !isCustom
                return (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => handlePresetPress(index)}
                    className={`flex-1 p-4 rounded-2xl border-2 bg-white ${
                      isSelected ? 'border-primary' : 'border-transparent'
                    }`}
                    style={
                      !isSelected
                        ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }
                        : { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 }
                    }
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.label} at ${option.description}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text className="text-2xl mb-2">{option.icon}</Text>
                    <Text className="text-base font-bold text-gray-900">{option.label}</Text>
                    <Text className="text-sm text-gray-500 mt-0.5">{option.description}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View className="flex-row" style={{ gap: 12 }}>
              {PRESET_TIMES.slice(2).map((option, index) => {
                const realIndex = index + 2
                const isSelected = selectedPreset === realIndex && !isCustom
                return (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => handlePresetPress(realIndex)}
                    className={`flex-1 p-4 rounded-2xl border-2 bg-white ${
                      isSelected ? 'border-primary' : 'border-transparent'
                    }`}
                    style={
                      !isSelected
                        ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }
                        : { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 }
                    }
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.label} at ${option.description}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text className="text-2xl mb-2">{option.icon}</Text>
                    <Text className="text-base font-bold text-gray-900">{option.label}</Text>
                    <Text className="text-sm text-gray-500 mt-0.5">{option.description}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Custom time option */}
          <TouchableOpacity
            onPress={handleCustomPress}
            className={`p-4 rounded-2xl border-2 mb-4 bg-white ${
              isCustom ? 'border-primary' : 'border-transparent'
            }`}
            style={
              !isCustom
                ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }
                : { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 }
            }
            accessibilityRole="radio"
            accessibilityLabel={`Custom time${isCustom && customHour !== null ? `, currently set to ${getCustomTimeLabel()}` : ''}`}
            accessibilityState={{ selected: isCustom }}
          >
            <Text className="text-2xl mb-2">⏰</Text>
            <Text className="text-base font-bold text-gray-900">Custom Time</Text>
            {isCustom && customHour !== null && (
              <Text className="text-sm text-gray-500 mt-0.5">{getCustomTimeLabel()}</Text>
            )}
          </TouchableOpacity>

          {/* Custom time picker grid */}
          {showCustomPicker && isCustom && (
            <View className="mb-4 bg-white rounded-2xl p-3">
              <Text className="text-xs text-gray-400 mb-2 ml-1 font-semibold tracking-[0.5px]">SELECT A TIME</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {CUSTOM_HOURS.map((item) => {
                  const isHourSelected = customHour === item.hour
                  return (
                    <TouchableOpacity
                      key={item.hour}
                      onPress={() => handleCustomHourSelect(item.hour)}
                      className={`px-3 py-2 rounded-xl ${
                        isHourSelected ? 'bg-primary' : 'bg-gray-50'
                      }`}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected: isHourSelected }}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          isHourSelected ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Continue button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!hasSelection}
            className={`w-full rounded-2xl py-4.5 items-center flex-row justify-center ${
              hasSelection ? 'bg-primary' : 'bg-[#E5E2DF]'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
            accessibilityState={{ disabled: !hasSelection }}
          >
            <Text
              className={`text-base font-semibold mr-2 ${
                hasSelection ? 'text-white' : 'text-gray-400'
              }`}
            >
              Continue
            </Text>
            <Text className={`text-base ${hasSelection ? 'text-white' : 'text-gray-400'}`}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
