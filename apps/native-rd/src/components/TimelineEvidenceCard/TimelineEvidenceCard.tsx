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
  // The Pressable wrapping the icon + label collapses both into a single a11y
  // node on iOS (accessibilityLabel becomes the element's name), so Maestro
  // can't find the inner label text directly. Drop the grouping in E2E mode;
  // production keeps `accessible+role=button+label` so screen readers
  // announce each card as one button with full context.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const cardA11y = isE2E
    ? ({ accessible: false } as const)
    : ({
        accessible: true,
        accessibilityRole: "button" as const,
        accessibilityLabel: `${EVIDENCE_TYPE_LABELS[evidence.type] ?? evidence.type} evidence: ${evidence.label}`,
        accessibilityHint: "Tap to view evidence",
      } as const);

  return (
    <Pressable
      style={styles.card(isGoal)}
      onPress={() => onPress(evidence.id)}
      {...cardA11y}
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
