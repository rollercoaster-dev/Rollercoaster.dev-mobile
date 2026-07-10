import type { SharedValue } from "react-native-reanimated";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import type { EditGoalStep } from "./EditGoalView";

/**
 * Shared types for the hierarchy drag coordinator (issue #496, finding 5
 * split). Kept in a tiny separate module so the pure helpers
 * (`hierarchyDragHelpers.ts`) can import the types without importing the hook
 * itself (which would create a circular dependency).
 */

export interface RowGeometry {
  absoluteY: number;
  height: number;
}

export type DropOutlineKind = "line" | "nested" | "group";

export interface DropOutline {
  top: number;
  height: number;
  kind: DropOutlineKind;
}

export interface UseEditGoalHierarchyDragParams {
  steps: readonly EditGoalStep[];
  onReorderSteps: (orderedStepIds: string[]) => void;
  onReorderSubSteps: (
    parentStepId: string,
    orderedSubStepIds: string[],
  ) => void;
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
  dragScrollController?: DragScrollController;
  editingId?: string | null;
  announceReorder?: (stepTitle: string, position: number) => string;
  announcePromote?: (stepTitle: string) => string;
  announceNestedUnder?: (stepTitle: string, parentTitle: string) => string;
}

export interface UseEditGoalHierarchyDrag {
  draggedRowId: string | null;
  isDragging: boolean;
  armedTargetId: string | null;
  dropOutline: DropOutline | null;
  dragScrollCompensation: SharedValue<number>;
  registerRowLayout: (rowId: string, geometry: RowGeometry) => void;
  registerRemeasure: (rowId: string, fn: (() => void) | null) => void;
  registerListOrigin: (originY: number) => void;
  registerListOriginRemeasure: (fn: (() => void) | null) => void;
  canDragRow: (rowId: string) => boolean;
  handleDragStart: (rowId: string) => void;
  handleDragMove: (translationY: number, absoluteY: number) => void;
  handleDragEnd: () => void;
  moveStep: (rowId: string, direction: 1 | -1) => void;
}
