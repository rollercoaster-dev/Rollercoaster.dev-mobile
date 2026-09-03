/**
 * Mock for react-native-reanimated
 *
 * Stubs the native animation runtime. Easing functions return identity
 * transforms, animation wrappers (withTiming, withSpring) return the
 * target value immediately, and useSharedValue returns a plain object.
 * `withTiming` synchronously invokes its completion callback with
 * `finished === true` (mirroring an instantly-completed animation) so
 * components that unmount/clean up on completion behave under test.
 * The default export includes Animated.View as a string placeholder.
 */
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
  withTiming: (
    toValue: number,
    _config?: object,
    callback?: (finished: boolean) => void,
  ) => {
    if (typeof callback === "function") callback(true);
    return toValue;
  },
  withDelay: (_delay: number, value: number) => value,
  withSpring: (toValue: number) => toValue,
  withRepeat: (
    animation: number,
    numberOfReps?: number,
    _reverse?: boolean,
    callback?: (finished: boolean) => void,
  ) => {
    // A finite repeat eventually completes and fires its callback with
    // finished === true. An infinite repeat (numberOfReps === -1) never
    // completes in real Reanimated, so the callback must NOT fire — otherwise
    // tests pass on a completion that can't happen at runtime.
    if (typeof callback === "function" && numberOfReps !== -1) callback(true);
    return animation;
  },
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  // Piecewise-linear, clamped to the output range — enough for the footer
  // padding interpolation (useKeyboardFooterPadding) to evaluate at rest.
  interpolate: (value: number, input: number[], output: number[]) => {
    if (value <= input[0]) return output[0];
    const last = input.length - 1;
    if (value >= input[last]) return output[last];
    let i = 0;
    while (value > input[i + 1]) i += 1;
    const t = (value - input[i]) / (input[i + 1] - input[i]);
    return output[i] + t * (output[i + 1] - output[i]);
  },
  Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
};

// default import (import Animated from ...) needs View at top level
// because without __esModule the default import IS module.exports
module.exports = {
  ...named,
  View: "Animated.View",
  Text: "Animated.Text",
  default: {
    View: "Animated.View",
    Text: "Animated.Text",
    ...named,
  },
};
