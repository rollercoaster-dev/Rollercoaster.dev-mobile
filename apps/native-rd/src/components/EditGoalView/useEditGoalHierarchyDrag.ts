/**
 * Unified root/sub-step drag coordinator for the redesigned editor (#496).
 * `classifyDrop` remains the hierarchy source of truth; focused helpers own
 * geometry, auto-scroll, outlines, and dispatch. Dwell arms only inside a
 * measured root band, and every absolute measurement refreshes at drag start.
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { triggerDragStart, triggerDragDrop } from "../../utils/haptics";
import { classifyDrop } from "../StepList/classifyDrop";
import { flattenEditGoalSteps } from "./flattenEditGoalSteps";
import {
  canDragForRowId,
  computeDropOutline,
  dispatchDropResult,
  flatIndexAtY,
  isArmableDwellTarget,
  isInsideBand,
  siblingReorder,
  titleForRowId,
  DWELL_ARM_MS,
  type DropDispatchCallbacks,
} from "./hierarchyDragHelpers";
import type {
  DropOutline,
  UseEditGoalHierarchyDrag,
  UseEditGoalHierarchyDragParams,
} from "./useEditGoalHierarchyDragTypes";
import { useHierarchyAutoScroll } from "./useHierarchyAutoScroll";
import { useHierarchyGeometryRegistry } from "./useHierarchyGeometryRegistry";

export type {
  DropOutline,
  RowGeometry,
  UseEditGoalHierarchyDrag,
  UseEditGoalHierarchyDragParams,
} from "./useEditGoalHierarchyDragTypes";

const defaultAnnounceReorder = (stepTitle: string, position: number) =>
  `Moved "${stepTitle}" to position ${position}`;
const defaultAnnouncePromote = (stepTitle: string) =>
  `Promoted "${stepTitle}" to top level`;
const defaultAnnounceNestedUnder = (stepTitle: string, parentTitle: string) =>
  `Nested "${stepTitle}" under "${parentTitle}"`;

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

  // Gesture callbacks may outlive the render that created them. Updating this
  // ref during render is intentional: a layout effect leaves one stale event
  // window and breaks same-tick inline-edit commits under React Native.
  /* eslint-disable react-hooks/refs */
  const latestRef = useRef({ flatSteps, steps, editingId, reparentEnabled });
  latestRef.current = { flatSteps, steps, editingId, reparentEnabled };
  /* eslint-enable react-hooks/refs */

  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [armedTargetId, setArmedTargetId] = useState<string | null>(null);
  const [dropOutline, setDropOutline] = useState<DropOutline | null>(null);

  const draggedRowIdRef = useRef<string | null>(null);
  const hoverRowIdRef = useRef<string | null>(null);
  const hoverInBandRef = useRef(false); // finding 1: in-band flag
  const armedTargetIdRef = useRef<string | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragScrollCompensation = useSharedValue(0);
  const {
    geometryRef,
    listOriginRef,
    registerRowLayout,
    registerRemeasure,
    registerListOrigin,
    registerListOriginRemeasure,
    refreshAllGeometry,
  } = useHierarchyGeometryRegistry();

  useEffect(
    () => () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    },
    [],
  );

  function canDragRow(rowId: string): boolean {
    return canDragForRowId(
      latestRef.current.flatSteps,
      latestRef.current.steps,
      rowId,
      latestRef.current.editingId,
      latestRef.current.reparentEnabled,
    );
  }

  // --- Hover + dwell (finding 1: in-band tracking) --------------------------

  function updateDragHover(translationY: number) {
    const draggedId = draggedRowIdRef.current;
    if (!draggedId) return;
    const flat = latestRef.current.flatSteps;
    const draggedFlat = flat.findIndex((s) => s.id === draggedId);
    if (draggedFlat < 0) return;

    const draggedG = geometryRef.current.get(draggedId);
    const centerAbsoluteY = draggedG
      ? draggedG.absoluteY + translationY + draggedG.height / 2
      : translationY;
    const hoverFlat = flatIndexAtY(
      flat,
      geometryRef.current,
      centerAbsoluteY,
      draggedFlat,
    );
    const hoverId = flat[hoverFlat]?.id ?? null;
    const inBand = hoverId
      ? isInsideBand(geometryRef.current, hoverId, centerAbsoluteY)
      : false;

    // Finding 1: restart/disarm on either hovered-row-id OR in-band change.
    if (
      hoverId !== hoverRowIdRef.current ||
      inBand !== hoverInBandRef.current
    ) {
      hoverRowIdRef.current = hoverId;
      hoverInBandRef.current = inBand;
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      armedTargetIdRef.current = null;
      setArmedTargetId(null);

      if (
        isArmableDwellTarget(
          flat,
          latestRef.current.steps,
          draggedId,
          hoverId,
          inBand,
          latestRef.current.reparentEnabled,
        )
      ) {
        const targetId = hoverId!;
        dwellTimerRef.current = setTimeout(() => {
          dwellTimerRef.current = null;
          if (draggedRowIdRef.current === null) return;
          armedTargetIdRef.current = targetId;
          setArmedTargetId(targetId);
        }, DWELL_ARM_MS);
      }
    }

    // Drop outline preview (suppressed while armed).
    setDropOutline(
      computeDropOutline(
        flat,
        latestRef.current.steps,
        geometryRef.current,
        listOriginRef.current,
        draggedId,
        draggedFlat,
        hoverFlat,
        armedTargetIdRef.current !== null,
      ),
    );
  }

  const autoScroll = useHierarchyAutoScroll(
    dragScrollController,
    dragScrollCompensation,
    updateDragHover,
  );

  // --- Gesture handlers -----------------------------------------------------

  function handleDragStart(rowId: string) {
    // Finding 2: refresh the list origin + every registered row so the
    // registry is in one coordinate frame before any hover decision.
    refreshAllGeometry();
    draggedRowIdRef.current = rowId;
    hoverRowIdRef.current = rowId;
    hoverInBandRef.current = false;
    setDraggedRowId(rowId);
    setIsDragging(true);
    setArmedTargetId(null);
    setDropOutline(null);
    armedTargetIdRef.current = null;
    autoScroll.start();
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    triggerDragStart();
  }

  function handleDragMove(translationY: number, absoluteY: number) {
    autoScroll.move(translationY, absoluteY);
  }

  function handleDragEnd() {
    autoScroll.stop();
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    const draggedId = draggedRowIdRef.current;
    const hoverId = hoverRowIdRef.current;
    if (draggedId && hoverId) {
      const flat = latestRef.current.flatSteps;
      const draggedFlat = flat.findIndex((s) => s.id === draggedId);
      const hoverFlat = flat.findIndex((s) => s.id === hoverId);
      if (draggedFlat >= 0 && hoverFlat >= 0) {
        const result = classifyDrop(
          flat,
          draggedFlat,
          hoverFlat,
          armedTargetIdRef.current,
        );
        const callbacks: DropDispatchCallbacks = {
          onReorderSteps,
          onReorderSubSteps,
          onReparentStep,
          announceReorder,
          announcePromote,
          announceNestedUnder,
        };
        dispatchDropResult(
          result,
          flat,
          latestRef.current.steps,
          draggedId,
          callbacks,
        );
      }
    }
    draggedRowIdRef.current = null;
    hoverRowIdRef.current = null;
    hoverInBandRef.current = false;
    setDraggedRowId(null);
    setIsDragging(false);
    armedTargetIdRef.current = null;
    setArmedTargetId(null);
    setDropOutline(null);
    autoScroll.reset();
  }

  // --- Sibling-scoped ↑/↓ (R8: never reparents) ----------------------------

  function moveStep(rowId: string, direction: 1 | -1) {
    if (latestRef.current.editingId !== null) return;
    const result = siblingReorder(
      latestRef.current.flatSteps,
      rowId,
      direction,
    );
    if (!result) return;
    if (result.parent === null) onReorderSteps(result.orderedIds);
    else onReorderSubSteps(result.parent, result.orderedIds);
    triggerDragDrop(); // haptic for the move
    AccessibilityInfo.announceForAccessibility(
      announceReorder(
        titleForRowId(latestRef.current.steps, rowId),
        result.newPosition,
      ),
    );
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
    registerListOriginRemeasure,
    canDragRow,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    moveStep,
  };
}
