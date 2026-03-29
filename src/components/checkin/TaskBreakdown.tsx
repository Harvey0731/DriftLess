import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

export interface Task {
  id: string
  title: string
  estimatedMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  included: boolean
}

interface TaskBreakdownProps {
  tasks: Task[]
  onToggle: (taskId: string) => void
  onMakeSmaller: (taskId: string) => void
}

const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    icon: 'eco' as const,
    color: '#006B64',
    bg: 'rgba(0,107,100,0.12)',
  },
  medium: {
    label: 'Medium',
    icon: 'bolt' as const,
    color: '#4C54BB',
    bg: 'rgba(76,84,187,0.12)',
  },
  hard: {
    label: 'Hard',
    icon: 'whatshot' as const,
    color: '#BA4900',
    bg: 'rgba(186,73,0,0.12)',
  },
}

export default function TaskBreakdown({ tasks, onToggle, onMakeSmaller }: TaskBreakdownProps) {
  return (
    <View style={{ gap: 16 }}>
      {tasks.map((task) => {
        const diff = DIFFICULTY_CONFIG[task.difficulty]
        return (
          <View
            key={task.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              overflow: 'hidden',
              shadowColor: '#323331',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            {/* Decorative background icon */}
            <View style={{
              position: 'absolute',
              bottom: -10,
              right: -10,
              opacity: 0.05,
            }}>
              <MaterialIcons name={diff.icon} size={96} color={diff.color} />
            </View>

            {/* Badge row — difficulty + time */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: diff.bg,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}>
                <MaterialIcons name={diff.icon} size={13} color={diff.color} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: diff.color }}>
                  {diff.label}
                </Text>
              </View>

              <Text style={{ fontSize: 13, fontWeight: '500', color: '#5f5f5d' }}>
                {task.estimatedMinutes} min
              </Text>
            </View>

            {/* Task title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#323331',
              lineHeight: 26,
              marginBottom: 16,
            }}>
              {task.title}
            </Text>

            {/* Make it smaller */}
            <Pressable
              onPress={() => onMakeSmaller(task.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                alignSelf: 'flex-start',
                opacity: pressed ? 0.7 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel={`Make task smaller: ${task.title}`}
            >
              <MaterialIcons name="unfold-less" size={16} color="#4C54BB" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#4C54BB' }}>
                Make it smaller
              </Text>
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}
