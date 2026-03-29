import React from 'react'
import { View, Text } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface StatCardsProps {
  focusMinutes: number
  streak: number
}

function StatCards({ focusMinutes, streak }: StatCardsProps) {
  return (
    <View className="flex-row px-5" style={{ gap: 12 }}>
      {/* Focus Minutes — bg-surface-container-low (#F6F3F1) */}
      <View className="flex-1 rounded-2xl p-5" style={{ backgroundColor: '#F6F3F1' }}>
        <MaterialIcons name="timer" size={24} color="#4C54BB" style={{ marginBottom: 8 }} />
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#323331' }}>{focusMinutes}</Text>
        <Text style={{ fontSize: 11, color: '#5f5f5d', letterSpacing: 1, fontWeight: '500', marginTop: 4, textTransform: 'uppercase' }}>
          Focus Minutes
        </Text>
      </View>

      {/* Day Streak */}
      <View className="flex-1 rounded-2xl p-5" style={{ backgroundColor: '#F6F3F1' }}>
        <MaterialIcons name="local-fire-department" size={24} color="#006B64" style={{ marginBottom: 8 }} />
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#323331' }}>{streak}</Text>
        <Text style={{ fontSize: 11, color: '#5f5f5d', letterSpacing: 1, fontWeight: '500', marginTop: 4, textTransform: 'uppercase' }}>
          Day Streak
        </Text>
      </View>
    </View>
  )
}

export default React.memo(StatCards)
