export interface DragScrollMetrics {
  offsetY: number;
  viewportTop: number;
  viewportHeight: number;
  contentHeight: number;
}

export interface DragScrollController {
  getMetrics(): DragScrollMetrics;
  scrollTo(y: number): void;
}

// Auto-scroll tuning (px). EDGE_PX is the activation band at each viewport
// edge: a drag pointer within this distance of the top/bottom edge triggers
// scrolling. Speed ramps from MIN to MAX px/frame across that band, eased in
// by `penetration ** 2` (see getAutoScrollVelocity) so a pointer grazing the
// edge scrolls gently and only the extreme edge reaches full speed. Tuned on
// device — adjust here, not per call site.
export const AUTO_SCROLL_EDGE_PX = 72;
export const AUTO_SCROLL_MIN_PX_PER_FRAME = 3;
export const AUTO_SCROLL_MAX_PX_PER_FRAME = 14;

export function getMaxScrollOffset(metrics: DragScrollMetrics): number {
  return Math.max(0, metrics.contentHeight - metrics.viewportHeight);
}

export function clampScrollOffset(
  offsetY: number,
  metrics: DragScrollMetrics,
): number {
  return Math.max(0, Math.min(getMaxScrollOffset(metrics), offsetY));
}

export function getEffectiveTranslationY(
  gestureTranslationY: number,
  currentScrollY: number,
  scrollYAtDragStart: number,
): number {
  return gestureTranslationY + currentScrollY - scrollYAtDragStart;
}

export function getAutoScrollVelocity(
  pointerY: number,
  metrics: DragScrollMetrics,
): number {
  const viewportBottom = metrics.viewportTop + metrics.viewportHeight;
  const maxOffset = getMaxScrollOffset(metrics);

  if (
    pointerY < metrics.viewportTop + AUTO_SCROLL_EDGE_PX &&
    metrics.offsetY > 0
  ) {
    const penetration = Math.min(
      1,
      Math.max(
        0,
        (metrics.viewportTop + AUTO_SCROLL_EDGE_PX - pointerY) /
          AUTO_SCROLL_EDGE_PX,
      ),
    );
    return -(
      AUTO_SCROLL_MIN_PX_PER_FRAME +
      (AUTO_SCROLL_MAX_PX_PER_FRAME - AUTO_SCROLL_MIN_PX_PER_FRAME) *
        penetration ** 2
    );
  }

  if (
    pointerY > viewportBottom - AUTO_SCROLL_EDGE_PX &&
    metrics.offsetY < maxOffset
  ) {
    const penetration = Math.min(
      1,
      Math.max(
        0,
        (pointerY - (viewportBottom - AUTO_SCROLL_EDGE_PX)) /
          AUTO_SCROLL_EDGE_PX,
      ),
    );
    return (
      AUTO_SCROLL_MIN_PX_PER_FRAME +
      (AUTO_SCROLL_MAX_PX_PER_FRAME - AUTO_SCROLL_MIN_PX_PER_FRAME) *
        penetration ** 2
    );
  }

  return 0;
}
