import React from "react";
import { View, Text } from "react-native";
import { styles, type StatusBadgeVariant } from "./StatusBadge.styles";

export type { StatusBadgeVariant };

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label?: string;
}

const defaultLabels: Record<StatusBadgeVariant, string> = {
  active: "Active",
  completed: "Done",
  locked: "Locked",
  earned: "Earned",
};

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
  const displayLabel = label ?? defaultLabels[variant];

  return (
    <View
      style={[styles.badge, variantBgMap[variant]]}
      accessible
      accessibilityLabel={`Status: ${displayLabel}`}
      accessibilityRole="text"
    >
      <Text style={[styles.text, variantTextMap[variant]]}>{displayLabel}</Text>
    </View>
  );
}
