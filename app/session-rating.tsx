import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/src/stores/authStore'
import { useSessionStore } from '@/src/stores/sessionStore'
import { toggleTaskComplete } from '@/src/services/tasks.service'
import { supabase } from '@/src/lib/supabase'
import { captureError } from '@/src/lib/sentry'

type Rating = 'great' | 'good' | 'ok' | 'struggled'

interface RatingOption {
  key: Rating
  label: string
  description: string
  bgClass: string
  selectedBgClass: string
}

const RATING_OPTIONS: RatingOption[] = [
  {
    key: 'great',
    label: 'Nailed it',
    description: 'Crushed it',
    bgClass: 'bg-green-50',
    selectedBgClass: 'bg-green-100',
  },
  {
    key: 'good',
    label: 'Solid',
    description: 'Solid session',
    bgClass: 'bg-blue-50',
    selectedBgClass: 'bg-blue-100',
  },
  {
    key: 'ok',
    label: 'Got started',
    description: 'You got going',
    bgClass: 'bg-yellow-50',
    selectedBgClass: 'bg-yellow-100',
  },
  {
    key: 'struggled',
    label: 'Showed up anyway',
    description: 'And that matters',
    bgClass: 'bg-orange-50',
    selectedBgClass: 'bg-orange-100',
  },
]

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

export default function SessionRatingScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    taskName: string
    durationSeconds: string
    plannedMinutes: string
    taskId: string
    checkInId: string
  }>()

  const taskName = params.taskName ?? 'Focus Session'
  const durationSeconds = parseInt(params.durationSeconds ?? '0', 10)
  const plannedMinutes = parseInt(params.plannedMinutes ?? '25', 10)
  const taskId = params.taskId ?? ''
  const checkInId = params.checkInId ?? ''

  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!selectedRating || isSaving) return

    const ratingMap: Record<Rating, number> = { great: 4, good: 3, ok: 2, struggled: 1 }
    const ratingValue = ratingMap[selectedRating]

    setIsSaving(true)
    try {
      const userId = useAuthStore.getState().user?.id
      if (!userId) {
        Alert.alert('Not Authenticated', 'Please sign in to save your session.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
        ])
        return
      }

      // End the session that was created when the timer started (via sessionStore)
      const sessionStore = useSessionStore.getState()
      if (sessionStore.currentSession) {
        await sessionStore.endSession(ratingValue, selectedRating, note || undefined)
      } else {
        // Fallback: if no session in store (e.g., app was force-quit),
        // find the existing active/paused session instead of creating a duplicate.
        const { endSession: endSvc } = await import('@/src/services/sessions.service')
        const { data: existingSession } = await supabase
          .from('focus_sessions')
          .select('id')
          .eq('user_id', userId)
          .in('status', ['active', 'paused'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingSession) {
          await endSvc(
            existingSession.id,
            durationSeconds,
            ratingValue,
            selectedRating,
            userId,
            note || undefined,
          )
        } else {
          // Last resort: no session found at all — create one to preserve data
          const { createSession: createSvc } = await import('@/src/services/sessions.service')
          const session = await createSvc(userId, taskId, checkInId, plannedMinutes)
          await endSvc(
            session.id,
            durationSeconds,
            ratingValue,
            selectedRating,
            userId,
            note || undefined,
          )
        }
      }

      // Mark linked task as complete (fire-and-forget, non-blocking)
      if (taskId) {
        toggleTaskComplete(taskId, true, userId).catch((err) => {
          captureError(err instanceof Error ? err : new Error(String(err)), {
            context: 'sessionRating.handleSave.toggleTaskComplete',
          })
        })
      }

      // Update streak via Supabase RPC (fire-and-forget, report errors to Sentry)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any)
        .rpc('update_streak', { p_user_id: userId })
        .then(({ error: streakErr }: { error: { message: string } | null }) => {
          if (streakErr) {
            captureError(new Error(`Streak update failed: ${streakErr.message}`), {
              context: 'sessionRating.handleSave.updateStreak',
              userId,
            })
          }
        })
        .catch((err: unknown) => {
          captureError(err instanceof Error ? err : new Error(String(err)), {
            context: 'sessionRating.handleSave.updateStreak',
            userId,
          })
        })

      // Navigate home
      if (router.canGoBack()) {
        router.dismissAll()
      } else {
        router.replace('/')
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'sessionRating.handleSave',
      })
      const message = err instanceof Error ? err.message : 'Failed to save session'
      Alert.alert('Error', message)
    } finally {
      setIsSaving(false)
    }
  }

  function handleTalkAboutIt() {
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        prefill: `I just finished a ${Math.round(durationSeconds / 60)} minute session on "${taskName}" and I'm struggling. Can we talk about it?`,
      },
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Session Complete',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
        }}
      />

      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading */}
        <Text className="text-2xl font-bold text-gray-800 text-center mb-2">How did it go?</Text>

        {/* Session summary */}
        <View className="bg-white border border-gray-200 rounded-2xl p-5 mb-8 items-center">
          <Text className="text-base font-medium text-gray-700 mb-1" numberOfLines={2}>
            {taskName}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-bold text-purple-600">
              {formatDuration(durationSeconds)}
            </Text>
            <Text className="text-sm text-gray-400">/ {plannedMinutes}m planned</Text>
          </View>
        </View>

        {/* Rating cards */}
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
          {RATING_OPTIONS.map((option) => {
            const isSelected = selectedRating === option.key
            return (
              <Pressable
                key={option.key}
                onPress={() => setSelectedRating(option.key)}
                className={`w-[48%] rounded-2xl p-5 ${
                  isSelected ? option.selectedBgClass : option.bgClass
                } ${isSelected ? 'border-2 border-purple-500' : 'border-2 border-transparent'}`}
                style={isSelected ? { transform: [{ scale: 1.03 }] } : undefined}
                accessibilityRole="button"
                accessibilityLabel={`${option.label}: ${option.description}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  className={`text-lg font-bold mb-1 ${
                    isSelected ? 'text-purple-700' : 'text-gray-800'
                  }`}
                >
                  {option.label}
                </Text>
                <Text className="text-sm text-gray-500">{option.description}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* "Want to talk about it?" for Struggled */}
        {selectedRating === 'struggled' && (
          <Pressable
            onPress={handleTalkAboutIt}
            className="bg-purple-50 border border-purple-200 rounded-2xl py-4 px-5 mb-6 items-center"
            accessibilityRole="button"
            accessibilityLabel="Want to talk about it?"
          >
            <Text className="text-purple-600 text-base font-semibold">
              Starting was the hard part — and you did it.
            </Text>
            <Text className="text-purple-400 text-sm mt-1">Talk it through with Drift</Text>
          </Pressable>
        )}

        {/* Optional note */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-2">Add a note (optional)</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-base text-gray-800 min-h-[80px]"
            placeholder="Any reflections on this session..."
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            textAlignVertical="top"
            accessibilityLabel="Session note"
          />
          <Text className="text-xs text-gray-400 mt-1 text-right">{note.length}/500</Text>
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={!selectedRating || isSaving}
          className={`rounded-2xl py-4 items-center mb-8 ${
            selectedRating && !isSaving ? 'bg-purple-500' : 'bg-gray-200'
          }`}
          style={({ pressed }) => [pressed && selectedRating ? { opacity: 0.85 } : {}]}
          accessibilityRole="button"
          accessibilityLabel="Save session"
        >
          <Text
            className={`text-lg font-bold ${
              selectedRating && !isSaving ? 'text-white' : 'text-gray-400'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Session'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
