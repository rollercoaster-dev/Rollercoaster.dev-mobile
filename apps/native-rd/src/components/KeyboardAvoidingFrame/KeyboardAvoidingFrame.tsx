/**
 * KeyboardAvoidingFrame — the one keyboard-avoiding wrapper for screens with a
 * text input above a pinned footer CTA. Wrap the [body][footer] pair; keep the
 * ScreenSubHeader (or the stage's own header) as a sibling above it.
 *
 * Built on react-native-keyboard-controller's KeyboardAvoidingView so the
 * padding tracks the keyboard frame-for-frame (React Native's own version
 * animates with LayoutAnimation and lags the keyboard). Two measurement
 * gotchas are handled here so no consumer has to know about them:
 *
 *   1. Both KeyboardAvoidingViews compute the overlap from their `onLayout`
 *      frame, whose `y` is relative to the PARENT, not the window. Every
 *      consumer sits under App.tsx's `marginTop: insets.top` (and the wizard
 *      inside a modal sheet), so a bare KAV under-pads by that inset — ~59pt on
 *      a Dynamic Island iPhone — and the footer CTA stays half under the keys.
 *   2. React Native's `measureInWindow` is not a fix either: under Fabric it
 *      resolves the position from the shadow tree, so an offset UIKit applies
 *      outside that tree — the ~62pt a native-stack modal sheet sits below the
 *      window top — is invisible to it. On the New Goal wizard it returned the
 *      same y as the layout frame, the footer (also ~62pt tall) under-padded by
 *      exactly its own height, and "I'm ready" sat fully under the keyboard.
 *
 * So the frame asks keyboard-controller's native module for its window
 * position on every layout (`viewPositionInWindow`, a UIKit/Android view
 * conversion that sees every offset) and passes `windowY − layoutY` as
 * `keyboardVerticalOffset`, which the KAV adds back into its overlap math.
 * `measureInWindow` stays as the fallback if that call rejects. keyboard-
 * controller's own `automaticOffset` wraps the same native call but replaces
 * the frame `y` outright and was seen falling back to the relative frame on a
 * tab-navigator stack screen (readout: relative y 78, window y 140, offset 0),
 * so the frame owns the measurement itself. The offset-based math also keeps
 * the overlap right on screens whose scene ends above the window bottom (the
 * tab bar inset), because the frame's own bottom edge, not the keyboard
 * height, drives the padding.
 */
import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  View,
  findNodeHandle,
  type LayoutChangeEvent,
  type ViewProps,
} from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardControllerNative,
} from "react-native-keyboard-controller";
import { styles } from "./KeyboardAvoidingFrame.styles";

export type KeyboardAvoidingFrameProps = ViewProps;

export function KeyboardAvoidingFrame({
  style,
  children,
  onLayout,
  ...rest
}: KeyboardAvoidingFrameProps) {
  const ref = useRef<View>(null);
  const [windowOffset, setWindowOffset] = useState(0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onLayout?.(event);
      const layoutY = event.nativeEvent.layout.y;
      // Both measurements are async; the KAV re-derives its overlap when the
      // offset prop changes, so a late-arriving value still lands.
      const apply = (windowY: number) => {
        const next = Math.round(windowY - layoutY);
        if (Number.isFinite(next)) {
          setWindowOffset((prev) => (prev === next ? prev : next));
        }
      };
      const measureFallback = () => {
        ref.current?.measureInWindow((_x, windowY) => apply(windowY));
      };
      const tag = findNodeHandle(ref.current);
      if (tag === null) {
        measureFallback();
        return;
      }
      KeyboardControllerNative.viewPositionInWindow(tag)
        .then((position) => apply(position.y))
        .catch(measureFallback);
    },
    [onLayout],
  );

  return (
    <KeyboardAvoidingView
      ref={ref}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={windowOffset}
      onLayout={handleLayout}
      style={[styles.frame, style]}
      {...rest}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
