import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'

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
import { getTodayDateString } from '@/src/utils/time'
import { captureError } from '@/src/lib/sentry'
import type { DailyCheckIn, Task, FocusSession } from '@/src/types/database'

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000

// --- Helpers ---

/** Calculate total focus minutes from today's completed sessions. */
function calcTodayFocusMinutes(sessions: FocusSession[]): number {
  const todayStr = getTodayDateString()
  return sessions
    .filter((s) => s.status === 'completed' && s.started_at.startsWith(todayStr))
    .reduce((sum, s) => sum + Math.round((s.actual_secs ?? 0) / 60), 0)
}

/** Map a Task from the DB into GoalTask for the GoalCard component. */
function toGoalTask(task: Task): GoalTask {
  return {
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimated_mins,
    completed: task.completed,
  }
}

/** Build an activity feed from recent sessions and today's check-in. */
function buildActivityFeed(sessions: FocusSession[], checkIn: DailyCheckIn | null): Activity[] {
  const activities: Activity[] = []

  for (const s of sessions) {
    if (s.status === 'completed') {
      const mins = Math.round((s.actual_secs ?? 0) / 60)
      activities.push({
        id: `session-${s.id}`,
        type: 'session',
        description: `Completed a ${mins}-minute focus session`,
        timestamp: new Date(s.ended_at ?? s.started_at),
      })
    }
  }

  if (checkIn) {
    activities.push({
      id: `checkin-${checkIn.id}`,
      type: 'checkin',
      description: 'Morning check-in completed',
      timestamp: new Date(checkIn.created_at),
    })
  }

  // Sort newest first
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return activities
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
        getRecentSessions(userId, 20),
      ])

      setCheckIn(todayCheckIn)
      setFocusMinutesToday(calcTodayFocusMinutes(recentSessions))
      setActivities(buildActivityFeed(recentSessions, todayCheckIn))

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

  // Load data on screen focus (covers both initial mount and returning to the tab)
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

  // Pull-to-refresh
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

      // Optimistic update
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))

      try {
        const userId = user?.id
        if (!userId) return
        await toggleTaskComplete(taskId, !task.completed, userId)
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          context: 'HomeScreen.handleToggleTask',
        })
        // Revert on failure
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
    router.push('/promises' as never)
  }, [router])

  const handleStartCheckIn = useCallback(() => {
    router.push('/check-in' as never)
  }, [router])

  const handleBadDay = useCallback(() => {
    router.push('/bad-day-toolbox' as never)
  }, [router])

  // --- Derived values ---

  const displayName = profile?.display_name ?? 'there'
  const streak = profile?.current_streak ?? 0
  const trustScore = profile?.trust_score ?? 50
  const hasCheckedIn = !!checkIn

  // --- Loading state ---

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        {/* Error banner */}
        {error && (
          <View className="mx-5 mt-3 bg-red-100 rounded-2xl p-4">
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

        {/* Welcome back overlay for 5+ day gap */}
        {showWelcomeBack && (
          <View className="mx-5 mt-3 bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <Text className="text-lg font-bold text-gray-800 mb-1">Welcome back.</Text>
            <Text className="text-sm text-gray-600 mb-1">
              {daysSinceLastActivity} days since your last session. No catch-up needed — today is
              what matters.
            </Text>
            {streak > 0 && (
              <Text className="text-xs text-gray-500 mb-3">
                Streak paused at {streak}. Restart today.
              </Text>
            )}
            <Pressable
              onPress={() => {
                setShowWelcomeBack(false)
                handleStartCheckIn()
              }}
              className="bg-purple-500 rounded-xl py-3 items-center active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Start check-in after returning"
            >
              <Text className="text-white font-semibold text-base">Let's go</Text>
            </Pressable>
          </View>
        )}

        {/* Greeting */}
        <GreetingHeader name={displayName} streak={streak} />
        <TrustScoreWidget score={trustScore} />

        {/* Check-in Prompt OR Goal Card */}
        {!hasCheckedIn ? (
          <View className="mx-5 mt-3 bg-surface rounded-2xl p-5 shadow-sm shadow-black/5">
            <Text className="text-lg font-bold text-text mb-1">How are you starting today?</Text>
            <Text className="text-sm text-textSecondary mb-4">
              Takes 2 minutes. Tells you what's actually doable.
            </Text>
            <Pressable
              onPress={handleStartCheckIn}
              className="bg-primary rounded-xl py-3.5 items-center active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Start check-in"
            >
              <Text className="text-white font-semibold text-base">Start Check-In</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-3">
            <GoalCard
              goalText={checkIn?.today_goal_text ?? "Today's tasks"}
              tasks={tasks}
              onToggleTask={handleToggleTask}
            />
          </View>
        )}

        {/* Stat Cards */}
        <View className="mt-5">
          <StatCards focusMinutes={focusMinutesToday} streak={streak} />
        </View>

        {/* Quick Actions */}
        <View className="mt-5">
          <QuickActions
            onStartSession={handleStartSession}
            onChat={handleChat}
            onProgress={handleProgress}
            onPromises={handlePromises}
            onBadDay={handleBadDay}
          />
        </View>

        {/* Activity Feed */}
        <View className="mt-5">
          <ActivityFeed activities={activities} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
