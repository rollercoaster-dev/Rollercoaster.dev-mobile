import React, { memo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Checkbox } from "../Checkbox";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import {
  EVIDENCE_CAPTURE_OPTIONS,
  EVIDENCE_OPTIONS,
  type EvidenceCaptureOption,
  type EvidenceTypeValue,
  type QuickEvidenceType,
} from "../../types/evidence";
import {
  evidenceLabel as evidenceTypeLabel,
  evidenceShortLabel,
} from "../../i18n/labels";
import {
  type StepCardStatus,
  type StepCardKind,
  type StepCardPart,
} from "./StepCard.shared";
import { StepCardTopBand } from "./StepCardTopBand";
import { StepOverviewCard } from "./StepOverviewCard";
import { styles } from "./StepCard.styles";

export type { StepCardStatus, StepCardKind, StepCardPart };

export interface StepCardStep {
  id: string;
  title: string;
  status: StepCardStatus;
  evidenceCount: number;
  plannedEvidenceTypes?: string[] | null;
  capturedEvidenceTypes?: string[];
  /**
   * Title of the parent step when this card is a sub-step (#292). With
   * `partIndex`/`partTotal` it drives the purple "↳ [parent] · part N of M"
   * top band (#360). Null/absent for top-level steps and promoted orphans.
   */
  parentTitle?: string | null;
  /** 1-based position of this sub-step within its parent's parts (#360). */
  partIndex?: number | null;
  /** Total number of parts under this sub-step's parent (#360). */
  partTotal?: number | null;
}

export interface StepCardProps {
  step: StepCardStep;
  stepIndex: number;
  totalSteps: number;
  onToggleComplete: (stepId: string) => void;
  onEvidenceTap: () => void;
  onQuickEvidence?: (stepId: string, type: QuickEvidenceType) => void;
  /**
   * Card archetype (#360). `leaf` (default) is the actionable step card;
   * `overview` renders a parent's parts as a timeline spine with an evidence
   * rollup and the manual complete-parent invite.
   */
  kind?: StepCardKind;
  /** Child parts for an overview card. Ignored for leaf cards. */
  parts?: readonly StepCardPart[];
  /**
   * Overview only: open a part's own card from its spine row (#360). Ignored by
   * leaf cards.
   */
  onOpenPart?: (partId: string) => void;
}

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

function StepCardLeaf({
  step,
  stepIndex,
  totalSteps,
  onToggleComplete,
  onEvidenceTap,
  onQuickEvidence,
}: StepCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
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
    <View style={styles.cardOuter}>
      <StepCardTopBand
        status={step.status}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        parentTitle={step.parentTitle}
        partIndex={step.partIndex}
        partTotal={step.partTotal}
      />
      <ScrollView
        style={styles.cardBody}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.cardBodyContent}
      >
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

        {/* Evidence rail — always-visible add affordance plus a read-only
            summary of the pieces already captured. We never surface what is
            "missing": adding evidence simply reveals the completion checkbox. */}
        <View style={styles.evidenceRail}>
          <Text style={styles.evidenceRailLabel} accessibilityRole="text">
            {t("focusMode:evidenceRail.zoneLabel")}
          </Text>
          <View style={styles.evidenceRailRow}>
            {capturedTypes.map((type) => {
              const option = EVIDENCE_OPTIONS.find((o) => o.type === type);
              const label = evidenceShortLabel(t, type as EvidenceTypeValue);
              return (
                <View
                  key={`captured-${type}`}
                  style={styles.evidenceChip}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={t("focusMode:evidenceRail.capturedChip", {
                    type: label,
                  })}
                  testID={`step-card-evidence-chip-${type}`}
                >
                  {option && (
                    <Text
                      style={styles.evidenceChipIcon}
                      accessibilityElementsHidden
                    >
                      {option.icon}
                    </Text>
                  )}
                  <Text style={styles.evidenceChipText}>{label}</Text>
                </View>
              );
            })}
            <Pressable
              onPress={onEvidenceTap}
              style={styles.evidenceAddButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t("focusMode:evidenceRail.addButton")}
              testID="step-card-add-evidence"
            >
              <Text style={styles.evidenceAddText}>
                {t("focusMode:evidenceRail.addButton")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Pinned foot — the completion action stays visible regardless of how far
          the body scrolls, keeping the card envelope stable. */}
      <View style={styles.cardFoot}>
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
      </View>
    </View>
  );
}

/**
 * Dispatcher: a parent renders the overview archetype, everything else the
 * actionable leaf. Kept hook-free so each archetype owns its own hook order.
 */
function StepCardComponent(props: StepCardProps) {
  if (props.kind === "overview") {
    return (
      <StepOverviewCard
        stepId={props.step.id}
        title={props.step.title}
        status={props.step.status}
        stepIndex={props.stepIndex}
        totalSteps={props.totalSteps}
        parts={props.parts ?? []}
        onToggleComplete={props.onToggleComplete}
        onOpenPart={props.onOpenPart}
      />
    );
  }
  return <StepCardLeaf {...props} />;
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

function equalParts(
  previous: readonly StepCardPart[] | undefined,
  next: readonly StepCardPart[] | undefined,
): boolean {
  const previousParts = previous ?? [];
  const nextParts = next ?? [];
  return (
    previousParts.length === nextParts.length &&
    previousParts.every((part, index) => {
      const other = nextParts[index];
      return (
        part.id === other.id &&
        part.title === other.title &&
        part.status === other.status &&
        part.evidenceCount === other.evidenceCount
      );
    })
  );
}

function areStepCardPropsEqual(
  previous: StepCardProps,
  next: StepCardProps,
): boolean {
  return (
    previous.kind === next.kind &&
    previous.step.id === next.step.id &&
    previous.step.title === next.step.title &&
    previous.step.status === next.step.status &&
    previous.step.parentTitle === next.step.parentTitle &&
    previous.step.partIndex === next.step.partIndex &&
    previous.step.partTotal === next.step.partTotal &&
    previous.step.evidenceCount === next.step.evidenceCount &&
    equalStringArrays(
      previous.step.plannedEvidenceTypes,
      next.step.plannedEvidenceTypes,
    ) &&
    equalStringArrays(
      previous.step.capturedEvidenceTypes,
      next.step.capturedEvidenceTypes,
    ) &&
    equalParts(previous.parts, next.parts) &&
    previous.stepIndex === next.stepIndex &&
    previous.totalSteps === next.totalSteps &&
    previous.onToggleComplete === next.onToggleComplete &&
    previous.onEvidenceTap === next.onEvidenceTap &&
    previous.onQuickEvidence === next.onQuickEvidence &&
    previous.onOpenPart === next.onOpenPart
  );
}

export const StepCard = memo(StepCardComponent, areStepCardPropsEqual);
