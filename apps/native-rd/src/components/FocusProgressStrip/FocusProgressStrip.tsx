import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { styles } from "./FocusProgressStrip.styles";

export interface FocusProgressStripProps {
  /** Steps completed. */
  doneCount: number;
  /** Total steps in the journey. */
  totalCount: number;
  /**
   * Tap the strip — the whole block is the "See all steps" target. Real
   * navigation to the Timeline is #377's wiring, not this presentational issue's.
   */
  onPress?: () => void;
}

/**
 * Focus Mode progress strip — a tappable "{done} / {total} done · See all
 * steps ›" header over a thin progress bar. Pure presentational (#450); not
 * wired to any screen (#377 owns that). The whole strip is one tap target that
 * fires {@link FocusProgressStripProps.onPress}. The counts are clamped into a
 * coherent range — `done` bounded to `[0, total]`, and a 0-total goal renders an
 * empty (never-NaN) bar — so the label, a11y value, and bar fill can never
 * disagree. Tuned to the canonical `App Shell.dc.html` strip markup.
 */
export function FocusProgressStrip({
  doneCount,
  totalCount,
  onPress,
}: FocusProgressStripProps) {
  const { t } = useTranslation(["focusMode"]);
  // Clamp the pair into a coherent range so the label, the a11y value, and the
  // bar fill can never disagree: `total` is non-negative, `done` is bounded to
  // `[0, total]`, and the 0-total case yields a finite 0 (never NaN).
  const total = Math.max(0, totalCount);
  const done = Math.min(Math.max(0, doneCount), total);
  const now = total > 0 ? Math.round((done / total) * 100) : 0;

  const content = (
    <>
      <View style={styles.topRow}>
        <Text style={styles.doneCount} numberOfLines={1}>
          {t("focusMode:progressStrip.doneCount", {
            done,
            total,
          })}
        </Text>
        <Text style={styles.seeAll}>
          {t("focusMode:progressStrip.seeAllSteps")}
        </Text>
      </View>
      <View
        testID="focus-progress-strip-bar"
        style={styles.barTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now }}
      >
        <View style={[styles.barFill, { width: `${now}%` }]} />
      </View>
    </>
  );

  // Only present as a button when there's a real handler. A handler-less
  // Pressable would put a non-functional "button" in the accessibility tree;
  // fall back to a plain container instead (matches Card/SettingsRow/
  // TimelineNode). Live consumers always pass onPress (#377 wires it) — the
  // handler-less path is stories/tests, where the inner progressbar and count
  // text stay readable on their own.
  if (!onPress) {
    return <View style={styles.strip}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("focusMode:progressStrip.a11yLabel", {
        done,
        total,
      })}
      style={styles.strip}
    >
      {content}
    </Pressable>
  );
}
