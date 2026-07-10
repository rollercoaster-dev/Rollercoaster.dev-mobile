/**
 * Geometry normalization helpers (issue #496, R14). The unified hierarchy
 * coordinator registers row geometry as **screen-absolute** `absoluteY` (via
 * `measureInWindow`), because nested `onLayout` `y` values are parent-relative
 * and cannot be compared across groups (R3). Two conversions are needed:
 *
 * - `toLocalTop` — drop-outline `top` values rendered *inside* the list must be
 *   list-local (the list's absolutely-positioned children use the list
 *   container's coordinate origin). An absolute `y` is never rendered directly
 *   as a local `top`; it is converted by subtracting the measured list origin.
 * - `normalizePointerY` — during edge auto-scroll the screen-absolute registry
 *   (measured at drag start) goes stale: rows physically move as content
 *   scrolls. The pointer's screen `absoluteY` is normalized back into the
 *   measurement frame by adding the accumulated scroll delta
 *   (`currentScroll - scrollAtDragStart`), so hover math stays aligned. When no
 *   scrolling occurs the delta is 0 and this is a passthrough.
 *
 * Pure + unit-tested in `__tests__/geometryNormalize.test.ts` so the math is
 * locked independently of the gesture hook.
 */

/** Convert a screen-absolute `y` to a list-local `top` for in-list rendering. */
export function toLocalTop(absoluteY: number, listOriginY: number): number {
  return absoluteY - listOriginY;
}

/**
 * Normalize a screen-absolute pointer `y` into the registry's measurement
 * frame by adding the accumulated scroll delta. `scrollDelta` is
 * `currentScrollOffset - scrollOffsetAtDragStart` (≥ 0 when scrolled down).
 */
export function normalizePointerY(
  pointerAbsoluteY: number,
  scrollDelta: number,
): number {
  return pointerAbsoluteY + scrollDelta;
}
