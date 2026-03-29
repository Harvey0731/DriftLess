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
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
import EnergySelector, { type EnergyLevel } from '@/src/components/checkin/EnergySelector'
import { AI_CHECKIN_STUB_ENABLED, stubAiCheckin } from '@/src/stubs/aiCheckin.stub'
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
    // Selection is now confirmed via the Continue button, not auto-advance
  }

  function handleEnergyContinue() {
    if (!selectedEnergy) return
    if (selectedEnergy === 'need-a-break') {
      setStep(5)
      return
    }
    setStep(2)
  }

  async function handleSubmitMessage() {
    if (!selectedEnergy || selectedEnergy === 'need-a-break') return

    setHasSubmittedMessage(true)
    setAiLoading(true)

    try {
      let data: { message: string; tasks: Array<{ id: string; title: string; estimated_mins: number; difficulty: string }>; check_in_id: string; clarification?: string }

      if (AI_CHECKIN_STUB_ENABLED) {
        // STUB — remove AI_CHECKIN_STUB_ENABLED import + this block when API key is ready
        data = await stubAiCheckin()
      } else {
        const result = await supabase.functions.invoke('ai-checkin', {
          body: { energyLevel: energyToNumber(selectedEnergy), message: userMessage.trim() },
        })
        if (result.error) throw result.error
        data = result.data
      }

      // BREAK-05: Handle clarification response
      if (data?.clarification && clarificationCount < MAX_CLARIFICATION_ROUNDS) {
        setClarificationQuestion(data.clarification)
        setClarificationCount((c) => c + 1)
        setHasSubmittedMessage(false)
        return
      }

      setAiMessage(data?.message ?? '')
      setCheckInId(data?.check_in_id ?? null)
      setClarificationQuestion('')
      setTasks(
        (data?.tasks ?? []).map((t) => ({
          id: t.id ?? generateId(),
          title: t.title,
          estimatedMinutes: t.estimated_mins ?? 15,
          difficulty: (t.difficulty ?? 'medium') as Task['difficulty'],
          included: true,
        })),
      )
      setTimeout(() => setStep(3), 600)
    } catch (err: unknown) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Could not reach the AI service. Please try again.')
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
      let data: { message: string; tasks: Array<{ id: string; title: string; estimated_mins: number; difficulty: string }>; check_in_id?: string }

      if (AI_CHECKIN_STUB_ENABLED) {
        data = await stubAiCheckin()
      } else {
        const result = await supabase.functions.invoke('ai-checkin', {
          body: { energyLevel: energyToNumber(selectedEnergy), message: `${userMessage.trim()}. Please suggest a DIFFERENT approach.` },
        })
        if (result.error) throw result.error
        data = result.data
      }

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
    // Skip DB update for stub IDs — they don't exist in the database
    if (checkInId && !checkInId.startsWith('stub-')) {
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7', alignItems: 'center', justifyContent: 'center' }} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#4C54BB" />
      </SafeAreaView>
    )
  }

  // --- CHECKIN-01: Already checked in ---

  if (alreadyCheckedIn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7' }} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#8EF4E9',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}>
            <MaterialIcons name="check" size={36} color="#006B64" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#323331', textAlign: 'center', marginBottom: 8 }}>
            Already checked in today
          </Text>
          <Text style={{ fontSize: 15, color: '#5f5f5d', textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
            You've already completed your daily check-in. Come back tomorrow for a fresh start!
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: '#4C54BB', borderRadius: 999, paddingHorizontal: 32, paddingVertical: 14 }}
            accessibilityRole="button"
            accessibilityLabel="Go back to home screen"
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // --- Step 1: Energy Selection ---

  function renderStep1() {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{
            fontSize: 34,
            fontWeight: '700',
            color: '#323331',
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 12,
            lineHeight: 42,
          }}>
            How's your energy today?
          </Text>
          <Text style={{ fontSize: 17, color: '#5f5f5d', textAlign: 'center', lineHeight: 26 }}>
            This shapes everything about today's session.
          </Text>
        </View>

        {/* Full-width stacked energy cards */}
        <EnergySelector selectedEnergy={selectedEnergy} onSelect={handleEnergySelect} />

        {/* Reflection pill — secondary-container */}
        <View style={{
          backgroundColor: '#8EF4E9',
          borderRadius: 16,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginTop: 32,
          marginBottom: 48,
          gap: 12,
        }}>
          <MaterialIcons name="lightbulb-outline" size={22} color="#006B64" style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 14, color: '#006B64', fontWeight: '500', lineHeight: 22 }}>
            Remember, energy is finite. Choosing "Low" doesn't mean failure—it means we'll prioritize gentle, restorative focus today.
          </Text>
        </View>

        {/* Continue button — gradient pill, centered */}
        <View style={{ alignItems: 'center' }}>
          <Pressable
            onPress={handleEnergyContinue}
            disabled={!selectedEnergy}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <LinearGradient
              colors={['#4C54BB', '#B8BCFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 999,
                paddingVertical: 18,
                paddingHorizontal: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                opacity: selectedEnergy ? 1 : 0.45,
                shadowColor: '#4C54BB',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: selectedEnergy ? 4 : 0,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    )
  }

  // --- Step 2: Context Input ---

  function renderStep2() {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#323331', lineHeight: 36, letterSpacing: -0.3, marginBottom: 10 }}>
              What's the one thing you'd be relieved to have started today?
            </Text>
            <Text style={{ fontSize: 17, color: '#5f5f5d', lineHeight: 26 }}>
              Write anything. I'll figure it out.
            </Text>
          </View>

          {/* Input container — tonal layering style */}
          {!hasSubmittedMessage ? (
            <View style={{
              backgroundColor: '#F6F3F1',
              borderRadius: 24,
              padding: 20,
              minHeight: 240,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 18,
                  color: '#323331',
                  lineHeight: 28,
                  minHeight: 160,
                  textAlignVertical: 'top',
                }}
                placeholder="Write anything. I'll figure it out."
                placeholderTextColor="rgba(123,123,120,0.4)"
                value={userMessage}
                onChangeText={setUserMessage}
                multiline
                maxLength={500}
                accessibilityLabel="What would you like to work on today?"
              />
              {/* AI indicator row */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: 1,
                borderTopColor: 'rgba(179,178,175,0.15)',
                paddingTop: 14,
                marginTop: 12,
                gap: 10,
              }}>
                <MaterialIcons name="auto-awesome" size={16} color="rgba(76,84,187,0.6)" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(76,84,187,0.6)', letterSpacing: 0.2 }}>
                  AI will organize your thought into actionable steps
                </Text>
              </View>
            </View>
          ) : (
            /* Submitted state — show the message as a card */
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: '#E4E2DF',
            }}>
              <Text style={{ fontSize: 17, color: '#323331', lineHeight: 26 }}>{userMessage || 'Getting your tasks...'}</Text>
              {aiLoading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 }}>
                  <ActivityIndicator size="small" color="#4C54BB" />
                  <Text style={{ fontSize: 14, color: '#5f5f5d' }}>Building your plan...</Text>
                </View>
              )}
            </View>
          )}

          {/* BREAK-05: Clarification question */}
          {clarificationQuestion && !hasSubmittedMessage && (
            <View style={{ marginTop: 16 }}>
              <View style={{ backgroundColor: '#EEF0FF', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <Text style={{ fontSize: 15, color: '#4C54BB', lineHeight: 22 }}>{clarificationQuestion}</Text>
              </View>
              <View style={{ backgroundColor: '#F6F3F1', borderRadius: 16, padding: 16 }}>
                <TextInput
                  style={{ fontSize: 16, color: '#323331', minHeight: 80, textAlignVertical: 'top' }}
                  placeholder="Be more specific..."
                  placeholderTextColor="rgba(123,123,120,0.4)"
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
                  style={{ marginTop: 10, backgroundColor: '#4C54BB', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  accessibilityRole="button"
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Send</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Reflection pill */}
          <View style={{
            backgroundColor: '#8EF4E9',
            borderRadius: 16,
            paddingHorizontal: 24,
            paddingVertical: 18,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 40,
            marginBottom: 40,
            gap: 14,
            shadowColor: '#323331',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.06,
            shadowRadius: 40,
            elevation: 2,
          }}>
            <MaterialIcons name="lightbulb" size={22} color="#006B64" />
            <Text style={{ flex: 1, fontSize: 14, color: '#006B64', fontWeight: '500', lineHeight: 21 }}>
              Even a messy thought can become a clear plan. Don't worry about the details yet.
            </Text>
          </View>

          {/* Get my tasks CTA — full width gradient */}
          <Pressable
            onPress={handleSubmitMessage}
            disabled={hasSubmittedMessage && aiLoading}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Get my tasks"
          >
            <LinearGradient
              colors={['#4C54BB', '#B8BCFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: '100%',
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: 'center',
                shadowColor: '#4C54BB',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              {hasSubmittedMessage && aiLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 }}>
                  Get my tasks
                </Text>
              )}
            </LinearGradient>
          </Pressable>
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
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Editorial header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: '#323331', marginBottom: 6 }}>
              Here's your plan
            </Text>
            <Text style={{ fontSize: 15, color: '#5f5f5d' }}>
              {includedCount} task{includedCount !== 1 ? 's' : ''} — about {totalMinutes} min total
            </Text>
          </View>

          {/* Task cards */}
          <TaskBreakdown
            tasks={tasks}
            onToggle={handleToggleTask}
            onMakeSmaller={handleMakeSmaller}
          />

          {/* WHY IS THIS HARD TODAY? */}
          <View style={{ marginTop: 32 }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#5f5f5d',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Why is this hard today?
            </Text>
            <Text style={{ fontSize: 13, color: '#5f5f5d', marginBottom: 12 }}>
              Optional — helps Drift coach you better
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { key: 'unclear_start', label: 'Not sure where to start' },
                { key: 'overwhelmed', label: 'Feeling overwhelmed' },
                { key: 'fear_of_failure', label: "Scared it won't be good enough" },
                { key: 'low_motivation', label: 'Just no motivation' },
              ].map((chip) => {
                const selected = hardReason === chip.key
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => setHardReason(selected ? null : chip.key)}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      backgroundColor: selected ? 'rgba(76,84,187,0.08)' : '#F6F3F1',
                      borderWidth: 1.5,
                      borderColor: selected ? '#4C54BB' : 'transparent',
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={chip.label}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: selected ? '600' : '400',
                      color: selected ? '#4C54BB' : '#5f5f5d',
                    }}>
                      {chip.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* HOW MUCH TIME DO YOU HAVE? */}
          <View style={{ marginTop: 28 }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#5f5f5d',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              How much time do you have?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TIME_PRESETS.map((minutes) => {
                const selected = !isCustomTime && timeCommitment === minutes
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => {
                      setIsCustomTime(false)
                      setTimeCommitment(minutes)
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: selected ? '#B8BCFF' : '#F6F3F1',
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${minutes} minutes`}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: selected ? '#323331' : '#5f5f5d',
                    }}>
                      {minutes}
                    </Text>
                    <Text style={{
                      fontSize: 11,
                      color: selected ? '#4C54BB' : '#8f8f8d',
                      marginTop: 2,
                    }}>
                      min
                    </Text>
                  </Pressable>
                )
              })}
              {/* Custom */}
              <Pressable
                onPress={() => {
                  setIsCustomTime(true)
                  setCustomTimeInput('')
                }}
                style={{
                  flex: 1,
                  backgroundColor: isCustomTime ? '#B8BCFF' : '#F6F3F1',
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isCustomTime }}
                accessibilityLabel="Custom duration"
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: isCustomTime ? '#323331' : '#5f5f5d',
                }}>
                  ···
                </Text>
                <Text style={{
                  fontSize: 11,
                  color: isCustomTime ? '#4C54BB' : '#8f8f8d',
                  marginTop: 2,
                }}>
                  custom
                </Text>
              </Pressable>
            </View>
            {isCustomTime && (
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <TextInput
                  style={{
                    backgroundColor: '#F6F3F1',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 16,
                    color: '#323331',
                    width: 120,
                    textAlign: 'center',
                  }}
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
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>5 – 180 minutes</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed bottom CTA */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 }}>
          <Pressable
            onPress={handleConfirm}
            disabled={includedCount === 0 || confirmLoading}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Start focus session"
          >
            <LinearGradient
              colors={includedCount > 0 ? ['#4C54BB', '#8B93FF'] : ['#C8C8C8', '#C8C8C8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 999,
                height: 64,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {confirmLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>
                    Let's do this
                  </Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCF9F7' }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        height: 64,
        backgroundColor: '#FCF9F7',
      }}>
        {/* Left — back button (step 2+) or spacer (step 1) */}
        {step > 1 && step !== 5 ? (
          <Pressable
            onPress={() => setStep((s) => Math.max(1, s - 1))}
            style={{ padding: 8, borderRadius: 20 }}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#8B93FF" />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}

        {/* Center — always shown */}
        {step !== 5 && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#4C54BB', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
              Step {step} of 3
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#323331' }}>
              {step === 1 ? 'Energy Check-in' : step === 2 ? 'Context Check-in' : 'Your Tasks'}
            </Text>
          </View>
        )}

        {/* Right spacer */}
        <View style={{ width: 40 }} />
      </View>

      {/* Shared progress bar */}
      {step < 5 && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 8, backgroundColor: '#FCF9F7' }}>
          <View style={{ height: 5, backgroundColor: '#F0EDEB', borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ width: `${(step / 3) * 100}%`, height: 5, backgroundColor: '#4C54BB', borderRadius: 999 }} />
          </View>
        </View>
      )}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 5 && renderBreakStep()}
    </SafeAreaView>
  )
}
