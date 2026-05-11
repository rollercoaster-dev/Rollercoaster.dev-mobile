import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../Text";
import {
  EVIDENCE_TYPE_ICONS,
  EVIDENCE_TYPE_LABELS,
} from "../../constants/evidenceIcons";
import type { ViewerEvidence } from "../../hooks/useAllEvidenceForGoal";
import { styles } from "./ViewerStripThumb.styles";

export interface ViewerStripThumbProps {
  evidence: ViewerEvidence;
  isActive: boolean;
  onPress: () => void;
}

export function ViewerStripThumb({
  evidence,
  isActive,
  onPress,
}: ViewerStripThumbProps) {
  const icon = EVIDENCE_TYPE_ICONS[evidence.type];
  const sourceLabel =
    evidence.source === "goal"
      ? "Goal Evidence"
      : (evidence.stepTitle ?? "Step");

  // The Pressable wrapping the icon + title collapses children into a single
  // a11y node on iOS (composed accessibilityLabel becomes the element's
  // name), so Maestro can't match the inner title literally. Drop the
  // grouping in E2E mode; production keeps `accessible+role+label` so
  // screen readers announce each thumb as one button with full context.
  // `accessibilityState` stays outside the gate so the screen-reader
  // selection cue is preserved in both modes.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const thumbA11y = isE2E
    ? ({
        accessible: false,
        accessibilityState: { selected: isActive },
      } as const)
    : ({
        accessible: true,
        accessibilityRole: "button" as const,
        accessibilityLabel: `${EVIDENCE_TYPE_LABELS[evidence.type] ?? evidence.type} evidence: ${evidence.title}, from ${sourceLabel}`,
        accessibilityState: { selected: isActive },
      } as const);

  return (
    <Pressable
      onPress={onPress}
      {...thumbA11y}
      style={({ pressed }) => [
        styles.container(isActive),
        pressed && styles.pressed,
      ]}
    >
      <View
        style={styles.sourceDot(evidence.source)}
        accessibilityElementsHidden
      />
      <Text style={styles.icon} accessibilityElementsHidden>
        {icon}
      </Text>
      <View style={styles.labelWrap}>
        <Text style={styles.label} numberOfLines={2}>
          {evidence.title}
        </Text>
      </View>
    </Pressable>
  );
}
