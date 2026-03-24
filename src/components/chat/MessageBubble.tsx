import React from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import type { ChatMessage } from '../../types/database'

/** Minimal message shape for MessageBubble — accepts full ChatMessage or lightweight UI-only messages. */
export type ChatBubbleMessage = Pick<ChatMessage, 'id' | 'role' | 'content' | 'created_at'>

interface MessageBubbleProps {
  message: ChatBubbleMessage
  onDelete?: (id: string) => void
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function MessageBubble({ message, onDelete }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const handleLongPress = () => {
    if (!isUser || !onDelete) return
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(message.id),
      },
    ])
  }

  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <Pressable
        onLongPress={handleLongPress}
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? 'bg-primary' : 'bg-gray-100'}`}
        accessibilityRole="text"
        accessibilityLabel={`${isUser ? 'You' : 'Drift'}: ${message.content}`}
        accessibilityHint={isUser && onDelete ? 'Long press to delete' : undefined}
      >
        <Text className={`text-base leading-6 ${isUser ? 'text-white' : 'text-gray-800'}`}>
          {message.content}
        </Text>
      </Pressable>
      <Text className="text-xs text-gray-400 mt-1 px-1">{formatTimestamp(message.created_at)}</Text>
    </View>
  )
}

export default React.memo(MessageBubble)
