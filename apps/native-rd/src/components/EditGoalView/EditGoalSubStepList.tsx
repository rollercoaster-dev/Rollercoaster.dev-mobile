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
import { View, type GestureResponderEvent } from "react-native";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import type { SharedValue } from "react-native-reanimated";
import { EditGoalSubStepRow } from "./EditGoalSubStepRow";
import type { EditGoalSubStep, EditGoalTimingCopy } from "./EditGoalView";
import type { StepTimingValue } from "../StepTimingEditor";
import type { RowGeometry } from "./useEditGoalHierarchyDrag";

export interface EditGoalSubStepListProps {
  subSteps: EditGoalSubStep[];
  /** Which id (step or sub-step) is being renamed inline; drag off while editing. */
  editingId: string | null;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEditing: (id: string, title: string) => void;
  onCommitEditing: () => void;
  onEvidenceChipPress: (id: string, event: GestureResponderEvent) => void;
  onDelete: (id: string) => void;
  showAccessibleControls: boolean;
  animationPref: AnimationPref;
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
  /**
   * Opens timing authoring for a sub-step (#575). Omitted → each sub-row's
   * timing line renders inert (D7).
   */
  onEditTiming?: (subStepId: string) => void;
  whenPromptLabel?: string;
  editTimingUnsetA11yLabel?: (subStepTitle: string) => string;
  editTimingSetA11yLabel?: (subStepTitle: string, lines: string[]) => string;
  // --- In-row timing editor (#576), forwarded to whichever sub-row owns it. ---
  expandedTimingId?: string | null;
  onCommitTiming?: (id: string, next: StepTimingValue) => void;
  onClearTiming?: (id: string) => void;
  onCollapseTiming?: (id: string) => void;
  timingNow?: Date;
  timingLocale?: string;
  timingCopy?: EditGoalTimingCopy;
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
  onEditTiming,
  whenPromptLabel,
  editTimingUnsetA11yLabel,
  editTimingSetA11yLabel,
  expandedTimingId,
  onCommitTiming,
  onClearTiming,
  onCollapseTiming,
  timingNow,
  timingLocale,
  timingCopy,
}: EditGoalSubStepListProps) {
  return (
    <>
      {subSteps.map((sub, index) => (
        <View key={sub.id}>
          <EditGoalSubStepRow
            subStep={sub}
            isBeingDragged={draggedRowId === sub.id}
            isEditing={editingId === sub.id}
            editText={editText}
            onEditTextChange={onEditTextChange}
            onStartEditing={() => onStartEditing(sub.id, sub.title)}
            onCommitEditing={onCommitEditing}
            onEvidenceChipPress={(e) => onEvidenceChipPress(sub.id, e)}
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
            onEditTiming={onEditTiming ? () => onEditTiming(sub.id) : undefined}
            whenPromptLabel={whenPromptLabel}
            editTimingUnsetA11yLabel={editTimingUnsetA11yLabel}
            editTimingSetA11yLabel={editTimingSetA11yLabel}
            isTimingExpanded={expandedTimingId === sub.id}
            onCommitTiming={
              onCommitTiming
                ? (next) => onCommitTiming(sub.id, next)
                : undefined
            }
            onClearTiming={
              onClearTiming ? () => onClearTiming(sub.id) : undefined
            }
            onCollapseTiming={
              onCollapseTiming ? () => onCollapseTiming(sub.id) : undefined
            }
            timingNow={timingNow}
            timingLocale={timingLocale}
            timingCopy={timingCopy}
          />
        </View>
      ))}
    </>
  );
}
