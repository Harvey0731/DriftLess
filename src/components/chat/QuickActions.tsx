import React from 'react'
import { ScrollView, Pressable, Text } from 'react-native'
import { useRouter } from 'expo-router'

const QUICK_ACTIONS = [
  "I'm stuck",
  "I'm procrastinating",
  'Break down task',
  "I can't start",
  "I'm in a spiral",
] as const

interface QuickActionsProps {
  onSelectAction: (action: string) => void
}

export default function QuickActions({ onSelectAction }: QuickActionsProps) {
  const router = useRouter()

  const handleAction = (action: string) => {
    if (action === "I'm in a spiral") {
      router.push('/shame-emergency' as never)
      return
    }
    onSelectAction(action)
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4 py-2"
      contentContainerStyle={{ gap: 8 }}
    >
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action}
          onPress={() => handleAction(action)}
          className={`border rounded-full px-4 py-2 active:bg-primary/10 ${
            action === "I'm in a spiral" ? 'border-danger' : 'border-primary'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              action === "I'm in a spiral" ? 'text-danger' : 'text-primary'
            }`}
          >
            {action}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}
