import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { TimelineNode } from "../TimelineNode";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { StepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { toLetterOrdinal } from "../../utils/format";
import { styles } from "./TimelineStep.styles";

export interface TimelineStepData {
  id: string;
  title: string;
  status: StepStatus;
  evidenceCount: number;
}

/**
 * A sub-step rendered on the parent's indented sub-spine (#293). Carries its own
 * status (so the current leaf shows `in-progress`) and its own evidence list.
 */
export interface TimelineStepChild {
  id: string;
  title: string;
  status: StepStatus;
  evidence: EvidenceItemData[];
}

export interface TimelineStepProps {
  step: TimelineStepData;
  stepIndex: number;
  evidence: EvidenceItemData[];
  onNodePress: (stepIndex: number) => void;
  onEvidencePress: (evidenceId: string) => void;
  defaultExpanded?: boolean;
  /** Sub-steps shown as an indented sub-spine under this step. Empty = flat step. */
  subSteps?: TimelineStepChild[];
}

const statusToVariant: Record<StepStatus, StatusBadgeVariant> = {
  completed: "completed",
  "in-progress": "active",
  // Placeholder until a dedicated "set aside" badge variant lands (#378). A
  // paused step is not-yet-actionable, so it reads like pending → "locked".
  paused: "locked",
  pending: "locked",
};

const statusToLabelKey: Record<StepStatus, "done" | "active" | "pending"> = {
  completed: "done",
  "in-progress": "active",
  // Placeholder label until a dedicated "set aside" status word lands (#378).
  paused: "pending",
  pending: "pending",
};

export function TimelineStep({
  step,
  stepIndex,
  evidence,
  onNodePress,
  onEvidencePress,
  defaultExpanded = false,
  subSteps = [],
}: TimelineStepProps) {
  const { t } = useTranslation(["timelineJourney"]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const statusLabel = t(
    `timelineJourney:step.status.${statusToLabelKey[step.status]}`,
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.container} accessibilityRole="none">
        <View style={styles.nodeColumn}>
          <TimelineNode
            status={step.status}
            stepNumber={stepIndex + 1}
            onPress={() => onNodePress(stepIndex)}
            accessibilityLabel={t("timelineJourney:step.a11yGoTo", {
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
                <Text style={styles.noEvidence}>
                  {t("timelineJourney:step.noEvidence")}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
      {subSteps.length > 0 && (
        <View style={styles.childSpine}>
          {subSteps.map((child, index) => (
            <ChildRow
              key={child.id}
              child={child}
              ordinal={toLetterOrdinal(index)}
              parentIndex={stepIndex}
              onNodePress={onNodePress}
              onEvidencePress={onEvidencePress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * One sub-step row on the indented sub-spine: a small lettered node (current
 * leaf highlights via `in-progress`) plus a slim card with its own collapsible
 * evidence drawer. Local component so each child owns its expand state without
 * hooks-in-loop (#293).
 */
function ChildRow({
  child,
  ordinal,
  parentIndex,
  onNodePress,
  onEvidencePress,
}: {
  child: TimelineStepChild;
  ordinal: string;
  parentIndex: number;
  onNodePress: (stepIndex: number) => void;
  onEvidencePress: (evidenceId: string) => void;
}) {
  const { t } = useTranslation(["timelineJourney"]);
  const [expanded, setExpanded] = useState(false);
  const statusLabel = t(
    `timelineJourney:step.status.${statusToLabelKey[child.status]}`,
  );

  return (
    <View style={styles.childRow}>
      <TimelineNode
        status={child.status}
        size="sm"
        label={ordinal}
        onPress={() => onNodePress(parentIndex)}
        accessibilityLabel={t("timelineJourney:step.a11yGoTo", {
          number: ordinal,
          title: child.title,
        })}
      />
      <View style={styles.childContentCard}>
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("timelineJourney:step.a11yChildExpand", {
            ordinal,
            title: child.title,
          })}
          accessibilityState={{ expanded }}
          style={styles.childHeader}
        >
          <StatusBadge
            variant={statusToVariant[child.status]}
            label={statusLabel}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.childTitle} numberOfLines={2}>
              {child.title}
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
            {child.evidence.length > 0 ? (
              child.evidence.map((ev) => (
                <TimelineEvidenceCard
                  key={ev.id}
                  evidence={ev}
                  onPress={onEvidencePress}
                />
              ))
            ) : (
              <Text style={styles.noEvidence}>
                {t("timelineJourney:step.noEvidence")}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
