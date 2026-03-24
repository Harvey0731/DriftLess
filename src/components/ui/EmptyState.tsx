import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionTitle,
  onAction,
}: EmptyStateProps) {
  return (
    <View
      className="flex-1 items-center justify-center px-8 py-12"
      accessibilityRole="summary"
    >
      {icon && <View className="mb-4">{icon}</View>}

      <Text
        className="mb-2 text-center text-xl font-semibold text-[#1F2937]"
        accessibilityRole="header"
      >
        {title}
      </Text>

      {description && (
        <Text className="mb-6 text-center text-base text-[#6B7280]">
          {description}
        </Text>
      )}

      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} variant="primary" />
      )}
    </View>
  );
}
