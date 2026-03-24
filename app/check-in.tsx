import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import EnergySelector, { type EnergyLevel } from '@/src/components/checkin/EnergySelector'
import TaskBreakdown, { type Task } from '@/src/components/checkin/TaskBreakdown'
import { useAuthStore } from '@/src/stores/authStore'
import { getTodayCheckIn } from '@/src/services/checkin.service'
import { consumeShield } from '@/src/services/shields.service'
import { supabase } from '@/src/lib/supabase'
import { captureError } from '@/src/lib/sentry'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a UUID v4 string without requiring crypto.randomUUID(). */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Map the UI energy level to a numeric 1-5 value for the Edge Function. */
function energyToNumber(energy: EnergyLevel): number {
  switch (energy) {
    case 'good':
      return 5
    case 'meh':
      return 3
    case 'low':
      return 1
    case 'need-a-break':
      return 1 // DB CHECK constraint requires 1-5; "need-a-break" maps to lowest valid value
  }
}

const TIME_PRESETS = [15, 25, 50] as const

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CheckInScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const [step, setStep] = useState(1)
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(null)
  const [userMessage, setUserMessage] = useState('')
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeCommitment, setTimeCommitment] = useState<number>(25)
  const [isCustomTime, setIsCustomTime] = useState(false)
  const [customTimeInput, setCustomTimeInput] = useState('')
  const [hardReason, setHardReason] = useState<string | null>(null)

  // AI response state
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [checkInId, setCheckInId] = useState<string | null>(null)

  // BREAK-05: Clarification state (max 3 rounds to prevent infinite loop)
  const MAX_CLARIFICATION_ROUNDS = 3
  const [clarificationQuestion, setClarificationQuestion] = useState('')
  const [clarificationInput, setClarificationInput] = useState('')
  const [clarificationCount, setClarificationCount] = useState(0)

  // BREAK-04: Regenerate loading state
  const [regenerateLoading, setRegenerateLoading] = useState(false)

  // "Already checked in" state
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [existingCheckInLoading, setExistingCheckInLoading] = useState(true)

  // Confirm loading
  const [confirmLoading, setConfirmLoading] = useState(false)

  // --- CHECKIN-01: Check for existing check-in on mount ---

  useEffect(() => {
    async function checkExisting() {
      if (!user?.id) {
        setExistingCheckInLoading(false)
        return
      }
      try {
        const existing = await getTodayCheckIn(user.id)
        if (existing) {
          setAlreadyCheckedIn(true)
        }
      } catch (err) {
        // Non-blocking — allow the user to proceed even if the lookup fails
        captureError(err instanceof Error ? err : new Error(String(err)), {
          context: 'CheckInScreen.checkExisting',
        })
      } finally {
        setExistingCheckInLoading(false)
      }
    }
    checkExisting()
  }, [user?.id])

  // --- Step navigation ---

  function handleEnergySelect(energy: EnergyLevel) {
    setSelectedEnergy(energy)

    if (energy === 'need-a-break') {
      // CHECKIN-05: Show break options instead of navigating away immediately
      setStep(5)
      return
    }

    setTimeout(() => setStep(2), 300)
  }

  async function handleSubmitMessage() {
    if (userMessage.trim().length === 0) return
    if (!selectedEnergy || selectedEnergy === 'need-a-break') return

    setHasSubmittedMessage(true)
    setAiLoading(true)

    try {
      // CHECKIN-03/04/09: Call the ai-checkin Edge Function
      const { data, error } = await supabase.functions.invoke('ai-checkin', {
        body: {
          energyLevel: energyToNumber(selectedEnergy),
          message: userMessage.trim(),
        },
      })

      if (error) throw error

      // BREAK-05: Handle clarification response for vague goals (capped to prevent infinite loop)
      if (data?.clarification && clarificationCount < MAX_CLARIFICATION_ROUNDS) {
        setClarificationQuestion(data.clarification)
        setClarificationCount((c) => c + 1)
        setHasSubmittedMessage(false)
        return
      }

      // Parse response — the Edge Function returns { message, tasks, check_in_id }
      const responseMessage: string = data?.message ?? ''
      const responseTasks: Array<{
        id: string
        title: string
        estimated_mins: number
        difficulty: string
      }> = data?.tasks ?? []

      setAiMessage(responseMessage)
      setCheckInId(data?.check_in_id ?? null)
      setClarificationQuestion('')

      // Map to the Task shape used by the UI
      setTasks(
        responseTasks.map((t) => ({
          id: t.id ?? generateId(),
          title: t.title,
          estimatedMinutes: t.estimated_mins ?? 15,
          difficulty: (t.difficulty ?? 'medium') as Task['difficulty'],
          included: true,
        })),
      )

      setTimeout(() => setStep(3), 600)
    } catch (err: unknown) {
      Alert.alert(
        'Something went wrong',
        err instanceof Error ? err.message : 'Could not reach the AI service. Please try again.',
      )
      // Reset so the user can re-submit
      setHasSubmittedMessage(false)
    } finally {
      setAiLoading(false)
    }
  }

  // BREAK-05: Submit clarified goal message
  async function handleSubmitClarification(clarifiedMessage: string) {
    if (!selectedEnergy || selectedEnergy === 'need-a-break') return

    setAiLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-checkin', {
        body: {
          energyLevel: energyToNumber(selectedEnergy),
          message: clarifiedMessage,
        },
      })

      if (error) throw error

      if (data?.clarification && clarificationCount < MAX_CLARIFICATION_ROUNDS) {
        setClarificationQuestion(data.clarification)
        setClarificationCount((c) => c + 1)
        setHasSubmittedMessage(false)
        return
      }

      const responseMessage: string = data?.message ?? ''
      const responseTasks: Array<{
        id: string
        title: string
        estimated_mins: number
        difficulty: string
      }> = data?.tasks ?? []

      setAiMessage(responseMessage)
      setCheckInId(data?.check_in_id ?? null)
      setClarificationQuestion('')

      setTasks(
        responseTasks.map((t) => ({
          id: t.id ?? generateId(),
          title: t.title,
          estimatedMinutes: t.estimated_mins ?? 15,
          difficulty: (t.difficulty ?? 'medium') as Task['difficulty'],
          included: true,
        })),
      )

      setTimeout(() => setStep(3), 600)
    } catch (err: unknown) {
      Alert.alert(
        'Something went wrong',
        err instanceof Error ? err.message : 'Could not reach the AI service. Please try again.',
      )
      setHasSubmittedMessage(false)
    } finally {
      setAiLoading(false)
    }
  }

  // BREAK-04: Regenerate tasks with a different approach
  async function handleRegenerate() {
    if (!selectedEnergy || selectedEnergy === 'need-a-break' || regenerateLoading) return

    setRegenerateLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-checkin', {
        body: {
          energyLevel: energyToNumber(selectedEnergy),
          message: `${userMessage.trim()}. Please suggest a DIFFERENT approach and different task breakdown than before.`,
        },
      })

      if (error) throw error

      const responseMessage: string = data?.message ?? ''
      const responseTasks: Array<{
        id: string
        title: string
        estimated_mins: number
        difficulty: string
      }> = data?.tasks ?? []

      setAiMessage(responseMessage)
      if (data?.check_in_id) setCheckInId(data.check_in_id)

      setTasks(
        responseTasks.map((t) => ({
          id: t.id ?? generateId(),
          title: t.title,
          estimatedMinutes: t.estimated_mins ?? 15,
          difficulty: (t.difficulty ?? 'medium') as Task['difficulty'],
          included: true,
        })),
      )
    } catch (err: unknown) {
      Alert.alert(
        'Something went wrong',
        err instanceof Error ? err.message : 'Could not regenerate tasks. Please try again.',
      )
    } finally {
      setRegenerateLoading(false)
    }
  }

  function handleToggleTask(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, included: !t.included } : t)))
  }

  function handleMakeSmaller(taskId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              estimatedMinutes: Math.max(5, Math.round(t.estimatedMinutes / 2)),
              difficulty: t.difficulty === 'hard' ? 'medium' : 'easy',
            }
          : t,
      ),
    )
  }

  // CHECKIN-07: Confirm and navigate to timer
  async function handleConfirm() {
    const includedTasks = tasks.filter((t) => t.included)
    if (includedTasks.length === 0 || confirmLoading) return

    setConfirmLoading(true)

    // Mark check-in as completed (fire-and-forget with error reporting)
    if (checkInId) {
      const updatePayload: Record<string, unknown> = { completed: true }
      if (hardReason) {
        updatePayload.hard_reason = hardReason
      }
      supabase
        .from('daily_check_ins')
        .update(updatePayload)
        .eq('id', checkInId)
        .eq('user_id', user?.id ?? '')
        .then(({ error: updateErr }) => {
          if (updateErr) {
            captureError(new Error(`Check-in completion update failed: ${updateErr.message}`), {
              context: 'checkIn.handleConfirm',
              checkInId,
            })
          }
        })
    }

    const firstTask = includedTasks[0]

    // M12: Reset loading state before navigation to avoid state update after unmount
    setConfirmLoading(false)

    router.push({
      pathname: '/timer',
      params: {
        taskName: firstTask.title,
        plannedMinutes: String(timeCommitment),
        taskId: firstTask.id,
        checkInId: checkInId ?? '',
      },
    })
  }

  // --- CHECKIN-05: "Need a Break" handlers ---

  function handleOpenToolbox() {
    router.push('/bad-day-toolbox')
  }

  async function handleRestDay() {
    if (!profile || !user?.id) return

    if ((profile.streak_shields ?? 0) <= 0) {
      Alert.alert(
        'No streak shields',
        "You don't have any streak shields left. Try the Bad Day Toolbox instead!",
      )
      return
    }

    try {
      // C7: Use atomic CAS-based shield decrement to prevent double-decrement race condition
      const success = await consumeShield(user.id, profile.streak_shields ?? 0)

      if (!success) {
        Alert.alert(
          'Shield already used',
          'Your streak shield was already consumed. Please try again.',
        )
        useAuthStore.getState().fetchProfile()
        return
      }

      // Refresh profile in store
      useAuthStore.getState().fetchProfile()

      Alert.alert('Rest day activated', 'Your streak is safe. Take care of yourself today!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Could not activate rest day. Please try again.',
      )
    }
  }

  // --- Progress dots (H19: inline JSX instead of inner component) ---

  const progressDots =
    step === 5 ? null : (
      <View className="flex-row items-center justify-center gap-2 mt-4 mb-6">
        {[1, 2, 3].map((dotStep) => (
          <View
            key={dotStep}
            className={`h-2 rounded-full ${
              dotStep === step
                ? 'w-8 bg-purple-500'
                : dotStep < step
                  ? 'w-2 bg-purple-300'
                  : 'w-2 bg-gray-200'
            }`}
          />
        ))}
      </View>
    )

  // --- Loading state ---

  if (existingCheckInLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Daily Check-in',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#F9FAFB' },
            headerTintColor: '#8B5CF6',
            headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          }}
        />
        <ActivityIndicator size="large" color="#8B5CF6" />
      </SafeAreaView>
    )
  }

  // --- CHECKIN-01: Already checked in ---

  if (alreadyCheckedIn) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Daily Check-in',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#F9FAFB' },
            headerTintColor: '#8B5CF6',
            headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
          }}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">&#10003;</Text>
          <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
            Already checked in today
          </Text>
          <Text className="text-base text-gray-500 text-center mb-8">
            You've already completed your daily check-in. Come back tomorrow for a fresh start!
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-purple-500 rounded-xl px-8 py-3"
            accessibilityRole="button"
            accessibilityLabel="Go back to home screen"
          >
            <Text className="text-white text-base font-semibold">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // --- Step 1: Energy Selection ---

  function renderStep1() {
    return (
      <View className="flex-1 px-6">
        <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
          How's your energy today?
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          No wrong answers -- just check in with yourself.
        </Text>
        <EnergySelector selectedEnergy={selectedEnergy} onSelect={handleEnergySelect} />
      </View>
    )
  }

  // --- Step 2: AI Conversation ---

  function renderStep2() {
    // Static initial prompt based on energy level (shown before AI response arrives)
    const initialPrompt =
      selectedEnergy === 'good'
        ? 'Great energy! What would you like to work on today?'
        : selectedEnergy === 'meh'
          ? "That's totally okay. What's the one thing you'd be relieved to have started today?"
          : "Thanks for being honest. What's the one thing you'd be relieved to have started today?"

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
          {/* AI message bubble */}
          <View className="bg-purple-50 rounded-2xl rounded-tl-sm p-4 mb-6 max-w-[90%]">
            <Text className="text-base text-gray-700 leading-6">{initialPrompt}</Text>
          </View>

          {/* User input or submitted message */}
          {hasSubmittedMessage ? (
            <View className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm p-4 mb-6 self-end max-w-[90%] ml-auto">
              <Text className="text-base text-gray-800">{userMessage}</Text>
            </View>
          ) : (
            <View className="mb-4">
              <TextInput
                className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-base text-gray-800 min-h-[48px]"
                placeholder="Tell me what you'd like to work on..."
                placeholderTextColor="#9CA3AF"
                value={userMessage}
                onChangeText={setUserMessage}
                multiline
                maxLength={500}
                accessibilityLabel="What would you like to work on today?"
              />
              <Pressable
                onPress={handleSubmitMessage}
                disabled={userMessage.trim().length === 0}
                className={`mt-3 rounded-xl py-3 items-center ${
                  userMessage.trim().length > 0 ? 'bg-purple-500' : 'bg-gray-200'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Text
                  className={`text-base font-semibold ${
                    userMessage.trim().length > 0 ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Send
                </Text>
              </Pressable>
            </View>
          )}

          {/* BREAK-05: Clarification question from AI */}
          {clarificationQuestion && !hasSubmittedMessage && (
            <>
              <View className="bg-purple-50 rounded-2xl rounded-tl-sm p-4 mb-4 max-w-[90%]">
                <Text className="text-base text-gray-700 leading-6">{clarificationQuestion}</Text>
              </View>
              <View className="mb-4">
                <TextInput
                  className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-base text-gray-800 min-h-[48px]"
                  placeholder="Be more specific..."
                  placeholderTextColor="#9CA3AF"
                  value={clarificationInput}
                  onChangeText={setClarificationInput}
                  multiline
                  maxLength={500}
                  accessibilityLabel="Clarify your goal"
                />
                <Pressable
                  onPress={() => {
                    const clarified = clarificationInput.trim()
                    if (clarified.length === 0) return
                    setUserMessage(clarified)
                    setClarificationInput('')
                    setClarificationQuestion('')
                    setHasSubmittedMessage(true)
                    handleSubmitClarification(clarified)
                  }}
                  disabled={clarificationInput.trim().length === 0}
                  className={`mt-3 rounded-xl py-3 items-center ${
                    clarificationInput.trim().length > 0 ? 'bg-purple-500' : 'bg-gray-200'
                  }`}
                  accessibilityRole="button"
                >
                  <Text
                    className={`text-base font-semibold ${
                      clarificationInput.trim().length > 0 ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    Send
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* AI loading / response indicator */}
          {hasSubmittedMessage && (
            <View className="bg-purple-50 rounded-2xl rounded-tl-sm p-4 max-w-[90%]">
              {aiLoading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text className="text-base text-gray-500">Thinking...</Text>
                </View>
              ) : (
                <Text className="text-base text-gray-700">
                  {aiMessage || "Got it! I've put together a plan for you. Let's take a look..."}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // --- Step 3: Task Review ---

  function renderStep3() {
    const totalMinutes = tasks
      .filter((t) => t.included)
      .reduce((sum, t) => sum + t.estimatedMinutes, 0)
    const includedCount = tasks.filter((t) => t.included).length

    return (
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Show AI message at top of task review */}
        {aiMessage ? (
          <View className="bg-purple-50 rounded-2xl p-4 mb-6">
            <Text className="text-base text-gray-700 leading-6">{aiMessage}</Text>
          </View>
        ) : null}

        <Text className="text-2xl font-bold text-gray-800 text-center mb-2">Here's your plan</Text>
        <Text className="text-base text-gray-500 text-center mb-6">
          {includedCount} task{includedCount !== 1 ? 's' : ''} -- about {totalMinutes} min total
        </Text>

        <TaskBreakdown
          tasks={tasks}
          onToggle={handleToggleTask}
          onMakeSmaller={handleMakeSmaller}
        />

        {/* BREAK-04: Regenerate / try different approach */}
        <Pressable
          onPress={handleRegenerate}
          disabled={regenerateLoading}
          className="mt-4 py-3 items-center rounded-xl border border-purple-200 bg-purple-50"
          accessibilityRole="button"
          accessibilityLabel="Try a different approach"
        >
          {regenerateLoading ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Text className="text-purple-600 text-sm font-semibold">Try a different approach</Text>
          )}
        </Pressable>

        {/* Why is this hard today? */}
        <View className="mt-6">
          <Text className="text-sm font-semibold text-gray-600 mb-2 text-center">
            Why is this hard today?
          </Text>
          <Text className="text-xs text-gray-400 text-center mb-3">
            Optional — helps Drift coach you better
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {[
              { key: 'unclear_start', label: 'Not sure where to start' },
              { key: 'overwhelmed', label: 'Feeling overwhelmed' },
              { key: 'fear_of_failure', label: "Scared it won't be good enough" },
              { key: 'low_motivation', label: 'Just no motivation' },
            ].map((chip) => (
              <Pressable
                key={chip.key}
                onPress={() => setHardReason(hardReason === chip.key ? null : chip.key)}
                className={`rounded-full px-4 py-2 border ${
                  hardReason === chip.key
                    ? 'bg-purple-50 border-purple-400'
                    : 'bg-white border-gray-200'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: hardReason === chip.key }}
                accessibilityLabel={chip.label}
              >
                <Text
                  className={`text-sm ${
                    hardReason === chip.key ? 'text-purple-600 font-semibold' : 'text-gray-600'
                  }`}
                >
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time commitment picker */}
        <View className="mt-8">
          <Text className="text-base font-semibold text-gray-700 mb-3 text-center">
            How much time do you have?
          </Text>
          <View className="flex-row justify-center gap-3">
            {TIME_PRESETS.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={() => {
                  setIsCustomTime(false)
                  setTimeCommitment(minutes)
                }}
                className={`rounded-xl px-6 py-3 ${
                  !isCustomTime && timeCommitment === minutes ? 'bg-purple-500' : 'bg-gray-100'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: !isCustomTime && timeCommitment === minutes }}
                accessibilityLabel={`${minutes} minutes`}
              >
                <Text
                  className={`text-base font-semibold ${
                    !isCustomTime && timeCommitment === minutes ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {minutes} min
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setIsCustomTime(true)
                setCustomTimeInput('')
              }}
              className={`rounded-xl px-6 py-3 ${isCustomTime ? 'bg-purple-500' : 'bg-gray-100'}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isCustomTime }}
              accessibilityLabel="Custom duration"
            >
              <Text
                className={`text-base font-semibold ${
                  isCustomTime ? 'text-white' : 'text-gray-600'
                }`}
              >
                Custom
              </Text>
            </Pressable>
          </View>
          {isCustomTime && (
            <View className="mt-3 items-center">
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-base text-gray-800 w-32 text-center"
                placeholder="Minutes"
                placeholderTextColor="#9CA3AF"
                value={customTimeInput}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '')
                  setCustomTimeInput(cleaned)
                  const num = parseInt(cleaned, 10)
                  if (num >= 5 && num <= 180) {
                    setTimeCommitment(num)
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
                accessibilityLabel="Custom minutes (5 to 180)"
              />
              <Text className="text-xs text-gray-400 mt-1">5 -- 180 minutes</Text>
            </View>
          )}
        </View>

        {/* Confirmation button */}
        <Pressable
          onPress={handleConfirm}
          disabled={includedCount === 0 || confirmLoading}
          className={`mt-8 mb-8 rounded-2xl py-4 items-center ${
            includedCount > 0 && !confirmLoading ? 'bg-green-500' : 'bg-gray-200'
          }`}
          style={({ pressed }) => [pressed ? { opacity: 0.85 } : {}]}
          accessibilityRole="button"
          accessibilityLabel="Start focus session"
        >
          <Text
            className={`text-lg font-bold ${includedCount > 0 ? 'text-white' : 'text-gray-400'}`}
          >
            Let's do this
          </Text>
        </Pressable>
      </ScrollView>
    )
  }

  // --- Step 5: Need a Break (CHECKIN-05) ---

  function renderBreakStep() {
    const shieldCount = profile?.streak_shields ?? 0

    return (
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-5xl mb-4">&#128564;</Text>
        <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
          That's okay. Everyone needs a break.
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Choose what feels right for you today.
        </Text>

        <Pressable
          onPress={handleOpenToolbox}
          className="bg-purple-500 rounded-2xl py-4 px-8 w-full items-center mb-4"
          accessibilityRole="button"
          accessibilityLabel="Open Bad Day Toolbox"
        >
          <Text className="text-white text-lg font-bold">Open Bad Day Toolbox</Text>
          <Text className="text-purple-200 text-sm mt-1">Activities to lift your mood</Text>
        </Pressable>

        <Pressable
          onPress={handleRestDay}
          className="bg-gray-100 rounded-2xl py-4 px-8 w-full items-center mb-4"
          accessibilityRole="button"
          accessibilityLabel="Take a rest day"
        >
          <Text className="text-gray-800 text-lg font-bold">Take a rest day</Text>
          <Text className="text-gray-500 text-sm mt-1">
            {shieldCount > 0
              ? `Use a streak shield (${shieldCount} remaining)`
              : 'No streak shields available'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="py-3"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-gray-400 text-base">Go back</Text>
        </Pressable>
      </View>
    )
  }

  // --- Main render ---

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Daily Check-in',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
        }}
      />

      {progressDots}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 5 && renderBreakStep()}
    </SafeAreaView>
  )
}
