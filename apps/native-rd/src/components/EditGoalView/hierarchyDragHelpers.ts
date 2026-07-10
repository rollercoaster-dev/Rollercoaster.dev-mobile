/**
 * Pure helpers for useEditGoalHierarchyDrag (issue #496, finding 5 split).
 * Extracted so the coordinator hook stays under the 300-line lint limit and
 * each piece is independently unit-testable. None of these touch React state
 * or refs — they take the flat list + geometry registry + callbacks and return
 * values or perform dispatch.
 */
import { AccessibilityInfo } from "react-native";
import { triggerDragDrop } from "../../utils/haptics";
import {
  classifyDrop,
  type ClassifyStep,
  type DropResult,
} from "../StepList/classifyDrop";
import { toLocalTop } from "./geometryNormalize";
import type { EditGoalStep } from "./EditGoalView";
import type { RowGeometry, DropOutline } from "./useEditGoalHierarchyDragTypes";

/** Dwell duration before a hovered root target arms for demote (R12). */
export const DWELL_ARM_MS = 220;

/**
 * R13: per-row canDrag from the flattened hierarchy + edit state + available
 * actions. A root needs ≥1 other root; a sub-step is draggable when reparent
 * is enabled (a lone child can promote / move) or when it has siblings.
 */
export function canDragForRowId(
  flat: readonly ClassifyStep[],
  steps: readonly EditGoalStep[],
  rowId: string,
  editingId: string | null,
  reparentEnabled: boolean,
): boolean {
  if (editingId !== null) return false;
  const idx = flat.findIndex((s) => s.id === rowId);
  if (idx < 0) return false;
  const step = flat[idx];
  if (step.parentStepId === null) {
    return steps.length > 1;
  }
  const parent = steps.find((s) => s.id === step.parentStepId);
  const siblingCount = parent?.subSteps?.length ?? 0;
  if (reparentEnabled) return true;
  return siblingCount > 1;
}

/**
 * Flat index of the row whose measured band contains `centerAbsoluteY`.
 * Gaps between rows map to the neighbouring row (the insertion target), so
 * callers that need dwell-zoned hit-testing must separately check whether the
 * center is actually inside the returned row's band (see `isInsideBand`).
 */
export function flatIndexAtY(
  flat: readonly ClassifyStep[],
  geometry: Map<string, RowGeometry>,
  centerAbsoluteY: number,
  draggedFlat: number,
): number {
  for (let i = 0; i < flat.length; i++) {
    const g = geometry.get(flat[i].id);
    if (!g) continue;
    if (centerAbsoluteY < g.absoluteY + g.height) return i;
  }
  if (flat.some((s) => geometry.has(s.id))) {
    return flat.length - 1;
  }
  return draggedFlat;
}

/** Whether `centerAbsoluteY` falls inside `rowId`'s measured band (R12 dwell). */
export function isInsideBand(
  geometry: Map<string, RowGeometry>,
  rowId: string,
  centerAbsoluteY: number,
): boolean {
  const g = geometry.get(rowId);
  if (!g) return false;
  return (
    centerAbsoluteY >= g.absoluteY && centerAbsoluteY <= g.absoluteY + g.height
  );
}

/** Whether the dragged step is a root that has children (can't be demoted). */
export function draggedHasChildren(
  flat: readonly ClassifyStep[],
  steps: readonly EditGoalStep[],
  draggedId: string,
): boolean {
  const draggedStep = flat.find((s) => s.id === draggedId);
  if (!draggedStep || draggedStep.parentStepId !== null) return false;
  return (steps.find((s) => s.id === draggedId)?.subSteps?.length ?? 0) > 0;
}

/**
 * Whether a root header is a valid dwell-arm target for the dragged leaf:
 * the target is a root, distinct from the dragged step, and the dragged step
 * is itself a leaf (mirrors classifyDrop's dwell rule so the highlight never
 * lies). `inBand` must be true — arming only happens inside the measured band.
 */
export function isArmableDwellTarget(
  flat: readonly ClassifyStep[],
  steps: readonly EditGoalStep[],
  draggedId: string,
  hoveredId: string | null,
  inBand: boolean,
  reparentEnabled: boolean,
): boolean {
  if (!reparentEnabled || !hoveredId || !inBand) return false;
  const hovered = flat.find((s) => s.id === hoveredId);
  if (!hovered || hovered.parentStepId !== null) return false;
  if (hoveredId === draggedId) return false;
  return !draggedHasChildren(flat, steps, draggedId);
}

/**
 * Pure drop-outline computation from the flat list + geometry + list origin.
 * Returns `null` when armed (suppressed), same-row, or a refused drop. Outline
 * `top` values are list-local (`absoluteY - listOriginY`), never raw absolute.
 */
export function computeDropOutline(
  flat: readonly ClassifyStep[],
  steps: readonly EditGoalStep[],
  geometry: Map<string, RowGeometry>,
  listOriginY: number,
  draggedId: string,
  draggedFlat: number,
  hoverFlat: number,
  armed: boolean,
): DropOutline | null {
  if (armed) return null;
  if (hoverFlat === draggedFlat) return null;
  const preview = classifyDrop(flat, draggedFlat, hoverFlat, null);
  if (preview.kind === "none") return null;
  const slotId = flat[hoverFlat]?.id ?? "";
  const slotG = geometry.get(slotId);
  if (!slotG) return null;

  const isNested =
    preview.kind === "reparent"
      ? preview.newParentStepId !== null
      : preview.parentStepId !== null;

  const isGroupReorder =
    draggedHasChildren(flat, steps, draggedId) &&
    preview.kind === "reorder" &&
    preview.parentStepId === null;

  if (isGroupReorder) {
    const targetRootId = flat[hoverFlat].parentStepId ?? flat[hoverFlat].id;
    const groupStart = flat.findIndex((s) => s.id === targetRootId);
    let groupEnd = groupStart;
    while (
      groupEnd + 1 < flat.length &&
      flat[groupEnd + 1].parentStepId === targetRootId
    ) {
      groupEnd++;
    }
    const startG = geometry.get(flat[groupStart].id);
    const endG = geometry.get(flat[groupEnd].id);
    if (!startG || !endG) return null;
    return {
      top: toLocalTop(startG.absoluteY, listOriginY),
      height: endG.absoluteY + endG.height - startG.absoluteY,
      kind: "group",
    };
  }
  if (isNested) {
    return {
      top: toLocalTop(slotG.absoluteY, listOriginY),
      height: slotG.height,
      kind: "nested",
    };
  }
  const top =
    hoverFlat > draggedFlat ? slotG.absoluteY + slotG.height : slotG.absoluteY;
  return { top: toLocalTop(top, listOriginY), height: 3, kind: "line" };
}

/** Look up a row's display title across roots and sub-steps (ids are unique). */
export function titleForRowId(
  steps: readonly EditGoalStep[],
  rowId: string,
): string {
  for (const s of steps) {
    if (s.id === rowId) return s.title;
    const sub = s.subSteps?.find((ss) => ss.id === rowId);
    if (sub) return sub.title;
  }
  return rowId;
}

export interface DropDispatchCallbacks {
  onReorderSteps: (orderedStepIds: string[]) => void;
  onReorderSubSteps: (
    parentStepId: string,
    orderedSubStepIds: string[],
  ) => void;
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
  announceReorder: (stepTitle: string, position: number) => string;
  announcePromote: (stepTitle: string) => string;
  announceNestedUnder: (stepTitle: string, parentTitle: string) => string;
}

/**
 * Dispatch a classifyDrop result to the right callback + fire haptics + an
 * accessibility announcement. Returns true if a callback actually dispatched.
 */
export function dispatchDropResult(
  result: DropResult,
  flat: readonly ClassifyStep[],
  steps: readonly EditGoalStep[],
  draggedId: string,
  callbacks: DropDispatchCallbacks,
): boolean {
  let dispatched = false;
  if (result.kind === "reorder") {
    if (result.parentStepId === null) {
      callbacks.onReorderSteps(result.orderedIds);
      dispatched = true;
    } else {
      callbacks.onReorderSubSteps(result.parentStepId, result.orderedIds);
      dispatched = true;
    }
  } else if (result.kind === "reparent") {
    callbacks.onReparentStep?.(result.stepId, result.newParentStepId);
    dispatched = callbacks.onReparentStep !== undefined;
  }
  if (!dispatched) return false;
  triggerDragDrop();
  if (result.kind === "reparent") {
    const stepTitle = titleForRowId(steps, result.stepId);
    if (result.newParentStepId === null) {
      AccessibilityInfo.announceForAccessibility(
        callbacks.announcePromote(stepTitle),
      );
    } else {
      const parentTitle =
        steps.find((s) => s.id === result.newParentStepId)?.title ?? "";
      AccessibilityInfo.announceForAccessibility(
        callbacks.announceNestedUnder(stepTitle, parentTitle),
      );
    }
  } else if (result.kind === "reorder") {
    const draggedTitle = titleForRowId(steps, draggedId);
    AccessibilityInfo.announceForAccessibility(
      callbacks.announceReorder(
        draggedTitle,
        result.orderedIds.indexOf(draggedId) + 1,
      ),
    );
  }
  return true;
}

/**
 * R8: sibling-scoped ↑/↓ reorder. Resolves the sibling group from the flat
 * step's parentStepId, swaps within it, and returns the new ordered ids + the
 * target's 1-based position (or null at a group boundary — never reparents).
 */
export function siblingReorder(
  flat: readonly ClassifyStep[],
  rowId: string,
  direction: 1 | -1,
): { parent: string | null; orderedIds: string[]; newPosition: number } | null {
  const idx = flat.findIndex((s) => s.id === rowId);
  if (idx < 0) return null;
  const step = flat[idx];
  const parent = step.parentStepId ?? null;
  const group = flat.filter((s) => (s.parentStepId ?? null) === parent);
  const pos = group.findIndex((s) => s.id === rowId);
  const swapWith = pos + direction;
  if (swapWith < 0 || swapWith >= group.length) return null;
  const reordered = [...group];
  [reordered[pos], reordered[swapWith]] = [reordered[swapWith], reordered[pos]];
  return {
    parent,
    orderedIds: reordered.map((s) => s.id),
    newPosition: swapWith + 1,
  };
}
