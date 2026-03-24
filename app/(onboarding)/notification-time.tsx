import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'

type TimeOption = {
  label: string
  description: string
  hour: number
  minute: number
}

const PRESET_TIMES: TimeOption[] = [
  { label: 'Morning', description: '8:00 AM', hour: 8, minute: 0 },
  { label: 'Midday', description: '12:00 PM', hour: 12, minute: 0 },
  { label: 'Afternoon', description: '3:00 PM', hour: 15, minute: 0 },
  { label: 'Evening', description: '7:00 PM', hour: 19, minute: 0 },
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
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 py-8">
          {/* Progress indicator */}
          <View className="flex-row items-center mb-8">
            <View className="flex-1 h-1.5 rounded-full bg-primary mr-2" />
            <View className="flex-1 h-1.5 rounded-full bg-primary mr-2" />
            <View className="flex-1 h-1.5 rounded-full bg-gray-200" />
          </View>
          <Text className="text-xs text-textSecondary text-center mb-6">Step 2 of 3</Text>

          {/* Header */}
          <View className="mb-8">
            <Text className="text-2xl font-bold text-text mb-3">
              When do you usually intend to start — but don't?
            </Text>
            <Text className="text-base text-textSecondary leading-6">
              We'll check in before the avoidance kicks in. One gentle nudge per day.
            </Text>
          </View>

          {/* Preset time options */}
          <View className="gap-3 mb-4">
            {PRESET_TIMES.map((option, index) => {
              const isSelected = selectedPreset === index && !isCustom
              return (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => handlePresetPress(index)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
                  }`}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option.label} at ${option.description}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View>
                    <Text
                      className={`text-base font-semibold ${
                        isSelected ? 'text-primary' : 'text-text'
                      }`}
                    >
                      {option.label}
                    </Text>
                    <Text className="text-sm text-textSecondary mt-0.5">{option.description}</Text>
                  </View>
                  {isSelected && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                      <Text className="text-white text-xs font-bold">{'\u2713'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Custom time option */}
          <TouchableOpacity
            onPress={handleCustomPress}
            className={`flex-row items-center justify-between p-4 rounded-xl border-2 mb-4 ${
              isCustom ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
            }`}
            accessibilityRole="radio"
            accessibilityLabel={`Custom time${isCustom && customHour !== null ? `, currently set to ${getCustomTimeLabel()}` : ''}`}
            accessibilityState={{ selected: isCustom }}
          >
            <View>
              <Text
                className={`text-base font-semibold ${isCustom ? 'text-primary' : 'text-text'}`}
              >
                Custom Time
              </Text>
              {isCustom && customHour !== null && (
                <Text className="text-sm text-textSecondary mt-0.5">{getCustomTimeLabel()}</Text>
              )}
            </View>
            {isCustom && customHour !== null && (
              <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                <Text className="text-white text-xs font-bold">{'\u2713'}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Custom time picker grid */}
          {showCustomPicker && isCustom && (
            <View className="mb-4 bg-gray-50 rounded-xl p-3">
              <Text className="text-xs text-textSecondary mb-2 ml-1">Select a time:</Text>
              <View className="flex-row flex-wrap gap-2">
                {CUSTOM_HOURS.map((item) => {
                  const isHourSelected = customHour === item.hour
                  return (
                    <TouchableOpacity
                      key={item.hour}
                      onPress={() => handleCustomHourSelect(item.hour)}
                      className={`px-3 py-2 rounded-lg ${
                        isHourSelected ? 'bg-primary' : 'bg-white border border-gray-200'
                      }`}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected: isHourSelected }}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          isHourSelected ? 'text-white' : 'text-text'
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
            className={`w-full rounded-xl py-4 items-center shadow-sm ${
              hasSelection ? 'bg-primary' : 'bg-gray-300'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
            accessibilityState={{ disabled: !hasSelection }}
          >
            <Text
              className={`text-base font-semibold ${hasSelection ? 'text-white' : 'text-gray-500'}`}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
