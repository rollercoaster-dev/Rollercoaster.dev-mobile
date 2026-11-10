import React from "react";
import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useTypeScale } from "../../hooks/useTypeScale";
import { Text } from "../Text";
import { styles } from "./FocusParkedState.styles";

export interface FocusParkedRow {
  /** Stable row key / testID. */
  id: string;
  /** The paused step's title. */
  title: string;
  /**
   * Resume THIS row's step. Each row fires its own handler — never a shared or
   * ambient one, so tapping row N can only ever resume row N.
   */
  onResume: () => void;
}

export interface FocusParkedStateProps {
  /**
   * The paused steps, one resumable row each. The displayed "{N} set aside"
   * count is derived from `rows.length` (D6) — it cannot drift from what renders.
   */
  rows: readonly FocusParkedRow[];
}

/**
 * Focus Mode parked / all-paused screen state (#450) — the "Nothing in progress."
 * view: a quiet heading, a reassurance line ("all still here, none hidden,
 * nothing counted"), and a list of resumable rows. Pure presentational; not wired
 * to any screen (#377 owns that). Sibling to `FocusCurrentTaskCard`, not a status
 * on it (D3): the list-of-rows shape doesn't fit that card's single-title
 * contract. Tuned to the canonical `App Shell.dc.html` markup.
 */
export function FocusParkedState({ rows }: FocusParkedStateProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  return (
    <View style={styles.container}>
      <Text
        variant="headline"
        style={styles.heading}
        accessibilityRole="header"
      >
        {t("focusMode:parked.heading")}
      </Text>
      <Text variant="metadata" style={styles.body}>
        {t("focusMode:parked.body", { count: rows.length })}
      </Text>
      <View style={styles.rows}>
        {rows.map((row) => (
          <ParkedRow key={row.id} row={row} />
        ))}
      </View>
    </View>
  );
}

/**
 * One resumable paused step. The whole row is a single `accessible` button with a
 * combined label (title + "paused. Resume."), matching the `accessible`-collapses-
 * children pattern used by `FocusCurrentTaskCard`'s planned box — so a screen
 * reader hears one node per row, not three. The visible pill/title/resume are the
 * sighted read of the same information.
 */
function ParkedRow({ row }: { row: FocusParkedRow }) {
  const { t } = useTranslation(["common", "focusMode"]);
  // At accessibility sizes the pill and "resume" squeeze the title into
  // mid-word breaks; stack pill, title and resume instead (#753).
  const { isAccessibilitySize } = useTypeScale();
  return (
    <Pressable
      onPress={row.onResume}
      accessible
      accessibilityRole="button"
      accessibilityLabel={t("focusMode:parked.rowA11y", { title: row.title })}
      style={[styles.row, isAccessibilitySize && styles.rowStacked]}
      testID={`focus-parked-row-${row.id}`}
    >
      <View style={styles.pill}>
        <Text variant="caption" chrome style={styles.pillText}>
          {t("common:stepCard.status.paused")}
        </Text>
      </View>
      <Text
        variant="metadata"
        style={[styles.rowTitle, isAccessibilitySize && styles.rowTitleStacked]}
      >
        {row.title}
      </Text>
      <Text variant="caption" style={styles.resume}>
        {t("focusMode:parked.resumeCta")}
      </Text>
    </Pressable>
  );
}
