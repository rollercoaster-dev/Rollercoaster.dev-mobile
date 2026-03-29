import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Animated from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";
import { Card } from "../Card";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import { Checkbox } from "../Checkbox";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import {
  EVIDENCE_OPTIONS,
  validateEvidenceType,
  type EvidenceTypeValue,
} from "../../types/evidence";
import { EvidenceType } from "../../db";
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
  onQuickNote?: (text: string) => void;
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

export function StepCard({
  step,
  stepIndex,
  totalSteps,
  onToggleComplete,
  onEvidenceTap,
  onQuickNote,
}: StepCardProps) {
  const { theme } = useUnistyles();
  const isCompleted = step.status === "completed";
  const evidenceLabel = formatEvidenceLabel(step.evidenceCount);
  const flashStyle = useFlashOnIncrease(step.evidenceCount);

  const plannedTypes = step.plannedEvidenceTypes ?? null;
  const capturedTypes = step.capturedEvidenceTypes ?? [];
  const hasPlannedTypes = plannedTypes !== null && plannedTypes.length > 0;
  const isBlocked =
    !isCompleted && hasPlannedTypes
      ? !plannedTypes.some((t) => capturedTypes.includes(t))
      : false;

  const blockerOption = isBlocked
    ? getMissingEvidenceOption(plannedTypes!, capturedTypes)
    : null;
  const hintText = blockerOption
    ? `Add ${blockerOption.icon} ${blockerOption.label} to complete`
    : null;

  // Quick-note: show when text is planned, not yet captured, and step is not complete
  const showQuickNote =
    !isCompleted &&
    hasPlannedTypes &&
    plannedTypes.includes(EvidenceType.text) &&
    !capturedTypes.includes(EvidenceType.text) &&
    !!onQuickNote;

  const [quickNoteText, setQuickNoteText] = useState("");

  const handleQuickNoteSubmit = () => {
    const trimmed = quickNoteText.trim();
    if (trimmed && onQuickNote) {
      onQuickNote(trimmed);
      setQuickNoteText("");
    }
  };

  const handleCheckboxPress = () => {
    if (isBlocked) {
      onEvidenceTap();
    } else {
      onToggleComplete();
    }
  };

  const checkboxLabel = blockerOption
    ? `Mark complete, requires ${blockerOption.icon} ${blockerOption.label}`
    : isCompleted
      ? "Completed"
      : "Mark complete";

  return (
    <Card>
      <View style={styles.container}>
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

        {hintText && (
          <Text style={styles.hintText} accessible accessibilityRole="text">
            {hintText}
          </Text>
        )}

        <View style={styles.checkboxRow}>
          <Checkbox
            checked={isCompleted}
            onToggle={handleCheckboxPress}
            label={checkboxLabel}
            disabled={isBlocked}
          />
        </View>

        {showQuickNote && (
          <View style={styles.quickNoteRow}>
            <TextInput
              style={styles.quickNoteInput}
              value={quickNoteText}
              onChangeText={setQuickNoteText}
              placeholder="Quick note..."
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleQuickNoteSubmit}
              accessible
              accessibilityLabel="Add a quick text note"
              accessibilityHint="Submits as text evidence for this step"
            />
            <Pressable
              onPress={handleQuickNoteSubmit}
              style={styles.quickNoteButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Submit quick note"
            >
              <Text style={styles.quickNoteButtonText}>Add</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
}
