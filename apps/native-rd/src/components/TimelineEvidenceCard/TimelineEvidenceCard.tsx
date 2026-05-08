import React from "react";
import { Pressable, Text } from "react-native";
import type { EvidenceItemData } from "../EvidenceDrawer";
import {
  EVIDENCE_TYPE_ICONS,
  EVIDENCE_TYPE_LABELS,
} from "../../constants/evidenceIcons";
import { styles } from "./TimelineEvidenceCard.styles";

export interface TimelineEvidenceCardProps {
  evidence: EvidenceItemData;
  isGoal?: boolean;
  onPress: (evidenceId: string) => void;
}

export function TimelineEvidenceCard({
  evidence,
  isGoal = false,
  onPress,
}: TimelineEvidenceCardProps) {
  return (
    <Pressable
      style={styles.card(isGoal)}
      onPress={() => onPress(evidence.id)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${EVIDENCE_TYPE_LABELS[evidence.type] ?? evidence.type} evidence: ${evidence.label}`}
      accessibilityHint="Tap to view evidence"
    >
      <Text style={styles.icon}>
        {EVIDENCE_TYPE_ICONS[evidence.type] ?? "\u{1F4C4}"}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {evidence.label}
      </Text>
    </Pressable>
  );
}
