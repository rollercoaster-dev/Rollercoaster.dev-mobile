import React from "react";
import { View, Pressable, Text as RNText } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sheetStyles } from "./AnimatedSheet.styles";

export interface SheetSurfaceProps {
  /** Sheet header copy. Pre-resolved by the caller (no i18n inside — D7). */
  title: string;
  /** Optional sub-line under the header; omit to hide it. */
  subLine?: string;
  /** a11y label for the × close affordance. Pre-resolved (D7). */
  closeLabel: string;
  /** Called by the header × control. */
  onClose: () => void;
  /** Optional testID for the × close control; undefined → no testID. */
  closeTestID?: string;
  /**
   * Ref for the header title. {@link AnimatedSheet} passes one so screen-reader
   * focus lands on the title when the sheet opens; standalone callers omit it.
   */
  titleRef?: React.Ref<RNText>;
  /** Body content rendered below the header. */
  children: React.ReactNode;
}

/**
 * The sheet chrome **without** the scrim — opaque surface, handle, header row
 * (title + ×) and optional sub-line, with the bottom safe-area inset folded
 * into its padding.
 *
 * Split out of {@link AnimatedSheet} (#573, D2) because theme-matrix stories
 * need a body they can tile: the full sheet brings an absolute-fill scrim
 * anchored to its parent, so seven live sheets stack over the canvas. Before
 * this existed each sheet duplicated the chrome markup for that reason
 * (`CaptureSheetBody` still does; converting it was out of scope for #573).
 *
 * The root is a plain styled `View` rather than a styled `SafeAreaView`:
 * unistyles styles on the third-party SafeAreaView are silently dropped on
 * web, which rendered the sheet with no background at all.
 */
export function SheetSurface({
  title,
  subLine,
  closeLabel,
  onClose,
  closeTestID,
  titleRef,
  children,
}: SheetSurfaceProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={sheetStyles.sheet(insets.bottom)}>
      <View style={sheetStyles.handle} />
      <View style={sheetStyles.sheetHeader}>
        <RNText
          ref={titleRef}
          style={sheetStyles.sheetTitle}
          accessibilityRole="header"
        >
          {title}
        </RNText>
        <Pressable
          style={sheetStyles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={8}
          testID={closeTestID}
        >
          <RNText style={sheetStyles.closeIcon}>{"✕"}</RNText>
        </Pressable>
      </View>
      {subLine ? <RNText style={sheetStyles.subLine}>{subLine}</RNText> : null}
      {children}
    </View>
  );
}
