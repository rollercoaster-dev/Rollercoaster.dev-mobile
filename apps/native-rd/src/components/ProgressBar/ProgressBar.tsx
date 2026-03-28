import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useAnimationPref } from '../../hooks/useAnimationPref';
import { getTimingConfig, getSpringConfig } from '../../utils/animation';
import { styles } from './ProgressBar.styles';

export interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const { animationPref } = useAnimationPref();
  const width = useSharedValue(clamped);

  useEffect(() => {
    if (animationPref === 'full') {
      width.value = withSpring(clamped, getSpringConfig('full'));
    } else {
      width.value = withTiming(clamped, getTimingConfig(animationPref, 'normal'));
    }
  }, [clamped, animationPref, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, width.value * 100))}%`,
  }));

  return (
    <View
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clamped * 100),
      }}
    >
      <Animated.View style={[styles.fillBase, fillStyle]} />
    </View>
  );
}
