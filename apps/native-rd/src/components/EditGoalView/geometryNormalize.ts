/**
 * Geometry normalization helper (issue #496, R14). The unified hierarchy
 * coordinator registers row geometry as **screen-absolute** `absoluteY` (via
 * `measureInWindow`), because nested `onLayout` `y` values are parent-relative
 * and cannot be compared across groups (R3).
 *
 * `toLocalTop` — drop-outline `top` values rendered *inside* the list must be
 * list-local (the list's absolutely-positioned children use the list
 * container's coordinate origin). An absolute `y` is never rendered directly
 * as a local `top`; it is converted by subtracting the measured list origin.
 *
 * During active auto-scroll the pointer is normalized by the scroll delta via
 * the already-tested `getEffectiveTranslationY` from `dragAutoScroll` — no
 * separate helper is needed here.
 *
 * Pure + unit-tested in `__tests__/geometryNormalize.test.ts`.
 */

/** Convert a screen-absolute `y` to a list-local `top` for in-list rendering. */
export function toLocalTop(absoluteY: number, listOriginY: number): number {
  return absoluteY - listOriginY;
}
