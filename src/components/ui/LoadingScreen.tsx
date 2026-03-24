import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View
      className="flex-1 items-center justify-center bg-[#FAF5FF]"
      accessibilityRole="none"
      accessibilityLabel={message ?? 'Loading'}
    >
      <ActivityIndicator size="large" color="#8B5CF6" />
      {message && (
        <Text className="mt-4 text-base text-[#6B7280]">{message}</Text>
      )}
    </View>
  );
}
