/**
 * useRowGeometryRegistration — shared hook that registers a row's
 * screen-absolute geometry into the hierarchy coordinator's registry
 * (issue #496, finding 5). Extracted from the duplicated `measureAndRegister`
 * + `useEffect` pattern that was copy-pasted in EditGoalStepRow and
 * EditGoalSubStepRow.
 *
 * R3/R15: `onLayout` alone reports parent-relative `y`; `measureInWindow`
 * provides the screen-absolute `y` the coordinator's hover math needs. The
 * remeasure callback is registered so drag-start can refresh this row's
 * geometry (the registry never goes stale after manual scroll — finding 2).
 *
 * @param rowId Stable id of the row (step or sub-step).
 * @param register Coordinator callback that stores `{ absoluteY, height }`.
 * @param registerRemeasure Coordinator callback that stores a remeasure fn.
 * @returns The created View `ref` and `measureAndRegister` callback to pass to
 * the measured View's `ref` and `onLayout` props.
 */
import { useEffect, useRef } from "react";
import type { View } from "react-native";
import type { RowGeometry } from "./useEditGoalHierarchyDragTypes";

export function useRowGeometryRegistration(
  rowId: string,
  register: (rowId: string, geometry: RowGeometry) => void,
  registerRemeasure: (rowId: string, fn: (() => void) | null) => void,
) {
  const ref = useRef<View>(null);

  function measureAndRegister() {
    const node = ref.current as unknown as {
      measureInWindow?: (
        cb: (x: number, y: number, w: number, h: number) => void,
      ) => void;
    } | null;
    if (node?.measureInWindow) {
      node.measureInWindow((_x, y, _w, h) => {
        register(rowId, { absoluteY: y, height: h });
      });
    }
  }

  useEffect(() => {
    registerRemeasure(rowId, measureAndRegister);
    return () => registerRemeasure(rowId, null);
    // register/registerRemeasure read refs on the coordinator; rowId is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId]);

  return { ref, measureAndRegister };
}
