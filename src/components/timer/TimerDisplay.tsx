import React from 'react'
import { View, Text } from 'react-native'
import { formatTimer } from '../../utils/time'

interface TimerDisplayProps {
  elapsedSeconds: number
  plannedMinutes: number
  isPaused: boolean
}

function formatPlannedTime(plannedMinutes: number): string {
  const safe = Math.max(0, Math.floor(plannedMinutes))
  if (safe >= 60) {
    const hours = Math.floor(safe / 60)
    const mins = safe % 60
    const hh = String(hours).padStart(2, '0')
    const mm = String(mins).padStart(2, '0')
    return `${hh}:${mm}:00`
  }

  return `${String(safe).padStart(2, '0')}:00`
}

export default function TimerDisplay({
  elapsedSeconds,
  plannedMinutes,
  isPaused,
}: TimerDisplayProps) {
  return (
    <View className="items-center">
      <Text
        className={`text-6xl font-bold tracking-tight ${
          isPaused ? 'text-purple-300' : 'text-purple-600'
        }`}
      >
        {formatTimer(elapsedSeconds)}
      </Text>

      <Text className="text-lg text-gray-400 mt-1">/ {formatPlannedTime(plannedMinutes)}</Text>

      {isPaused && <Text className="text-base text-purple-400 font-medium mt-2">Paused</Text>}
    </View>
  )
}
