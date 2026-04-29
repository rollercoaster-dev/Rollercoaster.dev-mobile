import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Keyboard,
} from "react-native";
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
  onQuickNoteFocus?: () => void;
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
  onQuickNoteFocus,
}: StepCardProps) {
  const { theme } = useUnistyles();
  const isCompleted = step.status === "completed";
  const evidenceLabel = formatEvidenceLabel(step.evidenceCount);
  const flashStyle = useFlashOnIncrease(step.evidenceCount);
  const quickNoteInputRef = useRef<TextInput>(null);

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
      quickNoteInputRef.current?.blur();
      Keyboard.dismiss();
    }
  };

  const handleCheckboxPress = () => {
    if (isBlocked) {
      onEvidenceTap();
    } else {
      onToggleComplete();
    }
  };

  const checkboxLabel = isCompleted ? "Completed" : "Mark complete";
  const checkboxA11yHint = blockerOption
    ? `Add ${blockerOption.label} to complete this step`
    : undefined;

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

        <View style={styles.checkboxRow}>
          <Checkbox
            checked={isCompleted}
            onToggle={handleCheckboxPress}
            label={checkboxLabel}
            disabled={isBlocked}
            accessibilityHint={checkboxA11yHint}
          />
        </View>

        {showQuickNote && (
          <View style={styles.quickNoteSection}>
            <Text style={styles.quickNoteLabel} accessibilityRole="text">
              Add a note to complete this step
            </Text>
            <View style={styles.quickNoteRow}>
              <TextInput
                ref={quickNoteInputRef}
                style={styles.quickNoteInput}
                value={quickNoteText}
                onChangeText={setQuickNoteText}
                onFocus={onQuickNoteFocus}
                placeholder="Quick note..."
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleQuickNoteSubmit}
                testID="step-card-quick-note-input"
                accessible
                accessibilityLabel="Quick note"
                accessibilityHint="Add a note to complete this step"
              />
              <Pressable
                onPress={handleQuickNoteSubmit}
                style={styles.quickNoteButton}
                testID="step-card-quick-note-add-button"
                accessible
                accessibilityRole="button"
                accessibilityLabel="Add quick note"
                accessibilityHint="Saves this quick note to the current step"
              >
                <Text style={styles.quickNoteButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </Card>
  );
}
