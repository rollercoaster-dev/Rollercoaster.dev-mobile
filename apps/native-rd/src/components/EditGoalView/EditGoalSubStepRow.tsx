/**
 * EditGoalSubStepRow — one "smaller step" nested under a parent step inside
 * EditGoalView (D12). Rendered inside the parent card's green-rail block.
 *
 * A leaf row: a decorative ↳ indent marker + tap-to-edit title (D10) + a
 * planned-evidence chip (reused EvidenceTypePicker `compact`, one pill per
 * planned type — D4; opens the type picker on tap — D8) + a × delete button.
 *
 * Reorder-within-parent is deferred to a follow-up — so there is no drag handle
 * yet. The ↳ marker is the prototype build-view's indent glyph (decorative,
 * hidden from screen readers); when reorder lands it becomes a functional ≡.
 */
import React from "react";
import { View, Text as RNText, TextInput, Pressable } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { styles } from "./EditGoalView.styles";
import type { EditGoalSubStep } from "./EditGoalView";

export interface EditGoalSubStepRowProps {
  subStep: EditGoalSubStep;
  /** Whether this sub-row's title is in inline-edit mode (state lives in the view). */
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEditing: () => void;
  onCommitEditing: () => void;
  /** Opens the evidence-type picker for this smaller step (D8/D12). */
  onEvidenceChipPress: () => void;
  onDelete: () => void;
}

export function EditGoalSubStepRow({
  subStep,
  isEditing,
  editText,
  onEditTextChange,
  onStartEditing,
  onCommitEditing,
  onEvidenceChipPress,
  onDelete,
}: EditGoalSubStepRowProps) {
  const { theme } = useUnistyles();

  const marker = (
    <RNText
      style={styles.subStepMarker}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {"↳"}
    </RNText>
  );

  if (isEditing) {
    return (
      <View style={styles.subStepRow}>
        {marker}
        <TextInput
          style={styles.subStepEditInput}
          value={editText}
          onChangeText={onEditTextChange}
          onSubmitEditing={onCommitEditing}
          onBlur={onCommitEditing}
          autoFocus
          returnKeyType="done"
          selectTextOnFocus
          placeholderTextColor={theme.colors.textMuted}
          testID={`edit-goal-substep-edit-${subStep.id}`}
          accessibilityLabel={`Edit smaller step: ${subStep.title}`}
        />
      </View>
    );
  }

  return (
    <View style={styles.subStepRow}>
      {marker}
      <Pressable
        style={styles.subStepTitlePress}
        onPress={onStartEditing}
        accessibilityRole="button"
        accessibilityLabel={subStep.title}
        accessibilityHint="Tap to edit smaller step title"
        testID={`edit-goal-substep-title-${subStep.id}`}
      >
        <RNText style={styles.subStepTitleText}>{subStep.title}</RNText>
      </Pressable>
      <Pressable
        style={styles.evidenceChip}
        onPress={onEvidenceChipPress}
        accessibilityRole="button"
        accessibilityLabel="Edit planned evidence"
        hitSlop={8}
        testID={`edit-goal-substep-evidence-${subStep.id}`}
      >
        <EvidenceTypePicker
          selectedTypes={subStep.plannedEvidenceTypes}
          compact
        />
      </Pressable>
      <Pressable
        style={styles.subStepDelete}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete smaller step: ${subStep.title}`}
        hitSlop={8}
        testID={`edit-goal-substep-delete-${subStep.id}`}
      >
        <RNText style={styles.subStepDeleteGlyph}>{"×"}</RNText>
      </Pressable>
    </View>
  );
}
