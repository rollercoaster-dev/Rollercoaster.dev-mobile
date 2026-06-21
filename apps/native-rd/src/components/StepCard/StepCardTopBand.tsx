import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "../StatusBadge";
import { statusToVariant, type StepCardStatus } from "./StepCard.shared";
import { styles } from "./StepCard.styles";

export interface StepCardTopBandProps {
  status: StepCardStatus;
  stepIndex: number;
  totalSteps: number;
  /**
   * Child step (#360 full prototype): renders the purple parent/part band
   * ("↳ [parent] · part N of M") instead of the plain "N of M" band. Requires
   * `partIndex` + `partTotal`; absent for flat steps and promoted orphans.
   */
  parentTitle?: string | null;
  partIndex?: number | null;
  partTotal?: number | null;
  /** Overview card: appends the "· Overview" suffix to the plain band. */
  isOverview?: boolean;
}

/**
 * Pinned, bordered header strip shared by every step card (#360). Carries the
 * card's context (parent/part for children, step number for flat/overview) plus
 * the status badge, sitting above the scrollable body so it stays put as the
 * body scrolls. Replaces the former in-body meta row + quiet "↳ in [parent]"
 * line.
 */
export function StepCardTopBand({
  status,
  stepIndex,
  totalSteps,
  parentTitle,
  partIndex,
  partTotal,
  isOverview,
}: StepCardTopBandProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  const badge = (
    <StatusBadge
      variant={statusToVariant[status]}
      label={t(`common:stepCard.status.${status}`)}
    />
  );

  const isChild = parentTitle != null && partIndex != null && partTotal != null;
  if (isChild) {
    return (
      <View
        style={[styles.topBand, styles.topBandChild]}
        testID="step-card-parent-band"
      >
        <Text
          style={styles.topBandChildText}
          numberOfLines={1}
          accessibilityRole="text"
        >
          {t("focusMode:band.childContext", {
            parent: parentTitle,
            index: partIndex,
            total: partTotal,
          })}
        </Text>
        {badge}
      </View>
    );
  }

  const progress = t("common:stepCard.progress", {
    current: stepIndex + 1,
    total: totalSteps,
  });
  return (
    <View style={styles.topBand} testID="step-card-top-band">
      <Text
        style={styles.topBandText}
        numberOfLines={1}
        accessibilityRole="text"
      >
        {isOverview
          ? `${progress} · ${t("focusMode:overview.metaLabel")}`
          : progress}
      </Text>
      {badge}
    </View>
  );
}
