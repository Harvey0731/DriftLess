import React from 'react'
import { View, Text, Pressable } from 'react-native'

export interface GoalTask {
  id: string
  title: string
  estimatedMinutes: number
  completed: boolean
}

interface GoalCardProps {
  goalText: string
  tasks: GoalTask[]
  onToggleTask: (taskId: string) => void
}

function GoalCard({ goalText, tasks, onToggleTask }: GoalCardProps) {
  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? completedCount / totalCount : 0

  return (
    <View className="mx-5 bg-surface rounded-2xl p-4 shadow-sm shadow-black/5">
      <Text className="text-lg font-bold text-text mb-1">Today's Goal</Text>
      <Text className="text-sm text-textSecondary mb-4">{goalText}</Text>

      {/* Progress bar */}
      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-2 bg-calm rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <Text className="text-xs text-textSecondary ml-3">
          {completedCount}/{totalCount}
        </Text>
      </View>

      {/* Task checklist */}
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          onPress={() => onToggleTask(task.id)}
          className="flex-row items-center py-2 border-b border-calm/50 last:border-b-0"
          accessibilityRole="checkbox"
          accessibilityLabel={task.title}
          accessibilityState={{ checked: task.completed }}
        >
          <View
            className={`w-5 h-5 rounded-md border-2 mr-3 items-center justify-center ${
              task.completed ? 'bg-accent border-accent' : 'border-textSecondary/40'
            }`}
          >
            {task.completed && <Text className="text-white text-xs font-bold">✅</Text>}
          </View>
          <Text
            className={`flex-1 text-sm ${
              task.completed ? 'text-textSecondary line-through' : 'text-text'
            }`}
          >
            {task.title}
          </Text>
          <Text className="text-xs text-textSecondary">{task.estimatedMinutes}m</Text>
        </Pressable>
      ))}
    </View>
  )
}

export default React.memo(GoalCard)
