import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { interpolate, useAnimatedStyle } from "react-native-reanimated";

/**
 * Animated bottom padding for a footer pinned inside a KeyboardAvoidingFrame.
 *
 * Such footers reserve bottom space at rest — the home indicator on the wizard,
 * the floating tab bar's lift on Edit Goal. With the keyboard up that space is
 * under the keys, so the reservation would open a dead gap between the CTA and
 * the keyboard. This interpolates from `closed` to `open` on the keyboard's own
 * progress, so the footer tracks the keyboard frame-for-frame instead of
 * snapping after it has finished hiding (which is what switching on a
 * keyboard-visible flag does). Apply on an `Animated.View` after the static
 * footer style so it wins on `paddingBottom`.
 */
export function useKeyboardFooterPadding(closed: number, open: number) {
  if (!Number.isFinite(closed) || !Number.isFinite(open)) {
    throw new RangeError(
      `useKeyboardFooterPadding: paddings must be finite, got ${closed}/${open}`,
    );
  }
  const { progress } = useReanimatedKeyboardAnimation();
  return useAnimatedStyle(() => ({
    paddingBottom: interpolate(progress.value, [0, 1], [closed, open]),
  }));
}
