import React from 'react'
import { View, Text } from 'react-native'

interface StatCardsProps {
  focusMinutes: number
  streak: number
}

function StatCards({ focusMinutes, streak }: StatCardsProps) {
  return (
    <View className="flex-row gap-3 px-5">
      {/* Focus Today */}
      <View className="flex-1 bg-surface rounded-2xl p-4 shadow-sm shadow-black/5">
        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
          <Text className="text-primary text-base font-bold">⏱️</Text>
        </View>
        <Text className="text-2xl font-bold text-text">{focusMinutes}</Text>
        <Text className="text-xs text-textSecondary">Focus minutes today</Text>
      </View>

      {/* Streak */}
      <View className="flex-1 bg-surface rounded-2xl p-4 shadow-sm shadow-black/5">
        <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center mb-2">
          <Text className="text-warning text-base font-bold">🔥</Text>
        </View>
        <Text className="text-2xl font-bold text-text">{streak}</Text>
        <Text className="text-xs text-textSecondary">Day streak</Text>
      </View>
    </View>
  )
}

export default React.memo(StatCards)
