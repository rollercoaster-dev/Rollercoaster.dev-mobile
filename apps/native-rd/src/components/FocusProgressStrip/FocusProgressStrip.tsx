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
 * coherent range — `done` bounded to `[0, total]`, a 0-total goal renders an
 * empty (never-NaN) bar, and the fill reserves 0%/100% for the true start and
 * finish (a partial goal never rounds to either) — so the label, a11y value,
 * and bar fill can never disagree. Tuned to the canonical `App Shell.dc.html`
 * strip markup.
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
  // Percent fill for the bar and the progressbar `now`. Reserve the 0%/100%
  // endpoints for the true boundaries (`done === 0` / `done === total`): a
  // partial goal must never round *up* to "complete" (e.g. 199/200 → 100) or
  // *down* to "empty" (e.g. 1/200 → 0) and read as finished/unstarted while the
  // label still says otherwise. Everything in between is clamped to [1, 99].
  const fraction = total > 0 ? done / total : 0;
  const now =
    fraction === 0
      ? 0
      : fraction === 1
        ? 100
        : Math.min(99, Math.max(1, Math.round(fraction * 100)));

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
        accessible
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
      accessible
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
