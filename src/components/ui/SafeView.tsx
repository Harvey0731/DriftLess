import React from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SafeViewProps extends Omit<ViewProps, 'className'> {
  children: React.ReactNode;
  /** Additional Tailwind classes to apply */
  className?: string;
}

export function SafeView({ children, className = '', ...viewProps }: SafeViewProps) {
  return (
    <SafeAreaView className="flex-1 bg-[#FAF5FF]" edges={['top', 'left', 'right']}>
      <View className={`flex-1 px-4 ${className}`} {...viewProps}>
        {children}
      </View>
    </SafeAreaView>
  );
}
