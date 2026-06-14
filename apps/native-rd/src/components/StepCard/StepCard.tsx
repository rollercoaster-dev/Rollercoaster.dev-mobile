import React, { memo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Card } from "../Card";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import { Checkbox } from "../Checkbox";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import {
  EVIDENCE_CAPTURE_OPTIONS,
  EVIDENCE_OPTIONS,
  type EvidenceCaptureOption,
  type QuickEvidenceType,
} from "../../types/evidence";
import {
  evidenceLabel as evidenceTypeLabel,
  evidenceShortLabel,
} from "../../i18n/labels";
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
  onToggleComplete: (stepId: string) => void;
  onEvidenceTap: () => void;
  onQuickEvidence?: (stepId: string, type: QuickEvidenceType) => void;
}

const statusToVariant: Record<StepCardStatus, StatusBadgeVariant> = {
  completed: "completed",
  "in-progress": "active",
  pending: "locked",
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

function StepCardComponent({
  step,
  stepIndex,
  totalSteps,
  onToggleComplete,
  onEvidenceTap,
  onQuickEvidence,
}: StepCardProps) {
  const { t } = useTranslation(["common"]);
  const isCompleted = step.status === "completed";
  const evidenceLabel = formatEvidenceLabel(t, step.evidenceCount);
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

  const checkboxLabel = isCompleted
    ? t("common:stepCard.checkbox.completed")
    : t("common:stepCard.checkbox.markComplete");

  return (
    <Card>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        <View style={styles.metaRow}>
          <Text style={styles.stepNumber}>
            {t("common:stepCard.progress", {
              current: stepIndex + 1,
              total: totalSteps,
            })}
          </Text>
          <StatusBadge
            variant={statusToVariant[step.status]}
            label={t(`common:stepCard.status.${step.status}`)}
          />
        </View>
        <Text
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {step.title}
        </Text>

        {onQuickEvidence && quickEvidenceOptions.length > 0 && (
          <View style={styles.quickActionsRow}>
            {quickEvidenceOptions.map((option) => {
              const optionLabel = evidenceShortLabel(t, option.type);
              return (
                <Pressable
                  key={option.type}
                  onPress={() => onQuickEvidence(step.id, option.type)}
                  style={styles.quickActionButton}
                  testID={`step-card-quick-evidence-${option.type}`}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={t("common:stepCard.quickAction.a11y", {
                    label: optionLabel,
                  })}
                >
                  <Text
                    style={styles.quickActionIcon}
                    accessibilityElementsHidden
                  >
                    {option.icon}
                  </Text>
                  <Text style={styles.quickActionText}>{optionLabel}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {isBlocked ? (
          <Text
            style={styles.addEvidencePromptText}
            accessibilityRole="text"
            accessibilityLabel={
              blockerOption
                ? t("common:stepCard.blocker.a11yWithType", {
                    label: evidenceTypeLabel(t, blockerOption.type),
                  })
                : t("common:stepCard.blocker.label")
            }
          >
            {t("common:stepCard.blocker.label")}
          </Text>
        ) : (
          <View style={styles.checkboxRow}>
            <Checkbox
              checked={isCompleted}
              onToggle={() => onToggleComplete(step.id)}
              label={checkboxLabel}
            />
          </View>
        )}

        {step.evidenceCount > 0 && (
          <View style={styles.evidenceBadgeWrapper}>
            <Pressable
              onPress={onEvidenceTap}
              style={styles.evidenceBadge}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t("common:stepCard.evidenceBadge.a11y", {
                count: step.evidenceCount,
              })}
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
        )}
      </ScrollView>
    </Card>
  );
}

function equalStringArrays(
  previous: readonly string[] | null | undefined,
  next: readonly string[] | null | undefined,
): boolean {
  const previousValues = previous ?? [];
  const nextValues = next ?? [];
  return (
    previousValues.length === nextValues.length &&
    previousValues.every((value, index) => value === nextValues[index])
  );
}

function areStepCardPropsEqual(
  previous: StepCardProps,
  next: StepCardProps,
): boolean {
  return (
    previous.step.id === next.step.id &&
    previous.step.title === next.step.title &&
    previous.step.status === next.step.status &&
    previous.step.evidenceCount === next.step.evidenceCount &&
    equalStringArrays(
      previous.step.plannedEvidenceTypes,
      next.step.plannedEvidenceTypes,
    ) &&
    equalStringArrays(
      previous.step.capturedEvidenceTypes,
      next.step.capturedEvidenceTypes,
    ) &&
    previous.stepIndex === next.stepIndex &&
    previous.totalSteps === next.totalSteps &&
    previous.onToggleComplete === next.onToggleComplete &&
    previous.onEvidenceTap === next.onEvidenceTap &&
    previous.onQuickEvidence === next.onQuickEvidence
  );
}

export const StepCard = memo(StepCardComponent, areStepCardPropsEqual);
