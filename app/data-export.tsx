import React, { useState } from 'react'
import { View, Text, Pressable, Alert, ActivityIndicator, Share } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/src/lib/supabase'
import { useAuthStore } from '@/src/stores/authStore'
import { captureError } from '@/src/lib/sentry'

const EXPORT_LIMIT = 1000 // Max rows per table to prevent OOM

export default function DataExportScreen() {
  const router = useRouter()
  const [requested, setRequested] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  async function handleRequestExport() {
    setIsExporting(true)
    try {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('Not authenticated')

      // Fetch user data in parallel with explicit limits to prevent OOM
      const [sessions, checkIns, tasks, promises, chatMessages] = await Promise.all([
        supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', userId)
          .limit(EXPORT_LIMIT)
          .order('created_at', { ascending: false }),
        supabase
          .from('daily_check_ins')
          .select('*')
          .eq('user_id', userId)
          .limit(EXPORT_LIMIT)
          .order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('user_id', userId).limit(EXPORT_LIMIT),
        supabase
          .from('promises')
          .select('*')
          .eq('user_id', userId)
          .limit(EXPORT_LIMIT)
          .order('created_at', { ascending: false }),
        supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('user_id', userId)
          .limit(EXPORT_LIMIT)
          .order('created_at', { ascending: false }),
      ])

      // Check for any errors
      const errors = [sessions, checkIns, tasks, promises, chatMessages].filter((r) => r.error)
      if (errors.length > 0) {
        throw new Error('Failed to fetch some data for export')
      }

      // Compile user data into a JSON export (excludes raw user_id from each row for privacy)
      const exportData = {
        exported_at: new Date().toISOString(),
        note: 'This export contains sensitive personal data including chat messages. Store securely.',
        sessions: sessions.data ?? [],
        check_ins: checkIns.data ?? [],
        tasks: tasks.data ?? [],
        promises: promises.data ?? [],
        chat_messages: chatMessages.data ?? [],
      }

      const jsonString = JSON.stringify(exportData, null, 2)

      // Warn user about sensitive data before sharing
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Sensitive Data',
          'This export contains personal data including chat messages. Please store it securely and do not share it publicly.',
          [{ text: 'Continue', onPress: () => resolve() }],
        )
      })

      // Share via native share sheet
      try {
        await Share.share({
          message: jsonString,
          title: 'Driftless Data Export',
        })
      } catch (err) {
        // If sharing is cancelled by user, no action needed. Log real errors.
        if (err instanceof Error && !err.message.includes('cancel')) {
          captureError(err, { context: 'DataExport.share' })
        }
      }

      setRequested(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      Alert.alert('Export Error', message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Export Data',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
        }}
      />

      <View className="flex-1 px-6 pt-8">
        {!requested ? (
          <>
            <Text className="text-2xl font-bold text-gray-800 text-center mb-4">
              Export Your Data
            </Text>
            <Text className="text-base text-gray-500 text-center leading-6 mb-2">
              You can request a full export of your Driftless data, including sessions, promises,
              streaks, and chat history.
            </Text>
            <Text className="text-base text-gray-500 text-center leading-6 mb-8">
              Your data will be compiled instantly and you can save or share it via the system share
              sheet.
            </Text>

            <Pressable
              onPress={handleRequestExport}
              disabled={isExporting}
              className={`rounded-2xl py-4 items-center active:opacity-80 ${
                isExporting ? 'bg-purple-300' : 'bg-purple-500'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Request Export"
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-lg font-bold">Request Export</Text>
              )}
            </Pressable>
          </>
        ) : (
          <View className="items-center pt-12">
            <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-6">
              <Text className="text-green-600 text-2xl font-bold">{'\u2713'}</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-800 text-center mb-3">
              Export Complete
            </Text>
            <Text className="text-base text-gray-500 text-center leading-6 mb-8">
              Your data has been compiled and shared. You can save it from the share sheet that was
              presented.
            </Text>

            <Pressable
              onPress={() => router.back()}
              className="bg-gray-100 rounded-2xl py-4 px-8 items-center active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Go Back"
            >
              <Text className="text-gray-700 text-base font-semibold">Go Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
