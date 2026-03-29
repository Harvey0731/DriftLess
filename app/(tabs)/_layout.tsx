import React from 'react'
import { View, Text } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { ErrorBoundary } from '@/src/components/ErrorBoundary'

export default function TabLayout() {
  const router = useRouter()

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#8B93FF',
          tabBarInactiveTintColor: '#A8A29E',
          tabBarStyle: {
            backgroundColor: '#F6F3F1',
            borderTopWidth: 0,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            height: 80,
            paddingBottom: 20,
            paddingTop: 10,
            shadowColor: '#323331',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.04,
            shadowRadius: 40,
            elevation: 10,
            position: 'absolute',
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 2,
            letterSpacing: 1,
            textTransform: 'uppercase',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="analytics" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="promises"
          options={{
            title: 'Promises',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="auto-awesome" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Toolbox',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="healing" size={24} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              router.push('/bad-day-toolbox' as never)
            },
          }}
        />
        <Tabs.Screen
          name="session"
          options={{ href: null }}
        />
        {/* Hide settings from tab bar but keep the route */}
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ErrorBoundary>
  )
}
