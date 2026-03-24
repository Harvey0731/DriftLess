import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/src/lib/supabase'
import { useAuthStore } from '@/src/stores/authStore'
import { captureError } from '@/src/lib/sentry'

export default function DeleteAccountScreen() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmed = confirmText.trim() === 'DELETE'

  async function handleDelete() {
    if (!isConfirmed || isDeleting) return

    setIsDeleting(true)

    try {
      const userId = useAuthStore.getState().user?.id
      if (!userId) throw new Error('Not authenticated')

      // Call server-side Edge Function for proper account deletion.
      // This uses auth.admin.deleteUser() to invalidate all JWTs immediately.
      const { error: deleteError } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      })

      if (deleteError) throw new Error(deleteError.message || 'Failed to delete account')

      // Sign out locally (JWT is already invalidated server-side)
      await useAuthStore.getState().signOut()

      Alert.alert(
        'Account Scheduled for Deletion',
        'Your account has been scheduled for deletion. Your data will be permanently removed within 30 days.',
        [{ text: 'OK' }],
      )
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'DeleteAccount.handleDelete',
      })
      const message = err instanceof Error ? err.message : 'Failed to delete account'
      Alert.alert('Error', message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Delete Account',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#1F2937', fontWeight: '600' },
        }}
      />

      <View className="flex-1 px-6 pt-6">
        {/* Warning card with red-tinted background */}
        <View className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
          <Text className="text-lg font-bold text-red-700 mb-2">This action is permanent</Text>
          <Text className="text-sm text-red-600 leading-5">
            Deleting your account will permanently remove all your data, including sessions,
            promises, streaks, chat history, and settings. This cannot be undone.
          </Text>
        </View>

        {/* Recovery info */}
        <View className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <Text className="text-base font-semibold text-gray-800 mb-2">Before you go</Text>
          <Text className="text-sm text-gray-500 leading-5 mb-2">
            After deletion, your account enters a 30-day recovery window. During this time, you can
            contact support to restore your account.
          </Text>
          <Text className="text-sm text-gray-500 leading-5">
            After 30 days, all data is permanently erased and cannot be recovered.
          </Text>
        </View>

        {/* Type DELETE to confirm */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-600 mb-2">Type DELETE to confirm</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800"
            placeholder="DELETE"
            placeholderTextColor="#D1D5DB"
            value={confirmText}
            onChangeText={setConfirmText}
            maxLength={10}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Type DELETE to confirm account deletion"
          />
        </View>

        {/* Delete button -- disabled until DELETE typed */}
        <Pressable
          onPress={handleDelete}
          disabled={!isConfirmed || isDeleting}
          className={`rounded-2xl py-4 items-center mb-4 ${
            isConfirmed && !isDeleting ? 'bg-red-500 active:opacity-80' : 'bg-gray-200'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Delete My Account"
        >
          {isDeleting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className={`text-lg font-bold ${isConfirmed ? 'text-white' : 'text-gray-400'}`}>
              Delete My Account
            </Text>
          )}
        </Pressable>

        {/* Cancel button */}
        <Pressable
          onPress={() => router.back()}
          className="rounded-2xl py-4 items-center bg-gray-100 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text className="text-gray-700 text-base font-semibold">Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
