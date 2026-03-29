import React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { getGreeting } from '../../utils/time'

interface GreetingHeaderProps {
  name: string
  streak: number
  avatarUrl?: string | null
  onSearchPress?: () => void
  onNotificationPress?: () => void
  onAvatarPress?: () => void
}

function GreetingHeader({
  name,
  avatarUrl,
  onSearchPress,
  onNotificationPress,
  onAvatarPress,
}: GreetingHeaderProps) {
  const greeting = getGreeting()

  return (
    <View className="px-5 pt-2 pb-1">
      {/* Top bar: brand + icons */}
      <View className="flex-row items-center justify-between mb-5">
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#8B93FF', letterSpacing: -1 }}>
          Driftless
        </Text>
        <View className="flex-row items-center" style={{ gap: 2 }}>
          <TouchableOpacity
            onPress={onSearchPress}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}
            accessibilityLabel="Search"
          >
            <MaterialIcons name="search" size={24} color="#78716C" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNotificationPress}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}
            accessibilityLabel="Notifications"
          >
            <MaterialIcons name="notifications-none" size={24} color="#78716C" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAvatarPress}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#E5E7EB',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginLeft: 6,
              borderWidth: 2,
              borderColor: 'rgba(76, 84, 187, 0.1)',
            }}
            accessibilityLabel="Profile"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <MaterialIcons name="person" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting — matches mockup: large bold name, subtitle below */}
      <Text style={{ fontSize: 34, fontWeight: '700', color: '#323331', lineHeight: 40, letterSpacing: -0.5 }}>
        {greeting}, {name}.
      </Text>
      <Text style={{ fontSize: 20, fontWeight: '500', color: '#5f5f5d', marginTop: 4 }}>
        What's been sitting undone?
      </Text>
    </View>
  )
}

export default React.memo(GreetingHeader)
