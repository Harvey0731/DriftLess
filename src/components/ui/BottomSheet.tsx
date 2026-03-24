import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 bg-black/50"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close bottom sheet"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="absolute bottom-0 left-0 right-0"
        pointerEvents="box-none"
      >
        <View className="rounded-t-3xl bg-white px-6 pb-8 pt-4">
          {/* Handle indicator */}
          <View className="mb-4 self-center">
            <View className="h-1 w-10 rounded-full bg-gray-300" />
          </View>

          {title && (
            <Text
              className="mb-4 text-xl font-bold text-[#1F2937]"
              accessibilityRole="header"
            >
              {title}
            </Text>
          )}

          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
