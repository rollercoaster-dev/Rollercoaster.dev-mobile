import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { styles, type StatusBadgeVariant } from "./StatusBadge.styles";

export type { StatusBadgeVariant };

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label?: string;
}

const variantBgMap = {
  active: styles.variantActive,
  completed: styles.variantCompleted,
  locked: styles.variantLocked,
  earned: styles.variantEarned,
} as const;

const variantTextMap = {
  active: styles.textActive,
  completed: styles.textCompleted,
  locked: styles.textLocked,
  earned: styles.textEarned,
} as const;

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const { t } = useTranslation(["common"]);
  const displayLabel = label ?? t(`status.${variant}`);

  return (
    <View
      style={[styles.badge, variantBgMap[variant]]}
      accessible
      accessibilityLabel={t("common:status.a11yPrefix", {
        label: displayLabel,
      })}
      accessibilityRole="text"
    >
      <Text style={[styles.text, variantTextMap[variant]]}>{displayLabel}</Text>
    </View>
  );
}
