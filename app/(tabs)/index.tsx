import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, TouchableOpacity, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

import GreetingHeader from '@/src/components/home/GreetingHeader'
import GoalCard, { GoalTask } from '@/src/components/home/GoalCard'
import StatCards from '@/src/components/home/StatCards'
import QuickActions from '@/src/components/home/QuickActions'
import ActivityFeed, { Activity } from '@/src/components/home/ActivityFeed'
import TrustScoreWidget from '@/src/components/home/TrustScoreWidget'

import { useAuthStore } from '@/src/stores/authStore'
import { getTodayCheckIn } from '@/src/services/checkin.service'
import { getTodayTasks, toggleTaskComplete } from '@/src/services/tasks.service'
import { getRecentSessions } from '@/src/services/sessions.service'
import { getLastActivity, setLastActivity } from '@/src/lib/mmkv'
import { getTodayDateString, computeStreak } from '@/src/utils/time'
import { captureError } from '@/src/lib/sentry'
import type { DailyCheckIn, Task, FocusSession } from '@/src/types/database'

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000

// --- Helpers ---

function calcTodayFocusMinutes(sessions: FocusSession[]): number {
  const todayStr = getTodayDateString()
  return sessions
    .filter((s) => s.status === 'completed' && s.started_at.startsWith(todayStr))
    .reduce((sum, s) => sum + Math.round((s.actual_secs ?? 0) / 60), 0)
}

function toGoalTask(task: Task): GoalTask {
  return {
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimated_mins,
    completed: task.completed,
  }
}

const RATING_EMOJI: Record<string, string> = {
  great: '⚡',
  good: '✓',
  ok: '→',
  struggled: '↗',
}

function buildActivityFeed(
  sessions: (FocusSession & { taskName?: string })[],
  checkIn: DailyCheckIn | null,
): Activity[] {
  const activities: Activity[] = []

  for (const s of sessions) {
    if (s.status === 'completed') {
      const mins = Math.round((s.actual_secs ?? 0) / 60)
      const taskName = s.taskName ?? 'Focus Session'
      const emoji = s.rating_label ? (RATING_EMOJI[s.rating_label] ?? '') : ''
      activities.push({
        id: `session-${s.id}`,
        type: 'session',
        title: taskName,
        description: `${mins} min${emoji ? '  ' + emoji : ''}`,
        timestamp: new Date(s.ended_at ?? s.started_at),
      })
    }
  }

  if (checkIn) {
    activities.push({
      id: `checkin-${checkIn.id}`,
      type: 'checkin',
      title: 'Morning Reflection completed',
      description: 'Consistent with your 7-day average. You\'re building a solid foundation.',
      timestamp: new Date(checkIn.created_at),
    })
  }

  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return activities
}

// --- Re-Entry Overlay ---

function ReEntryOverlay({
  visible,
  daysSince,
  streak,
  onContinue,
}: {
  visible: boolean
  daysSince: number
  streak: number
  onContinue: () => void
}) {
  if (!visible) return null

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-[#FAF8F5]">
        <SafeAreaView className="flex-1">
          {/* Brand */}
          <Text className="text-base font-semibold text-primary px-5 pt-3">Driftless</Text>

          {/* Mountain landscape placeholder */}
          <View className="mx-5 mt-6 rounded-2xl overflow-hidden h-48 bg-gradient-to-b from-purple-100 to-blue-50">
            <LinearGradient
              colors={['#DDD6FE', '#BFDBFE', '#E0E7FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              {/* Motivational banner */}
              <View className="bg-[#6EE7B7] rounded-xl mx-4 mb-0 p-4 self-stretch">
                <View className="flex-row items-center mb-1">
                  <Text className="text-lg mr-1">✧</Text>
                  <Text className="text-xs font-bold text-gray-800 tracking-[0.5px]">_ ✧RK</Text>
                </View>
                <Text className="text-sm text-gray-800 leading-5">
                  Every morning is a clean slate. No weights from yesterday allowed.
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Welcome back card */}
          <View
            className="mx-5 mt-6 bg-white rounded-3xl p-8 items-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <Text className="text-primary text-sm mr-2">☑</Text>
              <Text className="text-xs font-bold text-primary tracking-[2px]">
                GENTLE RE-ENTRY
              </Text>
            </View>

            <Text className="text-[32px] font-bold text-gray-900 mb-3">
              Welcome back.
            </Text>

            <Text className="text-base text-gray-500 text-center leading-6 mb-6">
              {daysSince} days since your last session.{' '}
              <Text className="font-bold text-gray-700">No catch-up needed</Text> — today is what matters.
            </Text>

            {/* Let's go button */}
            <TouchableOpacity
              onPress={onContinue}
              className="w-full"
              accessibilityRole="button"
              accessibilityLabel="Let's go - start check-in"
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text className="text-white text-base font-bold">Let's go</Text>
              </LinearGradient>
            </TouchableOpacity>

            {streak > 0 && (
              <Text className="text-sm text-gray-400 mt-4">
                Streak paused at {streak}. Restart today.
              </Text>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

// --- Component ---

export default function HomeScreen() {
  const router = useRouter()

  // Auth store
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  // Local state
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null)
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [focusMinutesToday, setFocusMinutesToday] = useState(0)
  const [activities, setActivities] = useState<Activity[]>([])
  const [showWelcomeBack, setShowWelcomeBack] = useState(false)
  const [daysSinceLastActivity, setDaysSinceLastActivity] = useState(0)
  const [localStreak, setLocalStreak] = useState(0)

  // --- Data loading ---

  const loadHomeData = useCallback(async () => {
    const userId = user?.id
    if (!userId) return

    try {
      setError(null)

      // Check for 5+ day inactivity gap (re-entry flow)
      const lastActivity = getLastActivity()
      if (lastActivity) {
        const gapMs = Date.now() - lastActivity
        if (gapMs >= FIVE_DAYS_MS) {
          setDaysSinceLastActivity(Math.floor(gapMs / (24 * 60 * 60 * 1000)))
          setShowWelcomeBack(true)
        }
      }
      // Record current activity
      setLastActivity()

      const [todayCheckIn, recentSessions] = await Promise.all([
        getTodayCheckIn(userId),
        getRecentSessions(userId, 100),
        useAuthStore.getState().fetchProfile().catch(() => {}),
      ])

      setCheckIn(todayCheckIn)
      setFocusMinutesToday(calcTodayFocusMinutes(recentSessions))
      setActivities(buildActivityFeed(recentSessions, todayCheckIn))
      setLocalStreak(computeStreak(
        recentSessions
          .filter((s) => s.status === 'completed')
          .map((s) => s.started_at.slice(0, 10))
      ))

      // Fetch tasks only if checked in today
      if (todayCheckIn) {
        const todayTasks = await getTodayTasks(userId)
        setTasks(todayTasks.map(toGoalTask))
      } else {
        setTasks([])
      }
    } catch (err: unknown) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'HomeScreen.loadHomeData',
      })
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      let mounted = true
      ;(async () => {
        if (loading) {
          await loadHomeData()
          if (mounted) setLoading(false)
        } else {
          loadHomeData()
        }
      })()
      return () => {
        mounted = false
      }
    }, [loadHomeData, loading]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadHomeData()
    setRefreshing(false)
  }, [loadHomeData])

  // --- Task toggle ---

  const handleToggleTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))

      try {
        const userId = user?.id
        if (!userId) return
        await toggleTaskComplete(taskId, !task.completed, userId)
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          context: 'HomeScreen.handleToggleTask',
        })
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, completed: task.completed } : t)),
        )
      }
    },
    [tasks, user?.id],
  )

  // --- Navigation handlers ---

  const handleStartSession = useCallback(() => {
    router.push('/timer' as never)
  }, [router])

  const handleChat = useCallback(() => {
    router.push('/(tabs)/chat' as never)
  }, [router])

  const handleProgress = useCallback(() => {
    router.push('/(tabs)/progress' as never)
  }, [router])

  const handlePromises = useCallback(() => {
    router.push('/(tabs)/promises' as never)
  }, [router])

  const handleStartCheckIn = useCallback(() => {
    router.push('/check-in' as never)
  }, [router])

  const handleBadDay = useCallback(() => {
    router.push('/bad-day-toolbox' as never)
  }, [router])

  const handleEditProfile = useCallback(() => {
    router.push('/(tabs)/settings' as never)
  }, [router])

  // --- Derived values ---

  const displayName = profile?.display_name ?? 'there'
  const streak = localStreak || (profile?.current_streak ?? 0)
  const trustScore = profile?.trust_score ?? 50
  const hasCheckedIn = !!checkIn

  // --- Loading state ---

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: '#FCF9F7' }} edges={['top']}>
        <ActivityIndicator size="large" color="#4C54BB" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#FCF9F7' }} edges={['top']}>
      {/* Re-entry overlay */}
      <ReEntryOverlay
        visible={showWelcomeBack}
        daysSince={daysSinceLastActivity}
        streak={streak}
        onContinue={() => {
          setShowWelcomeBack(false)
          handleStartCheckIn()
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4C54BB"
            colors={['#4C54BB']}
          />
        }
      >
        {/* Error banner */}
        {error && (
          <View className="mx-5 mt-3 bg-red-50 rounded-2xl p-4">
            <Text className="text-sm text-red-700">{error}</Text>
            <Pressable
              onPress={loadHomeData}
              className="mt-2 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Retry loading data"
            >
              <Text className="text-sm font-bold text-red-700 underline">Tap to retry</Text>
            </Pressable>
          </View>
        )}

        {/* Greeting */}
        <GreetingHeader
          name={displayName}
          streak={streak}
          onAvatarPress={handleEditProfile}
        />

        {/* Trust Score */}
        <TrustScoreWidget
          score={trustScore}
          onViewBreakdown={handleProgress}
        />

        {/* Stat Cards */}
        <View className="mt-5">
          <StatCards focusMinutes={focusMinutesToday} streak={streak} />
        </View>

        {/* Check-in Prompt OR Goal Card */}
        {!hasCheckedIn ? (
          <View className="mx-5 mt-5">
            <LinearGradient
              colors={['#4C54BB', '#B8BCFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                padding: 28,
                shadowColor: '#323331',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.06,
                shadowRadius: 40,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' }}>
                How are you starting today?
              </Text>
              <Text style={{ fontSize: 14, color: '#B8BCFF', marginBottom: 22, lineHeight: 20, fontWeight: '500', textAlign: 'center' }}>
                Setting an intention in the first hour increases your completion rate by 60%.
              </Text>
              <TouchableOpacity
                onPress={handleStartCheckIn}
                style={{
                  backgroundColor: '#FBF8FF',
                  borderRadius: 999,
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  alignSelf: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel="Set Today's Goal"
                activeOpacity={0.9}
              >
                <Text style={{ color: '#4C54BB', fontWeight: '700', fontSize: 14 }}>Set Today's Goal</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <View className="mt-5">
            <GoalCard
              goalText={checkIn?.today_goal_text ?? "Today's tasks"}
              tasks={tasks}
              onToggleTask={handleToggleTask}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View className="mt-6">
          <QuickActions
            onStartSession={handleStartSession}
            onChat={handleChat}
            onProgress={handleProgress}
            onPromises={handlePromises}
            onBadDay={handleBadDay}
          />
        </View>

        {/* Activity Feed */}
        <View className="mt-6">
          <ActivityFeed activities={activities} />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={handleStartSession}
        className="absolute bottom-28 right-5"
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#323331',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 6,
          overflow: 'hidden',
        }}
        accessibilityRole="button"
        accessibilityLabel="Start a new session"
      >
        <LinearGradient
          colors={['#4C54BB', '#B8BCFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '300' }}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
