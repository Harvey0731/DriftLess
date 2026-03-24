import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useAuthStore } from '@/src/stores/authStore'
import { getRecentSessions, getSessionStats } from '@/src/services/sessions.service'
import type { SessionStats } from '@/src/services/sessions.service'
import { supabase } from '@/src/lib/supabase'
import { captureError } from '@/src/lib/sentry'
import type { FocusSession, Milestone as MilestoneRow } from '@/src/types/database'

// --- Types ---

type Period = 'week' | 'month' | 'all'
type Rating = 'great' | 'good' | 'ok' | 'struggled'

interface ChartDay {
  day: string
  minutes: number
}

interface RatingRow {
  label: string
  count: number
  percentage: number
  colorClass: string
}

type MilestoneStatus = 'earned' | 'in-progress' | 'locked'

interface MilestoneDisplay {
  title: string
  status: MilestoneStatus
  progress?: string
}

// --- Rating helpers ---

const RATING_BADGE_BG: Record<Rating, string> = {
  great: 'bg-primary',
  good: 'bg-accent',
  ok: 'bg-warning',
  struggled: 'bg-danger',
}

const RATING_LABELS: Record<Rating, string> = {
  great: 'Great',
  good: 'Good',
  ok: 'OK',
  struggled: 'Struggled',
}

const RATING_NUM_TO_KEY: Record<number, Rating> = {
  4: 'great',
  3: 'good',
  2: 'ok',
  1: 'struggled',
}

// --- Utility functions ---

function getStartOfPeriod(period: Period): Date | null {
  const now = new Date()
  if (period === 'week') {
    const start = new Date(now)
    const dayOfWeek = start.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = start of week
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return null // 'all'
}

function filterSessionsByPeriod(sessions: FocusSession[], period: Period): FocusSession[] {
  const start = getStartOfPeriod(period)
  if (!start) return sessions
  return sessions.filter((s) => new Date(s.started_at) >= start)
}

function buildWeeklyChart(sessions: FocusSession[]): ChartDay[] {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const totals: Record<string, number> = {}
  for (const d of dayNames) totals[d] = 0

  const now = new Date()
  const startOfWeek = new Date(now)
  const dayOfWeek = startOfWeek.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startOfWeek.setDate(startOfWeek.getDate() - diff)
  startOfWeek.setHours(0, 0, 0, 0)

  for (const s of sessions) {
    const sessionDate = new Date(s.started_at)
    if (sessionDate >= startOfWeek) {
      const jsDay = sessionDate.getDay() // 0=Sun, 1=Mon, ...
      const idx = jsDay === 0 ? 6 : jsDay - 1
      totals[dayNames[idx]] += Math.round((s.actual_secs ?? 0) / 60)
    }
  }

  return dayNames.map((day) => ({ day, minutes: totals[day] }))
}

function computeRatingDistribution(ratingDist: Record<number, number>): RatingRow[] {
  const rows: { rating: number; label: string; colorClass: string }[] = [
    { rating: 4, label: 'Great', colorClass: 'bg-primary' },
    { rating: 3, label: 'Good', colorClass: 'bg-accent' },
    { rating: 2, label: 'OK', colorClass: 'bg-warning' },
    { rating: 1, label: 'Struggled', colorClass: 'bg-danger' },
  ]

  const total = Object.values(ratingDist).reduce((sum, c) => sum + c, 0)

  return rows.map((r) => {
    const count = ratingDist[r.rating] ?? 0
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
    return { label: r.label, count, percentage, colorClass: r.colorClass }
  })
}

function computeInsights(sessions: FocusSession[], stats: SessionStats): string[] {
  const insights: string[] = []

  if (sessions.length === 0) return insights

  // Best day of week
  const dayTotals: Record<string, number> = {}
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (const s of sessions) {
    const d = dayNames[new Date(s.started_at).getDay()]
    dayTotals[d] = (dayTotals[d] ?? 0) + (s.actual_secs ?? 0)
  }
  const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0]
  if (bestDay) {
    insights.push(`Most productive day: ${bestDay[0]}`)
  }

  // Avg session duration
  const avgMins = Math.round(stats.avgDurationSecs / 60)
  insights.push(`Average session: ${avgMins} min`)

  // Total sessions
  insights.push(`Total sessions: ${stats.totalSessions}`)

  // Total focus hours
  const totalHrs = (stats.totalTimeSecs / 3600).toFixed(1)
  insights.push(`Total focus time: ${totalHrs} hrs`)

  return insights
}

function computeMilestones(
  stats: SessionStats,
  earnedMilestones: MilestoneRow[],
): MilestoneDisplay[] {
  const earnedTypes = new Set(earnedMilestones.map((m) => m.type))
  const totalHrs = stats.totalTimeSecs / 3600

  const milestones: MilestoneDisplay[] = []

  // First Session
  if (earnedTypes.has('first_session') || stats.totalSessions >= 1) {
    milestones.push({ title: 'First Session', status: 'earned' })
  } else {
    milestones.push({ title: 'First Session', status: 'locked', progress: '0 / 1' })
  }

  // 10 Sessions
  if (earnedTypes.has('sessions_10') || stats.totalSessions >= 10) {
    milestones.push({ title: '10 Sessions', status: 'earned' })
  } else if (stats.totalSessions > 0) {
    milestones.push({
      title: '10 Sessions',
      status: 'in-progress',
      progress: `${stats.totalSessions} / 10`,
    })
  } else {
    milestones.push({ title: '10 Sessions', status: 'locked', progress: '0 / 10' })
  }

  // 25 Sessions
  if (earnedTypes.has('sessions_25') || stats.totalSessions >= 25) {
    milestones.push({ title: '25 Sessions', status: 'earned' })
  } else if (stats.totalSessions > 0) {
    milestones.push({
      title: '25 Sessions',
      status: 'in-progress',
      progress: `${stats.totalSessions} / 25`,
    })
  } else {
    milestones.push({ title: '25 Sessions', status: 'locked', progress: '0 / 25' })
  }

  // 10 Hours
  if (earnedTypes.has('hours_10') || totalHrs >= 10) {
    milestones.push({ title: '10 Hours', status: 'earned' })
  } else if (totalHrs > 0) {
    milestones.push({
      title: '10 Hours',
      status: 'in-progress',
      progress: `${totalHrs.toFixed(1)} / 10 hrs`,
    })
  } else {
    milestones.push({ title: '10 Hours', status: 'locked', progress: '0 / 10 hrs' })
  }

  // 50 Hours
  if (earnedTypes.has('hours_50') || totalHrs >= 50) {
    milestones.push({ title: '50 Hours', status: 'earned' })
  } else if (totalHrs > 0) {
    milestones.push({
      title: '50 Hours',
      status: 'in-progress',
      progress: `${totalHrs.toFixed(1)} / 50 hrs`,
    })
  } else {
    milestones.push({ title: '50 Hours', status: 'locked', progress: '0 / 50 hrs' })
  }

  return milestones
}

function getRatingKey(session: FocusSession): Rating {
  if (session.rating_label) {
    const lower = session.rating_label.toLowerCase() as Rating
    if (lower in RATING_BADGE_BG) return lower
  }
  if (session.rating !== null && session.rating in RATING_NUM_TO_KEY) {
    return RATING_NUM_TO_KEY[session.rating]
  }
  return 'ok' // fallback
}

function getSessionTaskName(session: FocusSession): string {
  if (!session.task_id) return 'Untitled Session'
  // H21: If the task_id looks like a UUID, show a friendly name instead
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(session.task_id)) return 'Focus Session'
  return session.task_id.substring(0, 50)
}

// --- Sub-components ---

function PeriodSelector({
  selected,
  onSelect,
}: {
  selected: Period
  onSelect: (p: Period) => void
}) {
  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ]

  return (
    <View className="flex-row bg-white rounded-xl p-1 mx-5 mb-4">
      {periods.map((p) => (
        <TouchableOpacity
          key={p.key}
          onPress={() => onSelect(p.key)}
          className={`flex-1 py-2.5 rounded-lg items-center ${
            selected === p.key ? 'bg-primary' : ''
          }`}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Show ${p.label.toLowerCase()} data`}
          accessibilityState={{ selected: selected === p.key }}
        >
          <Text
            className={`text-sm font-semibold ${
              selected === p.key ? 'text-white' : 'text-textSecondary'
            }`}
          >
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function StatCard({
  title,
  value,
  unit,
  trend,
  trendUp,
}: {
  title: string
  value: string
  unit?: string
  trend: string
  trendUp: boolean
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-3.5 mx-1">
      <Text className="text-xs text-textSecondary mb-1">{title}</Text>
      <View className="flex-row items-baseline">
        <Text className="text-xl font-bold text-text">{value}</Text>
        {unit ? <Text className="text-xs text-textSecondary ml-1">{unit}</Text> : null}
      </View>
      <View className="flex-row items-center mt-1.5">
        <Text className={`text-xs font-medium ${trendUp ? 'text-accent' : 'text-danger'}`}>
          {trendUp ? '^ ' : 'v '}
          {trend}
        </Text>
      </View>
    </View>
  )
}

function FocusChart({ data }: { data: ChartDay[] }) {
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1)
  const avgMinutes = data.reduce((sum, d) => sum + d.minutes, 0) / data.length
  const chartHeight = 140
  const avgLineTop =
    maxMinutes > 0 ? chartHeight - (avgMinutes / maxMinutes) * chartHeight : chartHeight

  return (
    <View className="bg-white rounded-2xl p-4 mx-5 mb-4">
      <Text className="text-base font-semibold text-text mb-3">Focus Time</Text>

      <View style={{ height: chartHeight, position: 'relative' }}>
        {/* Average line */}
        <View
          style={{
            position: 'absolute',
            top: avgLineTop,
            left: 0,
            right: 0,
            height: 1,
            borderTopWidth: 1,
            borderStyle: 'dashed',
            borderColor: '#10B981',
            zIndex: 1,
          }}
        />

        {/* Bars */}
        <View className="flex-row items-end justify-between px-2 h-full">
          {data.map((item) => {
            const barHeight = Math.max((item.minutes / maxMinutes) * chartHeight, 4)
            const isGoodSession = item.minutes >= 25
            return (
              <View key={item.day} className="items-center flex-1 mx-0.5">
                <Text className="text-[10px] text-textSecondary mb-1">{item.minutes}m</Text>
                <View
                  style={{ height: barHeight, width: 24 }}
                  className={`rounded-t-md ${isGoodSession ? 'bg-primary' : 'bg-secondary'}`}
                />
              </View>
            )
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View className="flex-row justify-between px-2 mt-2">
        {data.map((item) => (
          <View key={item.day} className="flex-1 items-center mx-0.5">
            <Text className="text-[10px] text-textSecondary">{item.day}</Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row items-center mt-3 justify-center">
        <View className="w-3 h-3 rounded-sm bg-primary mr-1.5" />
        <Text className="text-[10px] text-textSecondary mr-3">25+ min</Text>
        <View className="w-3 h-3 rounded-sm bg-secondary mr-1.5" />
        <Text className="text-[10px] text-textSecondary mr-3">Under 25 min</Text>
        <View
          style={{ width: 12, height: 2, backgroundColor: '#10B981', borderRadius: 1 }}
          className="mr-1.5"
        />
        <Text className="text-[10px] text-textSecondary">Avg ({Math.round(avgMinutes)}m)</Text>
      </View>
    </View>
  )
}

function SessionBreakdown({ distribution }: { distribution: RatingRow[] }) {
  return (
    <View className="bg-white rounded-2xl p-4 mx-5 mb-4">
      <Text className="text-base font-semibold text-text mb-3">How your sessions have felt</Text>
      {distribution.map((item) => (
        <View key={item.label} className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-text">{item.label}</Text>
            <Text className="text-sm text-textSecondary">
              {item.count} ({item.percentage}%)
            </Text>
          </View>
          <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <View
              style={{ width: `${item.percentage}%` }}
              className={`h-full rounded-full ${item.colorClass}`}
            />
          </View>
        </View>
      ))}
    </View>
  )
}

function InsightsSection({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null

  return (
    <View className="mx-5 mb-4">
      <Text className="text-base font-semibold text-text mb-3">Insights</Text>
      <View className="flex-row flex-wrap justify-between">
        {insights.map((insight, index) => (
          <View key={index} className="bg-white rounded-xl p-3 mb-2" style={{ width: '48%' }}>
            <Text className="text-sm text-text leading-5">{insight}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function MilestonesSection({ milestones }: { milestones: MilestoneDisplay[] }) {
  if (milestones.length === 0) return null

  return (
    <View className="mx-5 mb-4">
      <Text className="text-base font-semibold text-text mb-3">Milestones</Text>
      <View className="flex-row flex-wrap">
        {milestones.map((milestone) => {
          const isEarned = milestone.status === 'earned'
          const isLocked = milestone.status === 'locked'
          return (
            <View
              key={milestone.title}
              className={`rounded-xl p-3 mr-2 mb-2 items-center ${
                isEarned
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-white border border-gray-100'
              }`}
              style={{ width: '30%' }}
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${
                  isEarned ? 'bg-primary' : isLocked ? 'bg-gray-200' : 'bg-secondary/30'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    isEarned ? 'text-white' : 'text-textSecondary'
                  }`}
                >
                  {isEarned ? '*' : isLocked ? '?' : '~'}
                </Text>
              </View>
              <Text
                className={`text-xs text-center font-medium ${
                  isEarned ? 'text-primary' : isLocked ? 'text-gray-400' : 'text-text'
                }`}
              >
                {milestone.title}
              </Text>
              {milestone.progress ? (
                <Text className="text-[10px] text-textSecondary mt-1">{milestone.progress}</Text>
              ) : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function RatingBadge({ rating }: { rating: Rating }) {
  return (
    <View className={`px-2.5 py-1 rounded-full ${RATING_BADGE_BG[rating]}`}>
      <Text className="text-xs font-medium text-white">{RATING_LABELS[rating]}</Text>
    </View>
  )
}

// M-05: Fixed row height for getItemLayout optimization
const SESSION_ITEM_HEIGHT = 66 // p-3.5 (14px*2) + content (~38px) = ~66px
const SESSION_ITEM_MARGIN_BOTTOM = 8 // mb-2 = 8px

const SessionHistoryItem = React.memo(function SessionHistoryItem({
  session,
}: {
  session: FocusSession
}) {
  const formattedDate = new Date(session.started_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const durationMin = Math.round((session.actual_secs ?? 0) / 60)
  const ratingKey = getRatingKey(session)

  return (
    <View className="flex-row items-center bg-white rounded-xl p-3.5 mx-5 mb-2">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-medium text-text" numberOfLines={1}>
          {getSessionTaskName(session)}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-xs text-textSecondary">{formattedDate}</Text>
          <Text className="text-xs text-textSecondary mx-1.5">--</Text>
          <Text className="text-xs text-textSecondary">{durationMin} min</Text>
        </View>
      </View>
      <RatingBadge rating={ratingKey} />
    </View>
  )
})

function EmptyState() {
  return (
    <View className="items-center py-16 mx-5">
      <View className="w-16 h-16 rounded-full bg-secondary/20 items-center justify-center mb-4">
        <Text className="text-2xl text-secondary">~</Text>
      </View>
      <Text className="text-base font-semibold text-text mb-2">No sessions yet</Text>
      <Text className="text-sm text-textSecondary text-center leading-5">
        Complete your first focus session to start tracking your progress here.
      </Text>
    </View>
  )
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text className="text-sm text-textSecondary mt-3">Loading your progress...</Text>
    </View>
  )
}

// --- Main Screen ---

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user)
  const userId = user?.id

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const [allSessions, setAllSessions] = useState<FocusSession[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [earnedMilestones, setEarnedMilestones] = useState<MilestoneRow[]>([])

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const [sessionsResult, statsResult, milestonesResult] = await Promise.all([
        getRecentSessions(userId, 200),
        getSessionStats(userId),
        supabase
          .from('milestones')
          .select('*')
          .eq('user_id', userId)
          .order('achieved_at', { ascending: false }),
      ])

      setAllSessions(sessionsResult)
      setStats(statsResult)
      setEarnedMilestones((milestonesResult.data ?? []) as unknown as MilestoneRow[])
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'ProgressScreen.fetchData',
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Fetch on mount and re-fetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  // Derived data
  const filteredSessions = useMemo(
    () => filterSessionsByPeriod(allSessions, selectedPeriod),
    [allSessions, selectedPeriod],
  )

  const weeklyChart = useMemo(() => buildWeeklyChart(allSessions), [allSessions])

  const ratingDistribution = useMemo(
    () => computeRatingDistribution(stats?.ratingDistribution ?? {}),
    [stats],
  )

  const insights = useMemo(
    () =>
      computeInsights(
        allSessions,
        stats ?? { totalSessions: 0, totalTimeSecs: 0, avgDurationSecs: 0, ratingDistribution: {} },
      ),
    [allSessions, stats],
  )

  const milestoneDisplays = useMemo(
    () =>
      computeMilestones(
        stats ?? { totalSessions: 0, totalTimeSecs: 0, avgDurationSecs: 0, ratingDistribution: {} },
        earnedMilestones,
      ),
    [stats, earnedMilestones],
  )

  // Compute period stats for stat cards
  const periodStats = useMemo(() => {
    const completed = filteredSessions.filter((s) => s.status === 'completed')
    const totalSecs = completed.reduce((sum, s) => sum + (s.actual_secs ?? 0), 0)
    const totalHrs = (totalSecs / 3600).toFixed(1)
    const sessionCount = completed.length
    const avgMin = sessionCount > 0 ? Math.round(totalSecs / sessionCount / 60) : 0

    // Compute "vs last week" comparison
    const now = new Date()
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const thisWeekSessions = allSessions.filter((s) => {
      const d = new Date(s.started_at)
      return d >= oneWeekAgo && s.status === 'completed'
    })
    const lastWeekSessions = allSessions.filter((s) => {
      const d = new Date(s.started_at)
      return d >= twoWeeksAgo && d < oneWeekAgo && s.status === 'completed'
    })

    const thisWeekSecs = thisWeekSessions.reduce((sum, s) => sum + (s.actual_secs ?? 0), 0)
    const lastWeekSecs = lastWeekSessions.reduce((sum, s) => sum + (s.actual_secs ?? 0), 0)

    let focusTrend = 'No prior data'
    let focusTrendUp = true
    if (lastWeekSecs > 0) {
      const pctChange = Math.round(((thisWeekSecs - lastWeekSecs) / lastWeekSecs) * 100)
      focusTrend = `${Math.abs(pctChange)}% vs last week`
      focusTrendUp = pctChange >= 0
    } else if (thisWeekSecs > 0) {
      focusTrend = 'New this week'
      focusTrendUp = true
    }

    const sessionDiff = thisWeekSessions.length - lastWeekSessions.length
    let sessionTrend = 'No prior data'
    let sessionTrendUp = true
    if (lastWeekSessions.length > 0) {
      sessionTrend = `${Math.abs(sessionDiff)} ${sessionDiff >= 0 ? 'more' : 'fewer'}`
      sessionTrendUp = sessionDiff >= 0
    } else if (thisWeekSessions.length > 0) {
      sessionTrend = 'New this week'
      sessionTrendUp = true
    }

    const thisWeekAvg =
      thisWeekSessions.length > 0 ? Math.round(thisWeekSecs / thisWeekSessions.length / 60) : 0
    const lastWeekAvg =
      lastWeekSessions.length > 0 ? Math.round(lastWeekSecs / lastWeekSessions.length / 60) : 0
    let avgTrend = 'No prior data'
    let avgTrendUp = true
    if (lastWeekAvg > 0) {
      const pctChange = Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100)
      avgTrend = `${Math.abs(pctChange)}% vs last week`
      avgTrendUp = pctChange >= 0
    } else if (thisWeekAvg > 0) {
      avgTrend = 'New this week'
      avgTrendUp = true
    }

    return {
      totalHrs,
      sessionCount,
      avgMin,
      focusTrend,
      focusTrendUp,
      sessionTrend,
      sessionTrendUp,
      avgTrend,
      avgTrendUp,
    }
  }, [filteredSessions, allSessions])

  const hasData = allSessions.length > 0

  // H-HOOKS: useMemo must be called unconditionally (before any early returns)
  const listHeader = useMemo(
    () => (
      <>
        <Text className="text-2xl font-bold text-text mx-5 mt-4 mb-4">Progress</Text>

        <PeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />

        {/* Stats Overview */}
        <View className="flex-row mx-4 mb-4">
          <StatCard
            title="Total Focus"
            value={periodStats.totalHrs}
            unit="hrs"
            trend={periodStats.focusTrend}
            trendUp={periodStats.focusTrendUp}
          />
          <StatCard
            title="Sessions"
            value={String(periodStats.sessionCount)}
            trend={periodStats.sessionTrend}
            trendUp={periodStats.sessionTrendUp}
          />
          <StatCard
            title="Avg Duration"
            value={String(periodStats.avgMin)}
            unit="min"
            trend={periodStats.avgTrend}
            trendUp={periodStats.avgTrendUp}
          />
        </View>

        <FocusChart data={weeklyChart} />
        <SessionBreakdown distribution={ratingDistribution} />
        <InsightsSection insights={insights} />
        <MilestonesSection milestones={milestoneDisplays} />

        <View className="mx-5 mb-2">
          <Text className="text-base font-semibold text-text">Recent Sessions</Text>
        </View>
      </>
    ),
    [selectedPeriod, periodStats, weeklyChart, ratingDistribution, insights, milestoneDisplays],
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Text className="text-2xl font-bold text-text mx-5 mt-4 mb-4">Progress</Text>
        <LoadingState />
      </SafeAreaView>
    )
  }

  if (!hasData) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              <Text className="text-2xl font-bold text-text mx-5 mt-4 mb-4">Progress</Text>
              <EmptyState />
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
          }
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => <SessionHistoryItem session={item} />}
        getItemLayout={(_data, index) => ({
          length: SESSION_ITEM_HEIGHT + SESSION_ITEM_MARGIN_BOTTOM,
          offset: (SESSION_ITEM_HEIGHT + SESSION_ITEM_MARGIN_BOTTOM) * index,
          index,
        })}
        ListFooterComponent={<View className="h-8" />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      />
    </SafeAreaView>
  )
}
