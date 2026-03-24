import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, Animated, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useAuthStore } from '@/src/stores/authStore'
import { getSessionStats } from '@/src/services/sessions.service'
import { getPromiseHistory } from '@/src/services/promises.service'
import { captureError } from '@/src/lib/sentry'

type Phase = 'stop' | 'choose' | 'facts' | 'evidence' | 'tiny-steps'

type EvidenceStats = {
  sessionsCompleted: number
  promisesKept: number
  currentStreak: number
  promiseRate: number
}

const SHAME_FACTS = [
  {
    title: 'Shame shrinks your brain',
    body: 'When you feel shame, your prefrontal cortex -- the part responsible for planning and decision-making -- actually reduces activity. You are literally less capable of thinking clearly right now. This will pass.',
  },
  {
    title: 'Productivity is not your worth',
    body: 'Your value as a person has never been determined by your output. You are not a machine. Having a hard day does not erase everything you have done before.',
  },
  {
    title: 'Everyone struggles with this',
    body: 'Research shows that nearly everyone experiences productivity shame. The people who seem to have it together are often just better at hiding it.',
  },
  {
    title: 'Shame makes it worse, not better',
    body: 'Studies consistently show that self-compassion leads to better productivity than self-criticism. Being kind to yourself right now is the most productive thing you can do.',
  },
  {
    title: 'Your brain is protecting you',
    body: 'Procrastination and avoidance are often your nervous system trying to protect you from something that feels threatening. It is not laziness -- it is a stress response.',
  },
  {
    title: 'Small is not the same as nothing',
    body: 'Doing one small thing when you feel terrible counts for more than doing ten things on a good day. The effort you put in during hard moments matters.',
  },
  {
    title: 'This feeling is temporary',
    body: 'Emotions are like weather. This shame storm will pass. You have felt this way before and come through it. You will come through it again.',
  },
]

const MICRO_ACTIONS = [
  { label: 'Stand up and stretch', description: 'Just move your body for 30 seconds' },
  { label: 'Get a glass of water', description: 'A small act of self-care' },
  {
    label: 'Open the file -- just open it',
    description: 'You do not have to do anything with it yet',
  },
  {
    label: 'Work for 2 minutes. That is it.',
    description: 'Set a timer. When it rings, you can stop',
  },
]

export default function ShameEmergencyScreen() {
  const [phase, setPhase] = useState<Phase>('stop')
  const [showBackButton, setShowBackButton] = useState(false)
  const [selectedMicroAction, setSelectedMicroAction] = useState<string | null>(null)
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const subtitleFade = useRef(new Animated.Value(0)).current
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const fetchEvidence = useCallback(async () => {
    if (!user?.id) return
    setEvidenceLoading(true)
    try {
      const [sessionStats, promiseHistory] = await Promise.all([
        getSessionStats(user.id),
        getPromiseHistory(user.id, 30),
      ])

      const resolved = promiseHistory.filter((p) => p.kept !== null)
      const kept = resolved.filter((p) => p.kept === true)
      const promiseRate =
        resolved.length > 0 ? Math.round((kept.length / resolved.length) * 100) : 0

      setEvidenceStats({
        sessionsCompleted: sessionStats.totalSessions,
        promisesKept: kept.length,
        currentStreak: profile?.current_streak ?? 0,
        promiseRate,
      })
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'ShameEmergency.fetchEvidence',
      })
      // Use zeros as fallback
      setEvidenceStats({
        sessionsCompleted: 0,
        promisesKept: 0,
        currentStreak: profile?.current_streak ?? 0,
        promiseRate: 0,
      })
    } finally {
      setEvidenceLoading(false)
    }
  }, [user?.id, profile?.current_streak])

  useEffect(() => {
    // Fade in STOP text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()

    // Fade in subtitle after a beat
    const subtitleTimer = setTimeout(() => {
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start()
    }, 1000)

    // Show back button after 3 seconds
    const timer = setTimeout(() => setShowBackButton(true), 3000)

    // Auto-advance to choose phase after 3 seconds
    const advanceTimer = setTimeout(() => setPhase('choose'), 3500)

    return () => {
      clearTimeout(subtitleTimer)
      clearTimeout(timer)
      clearTimeout(advanceTimer)
      fadeAnim.stopAnimation()
      subtitleFade.stopAnimation()
    }
  }, [fadeAnim, subtitleFade])

  const handleUserEngagement = () => {
    setShowBackButton(true)
  }

  const renderStopPhase = () => (
    <View className="flex-1 items-center justify-center px-8">
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text className="text-5xl font-bold text-primary text-center tracking-wide">STOP</Text>
      </Animated.View>
      <Animated.View style={{ opacity: subtitleFade }} className="mt-6">
        <Text className="text-lg text-gray-600 text-center leading-7">
          What you are feeling right now{'\n'}is not the truth about you.
        </Text>
      </Animated.View>
    </View>
  )

  const renderChoosePhase = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      onScrollBeginDrag={handleUserEngagement}
    >
      <Text className="text-2xl font-bold text-text text-center mb-2 mt-8">Choose a path</Text>
      <Text className="text-base text-textSecondary text-center mb-8">
        There is no wrong choice here.
      </Text>

      <Pressable
        onPress={() => {
          setPhase('facts')
          handleUserEngagement()
        }}
        className="bg-white rounded-2xl p-6 mb-4 border border-calm active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Read the Facts"
      >
        <Text className="text-lg font-semibold text-text mb-1">Read the Facts</Text>
        <Text className="text-sm text-textSecondary">
          Science-backed truths about what you are feeling
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          setPhase('evidence')
          handleUserEngagement()
        }}
        className="bg-white rounded-2xl p-6 mb-4 border border-calm active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Show Me Evidence"
      >
        <Text className="text-lg font-semibold text-text mb-1">Show Me Evidence</Text>
        <Text className="text-sm text-textSecondary">See what you have actually accomplished</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          handleUserEngagement()
          router.push('/(tabs)/chat')
        }}
        className="bg-white rounded-2xl p-6 mb-4 border border-calm active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="I Need to Talk"
      >
        <Text className="text-lg font-semibold text-text mb-1">I Need to Talk</Text>
        <Text className="text-sm text-textSecondary">
          Open a conversation with your focus companion
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          setPhase('tiny-steps')
          handleUserEngagement()
        }}
        className="mt-4"
        accessibilityRole="button"
        accessibilityLabel="I just need one tiny thing to do"
      >
        <Text className="text-sm text-primary text-center underline">
          I just need one tiny thing to do
        </Text>
      </Pressable>
    </ScrollView>
  )

  const renderFactsView = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Pressable
        onPress={() => setPhase('choose')}
        className="mb-4"
        accessibilityRole="button"
        accessibilityLabel="Go back to choices"
      >
        <Text className="text-primary text-base">Back</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-text mb-6">Things that are true</Text>

      {SHAME_FACTS.map((fact, index) => (
        <View key={index} className="bg-white rounded-2xl p-5 mb-4 border border-calm">
          <Text className="text-base font-semibold text-text mb-2">{fact.title}</Text>
          <Text className="text-sm text-textSecondary leading-5">{fact.body}</Text>
        </View>
      ))}

      <Pressable
        onPress={() => setPhase('tiny-steps')}
        className="mt-4 bg-primary rounded-2xl py-4 items-center"
        accessibilityRole="button"
        accessibilityLabel="Show me one small thing I can do"
      >
        <Text className="text-white font-semibold text-base">Show me one small thing I can do</Text>
      </Pressable>
    </ScrollView>
  )

  // H18: Fetch evidence data via useEffect instead of during render
  useEffect(() => {
    if (phase === 'evidence' && !evidenceStats && !evidenceLoading) {
      fetchEvidence()
    }
  }, [phase, evidenceStats, evidenceLoading, fetchEvidence])

  const renderEvidenceView = () => {
    const stats = evidenceStats ?? {
      sessionsCompleted: 0,
      promisesKept: 0,
      currentStreak: 0,
      promiseRate: 0,
    }

    const encouragement =
      stats.sessionsCompleted > 0
        ? `You showed up ${stats.sessionsCompleted} time${stats.sessionsCompleted !== 1 ? 's' : ''}. You kept ${stats.promisesKept} promise${stats.promisesKept !== 1 ? 's' : ''} to yourself.${stats.currentStreak > 0 ? ` You have a ${stats.currentStreak}-day streak going.` : ''} Those are not the numbers of someone who is failing.`
        : 'You are here right now, looking for help instead of giving up. That counts for something. Every journey starts somewhere.'

    return (
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => setPhase('choose')} className="mb-4">
          <Text className="text-primary text-base">Back</Text>
        </Pressable>

        <Text className="text-2xl font-bold text-text mb-2">
          Look at what you have actually done
        </Text>
        <Text className="text-sm text-textSecondary mb-8">
          The shame is lying to you. Here is the real picture.
        </Text>

        {evidenceLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : (
          <>
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1 bg-white rounded-2xl p-5 border border-calm items-center">
                <Text className="text-3xl font-bold text-primary">{stats.sessionsCompleted}</Text>
                <Text className="text-xs text-textSecondary mt-1">Sessions{'\n'}Completed</Text>
              </View>
              <View className="flex-1 bg-white rounded-2xl p-5 border border-calm items-center">
                <Text className="text-3xl font-bold text-accent">{stats.promisesKept}</Text>
                <Text className="text-xs text-textSecondary mt-1">Promises{'\n'}Kept</Text>
              </View>
            </View>

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1 bg-white rounded-2xl p-5 border border-calm items-center">
                <Text className="text-3xl font-bold text-primary">{stats.currentStreak}</Text>
                <Text className="text-xs text-textSecondary mt-1">Day{'\n'}Streak</Text>
              </View>
              <View className="flex-1 bg-white rounded-2xl p-5 border border-calm items-center">
                <Text className="text-3xl font-bold text-accent">{stats.promiseRate}%</Text>
                <Text className="text-xs text-textSecondary mt-1">Promise{'\n'}Rate</Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-5 border border-calm mb-6">
              <Text className="text-base text-text leading-6">{encouragement}</Text>
            </View>
          </>
        )}

        <Pressable
          onPress={() => setPhase('tiny-steps')}
          className="bg-primary rounded-2xl py-4 items-center"
          accessibilityRole="button"
          accessibilityLabel="Show me one small thing I can do"
        >
          <Text className="text-white font-semibold text-base">
            Show me one small thing I can do
          </Text>
        </Pressable>
      </ScrollView>
    )
  }

  const renderTinySteps = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Pressable
        onPress={() => setPhase('choose')}
        className="mb-4"
        accessibilityRole="button"
        accessibilityLabel="Go back to choices"
      >
        <Text className="text-primary text-base">Back</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-text mb-2">Tiny-Step Protocol</Text>
      <Text className="text-base text-textSecondary mb-8">Pick one. Just one. That is enough.</Text>

      {MICRO_ACTIONS.map((action, index) => (
        <View
          key={index}
          className={`bg-white rounded-2xl p-5 mb-4 border ${
            selectedMicroAction === action.label ? 'border-accent bg-green-50' : 'border-calm'
          }`}
        >
          <Text className="text-base font-semibold text-text mb-1">{action.label}</Text>
          <Text className="text-sm text-textSecondary mb-4">{action.description}</Text>

          {selectedMicroAction === action.label ? (
            <View className="bg-accent rounded-xl py-3 items-center">
              <Text className="text-white font-semibold text-sm">You've got this. Go ahead.</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setSelectedMicroAction(action.label)}
              className="border border-accent rounded-xl py-3 items-center active:bg-accent/10"
              accessibilityRole="button"
              accessibilityLabel={`I will try: ${action.label}`}
            >
              <Text className="text-accent font-semibold text-sm">I will try this</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  )

  const renderPhase = () => {
    switch (phase) {
      case 'stop':
        return renderStopPhase()
      case 'choose':
        return renderChoosePhase()
      case 'facts':
        return renderFactsView()
      case 'evidence':
        return renderEvidenceView()
      case 'tiny-steps':
        return renderTinySteps()
    }
  }

  return (
    <LinearGradient colors={['#E0E7FF', '#EDE9FE', '#F5F3FF']} className="flex-1">
      <SafeAreaView className="flex-1">
        {showBackButton && (
          <View className="px-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              className="self-start"
              accessibilityRole="button"
              accessibilityLabel="Close shame emergency screen"
            >
              <Text className="text-primary text-base">Close</Text>
            </Pressable>
          </View>
        )}

        {renderPhase()}
      </SafeAreaView>
    </LinearGradient>
  )
}
