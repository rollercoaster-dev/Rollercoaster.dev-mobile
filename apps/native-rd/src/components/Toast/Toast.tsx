import React, { useEffect, useRef } from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { Text } from "../Text";
import { styles } from "./Toast.styles";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastProps {
  visible: boolean;
  message: string;
  action?: ToastAction;
  duration?: number;
  onDismiss?: () => void;
}

const SLIDE_DISTANCE = 100;

export function Toast({
  visible,
  message,
  action,
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const { shouldAnimate } = useAnimationPref();
  const translateY = useSharedValue(SLIDE_DISTANCE);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (visible) {
      const dur = shouldAnimate ? 250 : 0;
      translateY.value = withTiming(0, { duration: dur });
      opacity.value = withTiming(1, { duration: dur });

      timerRef.current = setTimeout(() => {
        onDismissRef.current?.();
      }, duration);
    } else {
      const dur = shouldAnimate ? 150 : 0;
      translateY.value = withTiming(SLIDE_DISTANCE, { duration: dur });
      opacity.value = withTiming(0, { duration: dur });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, shouldAnimate, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={message}
    >
      <Text variant="body" style={styles.message}>
        {message}
      </Text>
      {action && (
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            action.onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text variant="label" style={styles.actionLabel}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
