import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  AppState,
  type AppStateStatus,
  Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import TimerDisplay from '@/src/components/timer/TimerDisplay'
import TimerControls from '@/src/components/timer/TimerControls'
import { useSessionStore } from '@/src/stores/sessionStore'
import { storage } from '@/src/lib/mmkv'
import { captureError } from '@/src/lib/sentry'

// C1/C2: Unified timer — uses sessionStore as single source of truth for both
// MMKV persistence and focus_sessions DB row. No more raw MMKV keys.

const QUICK_PRESETS = [5, 25, 50] as const

export default function TimerScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    taskName: string
    plannedMinutes: string
    taskId: string
    checkInId: string
  }>()
  const cameFromCheckIn = !!params.taskName

  // Setup state for quick-action (no params) flow
  const [setupTaskName, setSetupTaskName] = useState('')
  const [setupMinutes, setSetupMinutes] = useState<number>(() => {
    // Read persisted session length preference from settings
    const stored = storage.getString('prefs.sessionLength')
    if (stored && stored !== 'custom') {
      const num = parseInt(stored, 10)
      if (num >= 5 && num <= 180) return num
    }
    return 25
  })
  const [isCustomSetup, setIsCustomSetup] = useState(false)
  const [customSetupInput, setCustomSetupInput] = useState('')
  const [setupComplete, setSetupComplete] = useState(cameFromCheckIn)

  const taskName = cameFromCheckIn
    ? (params.taskName ?? 'Focus Session')
    : setupTaskName || 'Focus Session'
  const plannedMinutes = cameFromCheckIn
    ? parseInt(params.plannedMinutes ?? '25', 10)
    : setupMinutes
  const taskId = params.taskId ?? ''
  const checkInId = params.checkInId ?? ''

  // Session store — single source of truth
  const {
    timerState,
    isTimerRunning,
    elapsedSeconds,
    startSession,
    pauseSession,
    resumeSession,
    restoreTimerFromMMKV,
    updateElapsed,
  } = useSessionStore()

  const [goalReached, setGoalReached] = useState(false)
  const [startedAtDisplay, setStartedAtDisplay] = useState('')
  const [_isStarting, setIsStarting] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refs for stable values to avoid stale closures in useEffect
  const taskIdRef = useRef(taskId)
  const plannedMinutesRef = useRef(plannedMinutes)
  const checkInIdRef = useRef(checkInId)
  taskIdRef.current = taskId
  plannedMinutesRef.current = plannedMinutes
  checkInIdRef.current = checkInId

  // --- Initialize: restore existing session or create new one ---
  useEffect(() => {
    if (!setupComplete) return

    let cancelled = false

    async function init() {
      // First try to restore an existing session from MMKV
      await restoreTimerFromMMKV()

      const state = useSessionStore.getState()
      if (state.currentSession) {
        // Restored an existing session
        setStartedAtDisplay(formatStartTime(new Date(state.currentSession.started_at).getTime()))
        return
      }

      // No existing session — create a new one in the DB via the store
      if (cancelled) return
      setIsStarting(true)
      try {
        await startSession(
          taskIdRef.current,
          plannedMinutesRef.current,
          checkInIdRef.current || undefined,
        )
        const newState = useSessionStore.getState()
        if (newState.currentSession) {
          setStartedAtDisplay(
            formatStartTime(new Date(newState.currentSession.started_at).getTime()),
          )
        }
      } catch (err: unknown) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          context: 'TimerScreen.startSession',
        })
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to start session. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }],
        )
      } finally {
        setIsStarting(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [setupComplete, restoreTimerFromMMKV, startSession, router])

  // --- 1-second tick interval using store's updateElapsed ---
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        updateElapsed()

        const { elapsedSeconds: elapsed } = useSessionStore.getState()
        if (elapsed >= plannedMinutes * 60 && !goalReached) {
          setGoalReached(true)
        }
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isTimerRunning, goalReached, plannedMinutes, updateElapsed])

  // --- AppState listener for foreground reconciliation ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateElapsed()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [updateElapsed])

  // --- Timer controls ---
  const isPaused = timerState?.status === 'paused'

  const handlePause = useCallback(() => {
    pauseSession()
  }, [pauseSession])

  const handleResume = useCallback(() => {
    resumeSession()
  }, [resumeSession])

  const handleEnd = useCallback(() => {
    // Navigate to session rating — the rating screen will finalize the session
    const finalElapsed = useSessionStore.getState().elapsedSeconds

    router.replace({
      pathname: '/session-rating',
      params: {
        taskName,
        durationSeconds: String(finalElapsed),
        plannedMinutes: String(plannedMinutes),
        taskId,
        checkInId,
      },
    })
  }, [taskName, plannedMinutes, taskId, checkInId, router])

  // --- Setup UI for quick-action (no check-in params) ---
  if (!setupComplete) {
    const canStart = setupMinutes >= 5 && setupMinutes <= 180

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <View className="flex-1 px-6 pt-12 justify-center">
          <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
            Quick Focus Session
          </Text>
          <Text className="text-base text-gray-500 text-center mb-8">
            Pick a duration and optionally name your task.
          </Text>

          {/* Task name input */}
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-6"
            placeholder="What's the one thing you're actually going to do?"
            placeholderTextColor="#9CA3AF"
            value={setupTaskName}
            onChangeText={setSetupTaskName}
            maxLength={120}
            accessibilityLabel="Task name"
          />

          {/* Duration presets */}
          <View className="flex-row justify-center gap-3 mb-3">
            {QUICK_PRESETS.map((mins) => (
              <Pressable
                key={mins}
                onPress={() => {
                  setIsCustomSetup(false)
                  setSetupMinutes(mins)
                }}
                className={`rounded-xl px-6 py-3 ${
                  !isCustomSetup && setupMinutes === mins ? 'bg-purple-500' : 'bg-gray-100'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: !isCustomSetup && setupMinutes === mins }}
                accessibilityLabel={`${mins} minutes`}
              >
                <Text
                  className={`text-base font-semibold ${
                    !isCustomSetup && setupMinutes === mins ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {mins} min
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setIsCustomSetup(true)
                setCustomSetupInput('')
              }}
              className={`rounded-xl px-6 py-3 ${isCustomSetup ? 'bg-purple-500' : 'bg-gray-100'}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isCustomSetup }}
              accessibilityLabel="Custom duration"
            >
              <Text
                className={`text-base font-semibold ${
                  isCustomSetup ? 'text-white' : 'text-gray-600'
                }`}
              >
                Custom
              </Text>
            </Pressable>
          </View>

          {isCustomSetup && (
            <View className="items-center mb-4">
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-base text-gray-800 w-32 text-center"
                placeholder="Minutes"
                placeholderTextColor="#9CA3AF"
                value={customSetupInput}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '')
                  setCustomSetupInput(cleaned)
                  const num = parseInt(cleaned, 10)
                  if (num >= 5 && num <= 180) {
                    setSetupMinutes(num)
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
                accessibilityLabel="Custom minutes (5 to 180)"
              />
              <Text className="text-xs text-gray-400 mt-1">5 -- 180 minutes</Text>
            </View>
          )}

          {/* Start button */}
          <Pressable
            onPress={() => setSetupComplete(true)}
            disabled={!canStart}
            className={`mt-6 rounded-2xl py-4 items-center ${
              canStart ? 'bg-green-500' : 'bg-gray-200'
            }`}
            style={({ pressed }) => [pressed ? { opacity: 0.85 } : {}]}
            accessibilityRole="button"
            accessibilityLabel="Start focus session"
          >
            <Text className={`text-lg font-bold ${canStart ? 'text-white' : 'text-gray-400'}`}>
              Start Session
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: '',
          headerShown: false,
        }}
      />

      <View className="flex-1 px-6 pt-12">
        {/* Header: task name and planned duration */}
        <View className="items-center mb-12">
          <Text className="text-lg font-semibold text-gray-800 text-center" numberOfLines={2}>
            {taskName}
          </Text>
          <Text className="text-sm text-gray-400 mt-1">{plannedMinutes} min planned</Text>
        </View>

        {/* Timer display */}
        <View className="flex-1 justify-center items-center">
          <TimerDisplay
            elapsedSeconds={elapsedSeconds}
            plannedMinutes={plannedMinutes}
            isPaused={isPaused}
          />

          {/* Goal reached banner */}
          {goalReached && (
            <View className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 mt-8 mx-4">
              <Text className="text-green-700 text-base font-semibold text-center">
                You did it.
              </Text>
              <Text className="text-green-600 text-sm text-center mt-1">
                Keep going or wrap up — both are great.
              </Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View className="pb-8">
          <TimerControls
            isPaused={isPaused}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
          />

          {/* Session info */}
          <Text className="text-sm text-gray-400 text-center mt-6">
            Started at {startedAtDisplay}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

function formatStartTime(epochMs: number): string {
  const date = new Date(epochMs)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = String(minutes).padStart(2, '0')
  return `${displayHours}:${displayMinutes} ${ampm}`
}
