/**
 * ScrollAtLargeType — a fixed body that becomes scrollable at large type.
 *
 * Several screens stack content in a non-scrolling `flex:1` View above a
 * pinned footer. At default size it fits; at large Dynamic Type / font scale
 * it runs under the footer and can't be reached (#754). This renders the
 * existing View, unchanged, at default size, and a ScrollView in the same slot
 * at large type so the footer stays pinned and the content scrolls above it.
 *
 * - `style` — the default-size View style (the layout that ships today).
 * - `contentContainerStyle` — the scroll content at large type. Use
 *   `flexGrow: 1` with the View's own `justifyContent` to keep content
 *   centered while it still fits; once it doesn't, it scrolls from the top
 *   instead of overflowing both edges.
 * - `scrollStyle` — extra frame style for the ScrollView (background etc.).
 */
import React from "react";
import {
  ScrollView,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { useTypeScale } from "../../hooks/useTypeScale";
import { styles } from "./ScrollAtLargeType.styles";

export interface ScrollAtLargeTypeProps extends ViewProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollStyle?: StyleProp<ViewStyle>;
}

export function ScrollAtLargeType({
  style,
  contentContainerStyle,
  scrollStyle,
  children,
  ...rest
}: ScrollAtLargeTypeProps) {
  const { isLargeType } = useTypeScale();

  if (!isLargeType) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      {...rest}
      style={[styles.scroll, scrollStyle]}
      contentContainerStyle={contentContainerStyle}
      // Taps on inputs and buttons inside must land, not just dismiss the
      // keyboard (same as every other form ScrollView in the app).
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
