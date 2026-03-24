import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ProgressBarProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Bar color, defaults to primary purple */
  color?: string;
  /** Bar height in pixels, defaults to 8 */
  height?: number;
}

export function ProgressBar({
  progress,
  color = '#8B5CF6',
  height = 8,
}: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const animatedWidth = useSharedValue(clampedProgress);

  useEffect(() => {
    animatedWidth.value = withTiming(clampedProgress, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  return (
    <View
      className="w-full overflow-hidden rounded-full bg-gray-200"
      style={{ height }}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clampedProgress * 100),
      }}
    >
      <Animated.View
        className="rounded-full"
        style={[{ height, backgroundColor: color }, animatedStyle]}
      />
    </View>
  );
}
