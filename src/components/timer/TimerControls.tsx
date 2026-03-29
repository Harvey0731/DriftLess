import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

interface TimerControlsProps {
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onEnd: () => void
}

export default function TimerControls({ isPaused, onPause, onResume, onEnd }: TimerControlsProps) {
  return (
    <View style={{ alignItems: 'center', gap: 32 }}>
      {/* Large circular play/pause button */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          isPaused ? onResume() : onPause()
        }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          borderRadius: 999,
          shadowColor: '#4C54BB',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        })}
        accessibilityRole="button"
        accessibilityLabel={isPaused ? 'Resume timer' : 'Pause timer'}
      >
        <LinearGradient
          colors={['#4C54BB', '#B8BCFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons
            name={isPaused ? 'play-arrow' : 'pause'}
            size={36}
            color="#FBF8FF"
          />
        </LinearGradient>
      </Pressable>

      {/* End session text link */}
      <Pressable
        onPress={onEnd}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="End session"
      >
        <Text style={{ color: '#5F5F5D', fontSize: 15, fontWeight: '500' }}>
          I'm done for now
        </Text>
      </Pressable>
    </View>
  )
}
