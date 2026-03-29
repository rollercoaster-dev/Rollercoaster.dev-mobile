import { useEffect, useRef } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAnimationPref } from "./useAnimationPref";

/**
 * Returns an animated style that flashes (opacity 0→1→0) when `count` increases.
 * Respects the user's animation preference — no flash when animations are off.
 */
export function useFlashOnIncrease(count: number) {
  const { shouldAnimate } = useAnimationPref();
  const prevCount = useRef(count);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (count > prevCount.current && shouldAnimate) {
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 450 }),
      );
    }
    prevCount.current = count;
  }, [count, shouldAnimate, flashOpacity]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return flashStyle;
}
