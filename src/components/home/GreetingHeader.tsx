import React from 'react'
import { View, Text } from 'react-native'
import { getGreeting } from '../../utils/time'

interface GreetingHeaderProps {
  name: string
  streak: number
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function GreetingHeader({ name, streak }: GreetingHeaderProps) {
  const greeting = getGreeting()
  const dateString = formatDate()

  // Context-aware subtitle based on streak
  const subtitle =
    streak === 0 ? 'Fresh start today.' : `${streak} day${streak === 1 ? '' : 's'} of showing up.`

  return (
    <View className="px-5 pt-4 pb-2">
      <Text className="text-sm text-textSecondary mb-1">{dateString}</Text>
      <Text className="text-2xl font-bold text-text">
        {greeting}, {name}
      </Text>
      <Text className="text-sm text-textSecondary mt-1">{subtitle}</Text>
      {streak > 0 && (
        <View className="flex-row items-center mt-2">
          <View className="bg-warning/20 rounded-full px-3 py-1 flex-row items-center">
            <Text className="text-warning text-sm mr-1">🔥</Text>
            <Text className="text-warning font-semibold text-sm">Day {streak} streak</Text>
          </View>
        </View>
      )}
    </View>
  )
}

export default React.memo(GreetingHeader)
