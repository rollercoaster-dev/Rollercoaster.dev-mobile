/**
 * EditGoalStepList — the reusable step-editor row/list layer extracted from
 * EditGoalView (issue #489, Track of Epic #384). It owns the "Steps" section
 * label + count, the drag-reorderable step rows (via useEditGoalDrag), each
 * parent's one-level sub-step block (EditGoalSubStepList), the inline "Add
 * step..." affordance, and the local ConfirmDeleteModal its pendingDelete
 * state drives (D1).
 *
 * The evidence-type picker's sheet + state was lifted up to the host
 * (EditGoalView) in #493/D8 so the shared AnimatedSheet anchors to the screen
 * viewport, not this list's content box; this layer now just signals a chip
 * tap outward via onEvidenceChipPress(id).
 *
 * Editing state that stays here — inline-rename (editingId/editText),
 * delete-confirm (pendingDelete), the new-step draft (newStepTitle) — plus the
 * screen-reader/animation-pref subscriptions that decide whether the ↑/↓
 * fallback shows (D5). EditGoalView became a thin composition around this; the
 * New Goal wizard (#490) reuses it.
 *
 * The shared step types stay defined in EditGoalView (D2); the two this file
 * needs — EditGoalStep/EditGoalSubStep — are imported here type-only. Styles
 * are the shared EditGoalView.styles module (D4). Drag orchestration lives in
 * useEditGoalDrag; the row anatomy in EditGoalStepRow.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  AccessibilityInfo,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { Text } from "../Text";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { EditGoalStepRow } from "./EditGoalStepRow";
import { EditGoalSubStepList } from "./EditGoalSubStepList";
import { useEditGoalHierarchyDrag } from "./useEditGoalHierarchyDrag";
import { styles } from "./EditGoalView.styles";
import type { EditGoalStep, EditGoalSubStep } from "./EditGoalView";

export interface EditGoalStepListProps {
  steps: EditGoalStep[];
  /** Fired on drop with the full new step order. Not wired to persistence. */
  onReorderSteps: (orderedStepIds: string[]) => void;
  /**
   * Fired on drop / ↑↓ with a parent's new sub-step order (#459). Scoped to one
   * parent — siblings under other parents never move. Not wired to persistence.
   */
  onReorderSubSteps: (
    parentStepId: string,
    orderedSubStepIds: string[],
  ) => void;
  /**
   * Fired on a drag-reparent / nest-under / un-nest (#496). When omitted the
   * coordinator collapses to local sibling reorder only (R5) and the
   * nest/un-nest accessible controls do not render.
   */
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
  onAddStep: (title: string) => void;
  onStepTitleChange: (stepId: string, title: string) => void;
  /**
   * Fired when a step's or sub-step's evidence chip is tapped (#493/D8). The
   * host (EditGoalView) owns the picker sheet + its open state; this list only
   * reports which id was tapped. Ids are unique across steps and sub-steps.
   */
  onEvidenceChipPress: (id: string) => void;
  /**
   * Adds a sub-step under `parentStepId` (D12). Called with `newSubStepTitle`
   * — the new sub-row is then renameable inline. Not wired to persistence.
   */
  onAddSubStep: (parentStepId: string, title: string) => void;
  onSubStepTitleChange: (subStepId: string, title: string) => void;
  onDeleteSubStep: (subStepId: string) => void;
  /** Deletes a top-level step (#460). Fired only after the user confirms (D1). */
  onDeleteStep: (stepId: string) => void;
  /**
   * Optional auto-scroll controller for drags near the viewport edge, supplied
   * by the screen that owns the ScrollView ([Integrate]). Omitted in Storybook
   * (short lists don't scroll); reorder still works without it.
   */
  dragScrollController?: DragScrollController;

  // --- Copy (i18n-free per D9; English defaults; [Integrate] passes t()). ---
  stepsSectionLabel?: string;
  addStepPlaceholder?: string;
  /** Pluralized step-count label. Default: "N step" / "N steps". */
  stepCountLabel?: (count: number) => string;
  /** "add a sub-step" affordance under a step that already has some (D12). */
  addSubStepLabel?: string;
  /** "break into sub-steps" prompt on a step with none (D12). */
  breakIntoSubStepsLabel?: string;
  /** Default title for a freshly-added sub-step, renamed inline after (D12). */
  newSubStepTitle?: string;
  /** a11y label for the "add step" + button. */
  addStepButtonLabel?: string;
  /** a11y label for the "break into sub-steps" prompt on a step (D12). */
  breakIntoSubStepsA11yLabel?: (stepTitle: string) => string;
  /** a11y label for the "add a sub-step" affordance under a step (D12). */
  addSubStepA11yLabel?: (stepTitle: string) => string;
  /**
   * Builds the screen-reader announcement after a reorder (drag drop or ↑/↓
   * fallback). `position` is 1-based. Defaults to `Moved "<title>" to position
   * N` inside {@link useEditGoalDrag}.
   */
  announceReorder?: (stepTitle: string, position: number) => string;

  // --- Confirm-delete copy (D5; English defaults; [Integrate] passes t()).
  // The modal's own Delete/Cancel button labels come from ConfirmDeleteModal's
  // internal i18n — only the title + message are threaded here. ---
  /** Confirm-modal title when deleting a step. */
  deleteStepConfirmTitle?: string;
  /** Confirm-modal message when deleting a step (receives the step title). */
  deleteStepConfirmMessage?: (title: string) => string;
  /** Confirm-modal title when deleting a sub-step. */
  deleteSubStepConfirmTitle?: string;
  /** Confirm-modal message when deleting a sub-step (receives the sub-step title). */
  deleteSubStepConfirmMessage?: (title: string) => string;
  // --- Nest-under / un-nest copy (#496, R10) ---
  nestUnderTriggerA11yLabel?: string;
  nestUnderPickerTitle?: string;
  nestUnderRowLabel?: (targetTitle: string) => string;
  nestUnderRowA11yLabel?: (targetTitle: string) => string;
  unNestA11yLabel?: string;
  announcePromote?: (stepTitle: string) => string;
  announceNestedUnder?: (stepTitle: string, parentTitle: string) => string;
}

const defaultStepCountLabel = (count: number) =>
  `${count} ${count === 1 ? "step" : "steps"}`;

export function EditGoalStepList({
  steps,
  onReorderSteps,
  onReorderSubSteps,
  onReparentStep,
  onAddStep,
  onStepTitleChange,
  onEvidenceChipPress,
  onAddSubStep,
  onSubStepTitleChange,
  onDeleteSubStep,
  onDeleteStep,
  dragScrollController,
  stepsSectionLabel = "Steps",
  addStepPlaceholder = "Add step...",
  stepCountLabel = defaultStepCountLabel,
  addSubStepLabel = "add a sub-step",
  breakIntoSubStepsLabel = "break into sub-steps",
  newSubStepTitle = "New sub-step",
  addStepButtonLabel = "Add step",
  breakIntoSubStepsA11yLabel = (stepTitle) =>
    `Break "${stepTitle}" into sub-steps`,
  addSubStepA11yLabel = (stepTitle) => `Add a sub-step to "${stepTitle}"`,
  announceReorder,
  deleteStepConfirmTitle = "Delete step?",
  deleteStepConfirmMessage = (title) =>
    `Delete "${title}"? Its evidence and any sub-steps will be removed too.`,
  deleteSubStepConfirmTitle = "Delete sub-step?",
  deleteSubStepConfirmMessage = (title) =>
    `Delete "${title}"? Its evidence will be removed too.`,
  nestUnderTriggerA11yLabel = "Nest this step under another step",
  nestUnderPickerTitle = "Choose a step to nest under",
  nestUnderRowLabel = (targetTitle) => `Nest under "${targetTitle}"`,
  nestUnderRowA11yLabel = (targetTitle) =>
    `Nest this step under ${targetTitle}`,
  unNestA11yLabel = "Promote this step to top level",
  announcePromote,
  announceNestedUnder,
}: EditGoalStepListProps) {
  const { theme } = useUnistyles();
  const { animationPref } = useAnimationPref();

  const [newStepTitle, setNewStepTitle] = useState("");
  // A single "which id is being renamed" source, keyed by step OR sub-step id
  // (ids are unique across both). commitEditing routes to the right callback.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  // Which row-level delete is awaiting confirmation (#460, D1/D2). One modal
  // instance below is driven by this; the rows only signal intent.
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "step" | "subStep";
    id: string;
    title: string;
  } | null>(null);

  const drag = useEditGoalHierarchyDrag({
    steps,
    onReorderSteps,
    onReorderSubSteps,
    onReparentStep,
    dragScrollController,
    editingId,
    announceReorder,
    announcePromote,
    announceNestedUnder,
  });

  // R14: register the list container's screen-absolute origin so drop outlines
  // render in list-local coordinates. measureInWindow is called from onLayout
  // of the list container below (listOriginRef is owned by the coordinator).
  const listContainerRef = useRef<View>(null);
  function measureListOrigin() {
    const node = listContainerRef.current as unknown as {
      measureInWindow?: (
        cb: (x: number, y: number, w: number, h: number) => void,
      ) => void;
    } | null;
    if (node?.measureInWindow) {
      node.measureInWindow((_x, y) => {
        drag.registerListOrigin(y);
      });
    }
  }

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
  // R13: canDrag per row is derived by the coordinator from the flattened
  // hierarchy + edit state + available actions (a lone child can promote when
  // reparent is enabled). The list-level `editingId === null` guard is retained
  // via the coordinator's editingId param.

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

  // Sub-steps block (D12), rendered inside each parent's card. A parent with
  // no sub-steps shows the "break into sub-steps" prompt; one with some
  // shows the indented green-rail block of sub-rows plus "add a sub-step".
  // Both add affordances seed a default-titled sub-step (renamed inline after).
  function renderSubStepBlock(step: EditGoalStep) {
    const subs = step.subSteps ?? [];
    if (subs.length === 0) {
      return (
        <Pressable
          style={styles.breakIntoRow}
          onPress={() => handleAddSubStep(step.id)}
          accessibilityRole="button"
          accessibilityLabel={breakIntoSubStepsA11yLabel(step.title)}
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
        <EditGoalSubStepList
          subSteps={subs}
          onReorder={(ids) => onReorderSubSteps(step.id, ids)}
          editingId={editingId}
          editText={editText}
          onEditTextChange={setEditText}
          onStartEditing={(id, title) => beginEdit(id, title)}
          onCommitEditing={commitEditing}
          onEvidenceChipPress={(id) => onEvidenceChipPress(id)}
          onDelete={(id) =>
            setPendingDelete({
              kind: "subStep",
              id,
              title: subs.find((s) => s.id === id)?.title ?? "",
            })
          }
          showAccessibleControls={showAccessibleControls}
          animationPref={animationPref}
          onDragStart={drag.handleDragStart}
          onDragMove={drag.handleDragMove}
          onDragEnd={drag.handleDragEnd}
          registerRowLayout={drag.registerRowLayout}
          registerRemeasure={drag.registerRemeasure}
          dragScrollCompensation={drag.dragScrollCompensation}
          canDragRow={drag.canDragRow}
          draggedRowId={drag.draggedRowId}
          moveStep={drag.moveStep}
          canUnNest={!!onReparentStep}
          onUnNest={
            onReparentStep
              ? (subStepId) => onReparentStep(subStepId, null)
              : undefined
          }
          unNestA11yLabel={unNestA11yLabel}
        />
        <Pressable
          style={styles.addSubStepRow}
          onPress={() => handleAddSubStep(step.id)}
          accessibilityRole="button"
          accessibilityLabel={addSubStepA11yLabel(step.title)}
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
    <>
      <View style={styles.stepsHeader}>
        <Text
          variant="headline"
          style={styles.stepsLabel}
          accessibilityRole="header"
        >
          {stepsSectionLabel}
        </Text>
        <RNText style={styles.stepCount}>{stepCountLabel(steps.length)}</RNText>
      </View>

      <GestureHandlerRootView
        onLayout={measureListOrigin}
        style={styles.stepList}
      >
        <View
          ref={listContainerRef}
          onLayout={measureListOrigin}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ position: "absolute", top: 0, left: 0, height: 0, width: 0 }}
        />
        {steps.map((step, index) => {
          const isLeafRoot = (step.subSteps?.length ?? 0) === 0;
          const nestTargets = steps
            .filter((s) => s.id !== step.id)
            .map((s) => ({ id: s.id, title: s.title }));
          const canNestUnder =
            !!onReparentStep && isLeafRoot && nestTargets.length > 0;
          return (
            <View key={step.id}>
              <EditGoalStepRow
                step={step}
                index={index}
                stepNumber={index + 1}
                isBeingDragged={drag.draggedRowId === step.id}
                isEditing={editingId === step.id}
                editText={editText}
                onEditTextChange={setEditText}
                onStartEditing={() => beginEdit(step.id, step.title)}
                onCommitEditing={commitEditing}
                onEvidenceChipPress={() => onEvidenceChipPress(step.id)}
                onDragStart={drag.handleDragStart}
                onDragMove={drag.handleDragMove}
                onDragEnd={drag.handleDragEnd}
                registerRowLayout={drag.registerRowLayout}
                registerRemeasure={drag.registerRemeasure}
                dragScrollCompensation={
                  drag.draggedRowId === step.id
                    ? drag.dragScrollCompensation
                    : undefined
                }
                onMoveUp={() => drag.moveStep(step.id, -1)}
                onMoveDown={() => drag.moveStep(step.id, 1)}
                showAccessibleControls={showAccessibleControls}
                animationPref={animationPref}
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                canDrag={drag.canDragRow(step.id)}
                isArmedTarget={
                  drag.isDragging && drag.armedTargetId === step.id
                }
                canNestUnder={canNestUnder}
                nestTargets={nestTargets}
                onNestUnder={
                  onReparentStep
                    ? (targetId) => onReparentStep(step.id, targetId)
                    : undefined
                }
                onDelete={() =>
                  setPendingDelete({
                    kind: "step",
                    id: step.id,
                    title: step.title,
                  })
                }
                nestUnderTriggerA11yLabel={nestUnderTriggerA11yLabel}
                nestUnderPickerTitle={nestUnderPickerTitle}
                nestUnderRowLabel={nestUnderRowLabel}
                nestUnderRowA11yLabel={nestUnderRowA11yLabel}
              >
                {/* Sub-steps block (D12), rendered inside the parent card so
                    it drags with the parent. See renderSubStepBlock. */}
                {renderSubStepBlock(step)}
              </EditGoalStepRow>
            </View>
          );
        })}
        {drag.isDragging && drag.dropOutline?.kind === "line" && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.dropLine, { top: drag.dropOutline.top }]}
          />
        )}
        {drag.isDragging && drag.dropOutline?.kind === "nested" && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.nestedDropOutline,
              { top: drag.dropOutline.top, height: drag.dropOutline.height },
            ]}
          />
        )}
        {drag.isDragging && drag.dropOutline?.kind === "group" && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.groupDropOutline,
              { top: drag.dropOutline.top, height: drag.dropOutline.height },
            ]}
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
          accessibilityLabel={addStepButtonLabel}
        >
          <RNText style={styles.addButtonText}>+</RNText>
        </Pressable>
      </View>

      {/* Confirm-delete modal (#460, D1/D2): one instance for both row-level
          deletions. The main-step × and the sub-step × both open it via
          pendingDelete; onDeleteStep / onDeleteSubStep fire only on Confirm.
          The modal supplies its own themed, i18n-aware Delete/Cancel buttons. */}
      <ConfirmDeleteModal
        visible={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            if (pendingDelete.kind === "step") {
              onDeleteStep(pendingDelete.id);
            } else {
              onDeleteSubStep(pendingDelete.id);
            }
          }
          setPendingDelete(null);
        }}
        title={
          pendingDelete?.kind === "subStep"
            ? deleteSubStepConfirmTitle
            : deleteStepConfirmTitle
        }
        message={
          pendingDelete
            ? pendingDelete.kind === "subStep"
              ? deleteSubStepConfirmMessage(pendingDelete.title)
              : deleteStepConfirmMessage(pendingDelete.title)
            : ""
        }
      />
    </>
  );
}
