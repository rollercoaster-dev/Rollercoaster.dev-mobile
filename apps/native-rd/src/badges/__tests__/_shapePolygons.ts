/**
 * Test-only outline polygons for each badge shape.
 *
 * The matrix in `layout.invariants.test.ts` checks containment using the
 * axis-aligned bounding box of each shape, which is too loose for concave
 * shapes (star, diamond) and for any shape where curves are involved
 * (roundedRect, shield, circle). These polygons trace the actual rendered
 * outline so we can run point-in-polygon tests against arc samples.
 *
 * Geometry mirrors `apps/native-rd/src/badges/shapes/paths.ts`. If a path
 * generator changes, update the matching polygon here so the invariant tests
 * stay aligned with what the renderer actually draws.
 */

import { BadgeShape } from "../types";
import type { Point } from "./_geometryHelpers";

/** Trace the outer rendered outline of `shape` as an ordered polygon. */
export function outlinePolygon(
  shape: BadgeShape,
  size: number,
  inset: number,
): Point[] {
  switch (shape) {
    case BadgeShape.circle:
      return circleVerts(size, inset, 64);
    case BadgeShape.hexagon:
      return hexagonVerts(size, inset);
    case BadgeShape.diamond:
      return diamondVerts(size, inset);
    case BadgeShape.star:
      return starVerts(size, inset);
    case BadgeShape.roundedRect:
      return roundedRectVerts(size, inset, 8);
    case BadgeShape.shield:
      return shieldVerts(size, inset, 12);
  }
}

function circleVerts(size: number, inset: number, n: number): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

function hexagonVerts(size: number, inset: number): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const out: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

function diamondVerts(size: number, inset: number): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  return [
    { x: cx, y: cy - r },
    { x: cx + r, y: cy },
    { x: cx, y: cy + r },
    { x: cx - r, y: cy },
  ];
}

function starVerts(size: number, inset: number): Point[] {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerR = outerR * 0.4;
  const out: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 180) * (36 * i - 90);
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

function roundedRectVerts(
  size: number,
  inset: number,
  perCorner: number,
): Point[] {
  const l = inset;
  const t = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const r = Math.min(w, h) * 0.12;
  const out: Point[] = [];

  const arc = (cx: number, cy: number, startA: number) => {
    for (let i = 0; i <= perCorner; i++) {
      const a = startA + (Math.PI / 2) * (i / perCorner);
      out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  };

  arc(l + r, t + r, Math.PI);
  arc(l + w - r, t + r, -Math.PI / 2);
  arc(l + w - r, t + h - r, 0);
  arc(l + r, t + h - r, Math.PI / 2);
  return out;
}

function quadSample(
  p0: Point,
  p1: Point,
  p2: Point,
  steps: number,
  out: Point[],
): void {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
}

function shieldVerts(size: number, inset: number, perCurve: number): Point[] {
  const l = inset;
  const r = size - inset;
  const t = inset;
  const b = size - inset;
  const w = r - l;
  const h = b - t;
  const cx = l + w / 2;
  const shoulderY = t + h * 0.1;
  const waistY = t + h * 0.55;

  const out: Point[] = [];
  const topLeft = { x: l + w * 0.075, y: t };
  const topRight = { x: l + w * 0.925, y: t };
  const rightShoulder = { x: r, y: shoulderY };
  const rightWaist = { x: r, y: waistY };
  const rightBottomCp = { x: r, y: b - h * 0.15 };
  const bottomTip = { x: cx, y: b };
  const leftBottomCp = { x: l, y: b - h * 0.15 };
  const leftWaist = { x: l, y: waistY };
  const leftShoulder = { x: l, y: shoulderY };
  const leftShoulderCp = { x: l, y: t };
  const rightShoulderCp = { x: r, y: t };

  out.push(topLeft);
  out.push(topRight);
  quadSample(topRight, rightShoulderCp, rightShoulder, perCurve, out);
  out.push(rightWaist);
  quadSample(rightWaist, rightBottomCp, bottomTip, perCurve, out);
  quadSample(bottomTip, leftBottomCp, leftWaist, perCurve, out);
  out.push(leftShoulder);
  quadSample(leftShoulder, leftShoulderCp, topLeft, perCurve, out);
  return out;
}
