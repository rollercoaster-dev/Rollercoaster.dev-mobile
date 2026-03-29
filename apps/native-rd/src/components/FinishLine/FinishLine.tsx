import React from "react";
import { View, Text } from "react-native";
import { TimelineNode } from "../TimelineNode";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { EVIDENCE_TYPE_ICONS } from "../../constants/evidenceIcons";
import { styles } from "./FinishLine.styles";

export interface FinishLineProps {
  goalEvidence: EvidenceItemData[];
}

export function FinishLine({ goalEvidence }: FinishLineProps) {
  return (
    <View style={styles.container}>
      <View style={styles.nodeColumn}>
        <TimelineNode
          status="completed"
          isGoalNode
          accessibilityLabel="Goal finish line"
        />
      </View>
      <View style={styles.contentCard}>
        <Text style={styles.heading} accessible accessibilityRole="header">
          Goal Evidence
        </Text>
        {goalEvidence.length > 0 ? (
          goalEvidence.map((ev) => (
            <View
              key={ev.id}
              style={styles.evidenceCard}
              accessible
              accessibilityLabel={`${ev.type} evidence: ${ev.label}`}
            >
              <Text style={styles.evidenceIcon}>
                {EVIDENCE_TYPE_ICONS[ev.type] ?? "\u{1F4C4}"}
              </Text>
              <Text style={styles.evidenceLabel} numberOfLines={1}>
                {ev.label}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noEvidence}>No goal evidence yet</Text>
        )}
      </View>
    </View>
  );
}
