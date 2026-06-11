import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { TimelineNode } from "../TimelineNode";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { styles } from "./FinishLine.styles";

export interface FinishLineProps {
  goalEvidence: EvidenceItemData[];
  onEvidencePress: (evidenceId: string) => void;
}

export function FinishLine({ goalEvidence, onEvidencePress }: FinishLineProps) {
  const { t } = useTranslation(["timelineJourney"]);
  return (
    <View style={styles.container}>
      <View style={styles.nodeColumn}>
        <TimelineNode
          status="completed"
          isGoalNode
          accessibilityLabel={t("timelineJourney:finishLine.a11yNode")}
        />
      </View>
      <View style={styles.contentCard}>
        <Text style={styles.heading} accessible accessibilityRole="header">
          {t("timelineJourney:finishLine.title")}
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
          <Text style={styles.noEvidence}>
            {t("timelineJourney:finishLine.noEvidence")}
          </Text>
        )}
      </View>
    </View>
  );
}
