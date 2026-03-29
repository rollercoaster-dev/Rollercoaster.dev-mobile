import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { TimelineNode } from "../TimelineNode";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import type { StepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { EVIDENCE_TYPE_ICONS } from "../../constants/evidenceIcons";
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
  defaultExpanded?: boolean;
}

const statusToVariant: Record<StepStatus, StatusBadgeVariant> = {
  completed: "completed",
  "in-progress": "active",
  pending: "locked",
};

const statusToLabel: Record<StepStatus, string> = {
  completed: "Done",
  "in-progress": "Active",
  pending: "Pending",
};

export function TimelineStep({
  step,
  stepIndex,
  evidence,
  onNodePress,
  defaultExpanded = false,
}: TimelineStepProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.container} accessibilityRole="none">
      <View style={styles.nodeColumn}>
        <TimelineNode
          status={step.status}
          stepNumber={stepIndex + 1}
          onPress={() => onNodePress(stepIndex)}
          accessibilityLabel={`Go to step ${stepIndex + 1}: ${step.title}`}
        />
      </View>
      <View style={styles.contentCard}>
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${step.title}, ${statusToLabel[step.status]}`}
          accessibilityState={{ expanded }}
          style={styles.header}
        >
          <StatusBadge
            variant={statusToVariant[step.status]}
            label={statusToLabel[step.status]}
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
              <Text style={styles.noEvidence}>No evidence yet</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
