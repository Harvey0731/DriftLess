import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type PressableProps,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<
  ButtonVariant,
  { container: string; text: string; pressed: string }
> = {
  primary: {
    container: 'bg-[#8B5CF6] shadow-md shadow-[#8B5CF6]/30',
    text: 'text-white',
    pressed: 'opacity-80',
  },
  secondary: {
    container: 'bg-transparent border-2 border-[#8B5CF6]',
    text: 'text-[#8B5CF6]',
    pressed: 'opacity-70 bg-[#8B5CF6]/10',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-[#8B5CF6]',
    pressed: 'bg-[#8B5CF6]/10',
  },
  danger: {
    container: 'bg-[#EF4444] shadow-md shadow-[#EF4444]/30',
    text: 'text-white',
    pressed: 'opacity-80',
  },
  accent: {
    container: 'bg-[#10B981] shadow-md shadow-[#10B981]/30',
    text: 'text-white',
    pressed: 'opacity-80',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'px-4 py-2',
    text: 'text-sm',
  },
  md: {
    container: 'px-6 py-3',
    text: 'text-base',
  },
  lg: {
    container: 'px-8 py-4',
    text: 'text-lg',
  },
};

export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      title,
      onPress,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      icon,
      fullWidth = false,
      ...pressableProps
    },
    ref,
  ) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        className={`
          flex-row items-center justify-center rounded-xl
          ${sizeStyle.container}
          ${variantStyle.container}
          ${fullWidth ? 'w-full' : 'self-start'}
          ${disabled ? 'opacity-50' : ''}
        `}
        style={({ pressed }) => [
          pressed && !disabled && !loading ? { opacity: 0.8 } : {},
        ]}
        {...pressableProps}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' || variant === 'ghost' ? '#8B5CF6' : '#FFFFFF'}
            accessibilityLabel="Loading"
          />
        ) : (
          <>
            {icon && <View className="mr-2">{icon}</View>}
            <Text
              className={`font-semibold ${sizeStyle.text} ${variantStyle.text}`}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';
