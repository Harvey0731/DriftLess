import React from 'react'
import { View, Text } from 'react-native'
import { getRelativeTime } from '../../utils/time'

export type ActivityType = 'session' | 'checkin' | 'promise' | 'milestone' | 'streak'

export interface Activity {
  id: string
  type: ActivityType
  description: string
  timestamp: Date
}

interface ActivityFeedProps {
  activities: Activity[]
}

function getActivityIcon(type: ActivityType): { text: string; bg: string; color: string } {
  switch (type) {
    case 'session':
      return { text: '▶️', bg: 'bg-primary/10', color: 'text-primary' }
    case 'checkin':
      return { text: '✓', bg: 'bg-accent/10', color: 'text-accent' }
    case 'promise':
      return { text: '⚡', bg: 'bg-warning/10', color: 'text-warning' }
    case 'milestone':
      return { text: '⭐', bg: 'bg-secondary/20', color: 'text-primary' }
    case 'streak':
      return { text: '🔥', bg: 'bg-warning/10', color: 'text-warning' }
    default:
      return { text: '[.]', bg: 'bg-calm', color: 'text-textSecondary' }
  }
}

function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <View className="px-5">
        <Text className="text-base font-bold text-text mb-3">Your Pattern</Text>
        <View className="bg-surface rounded-2xl p-6 items-center shadow-sm shadow-black/5">
          <Text className="text-textSecondary text-sm">Nothing here yet.</Text>
          <Text className="text-textSecondary text-xs mt-1">
            Check in or start a session — we'll track your patterns here.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="px-5">
      <Text className="text-base font-bold text-text mb-3">Your Pattern</Text>
      <View className="bg-surface rounded-2xl shadow-sm shadow-black/5 overflow-hidden">
        {activities.slice(0, 5).map((activity, index) => {
          const icon = getActivityIcon(activity.type)
          const isLast = index === Math.min(activities.length, 5) - 1

          return (
            <View
              key={activity.id}
              className={`flex-row items-center p-3 ${!isLast ? 'border-b border-calm/50' : ''}`}
            >
              <View className={`w-9 h-9 rounded-full ${icon.bg} items-center justify-center mr-3`}>
                <Text className={`${icon.color} text-xs font-bold`}>{icon.text}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-text">{activity.description}</Text>
              </View>
              <Text className="text-xs text-textSecondary ml-2">
                {getRelativeTime(activity.timestamp.toISOString())}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default React.memo(ActivityFeed)
