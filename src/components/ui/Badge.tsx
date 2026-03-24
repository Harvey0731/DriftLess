import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  default: {
    container: 'bg-[#C4B5FD]/30',
    text: 'text-[#8B5CF6]',
  },
  success: {
    container: 'bg-[#10B981]/15',
    text: 'text-[#10B981]',
  },
  warning: {
    container: 'bg-[#F59E0B]/15',
    text: 'text-[#F59E0B]',
  },
  danger: {
    container: 'bg-[#EF4444]/15',
    text: 'text-[#EF4444]',
  },
  info: {
    container: 'bg-[#E0E7FF]',
    text: 'text-[#4F46E5]',
  },
};

export function Badge({ text, variant = 'default' }: BadgeProps) {
  const style = variantStyles[variant];

  return (
    <View
      className={`self-start rounded-full px-3 py-1 ${style.container}`}
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <Text className={`text-xs font-semibold ${style.text}`}>{text}</Text>
    </View>
  );
}
