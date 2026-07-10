/**
 * useEditGoalHierarchyDrag — the unified flattened-hierarchy drag coordinator
 * for the redesigned Edit Goal editor (issue #496, R2). Replaces the old
 * architecture of one root `useEditGoalDrag` plus one independent
 * `useEditGoalDrag` per parent, which could not receive child drag gestures at
 * the root level and therefore could not support drag promote or
 * move-between-parents (review #1).
 *
 * One hook, one flat index space, one shared row-geometry registry. Root and
 * sub-step rows alike register their screen-absolute geometry (R3) and receive
 * drag handlers keyed by row id. `classifyDrop` (reused unchanged, R1) decides
 * reorder vs. reparent from the flat list; this hook dispatches
 * `onReorderSteps` / `onReorderSubSteps` / `onReparentStep`.
 *
 * Always called (review #2). When `onReparentStep` is omitted the reparent
 * dispatch path no-ops and the hook collapses to local sibling reorder only
 * (R5); `canDragRow` also falls back to the old sibling-count behavior (R13).
 *
 * Drag-reparent decisions: `classifyDrop` takes a flat render-order list
 * (`flattenEditGoalSteps`), the dragged flat index, the hover flat index, and
 * an optional armed dwell target id. Dwell-arm (R12) arms a root header as a
 * demote target after `DWELL_ARM_MS` ms of hovering within its measured band.
 *
 * Geometry (R14/R15): rows register `{ absoluteY, height }` measured via
 * `measureInWindow` (called from `onLayout` and on drag-start refresh via
 * `refreshGeometry`). Drop outlines are returned as list-local `top` values
 * (`absoluteY - listOriginY`); an absolute `y` is never rendered directly as a
 * local `top`. During edge auto-scroll the pointer is normalized by the scroll
 * delta so the registry does not go stale. `dragScrollController` is optional
 * (omitted in Storybook — short lists don't scroll).
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { triggerDragStart, triggerDragDrop } from "../../utils/haptics";
import { classifyDrop } from "../StepList/classifyDrop";
import {
  clampScrollOffset,
  getAutoScrollVelocity,
  getEffectiveTranslationY,
  type DragScrollController,
} from "../StepList/dragAutoScroll";
import { flattenEditGoalSteps } from "./flattenEditGoalSteps";
import { toLocalTop } from "./geometryNormalize";
import { reorderStepIds } from "./useEditGoalDrag";
import type { EditGoalStep } from "./EditGoalView";

/** Dwell duration before a hovered root target arms for demote (R12). */
const DWELL_ARM_MS = 220;

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
  /** Optional. When omitted the reparent path no-ops (R5). */
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
  /** Optional auto-scroll controller; omitted in Storybook. */
  dragScrollController?: DragScrollController;
  /** Suspend drag while a row is being inline-edited (existing invariant). */
  editingId?: string | null;
  /** Builds the reorder announcement (1-based position). */
  announceReorder?: (stepTitle: string, position: number) => string;
  /** Announcement for a promote (child → root). */
  announcePromote?: (stepTitle: string) => string;
  /** Announcement for a demote / move-between-parents. */
  announceNestedUnder?: (stepTitle: string, parentTitle: string) => string;
}

const defaultAnnounceReorder = (stepTitle: string, position: number) =>
  `Moved "${stepTitle}" to position ${position}`;
const defaultAnnouncePromote = (stepTitle: string) =>
  `Promoted "${stepTitle}" to top level`;
const defaultAnnounceNestedUnder = (stepTitle: string, parentTitle: string) =>
  `Nested "${stepTitle}" under "${parentTitle}"`;

export interface UseEditGoalHierarchyDrag {
  draggedRowId: string | null;
  isDragging: boolean;
  armedTargetId: string | null;
  dropOutline: DropOutline | null;
  dragScrollCompensation: ReturnType<typeof useSharedValue<number>>;
  /** Register a row's screen-absolute geometry (R3/R15). */
  registerRowLayout: (rowId: string, geometry: RowGeometry) => void;
  /** Register a remeasure callback so drag-start can refresh geometry (R15). */
  registerRemeasure: (rowId: string, fn: (() => void) | null) => void;
  /** Register the list container's screen-absolute origin (R14). */
  registerListOrigin: (originY: number) => void;
  /** Remeasure a row on demand (drag-start refresh). */
  refreshGeometry: (rowId: string) => void;
  /** Per-row drag eligibility from the flattened hierarchy (R13). */
  canDragRow: (rowId: string) => boolean;
  handleDragStart: (rowId: string) => void;
  handleDragMove: (translationY: number, absoluteY: number) => void;
  handleDragEnd: () => void;
  /** Sibling-scoped ↑/↓ fallback (never reparents, R8). */
  moveStep: (rowId: string, direction: 1 | -1) => void;
  /** Flat index for a row id (for rows that need it). */
  flatIndexForRowId: (rowId: string) => number;
}

export function useEditGoalHierarchyDrag({
  steps,
  onReorderSteps,
  onReorderSubSteps,
  onReparentStep,
  dragScrollController,
  editingId = null,
  announceReorder = defaultAnnounceReorder,
  announcePromote = defaultAnnouncePromote,
  announceNestedUnder = defaultAnnounceNestedUnder,
}: UseEditGoalHierarchyDragParams): UseEditGoalHierarchyDrag {
  const reparentEnabled = onReparentStep !== undefined;

  const flatSteps = flattenEditGoalSteps(steps);

  // Keep the latest flat list + steps in refs so gesture callbacks (which can
  // outlive the render that created them) never read a stale list.
  const flatStepsRef = useRef(flatSteps);
  flatStepsRef.current = flatSteps;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;
  const reparentEnabledRef = useRef(reparentEnabled);
  reparentEnabledRef.current = reparentEnabled;

  // Look up a row's display title across both roots and sub-steps (ids are
  // unique across both). Used for accessibility announcements.
  function titleForRowId(rowId: string): string {
    for (const s of stepsRef.current) {
      if (s.id === rowId) return s.title;
      const sub = s.subSteps?.find((ss) => ss.id === rowId);
      if (sub) return sub.title;
    }
    return rowId;
  }

  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [armedTargetId, setArmedTargetId] = useState<string | null>(null);
  const [dropOutline, setDropOutline] = useState<DropOutline | null>(null);

  const draggedRowIdRef = useRef<string | null>(null);
  const hoverRowIdRef = useRef<string | null>(null);
  const armedTargetIdRef = useRef<string | null>(null);
  const geometryRef = useRef<Map<string, RowGeometry>>(new Map());
  const remeasureRef = useRef<Map<string, () => void>>(new Map());
  const listOriginRef = useRef(0);
  const lastDragTranslationYRef = useRef(0);
  const lastDragAbsoluteYRef = useRef<number | null>(null);
  const dragStartScrollOffsetRef = useRef(0);
  const autoScrollFrameRef = useRef<number | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverRowIdForDwellRef = useRef<string | null>(null);
  const dragScrollCompensation = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
      }
    };
  }, []);

  const registerRowLayout = (rowId: string, geometry: RowGeometry) => {
    geometryRef.current.set(rowId, geometry);
  };

  const registerRemeasure = (rowId: string, fn: (() => void) | null) => {
    if (fn) remeasureRef.current.set(rowId, fn);
    else remeasureRef.current.delete(rowId);
  };

  const registerListOrigin = (originY: number) => {
    listOriginRef.current = originY;
  };

  const refreshGeometry = (rowId: string) => {
    remeasureRef.current.get(rowId)?.();
  };

  // --- R13: per-row canDrag from the flattened hierarchy + edit state --------
  const canDragRow = (rowId: string): boolean => {
    if (editingIdRef.current !== null) return false;
    const flat = flatStepsRef.current;
    const idx = flat.findIndex((s) => s.id === rowId);
    if (idx < 0) return false;
    const step = flat[idx];
    const isRoot = step.parentStepId === null;
    const stepsNow = stepsRef.current;
    if (isRoot) {
      // A root needs ≥1 other root to reorder among or to nest under; a lone
      // root (rootCount === 1) has no valid target in either mode (R13).
      const rootCount = stepsNow.length;
      return rootCount > 1;
    }
    // Sub-step: when reparent is enabled a lone child is draggable (it can
    // promote / move between parents); otherwise the old sibling-count gate
    // applies (R13).
    const parent = stepsNow.find((s) => s.id === step.parentStepId);
    const siblingCount = parent?.subSteps?.length ?? 0;
    if (reparentEnabledRef.current) return true;
    return siblingCount > 1;
  };

  // --- Helpers --------------------------------------------------------------

  // Flat index of the row whose measured band contains `centerAbsoluteY`.
  function flatIndexAtY(centerAbsoluteY: number, draggedFlat: number): number {
    const flat = flatStepsRef.current;
    for (let i = 0; i < flat.length; i++) {
      const g = geometryRef.current.get(flat[i].id);
      if (!g) continue;
      if (centerAbsoluteY < g.absoluteY + g.height) return i;
    }
    if (flat.some((s) => geometryRef.current.has(s.id))) {
      return flat.length - 1;
    }
    return draggedFlat;
  }

  function stopAutoScroll() {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }

  function updateDragHover(translationY: number) {
    const draggedId = draggedRowIdRef.current;
    if (!draggedId) return;
    const flat = flatStepsRef.current;
    const draggedFlat = flat.findIndex((s) => s.id === draggedId);
    if (draggedFlat < 0) return;

    const draggedG = geometryRef.current.get(draggedId);
    let centerAbsoluteY: number;
    if (draggedG) {
      centerAbsoluteY = draggedG.absoluteY + translationY + draggedG.height / 2;
    } else {
      centerAbsoluteY = translationY;
    }
    const hoverFlat = flatIndexAtY(centerAbsoluteY, draggedFlat);
    const hoverId = flat[hoverFlat]?.id ?? null;

    if (hoverId !== hoverRowIdRef.current) {
      hoverRowIdRef.current = hoverId;
      // Dwell disarm on row change.
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      armedTargetIdRef.current = null;
      setArmedTargetId(null);
      hoverRowIdForDwellRef.current = hoverId;

      // Arm only on a valid dwell target: a root, not the dragged step, while
      // dragging a leaf (mirrors classifyDrop's dwell rule).
      const draggedStep = flat[draggedFlat];
      const draggedHasChildren =
        draggedStep.parentStepId === null &&
        (stepsRef.current.find((s) => s.id === draggedId)?.subSteps?.length ??
          0) > 0;
      const hoveredStep = flat[hoverFlat];
      const armable =
        reparentEnabledRef.current &&
        !!hoveredStep &&
        hoveredStep.parentStepId === null &&
        hoveredStep.id !== draggedId &&
        !draggedHasChildren;
      if (armable) {
        dwellTimerRef.current = setTimeout(() => {
          dwellTimerRef.current = null;
          if (draggedRowIdRef.current === null) return;
          armedTargetIdRef.current = hoveredStep!.id;
          setArmedTargetId(hoveredStep!.id);
        }, DWELL_ARM_MS);
      }
    }

    // Drop outline preview via classifyDrop (suppressed while armed).
    if (armedTargetIdRef.current !== null) {
      setDropOutline(null);
      return;
    }
    if (hoverFlat === draggedFlat) {
      setDropOutline(null);
      return;
    }
    const preview = classifyDrop(flat, draggedFlat, hoverFlat, null);
    if (preview.kind === "none") {
      setDropOutline(null);
      return;
    }
    const slotG = geometryRef.current.get(flat[hoverFlat]?.id ?? "");
    if (!slotG) {
      setDropOutline(null);
      return;
    }
    const localTop = toLocalTop(slotG.absoluteY, listOriginRef.current);
    const isNested =
      preview.kind === "reparent"
        ? preview.newParentStepId !== null
        : preview.parentStepId !== null;
    // Group reorder of a root-with-children: outline the whole destination group.
    const draggedStep = flat[draggedFlat];
    const draggedHasChildren =
      draggedStep.parentStepId === null &&
      (stepsRef.current.find((s) => s.id === draggedId)?.subSteps?.length ??
        0) > 0;
    const isGroupReorder =
      draggedHasChildren &&
      preview.kind === "reorder" &&
      preview.parentStepId === null;
    if (isGroupReorder) {
      // Outline from the target root header through its last child.
      const targetRootId = flat[hoverFlat].parentStepId ?? flat[hoverFlat].id;
      const groupStart = flat.findIndex((s) => s.id === targetRootId);
      let groupEnd = groupStart;
      while (
        groupEnd + 1 < flat.length &&
        flat[groupEnd + 1].parentStepId === targetRootId
      ) {
        groupEnd++;
      }
      const startG = geometryRef.current.get(flat[groupStart].id);
      const endG = geometryRef.current.get(flat[groupEnd].id);
      if (startG && endG) {
        setDropOutline({
          top: toLocalTop(startG.absoluteY, listOriginRef.current),
          height: endG.absoluteY + endG.height - startG.absoluteY,
          kind: "group",
        });
      } else {
        setDropOutline(null);
      }
    } else if (isNested) {
      setDropOutline({ top: localTop, height: slotG.height, kind: "nested" });
    } else {
      const top =
        hoverFlat > draggedFlat
          ? slotG.absoluteY + slotG.height
          : slotG.absoluteY;
      setDropOutline({
        top: toLocalTop(top, listOriginRef.current),
        height: 3,
        kind: "line",
      });
    }
  }

  function runAutoScrollFrame() {
    autoScrollFrameRef.current = null;
    const pointerY = lastDragAbsoluteYRef.current;
    if (!dragScrollController || pointerY === null) return;
    const metrics = dragScrollController.getMetrics();
    const velocity = getAutoScrollVelocity(pointerY, metrics);
    if (velocity === 0) return;
    const nextOffset = clampScrollOffset(metrics.offsetY + velocity, metrics);
    if (nextOffset === metrics.offsetY) return;
    dragScrollController.scrollTo(nextOffset);
    const scrollDelta = nextOffset - dragStartScrollOffsetRef.current;
    dragScrollCompensation.value = scrollDelta;
    updateDragHover(
      getEffectiveTranslationY(
        lastDragTranslationYRef.current,
        nextOffset,
        dragStartScrollOffsetRef.current,
      ),
    );
    autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollFrame);
  }

  function syncAutoScroll() {
    const pointerY = lastDragAbsoluteYRef.current;
    if (!dragScrollController || pointerY === null) {
      stopAutoScroll();
      return;
    }
    const velocity = getAutoScrollVelocity(
      pointerY,
      dragScrollController.getMetrics(),
    );
    if (velocity === 0) {
      stopAutoScroll();
    } else if (autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollFrame);
    }
  }

  // --- Gesture handlers -----------------------------------------------------

  function handleDragStart(rowId: string) {
    // R15: remeasure the dragged row on drag start so the registry is fresh.
    refreshGeometry(rowId);
    draggedRowIdRef.current = rowId;
    hoverRowIdRef.current = rowId;
    hoverRowIdForDwellRef.current = rowId;
    setDraggedRowId(rowId);
    setIsDragging(true);
    setArmedTargetId(null);
    setDropOutline(null);
    armedTargetIdRef.current = null;
    lastDragTranslationYRef.current = 0;
    lastDragAbsoluteYRef.current = null;
    dragStartScrollOffsetRef.current =
      dragScrollController?.getMetrics().offsetY ?? 0;
    dragScrollCompensation.value = 0;
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    triggerDragStart();
  }

  function handleDragMove(translationY: number, absoluteY: number) {
    lastDragTranslationYRef.current = translationY;
    lastDragAbsoluteYRef.current = absoluteY;
    const currentScrollY =
      dragScrollController?.getMetrics().offsetY ??
      dragStartScrollOffsetRef.current;
    dragScrollCompensation.value =
      currentScrollY - dragStartScrollOffsetRef.current;
    // R14: normalize the pointer by the scroll delta when a controller is
    // present so the screen-absolute registry does not go stale. Without a
    // controller (Storybook) the delta is 0 and this is a passthrough.
    const effective = dragScrollController
      ? getEffectiveTranslationY(
          translationY,
          currentScrollY,
          dragStartScrollOffsetRef.current,
        )
      : translationY;
    updateDragHover(effective);
    syncAutoScroll();
  }

  function handleDragEnd() {
    stopAutoScroll();
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    const draggedId = draggedRowIdRef.current;
    const hoverId = hoverRowIdRef.current;
    if (draggedId && hoverId) {
      const flat = flatStepsRef.current;
      const draggedFlat = flat.findIndex((s) => s.id === draggedId);
      const hoverFlat = flat.findIndex((s) => s.id === hoverId);
      if (draggedFlat >= 0 && hoverFlat >= 0) {
        const result = classifyDrop(
          flat,
          draggedFlat,
          hoverFlat,
          armedTargetIdRef.current,
        );
        let dispatched = false;
        if (result.kind === "reorder") {
          if (result.parentStepId === null) {
            onReorderSteps(result.orderedIds);
            dispatched = true;
          } else {
            onReorderSubSteps(result.parentStepId, result.orderedIds);
            dispatched = true;
          }
        } else if (result.kind === "reparent") {
          onReparentStep?.(result.stepId, result.newParentStepId);
          dispatched = onReparentStep !== undefined;
        }
        if (dispatched) {
          triggerDragDrop();
          if (result.kind === "reparent") {
            const stepTitle = titleForRowId(result.stepId);
            if (result.newParentStepId === null) {
              AccessibilityInfo.announceForAccessibility(
                announcePromote(stepTitle),
              );
            } else {
              const parentTitle =
                stepsRef.current.find((s) => s.id === result.newParentStepId)
                  ?.title ?? "";
              AccessibilityInfo.announceForAccessibility(
                announceNestedUnder(stepTitle, parentTitle),
              );
            }
          } else if (result.kind === "reorder") {
            const draggedTitle = titleForRowId(draggedId);
            AccessibilityInfo.announceForAccessibility(
              announceReorder(
                draggedTitle,
                result.orderedIds.indexOf(draggedId) + 1,
              ),
            );
          }
        }
      }
    }
    draggedRowIdRef.current = null;
    hoverRowIdRef.current = null;
    hoverRowIdForDwellRef.current = null;
    setDraggedRowId(null);
    setIsDragging(false);
    armedTargetIdRef.current = null;
    setArmedTargetId(null);
    setDropOutline(null);
    lastDragAbsoluteYRef.current = null;
    dragScrollCompensation.value = 0;
  }

  // --- Sibling-scoped ↑/↓ (R8: never reparents) ----------------------------
  function moveStep(rowId: string, direction: 1 | -1) {
    if (editingIdRef.current !== null) return;
    const flat = flatStepsRef.current;
    const idx = flat.findIndex((s) => s.id === rowId);
    if (idx < 0) return;
    const step = flat[idx];
    const parent = step.parentStepId ?? null;
    const group = flat.filter((s) => (s.parentStepId ?? null) === parent);
    const pos = group.findIndex((s) => s.id === rowId);
    const swapWith = pos + direction;
    if (swapWith < 0 || swapWith >= group.length) return;
    const reordered = [...group];
    [reordered[pos], reordered[swapWith]] = [
      reordered[swapWith],
      reordered[pos],
    ];
    const ids = reordered.map((s) => s.id);
    if (parent === null) {
      onReorderSteps(ids);
    } else {
      onReorderSubSteps(parent, ids);
    }
    triggerDragDrop();
    const title = titleForRowId(rowId);
    AccessibilityInfo.announceForAccessibility(
      announceReorder(title, swapWith + 1),
    );
  }

  function flatIndexForRowId(rowId: string): number {
    return flatSteps.findIndex((s) => s.id === rowId);
  }

  return {
    draggedRowId,
    isDragging,
    armedTargetId,
    dropOutline,
    dragScrollCompensation,
    registerRowLayout,
    registerRemeasure,
    registerListOrigin,
    refreshGeometry,
    canDragRow,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    moveStep,
    flatIndexForRowId,
  };
}

// Re-export for consumers that previously imported from useEditGoalDrag.
export { reorderStepIds };
