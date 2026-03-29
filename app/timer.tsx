import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  AppState,
  type AppStateStatus,
  Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import TimerDisplay from '@/src/components/timer/TimerDisplay'
import TimerControls from '@/src/components/timer/TimerControls'
import { useSessionStore } from '@/src/stores/sessionStore'
import { useAuthStore } from '@/src/stores/authStore'
import { getTodayPromise } from '@/src/services/promises.service'
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
  const [todayPromise, setTodayPromise] = useState<string | null>(null)

  const userId = useAuthStore.getState().user?.id
  useEffect(() => {
    if (!userId) return
    getTodayPromise(userId)
      .then((p) => setTodayPromise(p?.text ?? null))
      .catch(() => {})
  }, [userId])
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
    // Pause first to freeze elapsed time in the store.
    // endSession() calls computeElapsed() using live wall-clock, so without
    // pausing here the rating screen's idle time (filling out the form) gets
    // added to the session duration.
    pauseSession()

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
  }, [taskName, plannedMinutes, taskId, checkInId, router, pauseSession])

  // --- Setup UI for quick-action (no check-in params) ---
  if (!setupComplete) {
    const canStart = setupMinutes >= 5 && setupMinutes <= 180

    const PRESET_BUTTONS = [
      { label: 'Just 5 min', mins: 5 },
      { label: '25 min', mins: 25 },
      { label: '50 min', mins: 50 },
    ]

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7' }} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Top App Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
          <View style={{ width: 40 }} />
          <Text style={{ fontSize: 18, fontWeight: '500', color: '#323331' }}>Focus</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ padding: 8, borderRadius: 999, backgroundColor: pressed ? '#EAE8E5' : 'transparent' })}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={24} color="#8B93FF" />
          </Pressable>
        </View>

        {/* Scrollable main content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#323331', marginBottom: 12, letterSpacing: -0.5 }}>
            What are you working on?
          </Text>
          <View style={{ width: 96, height: 6, backgroundColor: '#B8BCFF', borderRadius: 999, marginBottom: 40 }} />

          {/* Task input */}
          <TextInput
            style={{
              backgroundColor: '#F6F3F1',
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 20,
              fontSize: 18,
              color: '#323331',
              marginBottom: 40,
            }}
            placeholder="What's the one thing you're actually going to do?"
            placeholderTextColor="#5F5F5D66"
            value={setupTaskName}
            onChangeText={setSetupTaskName}
            maxLength={120}
            accessibilityLabel="Task name"
          />

          {/* Duration section */}
          <View style={{ marginBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#006B64', letterSpacing: 2, textTransform: 'uppercase' }}>
                How long?
              </Text>
              <Text style={{ fontSize: 12, color: '#5F5F5D', fontWeight: '500' }}>
                Deep focus recommended
              </Text>
            </View>

            {/* Row 1: 5 min + 25 min */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {PRESET_BUTTONS.slice(0, 2).map(({ label, mins }) => {
                const selected = !isCustomSetup && setupMinutes === mins
                return (
                  <Pressable
                    key={mins}
                    onPress={() => { setIsCustomSetup(false); setSetupMinutes(mins) }}
                    style={{ flex: 1, paddingVertical: 16, borderRadius: 999, alignItems: 'center', backgroundColor: selected ? '#B8BCFF' : '#F6F3F1' }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${mins} minutes`}
                  >
                    <Text style={{ fontWeight: selected ? '600' : '500', color: selected ? '#272D97' : '#323331', fontSize: 15 }}>
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Row 2: 50 min + Custom */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(() => {
                const { label, mins } = PRESET_BUTTONS[2]
                const selected = !isCustomSetup && setupMinutes === mins
                return (
                  <Pressable
                    key={mins}
                    onPress={() => { setIsCustomSetup(false); setSetupMinutes(mins) }}
                    style={{ flex: 1, paddingVertical: 16, borderRadius: 999, alignItems: 'center', backgroundColor: selected ? '#B8BCFF' : '#F6F3F1' }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${mins} minutes`}
                  >
                    <Text style={{ fontWeight: selected ? '600' : '500', color: selected ? '#272D97' : '#323331', fontSize: 15 }}>
                      {label}
                    </Text>
                  </Pressable>
                )
              })()}
              <Pressable
                onPress={() => { setIsCustomSetup(true); setCustomSetupInput('') }}
                style={{ flex: 1, paddingVertical: 16, borderRadius: 999, alignItems: 'center', backgroundColor: isCustomSetup ? '#B8BCFF' : '#F6F3F1' }}
                accessibilityRole="button"
                accessibilityState={{ selected: isCustomSetup }}
                accessibilityLabel="Custom duration"
              >
                <Text style={{ fontWeight: isCustomSetup ? '600' : '500', color: isCustomSetup ? '#272D97' : '#323331', fontSize: 15 }}>
                  Custom
                </Text>
              </Pressable>
            </View>

            {isCustomSetup && (
              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <TextInput
                  style={{ backgroundColor: '#F6F3F1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, textAlign: 'center', width: 128, color: '#323331' }}
                  placeholder="Minutes"
                  placeholderTextColor="#5F5F5D"
                  value={customSetupInput}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '')
                    setCustomSetupInput(cleaned)
                    const num = parseInt(cleaned, 10)
                    if (num >= 5 && num <= 180) setSetupMinutes(num)
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel="Custom minutes (5 to 180)"
                />
                <Text style={{ fontSize: 12, color: '#5F5F5D', marginTop: 4 }}>5 – 180 minutes</Text>
              </View>
            )}
          </View>

          {/* Insight card */}
          <View style={{ backgroundColor: '#8EF4E9', borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
            <MaterialIcons name="lightbulb" size={24} color="#006B64" />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 22, color: '#005C56' }}>
              Setting a clear intention reduces cognitive load by 40%. You're building momentum just by starting this setup.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 }}>
          <Pressable
            onPress={() => setSetupComplete(true)}
            disabled={!canStart}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : canStart ? 1 : 0.5 })}
            accessibilityRole="button"
            accessibilityLabel="Start focus session"
          >
            <LinearGradient
              colors={['#4C54BB', '#B8BCFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 999, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}
            >
              <Text style={{ color: '#FBF8FF', fontWeight: '700', fontSize: 18, letterSpacing: 0.5 }}>Start</Text>
              <MaterialIcons name="play-arrow" size={24} color="#FBF8FF" />
            </LinearGradient>
          </Pressable>
          <Text style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#5F5F5D', fontWeight: '500' }}>
            Take a deep breath. Focus will follow.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7' }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Decorative background blobs */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '40%', aspectRatio: 1, backgroundColor: '#8EF4E9', opacity: 0.12, borderRadius: 999 }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: '-5%', right: '-5%', width: '30%', aspectRatio: 1, backgroundColor: '#B8BCFF', opacity: 0.12, borderRadius: 999 }}
      />

      {/* Header: close left, title centered */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ padding: 8, borderRadius: 999, backgroundColor: pressed ? '#EAE8E5' : 'transparent' })}
          accessibilityRole="button"
          accessibilityLabel="Close timer"
        >
          <MaterialIcons name="close" size={24} color="#5F5F5D" />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#323331' }}>Focus</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 32 }}>
        {/* Task name */}
        <Text
          style={{ fontSize: 22, fontWeight: '600', color: '#323331', textAlign: 'center', letterSpacing: -0.3 }}
          numberOfLines={2}
        >
          {taskName}
        </Text>

        {/* Today's promise */}
        {todayPromise ? (
          <Text
            style={{ fontSize: 13, color: '#5F5F5D', textAlign: 'center', fontStyle: 'italic', lineHeight: 20, paddingHorizontal: 8 }}
            numberOfLines={2}
          >
            Today's promise: {todayPromise}
          </Text>
        ) : (
          <Text style={{ color: '#006B64', fontWeight: '500', fontSize: 13, letterSpacing: 0.3 }}>
            {plannedMinutes} min focus
          </Text>
        )}

        {/* Timer ring + display */}
        <TimerDisplay
          elapsedSeconds={elapsedSeconds}
          plannedMinutes={plannedMinutes}
          isPaused={isPaused}
        />

        {/* Goal reached affirmation */}
        {goalReached && (
          <View
            style={{
              width: '100%',
              backgroundColor: 'rgba(142,244,233,0.4)',
              borderRadius: 20,
              paddingVertical: 20,
              paddingHorizontal: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0,107,100,0.15)',
            }}
          >
            <Text style={{ color: '#005C56', fontWeight: '500', fontSize: 16, textAlign: 'center', lineHeight: 26 }}>
              You did it. Keep going or wrap up — both are great.
            </Text>
          </View>
        )}

        {/* Controls */}
        <TimerControls
          isPaused={isPaused}
          onPause={handlePause}
          onResume={handleResume}
          onEnd={handleEnd}
        />

        {startedAtDisplay ? (
          <Text style={{ fontSize: 12, color: '#B3B2AF', fontWeight: '500' }}>
            Started at {startedAtDisplay}
          </Text>
        ) : null}
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
