import React from 'react'
import { View, Text, Pressable } from 'react-native'

interface TimerControlsProps {
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onEnd: () => void
}

export default function TimerControls({ isPaused, onPause, onResume, onEnd }: TimerControlsProps) {
  return (
    <View className="items-center gap-4">
      {/* Large circular play/pause button */}
      <Pressable
        onPress={isPaused ? onResume : onPause}
        className={`w-20 h-20 rounded-full items-center justify-center ${
          isPaused ? 'bg-purple-500' : 'bg-purple-600'
        }`}
        style={({ pressed }) => [pressed ? { opacity: 0.85, transform: [{ scale: 0.95 }] } : {}]}
        accessibilityRole="button"
        accessibilityLabel={isPaused ? 'Resume timer' : 'Pause timer'}
      >
        {isPaused ? (
          /* Play icon: right-pointing triangle */
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 20,
              borderTopWidth: 14,
              borderBottomWidth: 14,
              borderLeftColor: 'white',
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              marginLeft: 4,
            }}
          />
        ) : (
          /* Pause icon: two vertical bars */
          <View className="flex-row gap-2">
            <View className="w-3 h-7 rounded-sm bg-white" />
            <View className="w-3 h-7 rounded-sm bg-white" />
          </View>
        )}
      </Pressable>

      {/* End session button */}
      <Pressable
        onPress={onEnd}
        className="bg-gray-100 rounded-xl px-8 py-3"
        style={({ pressed }) => [pressed ? { opacity: 0.7 } : {}]}
        accessibilityRole="button"
        accessibilityLabel="End session"
      >
        <Text className="text-gray-600 text-base font-medium">I'm done for now</Text>
      </Pressable>
    </View>
  )
}
