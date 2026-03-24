import React from 'react';
import { View, Text, Pressable, type ViewProps } from 'react-native';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps extends Omit<ViewProps, 'className'> {
  variant?: CardVariant;
  onPress?: () => void;
  header?: string;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white shadow-sm shadow-black/10',
  elevated: 'bg-white shadow-lg shadow-black/15',
  outlined: 'bg-white border border-gray-200',
};

export const Card = React.forwardRef<View, CardProps>(
  ({ variant = 'default', onPress, header, children, ...viewProps }, ref) => {
    const content = (
      <>
        {header && (
          <Text className="mb-2 text-lg font-semibold text-[#1F2937]">
            {header}
          </Text>
        )}
        {children}
      </>
    );

    if (onPress) {
      return (
        <Pressable
          ref={ref}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={header || 'Card'}
          className={`rounded-2xl p-4 ${variantStyles[variant]}`}
          style={({ pressed }) => [pressed ? { opacity: 0.9 } : {}]}
          {...viewProps}
        >
          {content}
        </Pressable>
      );
    }

    return (
      <View
        ref={ref}
        className={`rounded-2xl p-4 ${variantStyles[variant]}`}
        {...viewProps}
      >
        {content}
      </View>
    );
  },
);

Card.displayName = 'Card';
