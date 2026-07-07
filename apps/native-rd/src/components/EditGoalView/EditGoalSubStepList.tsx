/**
 * EditGoalSubStepList — the draggable sub-step rows for a single parent step
 * (#459). Owns one `useEditGoalDrag` instance scoped to this parent's siblings,
 * so reorder never crosses parents: each instance has its own row-layout/drag
 * refs and fires `onReorder` with only this parent's ordered sub-step ids.
 *
 * Reuses the top-level list's gesture + auto-scroll math verbatim (D2) — the
 * hook is generic over `{ id, title }[]`, so calling it per-parent needs no
 * change to useEditGoalDrag. Returns the rows plus the scoped drop-line as a
 * fragment; the caller wraps them in the (position: relative) `subStepBlock`
 * so the absolutely-positioned drop-line shares the rows' coordinate system.
 */
import React from "react";
import { View } from "react-native";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import { EditGoalSubStepRow } from "./EditGoalSubStepRow";
import { useEditGoalDrag } from "./useEditGoalDrag";
import { styles } from "./EditGoalView.styles";
import type { EditGoalSubStep } from "./EditGoalView";

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
}

export function EditGoalSubStepList({
  subSteps,
  onReorder,
  editingId,
  editText,
  onEditTextChange,
  onStartEditing,
  onCommitEditing,
  onEvidenceChipPress,
  onDelete,
  showAccessibleControls,
  animationPref,
  dragScrollController,
  announceReorder,
}: EditGoalSubStepListProps) {
  const drag = useEditGoalDrag({
    steps: subSteps,
    onReorderSteps: onReorder,
    dragScrollController,
    announceReorder,
  });

  const canDrag = subSteps.length > 1 && editingId === null;

  return (
    <>
      {subSteps.map((sub, index) => (
        <View
          key={sub.id}
          onLayout={(e) =>
            drag.registerRowLayout(index, {
              y: e.nativeEvent.layout.y,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <EditGoalSubStepRow
            subStep={sub}
            index={index}
            isBeingDragged={drag.draggedIndex === index}
            isEditing={editingId === sub.id}
            editText={editText}
            onEditTextChange={onEditTextChange}
            onStartEditing={() => onStartEditing(sub.id, sub.title)}
            onCommitEditing={onCommitEditing}
            onEvidenceChipPress={() => onEvidenceChipPress(sub.id)}
            onDelete={() => onDelete(sub.id)}
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
            isLast={index === subSteps.length - 1}
            canDrag={canDrag}
          />
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
    </>
  );
}
