/**
 * useEditGoalDrag — flat, single-level drag-to-reorder orchestration for
 * EditGoalView's step list (issue #445, D6).
 *
 * Owns the drag state, per-row layout tracking, the reorder hover math, and the
 * optional edge auto-scroll (reusing StepList's tested `dragAutoScroll`
 * functions). Deliberately has no substep / nesting / dwell concept — every
 * step is a top-level sibling. Extracted from the view so the reorder logic
 * stays independently testable (`reorderStepIds`) and the component readable.
 *
 * Since #459 this hook is also instantiated per-parent by EditGoalSubStepList
 * to reorder that parent's sub-step siblings — the `{ id, title }[]` shape is
 * already generic, so each instance is just another flat sibling list. No
 * top-level-only assumptions; no functional change was needed for that reuse.
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { triggerDragStart, triggerDragDrop } from "../../utils/haptics";
import {
  clampScrollOffset,
  getAutoScrollVelocity,
  getEffectiveTranslationY,
  type DragScrollController,
} from "../StepList/dragAutoScroll";

// Fixed-height fallback for the hover calc before rows report their layout.
const ITEM_HEIGHT = 56;

/**
 * Pure flat reorder (D6): move the id at `fromIndex` to `toIndex`, returning the
 * new order. No nesting — every step is a top-level sibling. Out-of-range
 * `fromIndex` returns the input unchanged; `toIndex` is clamped into range.
 */
export function reorderStepIds(
  ids: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (fromIndex < 0 || fromIndex >= ids.length) return ids;
  const clampedTo = Math.max(0, Math.min(ids.length - 1, toIndex));
  if (fromIndex === clampedTo) return ids;
  const next = ids.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return next;
}

interface RowLayout {
  y: number;
  height: number;
}

export interface UseEditGoalDragParams {
  /** Steps in render order — only id/title/length are read. */
  steps: readonly { id: string; title: string }[];
  onReorderSteps: (orderedStepIds: string[]) => void;
  /** Supplied by the screen that owns the ScrollView; omit to disable auto-scroll. */
  dragScrollController?: DragScrollController;
  /**
   * Builds the screen-reader announcement fired after a reorder (drag drop or
   * the ↑/↓ fallback). i18n-free per D9 — English default here, [Integrate]
   * passes a `t()`-backed builder. `position` is 1-based.
   */
  announceReorder?: (stepTitle: string, position: number) => string;
}

const defaultAnnounceReorder = (stepTitle: string, position: number) =>
  `Moved "${stepTitle}" to position ${position}`;

export interface UseEditGoalDrag {
  draggedIndex: number | null;
  isDragging: boolean;
  dropSlot: { top: number } | null;
  dragScrollCompensation: SharedValue<number>;
  registerRowLayout: (index: number, layout: RowLayout) => void;
  handleDragStart: (index: number) => void;
  handleDragMove: (translationY: number, absoluteY: number) => void;
  handleDragEnd: () => void;
  /** Accessible ↑/↓ fallback: move a step one position in `direction`. */
  moveStep: (index: number, direction: 1 | -1) => void;
}

export function useEditGoalDrag({
  steps,
  onReorderSteps,
  dragScrollController,
  announceReorder = defaultAnnounceReorder,
}: UseEditGoalDragParams): UseEditGoalDrag {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropSlot, setDropSlot] = useState<{ top: number } | null>(null);

  // Refs are authoritative for gesture callbacks (which can outlive the render
  // that created them); state mirrors them only to drive rendering.
  const draggedIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const rowLayoutsRef = useRef<(RowLayout | undefined)[]>([]);
  const lastDragTranslationYRef = useRef(0);
  const lastDragAbsoluteYRef = useRef<number | null>(null);
  const dragStartScrollOffsetRef = useRef(0);
  const autoScrollFrameRef = useRef<number | null>(null);
  const dragScrollCompensation = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
      }
    };
  }, []);

  function registerRowLayout(index: number, layout: RowLayout) {
    rowLayoutsRef.current[index] = layout;
  }

  function stopAutoScroll() {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }

  // Which row's measured band contains `centerY`. Falls back to keeping the
  // dragged row put when no geometry has been reported yet.
  function rowIndexAtY(centerY: number, draggedFrom: number): number {
    const layouts = rowLayoutsRef.current;
    for (let i = 0; i < steps.length; i++) {
      const l = layouts[i];
      if (!l) continue;
      if (centerY < l.y + l.height) return i;
    }
    if (layouts.some(Boolean)) return steps.length - 1;
    return draggedFrom;
  }

  function updateDragHover(translationY: number) {
    const activeDraggedIndex = draggedIndexRef.current;
    if (activeDraggedIndex === null) return;

    const draggedLayout = rowLayoutsRef.current[activeDraggedIndex];
    let newIndex: number;
    if (draggedLayout) {
      const dragCenterY =
        draggedLayout.y + translationY + draggedLayout.height / 2;
      newIndex = rowIndexAtY(dragCenterY, activeDraggedIndex);
    } else {
      newIndex = activeDraggedIndex + Math.round(translationY / ITEM_HEIGHT);
    }
    newIndex = Math.max(0, Math.min(steps.length - 1, newIndex));
    hoverIndexRef.current = newIndex;

    const slotLayout = rowLayoutsRef.current[newIndex];
    if (newIndex === activeDraggedIndex || !slotLayout) {
      setDropSlot(null);
      return;
    }
    // Below the row when moving down, above it when moving up; -1 straddles the
    // boundary. Clamp at 0 so an insert above the first row stays in-bounds.
    const top = Math.max(
      0,
      (newIndex > activeDraggedIndex
        ? slotLayout.y + slotLayout.height
        : slotLayout.y) - 1,
    );
    setDropSlot((prev) => (prev?.top === top ? prev : { top }));
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
    dragScrollCompensation.value =
      nextOffset - dragStartScrollOffsetRef.current;
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

  function handleDragStart(index: number) {
    draggedIndexRef.current = index;
    hoverIndexRef.current = index;
    setDraggedIndex(index);
    setIsDragging(true);
    setDropSlot(null);
    lastDragTranslationYRef.current = 0;
    lastDragAbsoluteYRef.current = null;
    dragStartScrollOffsetRef.current =
      dragScrollController?.getMetrics().offsetY ?? 0;
    dragScrollCompensation.value = 0;
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
    updateDragHover(
      getEffectiveTranslationY(
        translationY,
        currentScrollY,
        dragStartScrollOffsetRef.current,
      ),
    );
    syncAutoScroll();
  }

  function handleDragEnd() {
    stopAutoScroll();
    const from = draggedIndexRef.current;
    const to = hoverIndexRef.current;
    if (from !== null && to !== null && from !== to) {
      const dragged = steps[from];
      onReorderSteps(
        reorderStepIds(
          steps.map((s) => s.id),
          from,
          to,
        ),
      );
      triggerDragDrop();
      AccessibilityInfo.announceForAccessibility(
        announceReorder(dragged?.title ?? "", to + 1),
      );
    }
    draggedIndexRef.current = null;
    hoverIndexRef.current = null;
    setDraggedIndex(null);
    setIsDragging(false);
    setDropSlot(null);
    lastDragAbsoluteYRef.current = null;
    dragScrollCompensation.value = 0;
  }

  function moveStep(index: number, direction: 1 | -1) {
    const to = index + direction;
    if (to < 0 || to >= steps.length) return;
    onReorderSteps(
      reorderStepIds(
        steps.map((s) => s.id),
        index,
        to,
      ),
    );
    triggerDragDrop();
    AccessibilityInfo.announceForAccessibility(
      announceReorder(steps[index].title, to + 1),
    );
  }

  return {
    draggedIndex,
    isDragging,
    dropSlot,
    dragScrollCompensation,
    registerRowLayout,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    moveStep,
  };
}
