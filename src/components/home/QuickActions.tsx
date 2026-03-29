import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface QuickActionsProps {
  onStartSession: () => void
  onChat: () => void
  onProgress: () => void
  onPromises: () => void
  onBadDay?: () => void
}

function QuickActions({
  onStartSession,
  onChat,
  onPromises,
  onBadDay,
}: QuickActionsProps) {
  const cardStyle = {
    borderWidth: 1,
    borderColor: 'rgba(179, 178, 175, 0.05)',
  }

  const actions = [
    {
      label: 'Start Session',
      icon: 'play-arrow' as const,
      iconColor: '#4C54BB',
      iconBg: 'rgba(76, 84, 187, 0.1)',
      onPress: onStartSession,
    },
    {
      label: 'My Promise',
      icon: 'auto-awesome' as const,
      iconColor: '#006B64',
      iconBg: 'rgba(0, 107, 100, 0.1)',
      onPress: onPromises,
    },
    {
      label: 'Chat',
      icon: 'chat-bubble' as const,
      iconColor: '#7B5913',
      iconBg: 'rgba(123, 89, 19, 0.1)',
      onPress: onChat,
    },
    {
      label: 'Not feeling it?',
      icon: 'sentiment-dissatisfied' as const,
      iconColor: '#AC3149',
      iconBg: 'rgba(172, 49, 73, 0.1)',
      onPress: onBadDay,
    },
  ]

  return (
    <View className="px-5">
      {/* Row 1 */}
      <View className="flex-row" style={{ gap: 12, marginBottom: 12 }}>
        {actions.slice(0, 2).map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            className="flex-1 bg-white rounded-2xl items-center justify-center active:opacity-80"
            style={{ ...cardStyle, aspectRatio: 1, padding: 20 }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: action.iconBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <MaterialIcons name={action.icon} size={24} color={action.iconColor} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#323331' }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
      {/* Row 2 */}
      <View className="flex-row" style={{ gap: 12 }}>
        {actions.slice(2, 4).map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            className="flex-1 bg-white rounded-2xl items-center justify-center active:opacity-80"
            style={{ ...cardStyle, aspectRatio: 1, padding: 20 }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: action.iconBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <MaterialIcons name={action.icon} size={24} color={action.iconColor} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#323331' }}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default React.memo(QuickActions)
