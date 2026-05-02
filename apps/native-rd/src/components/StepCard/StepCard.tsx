import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { Card } from "../Card";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import { Checkbox } from "../Checkbox";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import {
  EVIDENCE_CAPTURE_OPTIONS,
  EVIDENCE_OPTIONS,
  validateEvidenceType,
  type EvidenceCaptureOption,
  type QuickEvidenceType,
} from "../../types/evidence";
import { styles } from "./StepCard.styles";

export type StepCardStatus = "completed" | "in-progress" | "pending";

export interface StepCardStep {
  id: string;
  title: string;
  status: StepCardStatus;
  evidenceCount: number;
  plannedEvidenceTypes?: string[] | null;
  capturedEvidenceTypes?: string[];
}

export interface StepCardProps {
  step: StepCardStep;
  stepIndex: number;
  totalSteps: number;
  onToggleComplete: () => void;
  onEvidenceTap: () => void;
  onQuickEvidence?: (type: QuickEvidenceType) => void;
}

const statusToVariant: Record<StepCardStatus, StatusBadgeVariant> = {
  completed: "completed",
  "in-progress": "active",
  pending: "locked",
};

const statusToLabel: Record<StepCardStatus, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  pending: "Pending",
};

function getMissingEvidenceOption(
  plannedTypes: string[],
  capturedTypes: string[],
) {
  const missing = plannedTypes.find((t) => !capturedTypes.includes(t));
  if (!missing) return null;
  return EVIDENCE_OPTIONS.find((o) => o.type === missing) ?? null;
}

type QuickEvidenceCaptureOption = EvidenceCaptureOption & {
  readonly type: QuickEvidenceType;
};

function getMissingQuickEvidenceOptions(
  plannedTypes: string[],
  capturedTypes: string[],
): readonly QuickEvidenceCaptureOption[] {
  return EVIDENCE_CAPTURE_OPTIONS.filter(
    (option): option is QuickEvidenceCaptureOption =>
      plannedTypes.includes(option.type) &&
      !capturedTypes.includes(option.type),
  );
}

export function StepCard({
  step,
  stepIndex,
  totalSteps,
  onToggleComplete,
  onEvidenceTap,
  onQuickEvidence,
}: StepCardProps) {
  const isCompleted = step.status === "completed";
  const evidenceLabel = formatEvidenceLabel(step.evidenceCount);
  const flashStyle = useFlashOnIncrease(step.evidenceCount);

  const plannedTypes = step.plannedEvidenceTypes ?? null;
  const capturedTypes = step.capturedEvidenceTypes ?? [];
  const hasPlannedTypes = plannedTypes !== null && plannedTypes.length > 0;
  // Block until EVERY planned evidence type has been captured. Using `some`
  // here would unblock the step after a single capture, which lets users
  // mark a multi-evidence step complete without supplying all the planned
  // pieces and breaks the evidence-gated completion contract.
  const isBlocked =
    !isCompleted && hasPlannedTypes
      ? plannedTypes.some((t) => !capturedTypes.includes(t))
      : false;

  const blockerOption = isBlocked
    ? getMissingEvidenceOption(plannedTypes!, capturedTypes)
    : null;

  const quickEvidenceOptions =
    !isCompleted && hasPlannedTypes && onQuickEvidence
      ? getMissingQuickEvidenceOptions(plannedTypes, capturedTypes)
      : [];

  const checkboxLabel = isCompleted ? "Completed" : "Mark complete";

  return (
    <Card>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        <Text style={styles.stepNumber}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
        <Text
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {step.title}
        </Text>
        <View style={styles.statusRow}>
          <StatusBadge
            variant={statusToVariant[step.status]}
            label={statusToLabel[step.status]}
          />
          <View style={styles.evidenceBadgeWrapper}>
            <Pressable
              onPress={onEvidenceTap}
              style={styles.evidenceBadge}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${step.evidenceCount} evidence items, tap to view`}
            >
              <Text style={styles.evidenceText}>{evidenceLabel}</Text>
            </Pressable>
            <Animated.View
              style={[styles.evidenceFlash, flashStyle]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </View>

        {hasPlannedTypes && (
          <View style={styles.plannedTypesRow}>
            <EvidenceTypePicker
              compact
              selectedTypes={plannedTypes.map(validateEvidenceType)}
            />
          </View>
        )}

        {isBlocked ? (
          <Text
            style={styles.addEvidencePromptText}
            accessibilityRole="text"
            accessibilityLabel={
              blockerOption
                ? `Add ${blockerOption.label} to complete this step`
                : "Add evidence to complete"
            }
          >
            Add evidence to complete
          </Text>
        ) : (
          <View style={styles.checkboxRow}>
            <Checkbox
              checked={isCompleted}
              onToggle={onToggleComplete}
              label={checkboxLabel}
            />
          </View>
        )}

        {onQuickEvidence && quickEvidenceOptions.length > 0 && (
          <View style={styles.quickActionsRow}>
            {quickEvidenceOptions.map((option) => (
              <Pressable
                key={option.type}
                onPress={() => onQuickEvidence(option.type)}
                style={styles.quickActionButton}
                testID={`step-card-quick-evidence-${option.type}`}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Add ${option.label} evidence`}
              >
                <Text
                  style={styles.quickActionIcon}
                  accessibilityElementsHidden
                >
                  {option.icon}
                </Text>
                <Text style={styles.quickActionText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Card>
  );
}
