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

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${EVIDENCE_TYPE_LABELS[evidence.type] ?? evidence.type} evidence: ${evidence.title}, from ${sourceLabel}`}
      accessibilityState={{ selected: isActive }}
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
