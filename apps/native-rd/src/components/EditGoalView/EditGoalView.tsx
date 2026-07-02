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
 *
 * Drag orchestration lives in useEditGoalDrag; the row anatomy in
 * EditGoalStepRow; the ⋯ menu content in EditGoalOverflowMenu.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  Modal,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DotsThree, Pencil } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { ScreenSubHeader } from "../ScreenHeader/ScreenSubHeader";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import type { EvidenceTypeValue } from "../../types/evidence";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import { EditGoalStepRow } from "./EditGoalStepRow";
import { EditGoalSubStepRow } from "./EditGoalSubStepRow";
import { useEditGoalDrag } from "./useEditGoalDrag";
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

/**
 * A "smaller step" nested under a parent step (D12) — the app's one-level
 * `parentStepId` model (`schema.ts`). It carries its own title and planned
 * evidence (every step, including a smaller step, requires evidence), but no
 * date/dep chips and no further nesting (depth is capped at one level).
 */
export interface EditGoalSubStep {
  id: string;
  title: string;
  /** Planned evidence types (multi, D4). Non-empty — same invariant as a step. */
  plannedEvidenceTypes: EvidenceTypeValue[];
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
  /**
   * Optional one-level "smaller steps" (D12). Absent/empty → the row shows a
   * "break into smaller steps" prompt; non-empty → an indented block of
   * sub-rows plus an "add a smaller step" affordance. Matches the Edit Goal C
   * prototype's edit view and the app's `parentStepId` data model.
   */
  subSteps?: EditGoalSubStep[];
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
  /**
   * Adds a smaller step under `parentStepId` (D12). Called with `newSubStepTitle`
   * — the new sub-row is then renameable inline (mirrors how the C prototype's
   * create flow seeds a default-titled step). Not wired to persistence.
   */
  onAddSubStep: (parentStepId: string, title: string) => void;
  onSubStepTitleChange: (subStepId: string, title: string) => void;
  /** Fired when a smaller step's evidence picker toggles its planned types (D12/D8). */
  onSubStepEvidenceChange: (
    subStepId: string,
    types: EvidenceTypeValue[],
  ) => void;
  onDeleteSubStep: (subStepId: string) => void;
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
  evidencePickerTitle?: string;
  evidenceTypesLabel?: string;
  /** Pluralized step-count label. Default: "N step" / "N steps". */
  stepCountLabel?: (count: number) => string;
  /** "add a smaller step" affordance under a step that already has some (D12). */
  addSubStepLabel?: string;
  /** "break into smaller steps" prompt on a step with none (D12). */
  breakIntoSubStepsLabel?: string;
  /** Default title for a freshly-added smaller step, renamed inline after (D12). */
  newSubStepTitle?: string;
}

const defaultStepCountLabel = (count: number) =>
  `${count} ${count === 1 ? "step" : "steps"}`;

export function EditGoalView({
  goalTitle,
  onGoalTitleChange,
  description,
  onDescriptionChange,
  steps,
  onReorderSteps,
  onAddStep,
  onStepTitleChange,
  onStepEvidenceChange,
  onAddSubStep,
  onSubStepTitleChange,
  onSubStepEvidenceChange,
  onDeleteSubStep,
  onOverflowPress,
  onBack,
  onDone,
  dragScrollController,
  headerLabel = "Edit goal",
  goalSectionLabel = "Goal",
  stepsSectionLabel = "Steps",
  addStepPlaceholder = "Add step...",
  descriptionPlaceholder,
  datesInfoText = 'Dates & dependencies live on each step — tap a step in the full planner to set "after" / "waiting on".',
  doneLabel = "Done",
  overflowAccessibilityLabel = "More options",
  evidencePickerTitle = "Planned evidence",
  evidenceTypesLabel = "Evidence types",
  stepCountLabel = defaultStepCountLabel,
  addSubStepLabel = "add a smaller step",
  breakIntoSubStepsLabel = "break into smaller steps",
  newSubStepTitle = "New smaller step",
}: EditGoalViewProps) {
  const { theme } = useUnistyles();
  const { animationPref } = useAnimationPref();

  const [newStepTitle, setNewStepTitle] = useState("");
  // A single "which id is being renamed" source, keyed by step OR sub-step id
  // (ids are unique across both). commitEditing routes to the right callback.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  // Which step or sub-step's evidence picker is open (D8/D12). Internal state —
  // the chip tap opens it locally; onStepEvidenceChange / onSubStepEvidenceChange
  // are the only outward evidence events.
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(
    null,
  );
  const [screenReaderActive, setScreenReaderActive] = useState(false);

  const drag = useEditGoalDrag({ steps, onReorderSteps, dragScrollController });

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setScreenReaderActive)
      .catch(() => {
        // Fail open: show the ↑/↓ fallback if we can't determine SR status.
        setScreenReaderActive(true);
      });
    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderActive,
    );
    return () => sub.remove();
  }, []);

  const showAccessibleControls = screenReaderActive || animationPref === "none";
  const canDrag = steps.length > 1 && editingId === null;

  function handleAddStep() {
    const trimmed = newStepTitle.trim();
    if (!trimmed) return;
    onAddStep(trimmed);
    setNewStepTitle("");
  }

  // Find the sub-step with `id` across every parent (one-level, D12).
  function findSubStep(id: string): EditGoalSubStep | undefined {
    for (const s of steps) {
      const sub = s.subSteps?.find((ss) => ss.id === id);
      if (sub) return sub;
    }
    return undefined;
  }

  function beginEdit(id: string, title: string) {
    setEditingId(id);
    setEditText(title);
  }

  function commitEditing() {
    if (editingId) {
      const trimmed = editText.trim();
      const step = steps.find((s) => s.id === editingId);
      if (step) {
        if (trimmed && trimmed !== step.title) {
          onStepTitleChange(editingId, trimmed);
        }
      } else {
        const sub = findSubStep(editingId);
        if (sub && trimmed && trimmed !== sub.title) {
          onSubStepTitleChange(editingId, trimmed);
        }
      }
    }
    setEditingId(null);
    setEditText("");
  }

  function handleAddSubStep(parentStepId: string) {
    onAddSubStep(parentStepId, newSubStepTitle);
  }

  // Evidence-picker toggle (D8/D12). Guards the "every step requires evidence"
  // invariant: the last remaining type can't be deselected (no-op), so a step or
  // sub-step never lands in a 0-selected state. Routes to the step or sub-step
  // callback depending on which id opened the picker.
  function handleToggleEvidence(type: EvidenceTypeValue) {
    if (editingEvidenceId === null) return;
    const step = steps.find((s) => s.id === editingEvidenceId);
    const sub = step ? undefined : findSubStep(editingEvidenceId);
    const current = step?.plannedEvidenceTypes ?? sub?.plannedEvidenceTypes;
    if (!current) return;
    const isSelected = current.includes(type);
    if (isSelected && current.length === 1) return;
    const next = isSelected
      ? current.filter((t) => t !== type)
      : [...current, type];
    if (step) {
      onStepEvidenceChange(editingEvidenceId, next);
    } else {
      onSubStepEvidenceChange(editingEvidenceId, next);
    }
  }

  const editingEvidenceStep =
    editingEvidenceId !== null
      ? steps.find((s) => s.id === editingEvidenceId)
      : undefined;
  const editingEvidenceSub =
    editingEvidenceId !== null && !editingEvidenceStep
      ? findSubStep(editingEvidenceId)
      : undefined;
  const editingEvidenceTypes =
    editingEvidenceStep?.plannedEvidenceTypes ??
    editingEvidenceSub?.plannedEvidenceTypes;

  // Smaller-steps block (D12), rendered inside each parent's card. A parent with
  // no smaller steps shows the "break into smaller steps" prompt; one with some
  // shows the indented green-rail block of sub-rows plus "add a smaller step".
  // Both add affordances seed a default-titled sub-step (renamed inline after).
  function renderSubStepBlock(step: EditGoalStep) {
    const subs = step.subSteps ?? [];
    if (subs.length === 0) {
      return (
        <Pressable
          style={styles.breakIntoRow}
          onPress={() => handleAddSubStep(step.id)}
          accessibilityRole="button"
          accessibilityLabel={`Break "${step.title}" into smaller steps`}
          hitSlop={6}
          testID={`edit-goal-break-into-${step.id}`}
        >
          <RNText
            style={styles.breakIntoGlyph}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {"⚊"}
          </RNText>
          <RNText style={styles.breakIntoText}>{breakIntoSubStepsLabel}</RNText>
        </Pressable>
      );
    }
    return (
      <View style={styles.subStepBlock}>
        {subs.map((sub) => (
          <EditGoalSubStepRow
            key={sub.id}
            subStep={sub}
            isEditing={editingId === sub.id}
            editText={editText}
            onEditTextChange={setEditText}
            onStartEditing={() => beginEdit(sub.id, sub.title)}
            onCommitEditing={commitEditing}
            onEvidenceChipPress={() => setEditingEvidenceId(sub.id)}
            onDelete={() => onDeleteSubStep(sub.id)}
          />
        ))}
        <Pressable
          style={styles.addSubStepRow}
          onPress={() => handleAddSubStep(step.id)}
          accessibilityRole="button"
          accessibilityLabel={`Add a smaller step to "${step.title}"`}
          hitSlop={6}
          testID={`edit-goal-add-substep-${step.id}`}
        >
          <RNText
            style={styles.addSubStepGlyph}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {"+"}
          </RNText>
          <RNText style={styles.addSubStepText}>{addSubStepLabel}</RNText>
        </Pressable>
      </View>
    );
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

        <GestureHandlerRootView style={styles.stepList}>
          {steps.map((step, index) => (
            <View
              key={step.id}
              onLayout={(e) =>
                drag.registerRowLayout(index, {
                  y: e.nativeEvent.layout.y,
                  height: e.nativeEvent.layout.height,
                })
              }
            >
              <EditGoalStepRow
                step={step}
                index={index}
                stepNumber={index + 1}
                isBeingDragged={drag.draggedIndex === index}
                isEditing={editingId === step.id}
                editText={editText}
                onEditTextChange={setEditText}
                onStartEditing={() => beginEdit(step.id, step.title)}
                onCommitEditing={commitEditing}
                onEvidenceChipPress={() => setEditingEvidenceId(step.id)}
                onDragStart={drag.handleDragStart}
                onDragMove={drag.handleDragMove}
                onDragEnd={drag.handleDragEnd}
                dragScrollCompensation={
                  drag.draggedIndex === index
                    ? drag.dragScrollCompensation
                    : undefined
                }
                onMoveUp={() => drag.moveStep(index, -1)}
                onMoveDown={() => drag.moveStep(index, 1)}
                showAccessibleControls={showAccessibleControls}
                animationPref={animationPref}
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                canDrag={canDrag}
              >
                {/* Smaller-steps block (D12), rendered inside the parent card so
                    it drags with the parent. See renderSubStepBlock. */}
                {renderSubStepBlock(step)}
              </EditGoalStepRow>
            </View>
          ))}
          {drag.isDragging && drag.dropSlot && (
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.dropLine, { top: drag.dropSlot.top }]}
            />
          )}
        </GestureHandlerRootView>

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

      {/* Evidence-type picker (D8/D12): the reused multi-select authoring grid
          in a local bottom-sheet Modal (mirrors the capture branch + nest
          picker). Opened by a step OR a sub-step's chip; toggling updates that
          row's pills via onStepEvidenceChange / onSubStepEvidenceChange; the last
          remaining type can't be deselected (handleToggleEvidence guard). */}
      <Modal
        visible={editingEvidenceTypes !== undefined}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingEvidenceId(null)}
        accessibilityViewIsModal
      >
        <View style={styles.pickerOverlay}>
          <Pressable
            style={styles.pickerBackdrop}
            onPress={() => setEditingEvidenceId(null)}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="edit-goal-evidence-backdrop"
          />
          <SafeAreaView edges={["bottom"]} style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <RNText style={styles.pickerTitle} accessibilityRole="header">
                {evidencePickerTitle}
              </RNText>
              <Pressable
                style={styles.pickerClose}
                onPress={() => setEditingEvidenceId(null)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                testID="edit-goal-evidence-close"
              >
                <RNText style={styles.pickerCloseIcon}>{"✕"}</RNText>
              </Pressable>
            </View>
            {editingEvidenceTypes ? (
              <EvidenceTypePicker
                selectedTypes={editingEvidenceTypes}
                onToggleType={handleToggleEvidence}
                label={evidenceTypesLabel}
              />
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
