import React from "react";
import { View, Pressable, ScrollView, type Text as RNText } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../Text";
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
  /**
   * Extra bottom clearance for chrome floating over the sheet's frame — pass
   * `PILL_LIFT` on screens inside the tab navigator, whose lifted tab pill
   * otherwise covers the sheet's last row. Used instead of the bottom
   * safe-area inset when larger (the tab bar already pays that inset).
   */
  bottomClearance?: number;
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
  bottomClearance = 0,
  children,
}: SheetSurfaceProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="sheet-surface"
      style={sheetStyles.sheet(Math.max(insets.bottom, bottomClearance))}
    >
      <View style={sheetStyles.handle} />
      <View style={sheetStyles.sheetHeader}>
        <Text
          ref={titleRef}
          variant="title"
          style={sheetStyles.sheetTitle}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <Pressable
          style={sheetStyles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={8}
          testID={closeTestID}
        >
          <Text variant="title" chrome style={sheetStyles.closeIcon}>
            {"✕"}
          </Text>
        </Pressable>
      </View>
      {/* Handle and header stay fixed; everything below scrolls once the
          sheet reaches its bound (large type), so title and × stay visible. */}
      <ScrollView
        testID="sheet-surface-body"
        style={sheetStyles.body}
        contentContainerStyle={sheetStyles.bodyContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {subLine ? (
          <Text variant="mono" style={sheetStyles.subLine}>
            {subLine}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}
