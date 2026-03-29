/**
 * Shape contour system for frame and text geometry.
 *
 * Extends shape path generators with inset paths (frame band boundaries),
 * open-arc text paths (for SVG textPath inscriptions), and vertex positions
 * (for rosette/element placement).
 */

import type { BadgeShape } from "../types";
import {
  circlePath,
  shieldPath,
  hexagonPath,
  roundedRectPath,
  starPath,
  diamondPath,
} from "./paths";

/** Geometry metadata for a badge shape, used by frame overlays and text-on-path. */
export type ShapeContour = {
  outerPath: string;
  innerPath: string;
  textPathTop: string;
  textPathBottom: string;
  vertices: { x: number; y: number }[];
};

/** Frame band width as a fraction of badge size. */
export const FRAME_BAND_RATIO = 0.12;

/** Default text arc center Y ratios — top arc raised, bottom arc lowered. */
const TEXT_ARC_TOP_CY_RATIO = 0.8;
const TEXT_ARC_BOTTOM_CY_RATIO = 1.1;

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Generate an open arc (no Z) from right to left across the top half.
 * On web, textPath follows the path direction and react-native-svg does not
 * expose a reliable side flip, so the upper inscription needs its own
 * explicit upper semicircle path.
 */
function topArc(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy}`;
}

/**
 * Generate an open arc (no Z) from right to left across the bottom half.
 * sweep-flag=0 (CCW on screen) from right to left traces downward
 * through (cx, cy+r) — the bottom semicircle.
 */
function bottomArc(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy}`;
}

// ── Circle ─────────────────────────────────────────────────────────────

function circleContour(size: number, inset: number): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 0.8; // text sits slightly inside outer edge

  const vertices: ShapeContour["vertices"] = [];
  const vertexR = outerR * 0.8;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i; // 45° increments
    vertices.push({
      x: cx + vertexR * Math.cos(angle),
      y: cy + vertexR * Math.sin(angle),
    });
  }

  return {
    outerPath: circlePath(size, inset),
    innerPath: circlePath(size, innerInset),
    textPathTop: topArc(cx, cy * TEXT_ARC_TOP_CY_RATIO, textR),
    textPathBottom: bottomArc(cx, cy * TEXT_ARC_BOTTOM_CY_RATIO, textR),
    vertices,
  };
}

// ── Hexagon ────────────────────────────────────────────────────────────

function hexagonContour(size: number, inset: number): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 0.8;

  // Flat-top hexagon vertices at outer radius (same angles as hexagonPath)
  const vertices: ShapeContour["vertices"] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    vertices.push({
      x: cx + outerR * Math.cos(angle),
      y: cy + outerR * Math.sin(angle),
    });
  }

  return {
    outerPath: hexagonPath(size, inset),
    innerPath: hexagonPath(size, innerInset),
    textPathTop: topArc(cx, cy * TEXT_ARC_TOP_CY_RATIO, textR),
    textPathBottom: bottomArc(cx, cy * TEXT_ARC_BOTTOM_CY_RATIO, textR),
    vertices,
  };
}

// ── Diamond ────────────────────────────────────────────────────────────

function diamondContour(size: number, inset: number): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 0.7; // tighter arc for diamond's narrow shape

  return {
    outerPath: diamondPath(size, inset),
    innerPath: diamondPath(size, innerInset),
    textPathTop: topArc(cx, cy * TEXT_ARC_TOP_CY_RATIO, textR),
    textPathBottom: bottomArc(cx, cy * TEXT_ARC_BOTTOM_CY_RATIO, textR),
    vertices: [
      { x: cx, y: cy - outerR }, // top
      { x: cx + outerR, y: cy }, // right
      { x: cx, y: cy + outerR }, // bottom
      { x: cx - outerR, y: cy }, // left
    ],
  };
}

// ── Star ───────────────────────────────────────────────────────────────

function starContour(size: number, inset: number): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 1.0;

  // 5 outer tip points (even-indexed from starPath's 10-point pattern)
  const vertices: ShapeContour["vertices"] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI / 180) * (72 * i - 90); // -90° starts from top
    vertices.push({
      x: cx + outerR * Math.cos(angle),
      y: cy + outerR * Math.sin(angle),
    });
  }

  return {
    outerPath: starPath(size, inset),
    innerPath: starPath(size, innerInset),
    textPathTop: topArc(cx, cy * 1.17, textR),
    textPathBottom: bottomArc(cx, cy * 0.94, textR),
    vertices,
  };
}

// ── Shield ─────────────────────────────────────────────────────────────

function shieldContour(size: number, inset: number): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  // Match shieldPath geometry
  const l = inset;
  const r = size - inset;
  const t = inset;
  const b = size - inset;
  const h = b - t;
  const shoulderY = t + h * 0.1;

  // Text arcs: use half-width as radius, offset vertically for shield shape
  const textR = (r - l) / 2;

  return {
    outerPath: shieldPath(size, inset),
    innerPath: shieldPath(size, innerInset),
    textPathTop: topArc(cx, cy * TEXT_ARC_TOP_CY_RATIO, textR),
    textPathBottom: bottomArc(cx, cy * TEXT_ARC_BOTTOM_CY_RATIO, textR * 0.8),
    vertices: [
      { x: l, y: shoulderY }, // left shoulder
      { x: r, y: shoulderY }, // right shoulder
      { x: cx, y: b }, // bottom point
    ],
  };
}

// ── Rounded Rectangle ──────────────────────────────────────────────────

function roundedRectContour(size: number, inset: number): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  const l = inset;
  const t = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const textR = w / 2;

  return {
    outerPath: roundedRectPath(size, inset),
    innerPath: roundedRectPath(size, innerInset),
    textPathTop: topArc(cx, cy * TEXT_ARC_TOP_CY_RATIO, textR),
    textPathBottom: bottomArc(cx, cy * TEXT_ARC_BOTTOM_CY_RATIO, textR),
    vertices: [
      { x: l + w * 0.25, y: t + h * 0.25 }, // top-left
      { x: l + w * 0.75, y: t + h * 0.25 }, // top-right
      { x: l + w * 0.75, y: t + h * 0.75 }, // bottom-right
      { x: l + w * 0.25, y: t + h * 0.75 }, // bottom-left
    ],
  };
}

// ── Dispatcher ─────────────────────────────────────────────────────────

const contourGenerators: Record<
  BadgeShape,
  (size: number, inset: number) => ShapeContour
> = {
  circle: circleContour,
  shield: shieldContour,
  hexagon: hexagonContour,
  roundedRect: roundedRectContour,
  star: starContour,
  diamond: diamondContour,
};

/**
 * Generate shape contour metadata for frame overlays and text-on-path.
 *
 * @param shape - Badge shape type
 * @param size  - Bounding box dimension (square)
 * @param inset - Stroke inset (typically half stroke width)
 */
export function generateContour(
  shape: BadgeShape,
  size: number,
  inset: number,
): ShapeContour {
  return contourGenerators[shape](size, inset);
}
