import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { TimelineNode } from "../TimelineNode";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { StepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { styles } from "./TimelineStep.styles";

export interface TimelineStepData {
  id: string;
  title: string;
  status: StepStatus;
  evidenceCount: number;
}

export interface TimelineStepProps {
  step: TimelineStepData;
  stepIndex: number;
  evidence: EvidenceItemData[];
  onNodePress: (stepIndex: number) => void;
  onEvidencePress: (evidenceId: string) => void;
  defaultExpanded?: boolean;
}

const statusToVariant: Record<StepStatus, StatusBadgeVariant> = {
  completed: "completed",
  "in-progress": "active",
  pending: "locked",
};

const statusToLabelKey: Record<StepStatus, "done" | "active" | "pending"> = {
  completed: "done",
  "in-progress": "active",
  pending: "pending",
};

export function TimelineStep({
  step,
  stepIndex,
  evidence,
  onNodePress,
  onEvidencePress,
  defaultExpanded = false,
}: TimelineStepProps) {
  const { t } = useTranslation("timelineJourney");
  const [expanded, setExpanded] = useState(defaultExpanded);
  const statusLabel = t(`step.status.${statusToLabelKey[step.status]}`);

  return (
    <View style={styles.container} accessibilityRole="none">
      <View style={styles.nodeColumn}>
        <TimelineNode
          status={step.status}
          stepNumber={stepIndex + 1}
          onPress={() => onNodePress(stepIndex)}
          accessibilityLabel={t("step.a11yGoTo", {
            number: stepIndex + 1,
            title: step.title,
          })}
        />
      </View>
      <View style={styles.contentCard}>
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${step.title}, ${statusLabel}`}
          accessibilityState={{ expanded }}
          style={styles.header}
        >
          <StatusBadge
            variant={statusToVariant[step.status]}
            label={statusLabel}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {step.title}
            </Text>
          </View>
          <Text
            style={[styles.chevron, expanded && styles.chevronExpanded]}
            accessibilityElementsHidden
          >
            {"\u25BC"}
          </Text>
        </Pressable>
        {expanded && (
          <View style={styles.evidenceSection}>
            {evidence.length > 0 ? (
              evidence.map((ev) => (
                <TimelineEvidenceCard
                  key={ev.id}
                  evidence={ev}
                  onPress={onEvidencePress}
                />
              ))
            ) : (
              <Text style={styles.noEvidence}>{t("step.noEvidence")}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
