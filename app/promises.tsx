import React, { useState, useCallback } from 'react'
import { captureError } from '@/src/lib/sentry'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import { TRUST_LABELS } from '@/src/utils/constants'
import { useAuthStore } from '@/src/stores/authStore'
import {
  getTodayPromise,
  createPromise,
  updatePromise,
  getPromiseHistory,
  calculateTrustScore,
} from '@/src/services/promises.service'
import type { PromiseRecord } from '@/src/types/database'

type BrokenReason = 'Too big' | 'Forgot' | 'Life happened' | "Just couldn't"

const EXAMPLE_CHIPS = [
  'I will open my laptop at 10am',
  'I will write for 15 minutes',
  'I will send that email today',
]

const BROKEN_REASONS: BrokenReason[] = ['Too big', 'Forgot', 'Life happened', "Just couldn't"]

// Rotate through a few icons for visual variety in history rows
const HISTORY_ICONS: Array<keyof typeof MaterialIcons.glyphMap> = [
  'menu-book',
  'directions-walk',
  'mail',
  'edit',
  'laptop',
  'self-improvement',
  'fitness-center',
]

function getTrustLabel(score: number) {
  for (const tier of TRUST_LABELS) {
    if (score >= tier.min && score <= tier.max) return tier
  }
  return TRUST_LABELS[0]
}

function formatPromiseDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Trust Score Ring (pure View, no SVG) ───────────────────────────────────

function TrustRing({ score }: { score: number }) {
  const SIZE = 180
  const THICKNESS = 7
  const INNER = 150
  const pct = Math.min(Math.max(score / 100, 0), 1)

  // Two-semicircle clipping technique
  const rightDeg = pct >= 0.5 ? 180 : pct * 360
  const leftDeg = pct > 0.5 ? (pct - 0.5) * 360 : 0

  return (
    <View style={{ width: SIZE, height: SIZE, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{
        position: 'absolute',
        width: SIZE, height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: THICKNESS,
        borderColor: '#E4E2DF',
      }} />

      {/* Right half fill */}
      {pct > 0 && (
        <View style={{ position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, right: 0, width: SIZE / 2, height: SIZE, overflow: 'hidden' }}>
            <View style={{
              position: 'absolute', top: 0, left: -(SIZE / 2), width: SIZE, height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: THICKNESS,
              borderColor: '#4C54BB',
              transform: [{ rotate: `${rightDeg}deg` }],
            }} />
          </View>
        </View>
      )}

      {/* Left half fill */}
      {pct > 0.5 && (
        <View style={{ position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, width: SIZE / 2, height: SIZE, overflow: 'hidden' }}>
            <View style={{
              position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: THICKNESS,
              borderColor: '#4C54BB',
              transform: [{ rotate: `${leftDeg}deg` }],
            }} />
          </View>
        </View>
      )}

      {/* Inner white circle — explicit 150px to match mockup */}
      <View style={{
        width: INNER, height: INNER,
        borderRadius: INNER / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#4C54BB',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
        elevation: 4,
      }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: '#4C54BB', lineHeight: 54 }}>
          {score}
        </Text>
        <Text style={{ fontSize: 9, fontWeight: '700', color: '#5f5f5d', letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>
          Trust Score
        </Text>
      </View>
    </View>
  )
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ history }: { history: PromiseRecord[] }) {
  const opacities = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  const heights =  ['40%', '55%', '45%', '70%', '65%', '85%', '92%']
  // 7 slots: oldest → newest. Last bar is most recent, shown in primary.
  const total = 7
  const filled = Math.min(history.length, total)
  const empty = total - filled

  return (
    <View style={{
      backgroundColor: '#F6F3F1',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 80,
    }}>
      {/* Empty placeholder bars for days with no data */}
      {Array.from({ length: empty }).map((_, i) => (
        <View key={`empty-${i}`} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
          <View style={{
            width: '100%',
            height: heights[i] ?? '30%',
            backgroundColor: '#B8BCFF',
            borderRadius: 999,
            opacity: 0.25,
          }} />
        </View>
      ))}
      {/* Data bars: all primary-container, except last (most recent) = primary */}
      {history.slice(-total).map((entry, i) => {
        const slot = empty + i
        const isLast = i === filled - 1
        return (
          <View key={entry.id} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View style={{
              width: '100%',
              height: heights[slot] ?? '50%',
              backgroundColor: isLast ? '#4C54BB' : '#B8BCFF',
              borderRadius: 999,
              opacity: opacities[slot] ?? 1,
            }} />
          </View>
        )
      })}
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PromisesScreen() {
  const user = useAuthStore((s) => s.user)
  const [promiseText, setPromiseText] = useState('')
  const [todayPromise, setTodayPromise] = useState<PromiseRecord | null>(null)
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [trustScore, setTrustScore] = useState(50)
  const [history, setHistory] = useState<PromiseRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    try {
      const [todayData, historyData, scoreData] = await Promise.all([
        getTodayPromise(user.id),
        getPromiseHistory(user.id, 30),
        calculateTrustScore(user.id),
      ])
      setTodayPromise(todayData)
      setHistory(historyData)
      setTrustScore(scoreData.score)
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'promises.fetchData',
      })
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData]),
  )

  async function handleSetPromise() {
    if (promiseText.trim().length === 0 || !user?.id || isSaving) return
    setIsSaving(true)
    try {
      const created = await createPromise(user.id, promiseText.trim())
      setTodayPromise(created)
      setPromiseText('')
      const [historyData, scoreData] = await Promise.all([
        getPromiseHistory(user.id, 7),
        calculateTrustScore(user.id),
      ])
      setHistory(historyData)
      setTrustScore(scoreData.score)
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'promises.handleSetPromise',
      })
      Alert.alert('Error', 'Failed to save your promise. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleKept() {
    if (!todayPromise || !user?.id || isSaving) return
    setIsSaving(true)
    try {
      const updated = await updatePromise(todayPromise.id, true, user.id)
      setTodayPromise(updated)
      const [historyData, scoreData] = await Promise.all([
        getPromiseHistory(user.id, 7),
        calculateTrustScore(user.id),
      ])
      setHistory(historyData)
      setTrustScore(scoreData.score)
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'promises.handleKept',
      })
      Alert.alert('Error', 'Failed to update your promise. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBroken(reason: BrokenReason) {
    if (!todayPromise || !user?.id || isSaving) return
    setIsSaving(true)
    try {
      const updated = await updatePromise(todayPromise.id, false, user.id, reason)
      setTodayPromise(updated)
      setShowReasonPicker(false)
      const [historyData, scoreData] = await Promise.all([
        getPromiseHistory(user.id, 7),
        calculateTrustScore(user.id),
      ])
      setHistory(historyData)
      setTrustScore(scoreData.score)
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'promises.handleBroken',
      })
      Alert.alert('Error', 'Failed to update your promise. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const trustLabel = getTrustLabel(trustScore)
  const keptCount = history.filter((h) => h.kept === true).length
  const resolvedCount = history.filter((h) => h.kept !== null).length

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7', alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#4C54BB" />
        <Text style={{ color: '#5f5f5d', marginTop: 12 }}>Loading promises...</Text>
      </SafeAreaView>
    )
  }

  const visibleHistory = showAllHistory ? history : history.slice(0, 3)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7' }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData() }}
            tintColor="#4C54BB"
          />
        }
      >

        {/* ── Page heading ── */}
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#323331', marginBottom: 20 }}>
          Promises
        </Text>

        {/* ── Trust Score Section ── */}
        <View style={{ alignItems: 'center', marginBottom: 40, gap: 24 }}>
          <TrustRing score={trustScore} />

          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#323331' }}>
              {trustLabel.label}
            </Text>
            {resolvedCount > 0 && (
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#5f5f5d' }}>
                You've kept {keptCount} of your last {resolvedCount} promises.
              </Text>
            )}
          </View>

          <Sparkline history={history} />
        </View>

        {/* ── Today's Commitment ── */}
        <View style={{
          backgroundColor: '#F6F3F1',
          borderRadius: 16,
          padding: 32,
          marginBottom: 40,
          gap: 24,
        }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#323331' }}>
              Today's Commitment
            </Text>
            <Text style={{ fontSize: 13, color: '#5f5f5d' }}>
              Small actions build undeniable proof of self-trust.
            </Text>
          </View>

          {/* If promise already set, show it; otherwise show input */}
          {todayPromise ? (
            <View style={{ gap: 16 }}>
              {/* Promise text display */}
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 999,
                paddingVertical: 16,
                paddingHorizontal: 24,
              }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#323331' }}>
                  {todayPromise.text}
                </Text>
              </View>

              {/* Resolved state */}
              {todayPromise.kept === true && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                  backgroundColor: 'rgba(142,244,233,0.4)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#005C56' }}>Kept</Text>
                  <MaterialIcons name="check" size={14} color="#005C56" />
                </View>
              )}

              {todayPromise.kept === false && (
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#E4E2DF',
                  borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#5f5f5d' }}>Missed</Text>
                </View>
              )}

              {/* Pending — kept / broken buttons */}
              {todayPromise.kept === null && !showReasonPicker && (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#323331' }}>
                    Did you keep your promise?
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={handleKept}
                      disabled={isSaving}
                      style={({ pressed }) => ({
                        flex: 1, backgroundColor: '#006B64', borderRadius: 999,
                        paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.8 : 1,
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Yes, I kept it"
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Yes, I kept it</Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => setShowReasonPicker(true)}
                      disabled={isSaving}
                      style={({ pressed }) => ({
                        flex: 1, backgroundColor: '#E4E2DF', borderRadius: 999,
                        paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.8 : 1,
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="No, I didn't"
                    >
                      <Text style={{ color: '#5f5f5d', fontWeight: '700', fontSize: 14 }}>Not this time</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Reason picker */}
              {todayPromise.kept === null && showReasonPicker && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#5f5f5d' }}>
                    That's okay. What got in the way?
                  </Text>
                  {BROKEN_REASONS.map((reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => handleBroken(reason)}
                      disabled={isSaving}
                      style={({ pressed }) => ({
                        backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14,
                        paddingHorizontal: 18, opacity: pressed ? 0.7 : 1,
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={reason}
                    >
                      <Text style={{ fontSize: 14, color: '#323331' }}>{reason}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setShowReasonPicker(false)} style={{ alignSelf: 'center', paddingVertical: 8 }}>
                    <Text style={{ fontSize: 13, color: '#4C54BB', fontWeight: '600' }}>Go back</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Input */}
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 999,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  fontSize: 15,
                  color: '#323331',
                  fontWeight: '500',
                }}
                placeholder="Make a promise to yourself."
                placeholderTextColor="#b3b2af"
                value={promiseText}
                onChangeText={setPromiseText}
                maxLength={200}
                accessibilityLabel="Promise text"
              />

              {/* Example chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXAMPLE_CHIPS.map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => setPromiseText(chip)}
                    style={({ pressed }) => ({
                      backgroundColor: '#E4E2DF', borderRadius: 999,
                      paddingHorizontal: 16, paddingVertical: 8, opacity: pressed ? 0.7 : 1,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={chip}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#5f5f5d' }}>{chip}</Text>
                  </Pressable>
                ))}
              </View>

              {/* CTA */}
              <Pressable
                onPress={handleSetPromise}
                disabled={promiseText.trim().length === 0 || isSaving}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                accessibilityRole="button"
                accessibilityLabel="Set my promise"
              >
                <LinearGradient
                  colors={promiseText.trim().length > 0 ? ['#4C54BB', '#B8BCFF'] : ['#C8C8C8', '#C8C8C8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 999,
                    paddingVertical: 18,
                    alignItems: 'center',
                    shadowColor: '#4C54BB',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 20,
                    elevation: 3,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                      Set my promise
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Recent Promises ── */}
        {history.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#5f5f5d', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Recent Promises
              </Text>
              {history.length > 3 && (
                <Pressable onPress={() => setShowAllHistory((v) => !v)}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#4C54BB' }}>
                    {showAllHistory ? 'Show Less' : `View All (${history.length})`}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={{ gap: 10 }}>
              {visibleHistory.map((entry, i) => {
                const isKept = entry.kept === true
                const isMissed = entry.kept === false
                const icon = HISTORY_ICONS[i % HISTORY_ICONS.length]

                return (
                  <View
                    key={entry.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      padding: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, opacity: isMissed ? 0.6 : 1 }}>
                      {/* Icon bubble */}
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: isKept
                          ? 'rgba(142,244,233,0.3)'
                          : isMissed
                            ? '#E4E2DF'
                            : 'rgba(184,188,255,0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <MaterialIcons
                          name={icon}
                          size={20}
                          color={isKept ? '#006B64' : isMissed ? '#5f5f5d' : '#4C54BB'}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: '700', color: '#323331' }}
                          numberOfLines={1}
                        >
                          {entry.text}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#5f5f5d', marginTop: 2 }}>
                          {formatPromiseDate(entry.promise_date)}
                        </Text>
                      </View>
                    </View>

                    {/* Status badge */}
                    {isKept && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: 'rgba(142,244,233,0.4)',
                        borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#006B64' }}>Kept</Text>
                        <MaterialIcons name="check" size={12} color="#006B64" />
                      </View>
                    )}
                    {isMissed && (
                      <View style={{
                        backgroundColor: '#E4E2DF',
                        borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#5f5f5d' }}>Missed</Text>
                      </View>
                    )}
                    {entry.kept === null && (
                      <View style={{
                        backgroundColor: 'rgba(184,188,255,0.3)',
                        borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#4C54BB' }}>Pending</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Reflection Pill ── */}
        <View style={{
          backgroundColor: '#8EF4E9',
          borderRadius: 20,
          padding: 32,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
        }}>
          <MaterialIcons name="auto-awesome" size={40} color="#006B64" />
          <Text style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '500',
            color: '#006B64',
            lineHeight: 22,
          }}>
            "Every small promise you keep is a vote for the person you wish to become."
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
