import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons } from '@expo/vector-icons'
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
  dotColor: string
  borderColor: string
}

const RATING_OPTIONS: RatingOption[] = [
  {
    key: 'great',
    label: 'Nailed it',
    description: 'Peak flow state achieved',
    dotColor: '#006B64',
    borderColor: 'rgba(0,107,100,0.5)',
  },
  {
    key: 'good',
    label: 'Solid',
    description: 'Good, steady progress',
    dotColor: '#B8BCFF',
    borderColor: 'rgba(76,84,187,0.5)',
  },
  {
    key: 'ok',
    label: 'Got started',
    description: 'Movement is movement',
    dotColor: '#FED07F',
    borderColor: 'rgba(123,89,19,0.4)',
  },
  {
    key: 'struggled',
    label: 'Showed up anyway',
    description: 'Resistance was high today',
    dotColor: '#F76A80',
    borderColor: 'rgba(247,106,128,0.8)',
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

      const sessionStore = useSessionStore.getState()
      if (sessionStore.currentSession) {
        await sessionStore.endSession(ratingValue, selectedRating, note || undefined)
      } else {
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
          await endSvc(existingSession.id, durationSeconds, ratingValue, selectedRating, userId, note || undefined)
        } else {
          const { createSession: createSvc } = await import('@/src/services/sessions.service')
          const session = await createSvc(userId, taskId, checkInId, plannedMinutes)
          await endSvc(session.id, durationSeconds, ratingValue, selectedRating, userId, note || undefined)
        }
      }

      if (taskId) {
        toggleTaskComplete(taskId, true, userId).catch((err) => {
          captureError(err instanceof Error ? err : new Error(String(err)), {
            context: 'sessionRating.handleSave.toggleTaskComplete',
          })
        })
      }

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

      if (router.canGoBack()) {
        router.dismissAll()
      } else {
        router.replace('/')
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'sessionRating.handleSave',
      })
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save session')
    } finally {
      setIsSaving(false)
    }
  }

  function handleTalkAboutIt() {
    router.push({
      pathname: '/bad-day-toolbox',
      params: {
        prefill: `I just finished a ${Math.round(durationSeconds / 60)} minute session on "${taskName}" and I'm struggling. Can we talk about it?`,
      },
    })
  }

  return (
    // screen background = surface-container-low (#F6F3F1)
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F3F1' }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Decorative background blobs */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, backgroundColor: '#4C54BB', opacity: 0.04, borderRadius: 999 }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, backgroundColor: '#006B64', opacity: 0.04, borderRadius: 999 }} />

      {/* Header — bg slightly lighter (#FCF9F7) than the content area */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, height: 64, backgroundColor: '#FCF9F7' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#8B93FF', letterSpacing: -0.3 }}>
          Driftless
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ padding: 8, borderRadius: 999, backgroundColor: pressed ? '#F6F3F1' : 'transparent' })}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialIcons name="close" size={24} color="#8B93FF" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading — mb-3 = 12px */}
        <Text style={{ fontSize: 34, fontWeight: '800', color: '#323331', letterSpacing: -0.5, marginBottom: 12 }}>
          How did that go?
        </Text>

        {/* Task + duration pill — mb-10 = 40px */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 8,
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginBottom: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <MaterialIcons name="assignment" size={16} color="#4C54BB" />
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#5F5F5D' }} numberOfLines={1}>
            {taskName}
            <Text style={{ color: '#B3B2AF' }}> · </Text>
            <Text style={{ color: '#4C54BB', fontWeight: '700' }}>{formatDuration(durationSeconds)}</Text>
          </Text>
        </View>

        {/* Rating cards — single column */}
        <View style={{ gap: 12, marginBottom: 40 }}>
          {RATING_OPTIONS.map((option) => {
            const isSelected = selectedRating === option.key
            return (
              <Pressable
                key={option.key}
                onPress={() => setSelectedRating(option.key)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                accessibilityRole="button"
                accessibilityLabel={`${option.label}: ${option.description}`}
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 24,
                    paddingHorizontal: 20,
                    backgroundColor: isSelected ? '#F0EDEB' : '#FFFFFF',
                    borderRadius: 28,
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: option.borderColor,
                    marginHorizontal: isSelected ? 0 : 2,
                    marginVertical: isSelected ? 0 : 2,
                    shadowColor: '#323331',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: option.dotColor, marginRight: 16, flexShrink: 0 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: '#323331', marginBottom: 3 }}>
                      {option.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#5F5F5D' }}>
                      {option.description}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Support prompt — always visible, overflow hidden for decorative icon */}
        <View
          style={{
            backgroundColor: 'rgba(142,244,233,0.3)',
            borderWidth: 1,
            borderColor: 'rgba(0,107,100,0.1)',
            borderRadius: 32,
            padding: 24,
            marginBottom: 40,
            overflow: 'hidden',
          }}
        >
          {/* Decorative spa icon — bottom right, 10% opacity */}
          <View pointerEvents="none" style={{ position: 'absolute', right: -8, bottom: -8, opacity: 0.1 }}>
            <MaterialIcons name="spa" size={96} color="#006B64" />
          </View>

          <Text style={{ fontSize: 17, fontWeight: '500', color: '#005C56', lineHeight: 28, fontStyle: 'italic', marginBottom: 16 }}>
            "Starting was the hard part — and you did it. Want to talk through what made it tough?"
          </Text>
          <Pressable
            onPress={handleTalkAboutIt}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, paddingVertical: 8 })}
            accessibilityRole="button"
            accessibilityLabel="Talk to Drift"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="forum" size={20} color="#006B64" />
              <Text style={{ color: '#006B64', fontWeight: '700', fontSize: 14 }}>Talk to Drift</Text>
              <MaterialIcons name="arrow-forward" size={14} color="#006B64" />
            </View>
          </Pressable>
        </View>

        {/* Notes input — mb-12 = 48px, rounded-lg = 32px */}
        <View style={{ marginBottom: 48 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#5F5F5D', marginBottom: 12, paddingHorizontal: 4 }}>
            Add a note about this session (optional)
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 32,
              padding: 16,
              fontSize: 15,
              color: '#323331',
              minHeight: 88,
              textAlignVertical: 'top',
            }}
            placeholder="What felt different this time?"
            placeholderTextColor="#7B7B78"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            accessibilityLabel="Session note"
          />
          <Text style={{ fontSize: 11, color: '#B3B2AF', marginTop: 4, textAlign: 'right' }}>
            {note.length}/500
          </Text>
        </View>

        {/* Save button — rounded-full, py-5 = 20px, gradient 135deg */}
        <Pressable
          onPress={handleSave}
          disabled={!selectedRating || isSaving}
          style={({ pressed }) => ({ opacity: pressed && selectedRating ? 0.95 : !selectedRating || isSaving ? 0.45 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Save session"
        >
          <LinearGradient
            colors={['#4C54BB', '#B8BCFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 999,
              paddingVertical: 20,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#4C54BB',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <Text style={{ color: '#FBF8FF', fontWeight: '700', fontSize: 18 }}>
              {isSaving ? 'Saving...' : 'Save Session'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(95,95,93,0.6)', fontWeight: '500' }}>
          Your sessions help Driftless adapt to your natural rhythm.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
