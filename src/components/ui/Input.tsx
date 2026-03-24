import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps } from 'react-native';

interface InputProps extends Omit<TextInputProps, 'className'> {
  label?: string;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      secureTextEntry = false,
      ...textInputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureVisible, setIsSecureVisible] = useState(!secureTextEntry);

    const borderColor = error
      ? 'border-[#EF4444]'
      : isFocused
        ? 'border-[#8B5CF6]'
        : 'border-gray-300';

    return (
      <View className="w-full">
        {label && (
          <Text
            className="mb-1.5 text-sm font-medium text-[#1F2937]"
            accessibilityRole="text"
          >
            {label}
          </Text>
        )}

        <View className="relative">
          <TextInput
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              textInputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              textInputProps.onBlur?.(e);
            }}
            secureTextEntry={secureTextEntry && !isSecureVisible}
            placeholderTextColor="#9CA3AF"
            accessibilityLabel={label}
            accessibilityState={{ disabled: textInputProps.editable === false }}
            accessibilityHint={helperText}
            className={`
              rounded-xl border-2 bg-white px-4 py-3 text-base text-[#1F2937]
              ${borderColor}
              ${secureTextEntry ? 'pr-12' : ''}
            `}
            {...textInputProps}
          />

          {secureTextEntry && (
            <Pressable
              onPress={() => setIsSecureVisible((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={isSecureVisible ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-0 bottom-0 justify-center px-1"
            >
              <Text className="text-sm font-medium text-[#6B7280]">
                {isSecureVisible ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          )}
        </View>

        {error && (
          <Text
            className="mt-1 text-sm text-[#EF4444]"
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}

        {helperText && !error && (
          <Text className="mt-1 text-sm text-[#6B7280]">{helperText}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';
