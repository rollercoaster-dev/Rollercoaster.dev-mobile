import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import {
  stepStateNodeBg,
  type StepStateMapKey,
} from "../TimelineNode/stepStateColorMap";
import { styles } from "./TimelineBreakdownBar.styles";

export interface TimelineBreakdownBarProps {
  /**
   * Per-state step counts, keyed by the canonical stepStateColorMap vocabulary
   * (#406). Pre-tallied by the caller — this presentational component does no
   * step traversal or counting of its own (plan D1).
   */
  counts: Record<StepStateMapKey, number>;
}

/**
 * Left-to-right order for both the bar segments and the legend chips:
 * done → in motion → to come → set aside. Local to this widget (plan D2) —
 * TimelineNode's matrix orders states differently and stepStateColorMap
 * intentionally carries no ordering.
 */
export const SEGMENT_ORDER: StepStateMapKey[] = [
  "completed",
  "in-progress",
  "pending",
  "paused",
];

/** Fully-namespaced, typed legend i18n key (mirrors StepStateBadgeKey, #406). */
type LegendI18nKey = `common:timelineBreakdown.legend.${StepStateMapKey}`;
const legendI18nKey = (state: StepStateMapKey): LegendI18nKey =>
  `common:timelineBreakdown.legend.${state}`;

/**
 * Honest-breakdown bar (#451): a 4-segment progress bar paired with a counts
 * legend, speaking the exact one-color language as TimelineNode via #406's
 * stepStateColorMap. Presentational only — no data fetching, no screen wiring
 * (that's #378).
 *
 * Segments use `flex: count` (plan D5), so a total of 0 renders an empty
 * bordered track (all `flex: 0`) with no NaN-width crash. A state with
 * `count === 0` produces no legend chip.
 */
export function TimelineBreakdownBar({ counts }: TimelineBreakdownBarProps) {
  const { t } = useTranslation(["common"]);
  const { theme } = useUnistyles();

  return (
    <View style={styles.card}>
      <View style={styles.track}>
        {SEGMENT_ORDER.map((state) => (
          <View
            key={state}
            style={[
              { flex: counts[state] },
              { backgroundColor: stepStateNodeBg(theme, state) },
            ]}
          />
        ))}
      </View>
      <View style={styles.legendRow}>
        {SEGMENT_ORDER.filter((state) => counts[state] > 0).map((state) => (
          <View key={state} style={styles.chip}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: stepStateNodeBg(theme, state) },
              ]}
            />
            <Text style={styles.chipText}>
              {t(legendI18nKey(state), { count: counts[state] })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
