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
 * fires {@link FocusProgressStripProps.onPress}. The fill fraction is clamped so
 * a 0-total goal renders an empty (not NaN) bar. Tuned to the canonical
 * `App Shell.dc.html` strip markup.
 */
export function FocusProgressStrip({
  doneCount,
  totalCount,
  onPress,
}: FocusProgressStripProps) {
  const { t } = useTranslation(["focusMode"]);
  // Guard the 0-total case so the fraction is a finite 0, never NaN.
  const pct = totalCount > 0 ? doneCount / totalCount : 0;
  const now = Math.round(pct * 100);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("focusMode:progressStrip.a11yLabel", {
        done: doneCount,
        total: totalCount,
      })}
      style={styles.strip}
    >
      <View style={styles.topRow}>
        <Text style={styles.doneCount} numberOfLines={1}>
          {t("focusMode:progressStrip.doneCount", {
            done: doneCount,
            total: totalCount,
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
    </Pressable>
  );
}
