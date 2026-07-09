import React, { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { styles } from "./EvidenceTypePicker.styles";

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
  /** Body content rendered below the header (the picker grid). */
  children: React.ReactNode;
}

/**
 * Shared animated bottom-sheet shell — an **in-tree** absolute scrim + sheet
 * that rises from the bottom of the nearest screen-sized ancestor, mirroring
 * EvidenceDrawer's overlay/drawer pattern. Deliberately NOT an RN `Modal`:
 * a Modal portals to the OS layer (and to `<body>` on web), escaping the
 * phone frame and losing the sheet chrome — the caller's frame is the correct
 * boundary for a mobile bottom sheet. Slide-up/scrim-fade timing respects the
 * animation preference (autism-friendly / OS reduce-motion → instant), and
 * Android hardware back dismisses while open (the job the Modal's
 * `onRequestClose` used to do).
 *
 * Owns everything the issue calls "chrome" — overlay, scrim, backdrop, slide,
 * BackHandler, mount/rendered-while-animating-out lifecycle, plus the handle,
 * header row (title + ×) and optional sub-line (D1). The grid is `children`.
 * Takes already-resolved copy strings and has no `react-i18next` dependency of
 * its own (D7). Not exported from the barrel — imported directly by consumers
 * (D2). Reuses `EvidenceTypePicker.styles.ts`'s existing keys as-is.
 */
export function AnimatedSheet({
  visible,
  onClose,
  title,
  subLine,
  closeLabel,
  closeTestID,
  backdropTestID = "capture-sheet-backdrop",
  children,
}: AnimatedSheetProps) {
  const { animationPref } = useAnimationPref();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Mounted while visible OR still sliding out; unmounts when the exit
  // animation completes so nothing lingers in the a11y tree.
  const [rendered, setRendered] = useState(visible);
  // 0 = parked below the frame, 1 = resting position.
  const progress = useSharedValue(0);

  useEffect(() => {
    const config = getTimingConfig(animationPref, "normal");
    if (visible) {
      setRendered(true);
      progress.value = withTiming(1, config);
    } else {
      progress.value = withTiming(0, config, (finished) => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
  }, [visible, animationPref, progress]);

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
      style={styles.overlay}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityViewIsModal
    >
      {/* Backdrop — tapping the exposed scrim dismisses the sheet. */}
      <Animated.View style={[styles.scrim, scrimAnimStyle]}>
        <Pressable
          testID={backdropTestID}
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
      </Animated.View>
      <Animated.View style={sheetAnimStyle}>
        <View style={styles.sheet(insets.bottom)}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <RNText style={styles.sheetTitle} accessibilityRole="header">
              {title}
            </RNText>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              hitSlop={8}
              testID={closeTestID}
            >
              <RNText style={styles.closeIcon}>{"✕"}</RNText>
            </Pressable>
          </View>
          {subLine ? <RNText style={styles.subLine}>{subLine}</RNText> : null}
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
