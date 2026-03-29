import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'

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
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Two-semicircle ring for circular progress (no SVG)
  const RING_SIZE = 64
  const RING_THICKNESS = 4
  const RING_INNER = RING_SIZE - RING_THICKNESS * 2
  const ratio = pct / 100
  const rightDeg = ratio >= 0.5 ? 180 : ratio * 360
  const leftDeg = ratio > 0.5 ? (ratio - 0.5) * 360 : 0

  return (
    <LinearGradient
      colors={['#4C54BB', '#B8BCFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 20,
        padding: 28,
        marginHorizontal: 20,
        shadowColor: '#323331',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>

        {/* Left: goal title + task list */}
        <View style={{ flex: 1, gap: 16 }}>
          {/* Goal title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialIcons name="my-location" size={20} color="#B8BCFF" />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1 }} numberOfLines={2}>
              {goalText}
            </Text>
          </View>

          {/* Task checklist */}
          <View style={{ gap: 12 }}>
            {tasks.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => onToggleTask(task.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityRole="checkbox"
                accessibilityLabel={task.title}
                accessibilityState={{ checked: task.completed }}
              >
                {/* Checkbox */}
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: task.completed ? '#FFFFFF' : 'rgba(184,188,255,0.6)',
                  backgroundColor: task.completed ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {task.completed && (
                    <MaterialIcons name="check" size={14} color="#4C54BB" />
                  )}
                </View>

                <Text style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: '500',
                  color: task.completed ? 'rgba(255,255,255,0.55)' : '#FFFFFF',
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                }}>
                  {task.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Right: circular progress */}
        <View style={{ alignItems: 'center', gap: 6, paddingTop: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(184,188,255,0.8)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Progress
          </Text>

          {/* Ring */}
          <View style={{ width: RING_SIZE, height: RING_SIZE, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            {/* Track */}
            <View style={{
              position: 'absolute',
              width: RING_SIZE, height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderWidth: RING_THICKNESS,
              borderColor: 'rgba(184,188,255,0.3)',
            }} />

            {/* Right half fill — only render when there's something to show */}
            {ratio > 0 && (
              <View style={{ position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', top: 0, right: 0, width: RING_SIZE / 2, height: RING_SIZE, overflow: 'hidden' }}>
                  <View style={{
                    position: 'absolute', top: 0, left: -(RING_SIZE / 2), width: RING_SIZE, height: RING_SIZE,
                    borderRadius: RING_SIZE / 2,
                    borderWidth: RING_THICKNESS,
                    borderColor: '#FFFFFF',
                    transform: [{ rotate: `${rightDeg}deg` }],
                  }} />
                </View>
              </View>
            )}

            {/* Left half fill */}
            {ratio > 0.5 && (
              <View style={{ position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', top: 0, left: 0, width: RING_SIZE / 2, height: RING_SIZE, overflow: 'hidden' }}>
                  <View style={{
                    position: 'absolute', top: 0, left: 0, width: RING_SIZE, height: RING_SIZE,
                    borderRadius: RING_SIZE / 2,
                    borderWidth: RING_THICKNESS,
                    borderColor: '#FFFFFF',
                    transform: [{ rotate: `${leftDeg}deg` }],
                  }} />
                </View>
              </View>
            )}

            {/* Inner label */}
            <View style={{
              width: RING_INNER, height: RING_INNER,
              borderRadius: RING_INNER / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{pct}%</Text>
            </View>
          </View>
        </View>

      </View>
    </LinearGradient>
  )
}

export default React.memo(GoalCard)
