import { useRef } from "react";
import type { RowGeometry } from "./useEditGoalHierarchyDragTypes";

/** Shared absolute-coordinate registry for root and sub-step drag rows. */
export function useHierarchyGeometryRegistry() {
  const geometryRef = useRef<Map<string, RowGeometry>>(new Map());
  const listOriginRef = useRef(0);
  const remeasureRef = useRef<Map<string, () => void>>(new Map());
  const listOriginRemeasureRef = useRef<(() => void) | null>(null);

  function registerRowLayout(rowId: string, geometry: RowGeometry) {
    geometryRef.current.set(rowId, geometry);
  }

  function registerRemeasure(rowId: string, remeasure: (() => void) | null) {
    if (remeasure) remeasureRef.current.set(rowId, remeasure);
    else remeasureRef.current.delete(rowId);
  }

  function registerListOrigin(originY: number) {
    listOriginRef.current = originY;
  }

  function registerListOriginRemeasure(remeasure: (() => void) | null) {
    listOriginRemeasureRef.current = remeasure;
  }

  /** Refresh one coordinate frame after a manual scroll and before dragging. */
  function refreshAllGeometry() {
    listOriginRemeasureRef.current?.();
    for (const remeasure of remeasureRef.current.values()) remeasure();
  }

  return {
    geometryRef,
    listOriginRef,
    registerRowLayout,
    registerRemeasure,
    registerListOrigin,
    registerListOriginRemeasure,
    refreshAllGeometry,
  };
}
