import React from 'react'
import { View, Text } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { getRelativeTime } from '../../utils/time'

export type ActivityType = 'session' | 'checkin' | 'promise' | 'milestone' | 'streak'

export interface Activity {
  id: string
  type: ActivityType
  title?: string
  description: string
  timestamp: Date
}

function getActivityDot(type: ActivityType): { icon: keyof typeof MaterialIcons.glyphMap; bgColor: string; iconColor: string } {
  switch (type) {
    case 'checkin':
      return { icon: 'check', bgColor: '#006B64', iconColor: '#E2FFFA' }
    case 'session':
      return { icon: 'bolt', bgColor: '#4C54BB', iconColor: '#FBF8FF' }
    case 'promise':
      return { icon: 'auto-awesome', bgColor: '#7B5913', iconColor: '#FFF8F1' }
    case 'milestone':
      return { icon: 'star', bgColor: '#4C54BB', iconColor: '#FBF8FF' }
    case 'streak':
      return { icon: 'local-fire-department', bgColor: '#006B64', iconColor: '#E2FFFA' }
    default:
      return { icon: 'circle', bgColor: '#9CA3AF', iconColor: '#FFFFFF' }
  }
}

function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <View className="px-5">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#323331' }}>Your Pattern</Text>
        <View
          style={{
            backgroundColor: 'rgba(76, 84, 187, 0.1)',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#4C54BB', letterSpacing: -0.3, textTransform: 'uppercase' }}>
            Live View
          </Text>
        </View>
      </View>

      {activities.length === 0 ? (
        <View className="rounded-2xl p-6 items-center" style={{ backgroundColor: '#F6F3F1' }}>
          <Text style={{ color: '#5f5f5d', fontSize: 14 }}>Nothing here yet.</Text>
          <Text style={{ color: '#5f5f5d', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            Check in or start a session — we'll track your patterns here.
          </Text>
        </View>
      ) : (
        <View className="rounded-2xl p-6" style={{ backgroundColor: '#F6F3F1' }}>
          {/* Timeline container */}
          <View style={{ position: 'relative' }}>
            {/* Vertical timeline line */}
            <View
              style={{
                position: 'absolute',
                left: 11,
                top: 8,
                bottom: 8,
                width: 2,
                backgroundColor: 'rgba(179, 178, 175, 0.2)',
              }}
            />

            {activities.slice(0, 5).map((activity, index) => {
              const dot = getActivityDot(activity.type)
              const timeStr = getRelativeTime(activity.timestamp.toISOString())
              const isOlderItem = index > 0

              return (
                <View
                  key={activity.id}
                  style={{
                    paddingLeft: 36,
                    marginBottom: index < Math.min(activities.length, 5) - 1 ? 24 : 0,
                    opacity: isOlderItem ? 0.6 : 1,
                    position: 'relative',
                  }}
                >
                  {/* Timeline dot — small circle with border matching bg */}
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 2,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: dot.bgColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: '#F6F3F1',
                    }}
                  >
                    <MaterialIcons name={dot.icon} size={10} color={dot.iconColor} />
                  </View>

                  {/* Content */}
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#323331' }}>
                        {activity.title ?? activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '500', color: '#5f5f5d', textTransform: 'uppercase' }}>
                        {timeStr}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#5f5f5d', lineHeight: 19 }}>
                      {activity.description}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          {/* Reflection pill — secondary-container (#8EF4E9) */}
          <View
            style={{
              backgroundColor: '#8EF4E9',
              borderRadius: 16,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginTop: 20,
            }}
          >
            <MaterialIcons name="lightbulb-outline" size={22} color="#006B64" style={{ marginRight: 14, marginTop: 1 }} />
            <Text
              style={{
                flex: 1,
                color: '#006B64',
                fontWeight: '500',
                fontSize: 13,
                lineHeight: 20,
                fontStyle: 'italic',
              }}
            >
              "The secret of getting ahead is getting started." — You've proved this{' '}
              {Math.max(activities.length, 1)} times this week.
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

export default React.memo(ActivityFeed)
