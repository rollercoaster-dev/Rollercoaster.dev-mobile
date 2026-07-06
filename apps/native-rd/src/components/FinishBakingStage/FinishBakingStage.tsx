import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { type BadgeDesign } from "../../badges/types";
import { Text } from "../Text";
import { styles } from "./FinishBakingStage.styles";

const DEFAULT_BADGE_SIZE = 146;

export interface FinishBakingStageProps {
  /** Badge design to preview (dimmed) while the badge is baking. */
  badgeDesign: BadgeDesign;
  /** Mono status label ("Baking your badge…"). */
  label?: string;
  /** Preview size in logical pixels. */
  badgeSize?: number;
}

/**
 * Baking interstitial of the finishing flow. Shows the just-designed badge at
 * reduced opacity with a native spinner and a "Baking your badge…" label.
 * The spinner is RN's platform `ActivityIndicator` (D9) rather than a custom
 * JS rotate loop, so there is no animation-preference concern. Presentational
 * only — the label is a static prop; real bake-status wiring is the integration
 * issue's job (#449). See dev plan for issue #470.
 */
export function FinishBakingStage({
  badgeDesign,
  label = "Baking your badge…",
  badgeSize = DEFAULT_BADGE_SIZE,
}: FinishBakingStageProps) {
  const { theme } = useUnistyles();

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      testID="finish-baking-stage"
    >
      <View style={styles.badgeDim}>
        <BadgeRenderer
          design={badgeDesign}
          size={badgeSize}
          testID="finish-baking-badge"
        />
      </View>
      <ActivityIndicator size="small" color={theme.colors.text} />
      <Text variant="mono" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}
