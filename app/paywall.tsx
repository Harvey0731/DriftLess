import React, { useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSubscriptionStore } from '@/src/stores/subscriptionStore'

const FEATURES = [
  'Talk through anything, anytime — no daily cap',
  'See why you get stuck, not just when',
  "Start with 2 minutes when that's all you've got",
  'New tools for the procrastination problem, every month',
]

export default function PaywallScreen() {
  const router = useRouter()
  const {
    currentOffering,
    isPurchasing,
    isRestoring,
    fetchOfferings,
    purchasePackage,
    restorePurchases,
  } = useSubscriptionStore()

  useEffect(() => {
    fetchOfferings()
  }, [fetchOfferings])

  const packages = currentOffering?.availablePackages ?? []

  async function handlePurchase(pkg: unknown) {
    const result = await purchasePackage(pkg)
    if (result.success) {
      router.back()
    } else if (!result.cancelled) {
      Alert.alert('Purchase Failed', result.error ?? 'An unknown error occurred. Please try again.')
    }
  }

  async function handleRestore() {
    const result = await restorePurchases()
    if (result.success) {
      if (result.isPro) {
        Alert.alert('Restored', 'Your purchases have been restored successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.')
      }
    } else {
      Alert.alert('Restore Failed', result.error ?? 'An unknown error occurred. Please try again.')
    }
  }

  const isLoading = isPurchasing || isRestoring

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: '',
          headerShown: false,
        }}
      />

      {/* Close button — always visible so users can dismiss */}
      <Pressable
        onPress={() => router.back()}
        className="absolute top-14 right-5 z-10 w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text className="text-gray-500 text-lg font-bold">X</Text>
      </Pressable>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center pt-16 pb-8 px-6">
          <View className="w-16 h-16 rounded-2xl bg-purple-100 items-center justify-center mb-4">
            <Text className="text-2xl font-bold text-purple-600">D</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-800 text-center mb-2">
            Your personal coach, without limits
          </Text>
          <Text className="text-base text-gray-500 text-center">
            Stop putting it off. Actually start.
          </Text>
        </View>

        {/* Feature list with checkmarks */}
        <View className="px-6 mb-8">
          {FEATURES.map((feature, index) => (
            <View key={index} className="flex-row items-center mb-4">
              <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center mr-3">
                <Text className="text-green-600 text-xs font-bold">{'\u2713'}</Text>
              </View>
              <Text className="text-base text-gray-700 flex-1">{feature}</Text>
            </View>
          ))}
        </View>

        {/* Package cards from RevenueCat */}
        {packages.length > 0 ? (
          <View className="px-6 gap-4 mb-8">
            {packages.map((pkg) => (
              <Pressable
                key={pkg.identifier}
                onPress={() => handlePurchase(pkg)}
                disabled={isLoading}
                className={`rounded-2xl p-5 border-2 border-purple-500 bg-purple-50 ${isLoading ? 'opacity-60' : ''}`}
                accessibilityRole="button"
                accessibilityLabel={`${pkg.product.title} ${pkg.product.priceString}`}
              >
                <Text className="text-lg font-bold text-gray-800 mb-1">{pkg.product.title}</Text>
                <Text className="text-2xl font-bold text-purple-600 mb-1">
                  {pkg.product.priceString}
                </Text>
                {pkg.product.description ? (
                  <Text className="text-sm text-gray-500">{pkg.product.description}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="px-6 mb-8 items-center py-4">
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text className="text-sm text-gray-500 mt-2">Loading plans...</Text>
          </View>
        )}

        {/* Loading overlay for purchase/restore */}
        {isPurchasing && (
          <View className="px-6 mb-4 items-center">
            <ActivityIndicator size="small" color="#22C55E" />
            <Text className="text-sm text-gray-500 mt-2">Processing purchase...</Text>
          </View>
        )}

        {/* Restore Purchase link */}
        <Pressable
          onPress={handleRestore}
          disabled={isLoading}
          className={`items-center mb-6 ${isLoading ? 'opacity-60' : ''}`}
          accessibilityRole="button"
          accessibilityLabel="Restore Purchase"
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Text className="text-sm text-purple-500">Restore Purchase</Text>
          )}
        </Pressable>

        {/* Legal text */}
        <View className="px-8">
          <Text className="text-xs text-gray-400 text-center leading-4">
            Payment will be charged to your App Store account at confirmation of purchase.
            Subscription automatically renews unless auto-renew is turned off at least 24 hours
            before the end of the current period. Your account will be charged for renewal within 24
            hours prior to the end of the current period. You can manage and cancel your
            subscriptions by going to your account settings on the App Store after purchase. By
            subscribing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
