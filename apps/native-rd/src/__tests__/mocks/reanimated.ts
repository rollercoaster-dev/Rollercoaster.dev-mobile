const Easing = {
  linear: (t: number) => t,
  out: () => (t: number) => t,
  in: () => (t: number) => t,
  cubic: (t: number) => t,
  quad: (t: number) => t * t,
};

const named = {
  Easing,
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (fn: () => object) => fn(),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  withTiming: (toValue: number) => toValue,
  withDelay: (_delay: number, value: number) => value,
  withSpring: (toValue: number) => toValue,
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
};

// default import (import Animated from ...) needs View at top level
// because without __esModule the default import IS module.exports
module.exports = {
  ...named,
  View: "Animated.View",
  default: { View: "Animated.View", ...named },
};
