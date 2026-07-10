/**
 * EditGoalSubStepList — the sub-step rows for a single parent step (#459,
 * revised for #496). Previously instantiated its own `useEditGoalDrag` scoped to
 * one parent's siblings; now it is a **thin mapping** over `EditGoalSubStepRow`
 * that forwards the unified hierarchy coordinator's shared handlers + geometry
 * registration (R2). The coordinator owns one flat index space across roots and
 * sub-steps alike, so a sub-step drag can promote / move between parents —
 * impossible when each parent had its own independent hook (review #1).
 *
 * Reuses the top-level list's gesture + auto-scroll math verbatim via the
 * coordinator; the `EditGoalSubStepRow` anatomy is unchanged apart from the
 * shared handlers + the un-nest accessible control (R8).
 */
import React from "react";
import { View } from "react-native";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import type { SharedValue } from "react-native-reanimated";
import { EditGoalSubStepRow } from "./EditGoalSubStepRow";
import type { EditGoalSubStep } from "./EditGoalView";
import type { RowGeometry } from "./useEditGoalHierarchyDrag";

export interface EditGoalSubStepListProps {
  subSteps: EditGoalSubStep[];
  /** Fired on drop / ↑↓ with this parent's new sub-step order. */
  onReorder: (orderedSubStepIds: string[]) => void;
  /** Which id (step or sub-step) is being renamed inline; drag off while editing. */
  editingId: string | null;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEditing: (id: string, title: string) => void;
  onCommitEditing: () => void;
  onEvidenceChipPress: (id: string) => void;
  onDelete: (id: string) => void;
  showAccessibleControls: boolean;
  animationPref: AnimationPref;
  dragScrollController?: DragScrollController;
  announceReorder?: (subStepTitle: string, position: number) => string;
  // --- Unified coordinator wiring (#496, R2) ---
  /** Shared drag handlers from the coordinator, keyed by row id. */
  onDragStart: (rowId: string) => void;
  onDragMove: (translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
  registerRowLayout: (rowId: string, geometry: RowGeometry) => void;
  registerRemeasure: (rowId: string, fn: (() => void) | null) => void;
  dragScrollCompensation?: SharedValue<number>;
  /** Per-row drag eligibility from the coordinator (R13). */
  canDragRow: (rowId: string) => boolean;
  /** Which row id is currently being dragged (to flag isBeingDragged). */
  draggedRowId: string | null;
  /** Move a row by ±1 within its sibling group (coordinator, R8). */
  moveStep: (rowId: string, direction: 1 | -1) => void;
  /** Un-nest (promote) a sub-step to root (R8). */
  onUnNest?: (subStepId: string) => void;
  /** Whether the un-nest control should show (reparent enabled + onReparentStep). */
  canUnNest?: boolean;
  unNestA11yLabel?: string;
}

export function EditGoalSubStepList({
  subSteps,
  editingId,
  editText,
  onEditTextChange,
  onStartEditing,
  onCommitEditing,
  onEvidenceChipPress,
  onDelete,
  showAccessibleControls,
  animationPref,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerRowLayout,
  registerRemeasure,
  dragScrollCompensation,
  canDragRow,
  draggedRowId,
  moveStep,
  onUnNest,
  canUnNest = false,
  unNestA11yLabel,
}: EditGoalSubStepListProps) {
  return (
    <>
      {subSteps.map((sub, index) => (
        <View key={sub.id}>
          <EditGoalSubStepRow
            subStep={sub}
            index={index}
            isBeingDragged={draggedRowId === sub.id}
            isEditing={editingId === sub.id}
            editText={editText}
            onEditTextChange={onEditTextChange}
            onStartEditing={() => onStartEditing(sub.id, sub.title)}
            onCommitEditing={onCommitEditing}
            onEvidenceChipPress={() => onEvidenceChipPress(sub.id)}
            onDelete={() => onDelete(sub.id)}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            registerRowLayout={registerRowLayout}
            registerRemeasure={registerRemeasure}
            dragScrollCompensation={
              draggedRowId === sub.id ? dragScrollCompensation : undefined
            }
            onMoveUp={() => moveStep(sub.id, -1)}
            onMoveDown={() => moveStep(sub.id, 1)}
            showAccessibleControls={showAccessibleControls}
            animationPref={animationPref}
            isFirst={index === 0}
            isLast={index === subSteps.length - 1}
            canDrag={canDragRow(sub.id)}
            canUnNest={canUnNest}
            onUnNest={onUnNest ? () => onUnNest(sub.id) : undefined}
            unNestA11yLabel={unNestA11yLabel}
          />
        </View>
      ))}
    </>
  );
}
