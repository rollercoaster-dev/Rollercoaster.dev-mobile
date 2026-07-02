/**
 * EditGoalView — the redesigned Edit Goal screen body (issue #445, Track of
 * Epic #384). Implements the App Shell prototype's `edit` route: an editable
 * goal-title card, a "Steps" section with drag-reorderable rows (title +
 * planned-evidence chip + optional date/dependency chips), an inline "Add
 * step..." row, a dates/deps info banner, and a "Done" footer — with "Delete
 * goal" demoted into a ⋯ overflow menu (see EditGoalOverflowMenu).
 *
 * Pure, prop-driven, i18n-free (D9): all copy arrives as props with English
 * defaults; the future [Integrate] issue threads real t() output through them
 * and wires the callbacks to Evolu. Storybook-first, so every theme + the
 * reorder/evidence interactions can be verified before the screen is wired.
 * `grep -rn "EditGoalView" src/screens` stays empty until then.
 */
import React, { useState } from "react";
import { View, Text as RNText, TextInput, Pressable } from "react-native";
import { DotsThree, Pencil } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { ScreenSubHeader } from "../ScreenHeader/ScreenSubHeader";
import type { EvidenceTypeValue } from "../../types/evidence";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import { styles } from "./EditGoalView.styles";

/** Tone of a display-only date/dependency chip on a step row (D5). */
export type EditGoalChipTone = "after" | "waiting" | "due";

/** A display-only date/dependency chip. Rendered only when present — never a
 * "missing" placeholder (ND rule: show what's there, not what's absent). */
export interface EditGoalDateDepChip {
  tone: EditGoalChipTone;
  /** Chip text, e.g. "after Draft outline", "Alex", "Fri". */
  text: string;
}

export interface EditGoalStep {
  id: string;
  title: string;
  /**
   * Planned evidence types (multi, D4 — matches the app's `string[]` data
   * model). At least one entry: "every step requires evidence" is a product
   * invariant, so the evidence picker refuses to leave this empty.
   */
  plannedEvidenceTypes: EvidenceTypeValue[];
  /** Optional date/dependency chips (D5). Absent/empty → no chip row. */
  dateDepChips?: EditGoalDateDepChip[];
}

export interface EditGoalViewProps {
  goalTitle: string;
  onGoalTitleChange: (title: string) => void;
  /**
   * Optional goal description (D3). When `undefined` (the shipped default,
   * matching the canonical prototype) no description UI renders — absence is
   * silent. Supplying it opts the field back in for the [Integrate] issue.
   */
  description?: string;
  onDescriptionChange?: (description: string) => void;
  steps: EditGoalStep[];
  /** Fired on drop with the full new step order. Not wired to persistence. */
  onReorderSteps: (orderedStepIds: string[]) => void;
  onAddStep: (title: string) => void;
  onStepTitleChange: (stepId: string, title: string) => void;
  /** Fired when the row's evidence picker toggles a step's planned types (D8). */
  onStepEvidenceChange: (stepId: string, types: EvidenceTypeValue[]) => void;
  onOverflowPress: () => void;
  onBack: () => void;
  onDone: () => void;
  /**
   * Optional auto-scroll controller for drags near the viewport edge, supplied
   * by the screen that owns the ScrollView ([Integrate]). Omitted in Storybook
   * (short lists don't scroll); reorder still works without it.
   */
  dragScrollController?: DragScrollController;

  // --- Copy (i18n-free per D9; English defaults; [Integrate] passes t()). ---
  headerLabel?: string;
  goalSectionLabel?: string;
  stepsSectionLabel?: string;
  addStepPlaceholder?: string;
  descriptionPlaceholder?: string;
  datesInfoText?: string;
  doneLabel?: string;
  overflowAccessibilityLabel?: string;
  /** Pluralized step-count label. Default: "N step" / "N steps". */
  stepCountLabel?: (count: number) => string;
}

const defaultStepCountLabel = (count: number) =>
  `${count} ${count === 1 ? "step" : "steps"}`;

export function EditGoalView({
  goalTitle,
  onGoalTitleChange,
  description,
  onDescriptionChange,
  steps,
  onAddStep,
  onOverflowPress,
  onBack,
  onDone,
  headerLabel = "Edit goal",
  goalSectionLabel = "Goal",
  stepsSectionLabel = "Steps",
  addStepPlaceholder = "Add step...",
  descriptionPlaceholder,
  datesInfoText = 'Dates & dependencies live on each step — tap a step in the full planner to set "after" / "waiting on".',
  doneLabel = "Done",
  overflowAccessibilityLabel = "More options",
  stepCountLabel = defaultStepCountLabel,
}: EditGoalViewProps) {
  const { theme } = useUnistyles();
  const [newStepTitle, setNewStepTitle] = useState("");

  function handleAddStep() {
    const trimmed = newStepTitle.trim();
    if (!trimmed) return;
    onAddStep(trimmed);
    setNewStepTitle("");
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader
        label={headerLabel}
        onBack={onBack}
        right={
          <IconButton
            icon={<DotsThree size={24} weight="bold" />}
            tone="chrome"
            onPress={onOverflowPress}
            accessibilityLabel={overflowAccessibilityLabel}
            testID="edit-goal-overflow-trigger"
          />
        }
      />

      <View style={styles.body}>
        {/* Optional description (D3) — rendered only when the prop is supplied;
            no "add a description" affordance when absent. */}
        {description !== undefined ? (
          <View style={styles.descriptionBlock}>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={onDescriptionChange}
              placeholder={descriptionPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              testID="edit-goal-description-input"
              accessibilityLabel={descriptionPlaceholder ?? goalSectionLabel}
            />
          </View>
        ) : null}

        <RNText style={styles.sectionLabel}>{goalSectionLabel}</RNText>
        <View style={styles.titleCard}>
          <TextInput
            style={styles.titleInput}
            value={goalTitle}
            onChangeText={onGoalTitleChange}
            testID="edit-goal-title-input"
            accessibilityLabel={goalSectionLabel}
          />
          <Pencil size={16} weight="bold" color={theme.colors.textSecondary} />
        </View>

        <View style={styles.stepsHeader}>
          <Text
            variant="headline"
            style={styles.stepsLabel}
            accessibilityRole="header"
          >
            {stepsSectionLabel}
          </Text>
          <RNText style={styles.stepCount}>
            {stepCountLabel(steps.length)}
          </RNText>
        </View>

        <View style={styles.stepList}>
          {steps.map((step) => (
            <View key={step.id} style={styles.stepCard}>
              <RNText style={styles.stepTitleText}>{step.title}</RNText>
            </View>
          ))}
        </View>

        <View style={styles.addRow}>
          <View style={styles.addInputCard}>
            <TextInput
              style={styles.addInput}
              value={newStepTitle}
              onChangeText={setNewStepTitle}
              onSubmitEditing={handleAddStep}
              placeholder={addStepPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              blurOnSubmit={false}
              testID="edit-goal-add-step-input"
              accessibilityLabel={addStepPlaceholder}
            />
          </View>
          <Pressable
            style={styles.addButton}
            onPress={handleAddStep}
            testID="edit-goal-add-step-button"
            accessibilityRole="button"
            accessibilityLabel="Add step"
          >
            <RNText style={styles.addButtonText}>+</RNText>
          </Pressable>
        </View>

        <View style={styles.infoBanner}>
          <RNText style={styles.infoBannerIcon} accessibilityElementsHidden>
            📅
          </RNText>
          <RNText style={styles.infoBannerText}>{datesInfoText}</RNText>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label={doneLabel}
          variant="secondary"
          onPress={onDone}
          testID="edit-goal-done-button"
        />
      </View>
    </View>
  );
}
