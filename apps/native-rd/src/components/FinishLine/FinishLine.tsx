import React from "react";
import { View, Text } from "react-native";
import { TimelineNode } from "../TimelineNode";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { styles } from "./FinishLine.styles";

export interface FinishLineProps {
  goalEvidence: EvidenceItemData[];
  onEvidencePress: (evidenceId: string) => void;
}

export function FinishLine({ goalEvidence, onEvidencePress }: FinishLineProps) {
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
            <TimelineEvidenceCard
              key={ev.id}
              evidence={ev}
              isGoal
              onPress={onEvidencePress}
            />
          ))
        ) : (
          <Text style={styles.noEvidence}>No goal evidence yet</Text>
        )}
      </View>
    </View>
  );
}
