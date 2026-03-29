import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import Svg, { Polyline, Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg'
import { computeStreak } from '@/src/utils/time'
import { useAuthStore } from '@/src/stores/authStore'
import { getRecentSessions, getSessionStats } from '@/src/services/sessions.service'
import type { SessionStats } from '@/src/services/sessions.service'
import { getPromiseHistory } from '@/src/services/promises.service'
import { supabase } from '@/src/lib/supabase'
import { captureError } from '@/src/lib/sentry'
import type { FocusSession, Milestone as MilestoneRow, PromiseRecord, DailyCheckIn } from '@/src/types/database'

// --- Types ---

type Period = 'week' | 'month' | 'all'

interface ChartDay {
  day: string
  minutes: number
}

interface RatingRow {
  label: string
  count: number
  percentage: number
  color: string
}

type MilestoneStatus = 'earned' | 'in-progress' | 'locked'

interface MilestoneDisplay {
  title: string
  status: MilestoneStatus
  progress?: string
}

// --- Rating config (matches mockup labels) ---

const RATING_CONFIG: Record<number, { label: string; color: string }> = {
  4: { label: 'Nailed it',       color: '#006B64' },
  3: { label: 'Solid',           color: '#7FE6DB' },
  2: { label: 'Got started',     color: '#FED07F' },
  1: { label: 'Showed up anyway',color: 'rgba(179,178,175,0.55)' },
}

// --- Utility functions (unchanged logic) ---

function getStartOfPeriod(period: Period): Date | null {
  const now = new Date()
  if (period === 'week') {
    const start = new Date(now)
    const dayOfWeek = start.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return null
}

function filterSessionsByPeriod(sessions: FocusSession[], period: Period): FocusSession[] {
  const start = getStartOfPeriod(period)
  if (!start) return sessions
  return sessions.filter((s) => new Date(s.started_at) >= start)
}

function buildWeeklyChart(sessions: FocusSession[]): ChartDay[] {
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const keys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const totals: Record<string, number> = {}
  for (const k of keys) totals[k] = 0

  const now = new Date()
  const startOfWeek = new Date(now)
  const dayOfWeek = startOfWeek.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startOfWeek.setDate(startOfWeek.getDate() - diff)
  startOfWeek.setHours(0, 0, 0, 0)

  for (const s of sessions) {
    const sessionDate = new Date(s.started_at)
    if (sessionDate >= startOfWeek) {
      const jsDay = sessionDate.getDay()
      const idx = jsDay === 0 ? 6 : jsDay - 1
      totals[keys[idx]] += Math.round((s.actual_secs ?? 0) / 60)
    }
  }

  return keys.map((key, i) => ({ day: dayNames[i], minutes: totals[key] }))
}

function computeRatingDistribution(ratingDist: Record<number, number>): RatingRow[] {
  const total = Object.values(ratingDist).reduce((sum, c) => sum + c, 0)
  return [4, 3, 2, 1].map((r) => {
    const cfg = RATING_CONFIG[r]
    const count = ratingDist[r] ?? 0
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
    return { label: cfg.label, count, percentage, color: cfg.color }
  })
}

function computeBestDay(sessions: FocusSession[]): string | null {
  if (sessions.length === 0) return null
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const totals: Record<string, number> = {}
  for (const s of sessions) {
    const d = dayNames[new Date(s.started_at).getDay()]
    totals[d] = (totals[d] ?? 0) + (s.actual_secs ?? 0)
  }
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

function computeTopHardReason(checkIns: { hard_reason: string | null }[]): string | null {
  const counts: Record<string, number> = {}
  for (const c of checkIns) {
    if (c.hard_reason) counts[c.hard_reason] = (counts[c.hard_reason] ?? 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!sorted[0]) return null
  const key = sorted[0][0]
  const labels: Record<string, string> = {
    unclear_start: 'Not sure where to start',
    overwhelmed: 'Feeling overwhelmed',
    fear_of_failure: "Scared it won't be good enough",
    low_motivation: 'Just no motivation',
  }
  return labels[key] ?? key
}

function computePeakHour(sessions: FocusSession[]): string | null {
  if (sessions.length === 0) return null
  const buckets: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0 }
  for (const s of sessions) {
    const h = new Date(s.started_at).getHours()
    if (h < 12) buckets['Morning'] += s.actual_secs ?? 0
    else if (h < 17) buckets['Afternoon'] += s.actual_secs ?? 0
    else buckets['Evening'] += s.actual_secs ?? 0
  }
  return Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

interface SparklinePoint {
  day: string   // e.g. 'M', 'T', …
  score: number // 0-100
}

function buildTrustSparkline(promises: PromiseRecord[]): SparklinePoint[] {
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const result: SparklinePoint[] = []

  for (let i = 6; i >= 0; i--) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - i)
    cutoff.setHours(23, 59, 59, 999)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const since30 = new Date(cutoff)
    since30.setDate(since30.getDate() - 30)
    const since30Str = since30.toISOString().slice(0, 10)

    const relevant = promises.filter(
      (p) => p.promise_date >= since30Str && p.promise_date <= cutoffStr,
    )
    const resolved = relevant.filter((p) => p.kept !== null)
    const kept = resolved.filter((p) => p.kept === true)
    const keptRatio = resolved.length > 0 ? kept.length / resolved.length : 0.5

    const sorted = [...resolved].sort((a, b) => b.promise_date.localeCompare(a.promise_date))
    let streak = 0
    for (const p of sorted) {
      if (p.kept) streak++
      else break
    }
    const streakBonus = Math.min(streak / 30, 1)
    const activityBonus = Math.min(relevant.length / 30, 1)
    const score = Math.max(0, Math.min(100, Math.round(keptRatio * 60 + streakBonus * 20 + activityBonus * 20)))

    const dayIdx = cutoff.getDay()
    result.push({ day: dayLetters[dayIdx], score })
  }

  return result
}

function computeMilestones(
  stats: SessionStats,
  earnedMilestones: MilestoneRow[],
): MilestoneDisplay[] {
  const earnedTypes = new Set(earnedMilestones.map((m) => m.type))
  const totalHrs = stats.totalTimeSecs / 3600

  const milestones: MilestoneDisplay[] = []

  if (earnedTypes.has('first_session') || stats.totalSessions >= 1) {
    milestones.push({ title: 'First Session', status: 'earned' })
  } else {
    milestones.push({ title: 'First Session', status: 'locked', progress: '0 / 1' })
  }

  if (earnedTypes.has('sessions_10') || stats.totalSessions >= 10) {
    milestones.push({ title: '10 Sessions', status: 'earned' })
  } else {
    milestones.push({
      title: '30-Day Streak',
      status: 'in-progress',
      progress: `${stats.totalSessions}/30 days`,
    })
  }

  if (earnedTypes.has('hours_10') || totalHrs >= 10) {
    milestones.push({ title: '10 Hours', status: 'earned' })
  } else {
    milestones.push({
      title: '10 Hours',
      status: 'in-progress',
      progress: `${totalHrs.toFixed(1)} / 10 hrs`,
    })
  }

  return milestones
}

// --- Sub-components ---

function TrustScoreSparkline({ data, currentScore }: { data: SparklinePoint[]; currentScore: number }) {
  const W = 280
  const H = 72
  const PAD = 8

  if (data.length < 2) return null

  const scores = data.map((d) => d.score)
  const minS = Math.max(0, Math.min(...scores) - 5)
  const maxS = Math.min(100, Math.max(...scores) + 5)
  const range = maxS - minS || 1

  const xStep = (W - PAD * 2) / (data.length - 1)
  const toX = (i: number) => PAD + i * xStep
  const toY = (s: number) => H - PAD - ((s - minS) / range) * (H - PAD * 2)

  const points = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ')

  // filled area path
  const areaPath =
    `M ${toX(0)},${toY(data[0].score)} ` +
    data.slice(1).map((d, i) => `L ${toX(i + 1)},${toY(d.score)}`).join(' ') +
    ` L ${toX(data.length - 1)},${H} L ${toX(0)},${H} Z`

  const lastX = toX(data.length - 1)
  const lastY = toY(data[data.length - 1].score)

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 32,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#323331' }}>Trust Score</Text>
          <Text style={{ fontSize: 12, color: '#5f5f5d', marginTop: 2 }}>7-day history</Text>
        </View>
        <View style={{
          backgroundColor: 'rgba(76,84,187,0.1)',
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 6,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#4C54BB' }}>{currentScore}</Text>
        </View>
      </View>

      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4C54BB" stopOpacity={0.15} />
            <Stop offset="100%" stopColor="#4C54BB" stopOpacity={0} />
          </SvgGradient>
        </Defs>
        {/* Filled area */}
        <Path d={areaPath} fill="url(#sparkFill)" />
        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke="#4C54BB"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Latest dot */}
        <Circle cx={lastX} cy={lastY} r={4} fill="#4C54BB" />
        <Circle cx={lastX} cy={lastY} r={7} fill="rgba(76,84,187,0.2)" />
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ fontSize: 10, fontWeight: '500', color: '#b3b2af', width: xStep, textAlign: 'center' }}>
            {d.day}
          </Text>
        ))}
      </View>
    </View>
  )
}

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
    <View style={{
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(179,178,175,0.15)',
      marginBottom: 24,
    }}>
      {periods.map((p) => {
        const isActive = selected === p.key
        return (
          <Pressable
            key={p.key}
            onPress={() => onSelect(p.key)}
            style={{ paddingBottom: 12, marginRight: 32 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: isActive ? '600' : '500',
              color: isActive ? '#4C54BB' : '#5f5f5d',
            }}>
              {p.label}
            </Text>
            {isActive && (
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: '#4C54BB',
                borderRadius: 999,
              }} />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

type Trend = 'up' | 'down' | 'flat'

function TrendArrow({ trend }: { trend: Trend }) {
  const icon =
    trend === 'up' ? 'trending-up' :
    trend === 'down' ? 'trending-down' : 'trending-flat'
  // Up = teal accent, down/flat = neutral grey — no alarm colors
  const color = trend === 'up' ? '#006B64' : '#b3b2af'
  return <MaterialIcons name={icon} size={16} color={color} />
}

function StatCards({ totalHrs, sessionCount, avgMin, trends }: {
  totalHrs: string
  sessionCount: number
  avgMin: number
  trends: [Trend, Trend, Trend]
}) {
  const cards = [
    { label: 'Total Focus', value: totalHrs + 'h',       trend: trends[0] },
    { label: 'Sessions',    value: String(sessionCount),  trend: trends[1] },
    { label: 'Avg. Session', value: avgMin + 'm',         trend: trends[2] },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
      {cards.map((card) => (
        <View key={card.label} style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 32,
          padding: 16,
          height: 128,
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#5f5f5d',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              flex: 1,
            }}>
              {card.label}
            </Text>
            <TrendArrow trend={card.trend} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#323331' }}>
            {card.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

function FocusChart({ data }: { data: ChartDay[] }) {
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1)
  const CHART_HEIGHT = 128

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 32,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#323331' }}>Focus Minutes</Text>
        <Text style={{ fontSize: 12, fontWeight: '500', color: '#5f5f5d' }}>Last 7 Days</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {data.map((item, i) => {
          const pct = maxMinutes > 0 ? item.minutes / maxMinutes : 0
          const barH = Math.max(pct * CHART_HEIGHT, 6)

          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', marginHorizontal: 3 }}>
              {/* Container track */}
              <View style={{
                width: '100%',
                height: CHART_HEIGHT,
                backgroundColor: 'rgba(184,188,255,0.25)',
                borderTopLeftRadius: 999,
                borderTopRightRadius: 999,
                overflow: 'hidden',
                justifyContent: 'flex-end',
              }}>
                {/* Filled bar */}
                <View style={{
                  width: '100%',
                  height: barH,
                  backgroundColor: '#4C54BB',
                }} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '500', color: '#5f5f5d', marginTop: 8 }}>{item.day}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function SessionFeelings({ distribution }: { distribution: RatingRow[] }) {
  const total = distribution.reduce((sum, r) => sum + r.percentage, 0)
  if (total === 0) return null

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#323331', marginBottom: 16 }}>
        How Sessions Have Felt
      </Text>
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}>
        {/* Stacked bar */}
        <View style={{
          flexDirection: 'row',
          height: 16,
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          {distribution.filter((r) => r.percentage > 0).map((r) => (
            <View
              key={r.label}
              style={{ width: `${r.percentage}%`, backgroundColor: r.color }}
            />
          ))}
        </View>

        {/* Legend 2-col */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {distribution.map((r) => (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '45%' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: r.color }} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#5f5f5d' }}>
                {r.label} ({r.percentage}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

interface InsightCard {
  icon: keyof typeof MaterialIcons.glyphMap
  label: string
  value: string
  sub: string
  bg: string
  iconColor: string
  labelColor: string
  valueColor: string
  subColor: string
}

function InsightsSection({
  bestDay,
  hardReason,
  peakHour,
  currentStreak,
  sessionCount,
}: {
  bestDay: string | null
  hardReason: string | null
  peakHour: string | null
  currentStreak: number
  sessionCount: number
}) {
  const cards: InsightCard[] = []

  if (bestDay) {
    cards.push({
      icon: 'auto-awesome',
      label: 'Most productive day',
      value: bestDay,
      sub: 'Focus is highest on this day.',
      bg: 'rgba(184,188,255,0.2)',
      iconColor: '#4C54BB',
      labelColor: '#4C54BB',
      valueColor: '#272D97',
      subColor: 'rgba(39,45,151,0.6)',
    })
  }

  if (peakHour) {
    cards.push({
      icon: 'wb-sunny',
      label: 'Peak focus time',
      value: peakHour,
      sub: 'When your sessions run longest.',
      bg: 'rgba(254,208,127,0.2)',
      iconColor: '#7B5913',
      labelColor: '#7B5913',
      valueColor: '#5C3D08',
      subColor: 'rgba(92,61,8,0.6)',
    })
  }

  if (currentStreak > 0) {
    cards.push({
      icon: 'local-fire-department',
      label: 'Current streak',
      value: `${currentStreak} day${currentStreak === 1 ? '' : 's'}`,
      sub: currentStreak >= 7 ? 'Keep the momentum going!' : 'Every day counts.',
      bg: 'rgba(142,244,233,0.2)',
      iconColor: '#006B64',
      labelColor: '#006B64',
      valueColor: '#005C56',
      subColor: 'rgba(0,92,86,0.6)',
    })
  }

  // Only show "What makes it hard" after 3+ sessions (per spec: 5+, relaxed for early users)
  if (hardReason && sessionCount >= 3) {
    cards.push({
      icon: 'bolt',
      label: 'What makes it hard',
      value: hardReason,
      sub: 'Your most common friction point.',
      bg: 'rgba(172,49,73,0.07)',
      iconColor: '#AC3149',
      labelColor: '#AC3149',
      valueColor: '#323331',
      subColor: '#5f5f5d',
    })
  }

  if (cards.length === 0) return null

  // Pair cards into rows of 2
  const rows: InsightCard[][] = []
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(cards.slice(i, i + 2))
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#323331', marginBottom: 16 }}>
        Insights
      </Text>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {row.map((card) => (
            <View key={card.label} style={{
              width: '48%',
              height: 160,
              backgroundColor: card.bg,
              borderRadius: 32,
              padding: 20,
              justifyContent: 'center',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <MaterialIcons name={card.icon} size={16} color={card.iconColor} />
                <Text style={{
                  fontSize: 9,
                  fontWeight: '700',
                  color: card.labelColor,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginLeft: 6,
                  flex: 1,
                }}>
                  {card.label}
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: card.valueColor, marginBottom: 4 }} numberOfLines={2}>
                {card.value}
              </Text>
              <Text style={{ fontSize: 11, color: card.subColor, lineHeight: 16 }}>
                {card.sub}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function MilestonesSection({ milestones }: { milestones: MilestoneDisplay[] }) {
  if (milestones.length === 0) return null

  const MILESTONE_ICONS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
    'First Session':  { icon: 'workspace-premium', label: 'First Session' },
    '30-Day Streak':  { icon: 'local-fire-department', label: '30-Day Streak' },
    '10 Hours':       { icon: 'timer', label: '10 Hours' },
    '10 Sessions':    { icon: 'workspace-premium', label: '10 Sessions' },
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#323331', marginBottom: 16 }}>
        Milestones
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {milestones.map((m) => {
          const isEarned = m.status === 'earned'
          const cfg = MILESTONE_ICONS[m.title] ?? { icon: 'star' as keyof typeof MaterialIcons.glyphMap, label: m.title }

          return (
            <View
              key={m.title}
              style={{
                width: '46%',
                aspectRatio: 1,
                borderRadius: 32,
                padding: 24,
                alignItems: 'center',
                justifyContent: 'center',
                ...(isEarned
                  ? { backgroundColor: '#8EF4E9' }
                  : {
                      borderWidth: 2,
                      borderStyle: 'dashed' as const,
                      borderColor: 'rgba(179,178,175,0.3)',
                    }),
              }}
            >
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: isEarned ? 'rgba(0,107,100,0.12)' : '#F6F3F1',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <MaterialIcons
                  name={cfg.icon}
                  size={32}
                  color={isEarned ? '#006B64' : 'rgba(179,178,175,0.5)'}
                />
              </View>
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: isEarned ? '#005C56' : 'rgba(179,178,175,0.7)',
                textAlign: 'center',
                marginBottom: 2,
              }}>
                {m.title}
              </Text>
              {m.progress && (
                <Text style={{ fontSize: 10, color: isEarned ? '#005C56' : 'rgba(179,178,175,0.6)' }}>
                  {m.progress}
                </Text>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

// --- Session history helpers ---

function getSessionTaskName(session: FocusSession): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!session.task_id || uuidRegex.test(session.task_id)) return 'Focus Session'
  return session.task_id.substring(0, 50)
}

function getRatingConfig(session: FocusSession): { label: string; color: string } {
  if (session.rating !== null && session.rating in RATING_CONFIG) {
    return RATING_CONFIG[session.rating]
  }
  return { label: 'Session', color: '#b3b2af' }
}

function RatingBadge({ session }: { session: FocusSession }) {
  const cfg = getRatingConfig(session)
  return (
    <View style={{
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: cfg.color + '22',
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>
        {cfg.label}
      </Text>
    </View>
  )
}

const SessionHistoryItem = React.memo(function SessionHistoryItem({ session }: { session: FocusSession }) {
  const date = new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const durationMin = Math.round((session.actual_secs ?? 0) / 60)

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 16,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#323331' }} numberOfLines={1}>
          {getSessionTaskName(session)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#5f5f5d' }}>{date}</Text>
          <Text style={{ fontSize: 12, color: '#b3b2af' }}>·</Text>
          <Text style={{ fontSize: 12, color: '#5f5f5d' }}>{durationMin} min</Text>
        </View>
      </View>
      <RatingBadge session={session} />
    </View>
  )
})

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 64 }}>
      <View style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(142,244,233,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <MaterialIcons name="analytics" size={28} color="#006B64" />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#323331', marginBottom: 8 }}>
        No sessions yet
      </Text>
      <Text style={{ fontSize: 14, color: '#5f5f5d', textAlign: 'center', lineHeight: 22 }}>
        Complete your first focus session to start{'\n'}tracking your progress here.
      </Text>
    </View>
  )
}

// --- Main Screen ---

export default function ProgressScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const authLoading = useAuthStore((s) => s.isLoading)
  const userId = user?.id

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const [allSessions, setAllSessions] = useState<FocusSession[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [earnedMilestones, setEarnedMilestones] = useState<MilestoneRow[]>([])
  const [promises, setPromises] = useState<PromiseRecord[]>([])
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([])

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const since90 = new Date()
      since90.setDate(since90.getDate() - 90)
      const [sessionsResult, statsResult, milestonesResult, promisesResult, checkInsResult] = await Promise.all([
        getRecentSessions(userId, 200),
        getSessionStats(userId),
        supabase
          .from('milestones')
          .select('*')
          .eq('user_id', userId)
          .order('achieved_at', { ascending: false }),
        getPromiseHistory(userId, 30),
        supabase
          .from('daily_check_ins')
          .select('hard_reason, check_in_date, energy_level')
          .eq('user_id', userId)
          .gte('check_in_date', since90.toISOString().slice(0, 10))
          .order('check_in_date', { ascending: false }),
      ])
      setAllSessions(sessionsResult)
      setStats(statsResult)
      setEarnedMilestones((milestonesResult.data ?? []) as unknown as MilestoneRow[])
      setPromises(promisesResult)
      setCheckIns((checkInsResult.data ?? []) as unknown as DailyCheckIn[])
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'ProgressScreen.fetchData',
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Re-fetch when userId becomes available (handles HMR / cold-start race where
  // useFocusEffect already fired before auth was restored into the store).
  // Also stops the spinner if auth finishes but there's no user (logged out).
  useEffect(() => {
    if (userId) {
      fetchData()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [userId, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch every time the tab gains focus (e.g. returning from timer screen)
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

  const filteredSessions = useMemo(
    () => filterSessionsByPeriod(allSessions, selectedPeriod),
    [allSessions, selectedPeriod],
  )

  const weeklyChart = useMemo(() => buildWeeklyChart(allSessions), [allSessions])

  const ratingDistribution = useMemo(
    () => computeRatingDistribution(stats?.ratingDistribution ?? {}),
    [stats],
  )

  const bestDay = useMemo(() => computeBestDay(allSessions), [allSessions])
  const hardReason = useMemo(() => computeTopHardReason(checkIns), [checkIns])
  const peakHour = useMemo(() => computePeakHour(allSessions), [allSessions])

  const localStreak = useMemo(() => {
    const dates = allSessions
      .filter((s) => s.status === 'completed')
      .map((s) => s.started_at.slice(0, 10))
    return computeStreak(dates)
  }, [allSessions])

  const milestoneDisplays = useMemo(
    () =>
      computeMilestones(
        stats ?? { totalSessions: 0, totalTimeSecs: 0, avgDurationSecs: 0, ratingDistribution: {} },
        earnedMilestones,
      ),
    [stats, earnedMilestones],
  )

  const periodStats = useMemo(() => {
    const completed = filteredSessions.filter((s) => s.status === 'completed')
    const totalSecs = completed.reduce((sum, s) => sum + (s.actual_secs ?? 0), 0)
    const totalHrs = (totalSecs / 3600).toFixed(1)
    const sessionCount = completed.length
    const avgMin = sessionCount > 0 ? Math.round(totalSecs / sessionCount / 60) : 0

    // Compute previous period for trend arrows
    const toTrend = (curr: number, prev: number): Trend =>
      prev === 0 ? 'flat' : curr > prev ? 'up' : curr < prev ? 'down' : 'flat'

    let trends: [Trend, Trend, Trend] = ['flat', 'flat', 'flat']
    if (selectedPeriod !== 'all') {
      const periodMs = selectedPeriod === 'week' ? 7 * 86400000 : 30 * 86400000
      const now = Date.now()
      const prevStart = new Date(now - periodMs * 2)
      const prevEnd = new Date(now - periodMs)
      const prevCompleted = allSessions.filter((s) => {
        const t = new Date(s.started_at).getTime()
        return s.status === 'completed' && t >= prevStart.getTime() && t < prevEnd.getTime()
      })
      const prevSecs = prevCompleted.reduce((sum, s) => sum + (s.actual_secs ?? 0), 0)
      const prevCount = prevCompleted.length
      const prevAvg = prevCount > 0 ? Math.round(prevSecs / prevCount / 60) : 0
      trends = [
        toTrend(totalSecs, prevSecs),
        toTrend(sessionCount, prevCount),
        toTrend(avgMin, prevAvg),
      ]
    }

    return { totalHrs, sessionCount, avgMin, trends }
  }, [filteredSessions, selectedPeriod, allSessions])

  const trustSparkline = useMemo(() => buildTrustSparkline(promises), [promises])

  const avatarInitial = (profile?.display_name ?? user?.email ?? 'U')[0].toUpperCase()
  const currentTrustScore = profile?.trust_score ?? 50

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4C54BB" />
          <Text style={{ fontSize: 14, color: '#5f5f5d', marginTop: 12 }}>
            Loading your progress...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7' }} edges={['top']}>
      {/* Top app bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        height: 64,
        backgroundColor: '#FCF9F7',
      }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          backgroundColor: '#B8BCFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#272D97' }}>{avatarInitial}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#8B93FF', letterSpacing: -0.3 }}>
          Driftless
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/settings' as never)}
          style={({ pressed }) => ({ padding: 8, borderRadius: 999, backgroundColor: pressed ? '#F6F3F1' : 'transparent' })}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <MaterialIcons name="settings" size={24} color="#5f5f5d" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4C54BB" />
        }
      >
        {/* Page heading */}
        <Text style={{ fontSize: 34, fontWeight: '800', color: '#323331', letterSpacing: -0.5, marginBottom: 20 }}>
          Progress
        </Text>

        <PeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />

        <StatCards
          totalHrs={periodStats.totalHrs}
          sessionCount={periodStats.sessionCount}
          avgMin={periodStats.avgMin}
          trends={periodStats.trends}
        />

        <FocusChart data={weeklyChart} />

        <TrustScoreSparkline data={trustSparkline} currentScore={currentTrustScore} />

        {allSessions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <SessionFeelings distribution={ratingDistribution} />
            <InsightsSection
              bestDay={bestDay}
              hardReason={hardReason}
              peakHour={peakHour}
              currentStreak={localStreak}
              sessionCount={allSessions.filter((s) => s.status === 'completed').length}
            />
            <MilestonesSection milestones={milestoneDisplays} />

            {/* Recent Sessions */}
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#323331' }}>
                  Recent Sessions
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#5f5f5d' }}>
                  {filteredSessions.length} total
                </Text>
              </View>
              {filteredSessions.length === 0 ? (
                <Text style={{ fontSize: 14, color: '#5f5f5d', textAlign: 'center', paddingVertical: 24 }}>
                  No sessions in this period.
                </Text>
              ) : (
                filteredSessions.map((session) => (
                  <SessionHistoryItem key={session.id} session={session} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
