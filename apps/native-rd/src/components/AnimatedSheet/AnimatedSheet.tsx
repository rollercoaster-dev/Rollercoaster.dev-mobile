import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Text as RNText,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { focusAccessibilityRef } from "../../utils/accessibilityFocus";
import { sheetStyles } from "./AnimatedSheet.styles";
import { SheetSurface } from "./SheetSurface";

export interface AnimatedSheetProps {
  /** Whether the sheet is open (drives the slide-up/scrim animation). */
  visible: boolean;
  /** Closes the sheet — wired to backdrop tap, header × control, and Android back. */
  onClose: () => void;
  /** Sheet header copy. Pre-resolved by the caller (no i18n inside — D7). */
  title: string;
  /** Optional sub-line under the header; omit to hide it. */
  subLine?: string;
  /** a11y label for the backdrop + × close affordances. Pre-resolved (D7). */
  closeLabel: string;
  /** Optional testID for the × close control; undefined → no testID (D6). */
  closeTestID?: string;
  /**
   * testID for the backdrop Pressable so each consumer's sheet stays
   * independently addressable. Defaults to "capture-sheet-backdrop" (the
   * capture-sheet's original hook); the edit-goal sheet passes its own.
   */
  backdropTestID?: string;
  /**
   * Control to restore screen-reader focus to once the sheet finishes closing
   * — the element that opened it (the "Share badge" CTA, an evidence chip, the
   * "Add evidence" trigger). Accepts a `View` ref, or a `RefObject` whose
   * `current` is already a native tag captured from a press event
   * (`event.nativeEvent.target`). Omit it and no focus is restored on close.
   */
  restoreFocusRef?: React.RefObject<View | number | null>;
  /** Body content rendered below the header (the picker grid). */
  children: React.ReactNode;
}

/**
 * Shared animated bottom-sheet shell — an **in-tree** absolute scrim + sheet
 * that rises from the bottom of the nearest screen-sized ancestor.
 * Deliberately NOT an RN `Modal`:
 * a Modal portals to the OS layer (and to `<body>` on web), escaping the
 * phone frame and losing the sheet chrome — the caller's frame is the correct
 * boundary for a mobile bottom sheet. Slide-up/scrim-fade timing respects the
 * animation preference (autism-friendly / OS reduce-motion → instant), and
 * Android hardware back dismisses while open (the job the Modal's
 * `onRequestClose` used to do).
 *
 * Owns the animated half of the chrome — overlay, scrim, backdrop, slide,
 * BackHandler, and the mount/rendered-while-animating-out lifecycle. The
 * static half (handle, header row, sub-line, surface) is {@link SheetSurface},
 * which the theme-matrix stories render on its own (#573, D2). The body is
 * `children`. Takes already-resolved copy strings and has no `react-i18next`
 * dependency of its own (D7).
 */
export function AnimatedSheet({
  visible,
  onClose,
  title,
  subLine,
  closeLabel,
  closeTestID,
  backdropTestID = "capture-sheet-backdrop",
  restoreFocusRef,
  children,
}: AnimatedSheetProps) {
  const { animationPref } = useAnimationPref();
  const { height: windowHeight } = useWindowDimensions();
  // Mounted while visible OR still sliding out; unmounts when the exit
  // animation completes so nothing lingers in the a11y tree.
  const [rendered, setRendered] = useState(visible);
  // 0 = parked below the frame, 1 = resting position.
  const progress = useSharedValue(0);
  // The header title — focus lands here on open so assistive tech enters the
  // sheet rather than staying on the trigger behind it.
  const titleRef = useRef<RNText>(null);
  // Cancels a still-pending (delayed) focus request, so an interrupted
  // open→close→open cycle can't fire a stale restore after the sheet reopens.
  const pendingFocusCancel = useRef<(() => void) | undefined>(undefined);
  // false→true edge detector so the title is focused on an actual open, not on
  // every re-render (or an animation-pref change) while already visible.
  const wasVisible = useRef(false);

  // Re-runs on every visible transition, so the onExitComplete closure captures
  // the current restoreFocusRef (whose .current is read lazily when the exit
  // animation finishes) — no mirror ref needed.
  useEffect(() => {
    const config = getTimingConfig(animationPref, "normal");
    const opening = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (visible) {
      setRendered(true);
      progress.value = withTiming(1, config);
      if (opening) {
        pendingFocusCancel.current?.();
        pendingFocusCancel.current = focusAccessibilityRef(titleRef);
      }
    } else {
      // On the rendered:true→false transition (exit animation complete), move
      // focus back to whatever opened the sheet.
      const onExitComplete = () => {
        setRendered(false);
        pendingFocusCancel.current?.();
        pendingFocusCancel.current = focusAccessibilityRef(restoreFocusRef);
      };
      progress.value = withTiming(0, config, (finished) => {
        if (finished) runOnJS(onExitComplete)();
      });
    }
  }, [visible, animationPref, progress, restoreFocusRef]);

  // Drop any pending focus request if the sheet unmounts before it fires.
  useEffect(() => () => pendingFocusCancel.current?.(), []);

  // Android hardware/gesture back closes the sheet instead of the screen.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const scrimAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const sheetAnimStyle = useAnimatedStyle(() => ({
    // windowHeight overshoots the sheet's own height, which just means the
    // rise starts from safely offscreen — no layout measurement needed.
    transform: [{ translateY: (1 - progress.value) * windowHeight }],
  }));

  if (!rendered) return null;

  return (
    <View
      testID="animated-sheet-overlay"
      style={sheetStyles.overlay}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityViewIsModal
    >
      {/* Backdrop — tapping the exposed scrim dismisses the sheet. */}
      <Animated.View style={[sheetStyles.scrim, scrimAnimStyle]}>
        <Pressable
          testID={backdropTestID}
          style={sheetStyles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
      </Animated.View>
      <Animated.View style={sheetAnimStyle}>
        <SheetSurface
          title={title}
          subLine={subLine}
          closeLabel={closeLabel}
          onClose={onClose}
          closeTestID={closeTestID}
          titleRef={titleRef}
        >
          {children}
        </SheetSurface>
      </Animated.View>
    </View>
  );
}
