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
  'I will write for 15 min',
  'I will go for a walk before noon',
  'I will work on one task today',
]

const BROKEN_REASONS: BrokenReason[] = ['Too big', 'Forgot', 'Life happened', "Just couldn't"]

function getTrustLabel(score: number) {
  for (const tier of TRUST_LABELS) {
    if (score >= tier.min && score <= tier.max) {
      return tier
    }
  }
  return TRUST_LABELS[0]
}

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

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    try {
      const [todayData, historyData, scoreData] = await Promise.all([
        getTodayPromise(user.id),
        getPromiseHistory(user.id, 7),
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
      // Refresh history and score
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
      // Refresh history and score
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
      // Refresh history and score
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Promises',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#F9FAFB' },
            headerTintColor: '#8B5CF6',
            headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          }}
        />
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text className="text-gray-400 mt-3">Loading promises...</Text>
      </SafeAreaView>
    )
  }

  function renderPromiseInput() {
    return (
      <View className="px-6">
        <Text className="text-2xl font-bold text-gray-800 text-center mb-2 mt-4">
          Make a Promise to Yourself
        </Text>
        <Text className="text-base text-gray-500 text-center mb-6">
          One small, specific thing you will do today.
        </Text>

        <TextInput
          className="bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-800 mb-4"
          placeholder="I will..."
          placeholderTextColor="#9CA3AF"
          value={promiseText}
          onChangeText={setPromiseText}
          maxLength={200}
          accessibilityLabel="Promise text"
        />

        {/* Example chips */}
        <View className="flex-row flex-wrap gap-2 mb-6">
          {EXAMPLE_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => setPromiseText(chip)}
              className="bg-purple-50 border border-purple-200 rounded-full px-4 py-2 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={chip}
            >
              <Text className="text-sm text-purple-600">{chip}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleSetPromise}
          disabled={promiseText.trim().length === 0 || isSaving}
          className={`rounded-2xl py-4 items-center ${
            promiseText.trim().length > 0 && !isSaving ? 'bg-purple-500' : 'bg-gray-200'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Set Promise"
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              className={`text-lg font-bold ${
                promiseText.trim().length > 0 ? 'text-white' : 'text-gray-400'
              }`}
            >
              Set Promise
            </Text>
          )}
        </Pressable>
      </View>
    )
  }

  function renderPromiseCard() {
    if (!todayPromise) return null

    const isResolved = todayPromise.kept !== null

    return (
      <View className="px-6">
        <View
          className={`rounded-2xl p-5 mb-6 border ${
            todayPromise.kept === true
              ? 'bg-green-50 border-green-200'
              : todayPromise.kept === false
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200'
          }`}
        >
          <Text className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            Today's Promise
          </Text>
          <Text className="text-lg font-semibold text-gray-800 mb-4">{todayPromise.text}</Text>

          {todayPromise.kept === true && (
            <View className="bg-green-100 rounded-xl py-2 px-4 self-start">
              <Text className="text-green-700 font-semibold text-sm">Promise Kept</Text>
            </View>
          )}

          {todayPromise.kept === false && (
            <View className="bg-red-100 rounded-xl py-2 px-4 self-start">
              <Text className="text-red-700 font-semibold text-sm">Not This Time</Text>
            </View>
          )}

          {!isResolved && !showReasonPicker && (
            <View>
              <Text className="text-base font-medium text-gray-700 mb-3">
                Did you keep your promise?
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleKept}
                  disabled={isSaving}
                  className="flex-1 bg-green-500 rounded-xl py-3 items-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Yes, I kept it"
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">Yes, I kept it</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShowReasonPicker(true)}
                  disabled={isSaving}
                  className="flex-1 bg-gray-100 rounded-xl py-3 items-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="No, I didn't"
                >
                  <Text className="text-gray-600 font-semibold text-sm">No, I didn't</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!isResolved && showReasonPicker && (
            <View>
              <Text className="text-sm font-medium text-gray-600 mb-3">
                That's okay. What got in the way?
              </Text>
              {BROKEN_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => handleBroken(reason)}
                  disabled={isSaving}
                  className="bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 mb-2 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={reason}
                >
                  <Text className="text-gray-700 text-sm">{reason}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowReasonPicker(false)} className="mt-1 self-center">
                <Text className="text-sm text-purple-500">Go back</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    )
  }

  function renderTrustScore() {
    return (
      <View className="px-6 mb-6">
        <View className="bg-white border border-gray-200 rounded-2xl p-6 items-center">
          <Text className="text-xs text-gray-400 uppercase tracking-wide mb-2">Trust Score</Text>
          <Text className="text-5xl font-bold" style={{ color: trustLabel.color }}>
            {trustScore}
          </Text>
          <Text className="text-base font-semibold mt-1" style={{ color: trustLabel.color }}>
            {trustLabel.label}
          </Text>
          <Text className="text-xs text-gray-400 mt-3 text-center leading-4">
            This is how consistently you keep promises to yourself.
          </Text>
        </View>
      </View>
    )
  }

  function renderHistory() {
    // Filter out today's promise from history to avoid duplication
    const pastHistory = history.filter((entry) => entry.id !== todayPromise?.id)
    if (pastHistory.length === 0) return null

    return (
      <View className="px-6 mb-8">
        <Text className="text-lg font-bold text-gray-800 mb-4">This Week</Text>
        {pastHistory.map((entry) => (
          <View
            key={entry.id}
            className="flex-row items-center bg-white border border-gray-200 rounded-xl p-4 mb-2"
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                entry.kept === true
                  ? 'bg-green-100'
                  : entry.kept === false
                    ? 'bg-red-100'
                    : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  entry.kept === true
                    ? 'text-green-600'
                    : entry.kept === false
                      ? 'text-red-600'
                      : 'text-gray-400'
                }`}
              >
                {entry.kept === true ? '\u2713' : entry.kept === false ? 'X' : '-'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-800" numberOfLines={1}>
                {entry.text}
              </Text>
              <Text className="text-xs text-gray-400 mt-1">{entry.promise_date}</Text>
            </View>
          </View>
        ))}
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Promises',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchData()
            }}
            tintColor="#8B5CF6"
          />
        }
      >
        {todayPromise ? renderPromiseCard() : renderPromiseInput()}
        {renderTrustScore()}
        {renderHistory()}
      </ScrollView>
    </SafeAreaView>
  )
}
