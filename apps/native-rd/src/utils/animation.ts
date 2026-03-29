import {
  Easing,
  type WithTimingConfig,
  type WithSpringConfig,
} from "react-native-reanimated";
import type { AnimationPref } from "../hooks/useAnimationPref";

export type AnimationSpeed = "quick" | "normal" | "slow";

export const ANIMATION_DURATIONS: Record<
  AnimationPref,
  Record<AnimationSpeed, number>
> = {
  full: { quick: 200, normal: 300, slow: 500 },
  reduced: { quick: 100, normal: 150, slow: 200 },
  none: { quick: 0, normal: 0, slow: 0 },
} as const;

export function getAnimationDuration(
  pref: AnimationPref,
  speed: AnimationSpeed = "normal",
): number {
  return ANIMATION_DURATIONS[pref][speed];
}

export function getTimingConfig(
  pref: AnimationPref,
  speed: AnimationSpeed = "normal",
): WithTimingConfig {
  return {
    duration: ANIMATION_DURATIONS[pref][speed],
    easing: pref === "full" ? Easing.out(Easing.cubic) : Easing.linear,
  };
}

export function getSpringConfig(pref: AnimationPref): WithSpringConfig {
  if (pref === "none") {
    return { duration: 0 };
  }
  if (pref === "reduced") {
    return { damping: 20, stiffness: 300 };
  }
  // full — bouncy spring
  return { damping: 12, stiffness: 180 };
}
