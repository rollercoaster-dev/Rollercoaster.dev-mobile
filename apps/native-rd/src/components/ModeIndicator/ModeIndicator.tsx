import React from "react";
import { View, Image } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../Text";
import { styles } from "./ModeIndicator.styles";

export type LifecycleMode = "edit" | "focus" | "complete" | "timeline";

// `Record<LifecycleMode, ...>` forces this object to stay exhaustive: adding
// a new union member becomes a TS error here, not a runtime drift between the
// union and the parity test. Treat this as the single source of truth — derive
// `LIFECYCLE_MODES` from its keys instead of hand-listing them elsewhere.
const MODE_CONFIG: Record<LifecycleMode, { emoji: string }> = {
  edit: { emoji: "📝" },
  focus: { emoji: "🎯" },
  complete: { emoji: "🎉" },
  timeline: { emoji: "📖" },
};

export const LIFECYCLE_MODES = Object.keys(MODE_CONFIG) as LifecycleMode[];

export interface ModeIndicatorProps {
  mode: LifecycleMode;
  icon?: ImageSourcePropType;
}

export function ModeIndicator({ mode, icon }: ModeIndicatorProps) {
  const { t } = useTranslation("common");
  const config = MODE_CONFIG[mode];
  const label = t(`modeIndicator.${mode}` as const);

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
      accessibilityLabel={t("modeIndicator.a11y.current", { label })}
    >
      {icon ? (
        <Image source={icon} style={styles.iconImage} resizeMode="contain" />
      ) : (
        <Text style={styles.icon} accessibilityElementsHidden>
          {config.emoji}
        </Text>
      )}
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}
