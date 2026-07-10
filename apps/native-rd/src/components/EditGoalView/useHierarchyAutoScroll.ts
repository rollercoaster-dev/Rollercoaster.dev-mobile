import { useEffect, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";
import {
  clampScrollOffset,
  getAutoScrollVelocity,
  getEffectiveTranslationY,
  type DragScrollController,
} from "../StepList/dragAutoScroll";

/** Edge auto-scroll state isolated from hierarchy/reparent decisions. */
export function useHierarchyAutoScroll(
  controller: DragScrollController | undefined,
  compensation: SharedValue<number>,
  updateHover: (effectiveTranslationY: number) => void,
) {
  const updateHoverRef = useRef(updateHover);
  updateHoverRef.current = updateHover;
  const lastTranslationRef = useRef(0);
  const lastAbsoluteYRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  function stop() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function runFrame() {
    frameRef.current = null;
    const pointerY = lastAbsoluteYRef.current;
    if (!controller || pointerY === null) return;
    const metrics = controller.getMetrics();
    const velocity = getAutoScrollVelocity(pointerY, metrics);
    if (velocity === 0) return;
    const nextOffset = clampScrollOffset(metrics.offsetY + velocity, metrics);
    if (nextOffset === metrics.offsetY) return;
    controller.scrollTo(nextOffset);
    compensation.value = nextOffset - startOffsetRef.current;
    updateHoverRef.current(
      getEffectiveTranslationY(
        lastTranslationRef.current,
        nextOffset,
        startOffsetRef.current,
      ),
    );
    frameRef.current = requestAnimationFrame(runFrame);
  }

  function sync() {
    const pointerY = lastAbsoluteYRef.current;
    if (!controller || pointerY === null) return stop();
    const velocity = getAutoScrollVelocity(pointerY, controller.getMetrics());
    if (velocity === 0) stop();
    else if (frameRef.current === null)
      frameRef.current = requestAnimationFrame(runFrame);
  }

  function start() {
    stop();
    lastTranslationRef.current = 0;
    lastAbsoluteYRef.current = null;
    startOffsetRef.current = controller?.getMetrics().offsetY ?? 0;
    compensation.value = 0;
  }

  function move(translationY: number, absoluteY: number) {
    lastTranslationRef.current = translationY;
    lastAbsoluteYRef.current = absoluteY;
    const currentOffset =
      controller?.getMetrics().offsetY ?? startOffsetRef.current;
    compensation.value = currentOffset - startOffsetRef.current;
    updateHoverRef.current(
      controller
        ? getEffectiveTranslationY(
            translationY,
            currentOffset,
            startOffsetRef.current,
          )
        : translationY,
    );
    sync();
  }

  function reset() {
    stop();
    lastAbsoluteYRef.current = null;
    compensation.value = 0;
  }

  useEffect(() => stop, []);

  return { start, move, stop, reset };
}
