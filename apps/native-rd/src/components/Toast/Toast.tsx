import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
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
  /** Fired once the slide-out completes (finished === true), so the owner can
   * release the toast's state instead of holding it for the app's lifetime. */
  onExitComplete?: () => void;
}

const SLIDE_DISTANCE = 100;

export function Toast({
  visible,
  message,
  action,
  duration = 5000,
  onDismiss,
  onExitComplete,
}: ToastProps) {
  const { shouldAnimate } = useAnimationPref();
  const translateY = useSharedValue(SLIDE_DISTANCE);
  const opacity = useSharedValue(0);
  // `mounted` lags `visible`: it stays true through the slide-out so the exit
  // animation can play, then flips false only once the animation completes.
  const [mounted, setMounted] = useState(visible);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  // Runs on the JS thread when the slide-out finishes: drop `mounted` and let
  // the owner release its toast state. Reads the latest callback via ref so the
  // worklet doesn't need it in the effect's dependency list.
  function finishExit() {
    setMounted(false);
    onExitCompleteRef.current?.();
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const dur = shouldAnimate ? 250 : 0;
      translateY.value = withTiming(0, { duration: dur });
      opacity.value = withTiming(1, { duration: dur });

      // `accessibilityLiveRegion` (below) announces on Android; iOS VoiceOver
      // has no live region, so it needs the explicit announce. Guarded to iOS
      // to avoid double-speak in TalkBack. In the visible branch so a re-show
      // re-announces.
      if (Platform.OS === "ios") {
        AccessibilityInfo.announceForAccessibility(message);
      }

      timerRef.current = setTimeout(() => {
        onDismissRef.current?.();
      }, duration);
    } else {
      const dur = shouldAnimate ? 150 : 0;
      // Unmount only after the slide-out finishes, so the exit plays instead of
      // the view vanishing the instant `visible` flips false. An interrupted
      // exit reports finished === false, so the stale callback won't tear down a
      // toast that's becoming visible again.
      translateY.value = withTiming(
        SLIDE_DISTANCE,
        { duration: dur },
        (finished) => {
          if (finished) runOnJS(finishExit)();
        },
      );
      opacity.value = withTiming(0, { duration: dur });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message, duration, shouldAnimate, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Render while visible, and keep rendering while `mounted` lingers after
  // `visible` flips false so the slide-out can play. Gating on `mounted` alone
  // would drop a frame on re-show: `visible` is already true but `mounted`
  // hasn't caught up, so the view would be absent for one paint.
  if (!visible && !mounted) return null;

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
