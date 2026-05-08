/**
 * Geometric helpers for the badge layout invariant test matrix.
 *
 * These are intentionally tiny pure utilities used to assert containment,
 * non-overlap, and centering across the cartesian product of badge designs.
 * They live next to the tests that use them — not in production source — so
 * the renderer never accidentally depends on test-only conventions.
 */

import type { Box, LayoutBoxes } from "../layoutBoxes";
import type { BadgeShape } from "../types";

export type Point = { x: number; y: number };

/**
 * Boxes are treated as half-open rectangles `[x, x+w) × [y, y+h)`. Two boxes
 * touching exactly along an edge are NOT considered overlapping — useful for
 * "the bottom label sits flush below the shape" assertions.
 */
export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/**
 * `inner` is fully inside `outer` when its rectangle is bounded on all four
 * sides. A small floating-point tolerance is applied so that 1e-12 rounding
 * errors at the edges don't fail an otherwise correct layout.
 */
const CONTAINMENT_EPSILON = 1e-6;

export function boxIsInside(inner: Box, outer: Box): boolean {
  return (
    inner.x >= outer.x - CONTAINMENT_EPSILON &&
    inner.y >= outer.y - CONTAINMENT_EPSILON &&
    inner.x + inner.w <= outer.x + outer.w + CONTAINMENT_EPSILON &&
    inner.y + inner.h <= outer.y + outer.h + CONTAINMENT_EPSILON
  );
}

/**
 * Cartesian product over a record of arrays. Returns an array of records where
 * each record holds one combination, e.g.:
 *
 *   cartesian({ shape: ["a","b"], frame: ["1","2"] })
 *   // [{shape:"a",frame:"1"}, {shape:"a",frame:"2"}, {shape:"b",frame:"1"}, ...]
 *
 * Type system note: callers receive a record with the union of each axis's
 * element type — the runtime is fully generic.
 */
export function cartesian<T extends Record<string, readonly unknown[]>>(
  axes: T,
): { [K in keyof T]: T[K][number] }[] {
  type Combo = { [K in keyof T]: T[K][number] };
  const keys = Object.keys(axes) as (keyof T)[];

  return keys.reduce<Combo[]>(
    (acc, key) => {
      const values = axes[key];
      const next: Combo[] = [];
      for (const combo of acc) {
        for (const value of values) {
          next.push({ ...combo, [key]: value } as Combo);
        }
      }
      return next;
    },
    [{} as Combo],
  );
}

/**
 * Names of the rectangular layers we collect for invariant checks. Keeping
 * this as a closed string-literal union (rather than `string`) means collected
 * layers and diagnostics stay tied to known layout concepts.
 */
export type BoxName =
  | "shape"
  | "frame"
  | "pathTextTop"
  | "pathTextBottom"
  | "banner"
  | "bottomLabel"
  | "iconOrMonogram";

/**
 * The set of named, non-null boxes inside a `LayoutBoxes`. Notably, the
 * `iconOrMonogram` center content is converted to a small symbolic box around
 * its center point — this is an approximation but it lets the same overlap
 * machinery treat it like the other layers.
 */
export type NamedBox = { name: BoxName; box: Box };

/** Convert the center point + glyph size into a rectangular box for checks. */
export function centerContentBox(boxes: LayoutBoxes): Box {
  const c = boxes.iconOrMonogram;
  return {
    x: c.cx - c.size / 2,
    y: c.cy - c.size / 2,
    w: c.size,
    h: c.size,
  };
}

export function collectBoxes(boxes: LayoutBoxes): NamedBox[] {
  const out: NamedBox[] = [];
  out.push({ name: "shape", box: boxes.shape });
  if (boxes.frame) out.push({ name: "frame", box: boxes.frame });
  if (boxes.pathTextTop)
    out.push({ name: "pathTextTop", box: boxes.pathTextTop });
  if (boxes.pathTextBottom)
    out.push({ name: "pathTextBottom", box: boxes.pathTextBottom });
  if (boxes.banner) out.push({ name: "banner", box: boxes.banner });
  if (boxes.bottomLabel)
    out.push({ name: "bottomLabel", box: boxes.bottomLabel });

  out.push({
    name: "iconOrMonogram",
    box: centerContentBox(boxes),
  });

  return out;
}

/**
 * Foreground layers are the pieces that should not collide with each other.
 * Shape and frame are structural/background boxes, so they are checked with
 * explicit containment/position assertions instead of pairwise overlap.
 */
export function collectForegroundBoxes(boxes: LayoutBoxes): NamedBox[] {
  return collectBoxes(boxes).filter(
    ({ name }) => name !== "shape" && name !== "frame",
  );
}

/**
 * Allow-list for known-OK AABB overlaps. The matrix uses axis-aligned bounding
 * boxes which are conservatively oversized for curved layers (path text arcs,
 * banner ribbons that hug the silhouette). When bboxes touch each other but
 * the rendered geometry doesn't, we record the pair here.
 *
 * Keyed by `BadgeShape` so a real regression on a non-star shape (e.g. shield
 * top banner ↔ pathTextTop) still trips the matrix.
 */
const ALLOWED_OVERLAPS_BY_SHAPE: Partial<
  Record<BadgeShape, ReadonlyArray<readonly [BoxName, BoxName]>>
> = {
  // Star path text and banner both sit above/below the silhouette in the
  // negative-y region outside the badge canvas, so their bboxes can touch by
  // sub-pixel amounts at small sizes (e.g. 80 with a top banner). The actual
  // glyphs trace the arc and never collide with the banner ribbon.
  star: [
    ["pathTextTop", "banner"],
    ["pathTextBottom", "banner"],
  ],
};

function pairContains(
  pair: readonly [BoxName, BoxName],
  a: BoxName,
  b: BoxName,
): boolean {
  return (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a);
}

export function isAllowedOverlap(
  shape: BadgeShape,
  a: BoxName,
  b: BoxName,
): boolean {
  return (
    ALLOWED_OVERLAPS_BY_SHAPE[shape]?.some((pair) =>
      pairContains(pair, a, b),
    ) ?? false
  );
}

export function forEachBox(
  boxes: LayoutBoxes,
  fn: (named: NamedBox) => void,
): void {
  for (const named of collectBoxes(boxes)) fn(named);
}

export function forEachPair(
  boxes: NamedBox[],
  fn: (a: NamedBox, b: NamedBox) => void,
): void {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      fn(boxes[i]!, boxes[j]!);
    }
  }
}

/**
 * Ray-casting point-in-polygon test. The polygon is closed implicitly — the
 * last vertex connects back to the first. Boundary points are not guaranteed
 * to land on a particular side; callers should use a small inset/outset on the
 * polygon rather than trusting boundary classification.
 */
export function pointInPolygon(p: Point, verts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const vi = verts[i]!;
    const vj = verts[j]!;
    const intersect =
      vi.y > p.y !== vj.y > p.y &&
      p.x < ((vj.x - vi.x) * (p.y - vi.y)) / (vj.y - vi.y) + vi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Sample N+1 points along the actual rendered text arc — mirrors the geometry
 * in `arcSized` from `shapes/contours.ts`. The arc spans `angle` radians,
 * centered at the apex (-π/2 for top-side text, +π/2 for bottom-side text).
 *
 * Use `MAX_ARC_ANGLE` (0.9π) for the worst-case visible sweep; longer text is
 * clamped to that ceiling by the renderer.
 */
export function arcSamplePoints(
  cx: number,
  cy: number,
  r: number,
  angle: number,
  side: "top" | "bottom",
  n = 24,
): Point[] {
  const half = angle / 2;
  const baseAngle = side === "top" ? -Math.PI / 2 : Math.PI / 2;
  const start = baseAngle + (side === "top" ? -half : half);
  const end = baseAngle + (side === "top" ? half : -half);
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = start + (end - start) * t;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}
