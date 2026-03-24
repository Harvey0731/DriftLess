import React from 'react'
import { View, Text, Pressable } from 'react-native'

interface QuickActionsProps {
  onStartSession: () => void
  onChat: () => void
  onProgress: () => void
  onPromises: () => void
  onBadDay?: () => void
}

interface ActionItem {
  label: string
  iconText: string
  bgColor: string
  textColor: string
  onPress: () => void
}

function QuickActions({
  onStartSession,
  onChat,
  onProgress,
  onPromises,
  onBadDay,
}: QuickActionsProps) {
  const actions: ActionItem[] = [
    {
      label: 'Start Session',
      iconText: '▶️',
      bgColor: 'bg-primary/10',
      textColor: 'text-primary',
      onPress: onStartSession,
    },
    {
      label: 'Promises',
      iconText: '🤝',
      bgColor: 'bg-secondary/10',
      textColor: 'text-secondary',
      onPress: onPromises,
    },
    {
      label: 'Chat',
      iconText: '💬',
      bgColor: 'bg-accent/10',
      textColor: 'text-accent',
      onPress: onChat,
    },
    {
      label: 'Progress',
      iconText: '📊',
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
      onPress: onProgress,
    },
  ]

  if (onBadDay) {
    actions.push({
      label: 'Not feeling it?',
      iconText: '🫂',
      bgColor: 'bg-danger/10',
      textColor: 'text-danger',
      onPress: onBadDay,
    })
  }

  return (
    <View className="px-5">
      <Text className="text-base font-bold text-text mb-3">Quick Actions</Text>
      <View className="flex-row gap-3">
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            className="flex-1 bg-surface rounded-2xl p-4 items-center shadow-sm shadow-black/5 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View
              className={`w-12 h-12 rounded-full ${action.bgColor} items-center justify-center mb-2`}
            >
              <Text className={`${action.textColor} text-sm font-bold`}>{action.iconText}</Text>
            </View>
            <Text className="text-xs text-text font-medium text-center">{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default React.memo(QuickActions)
