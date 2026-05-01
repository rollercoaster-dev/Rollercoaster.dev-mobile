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
import { measureTextWidth } from "../text/measureTextWidth";

/** Text-aware arc sizing inputs. */
export type ContourTextOpts = {
  topText?: string;
  bottomText?: string;
  fontSize?: number;
};

/** Caps sweep below 180° so the arc endpoints don't meet at 6 o'clock. */
const MAX_ARC_ANGLE = 0.9 * Math.PI;

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

/**
 * Radius of the arc that path text is drawn along, per shape.
 *
 * Mirrors the per-shape `textR` calculations used inside `generateContour`.
 * Exported so layout-only consumers (tests, layout-box helpers) can derive
 * the path-text bounding region without rendering SVG.
 */
export function getPathTextRadius(
  shape: BadgeShape,
  size: number,
  inset: number,
  side: "top" | "bottom" = "top",
): number {
  const outerR = size / 2 - inset;
  switch (shape) {
    case "circle":
    case "hexagon":
      return outerR * 0.8;
    case "diamond":
      return outerR * 0.7;
    case "star":
      return outerR * 1.0;
    case "shield": {
      const half = (size - inset * 2) / 2;
      return side === "bottom" ? half * 0.8 : half;
    }
    case "roundedRect":
      return (size - inset * 2) / 2;
  }
}

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

function arcAngleForText(text: string, fontSize: number, r: number): number {
  const width = measureTextWidth(text, fontSize);
  if (width <= 0 || r <= 0) return Math.PI;
  const angle = width / r;
  return Math.min(MAX_ARC_ANGLE, Math.max(0.25 * Math.PI, angle));
}

/**
 * `side="top"`: arc centered at -π/2 (12 o'clock), sweep-flag=1.
 * `side="bottom"`: arc centered at +π/2 (6 o'clock), sweep-flag=0.
 * Both written left-to-right so SVG textPath reads naturally.
 */
function arcSized(
  cx: number,
  cy: number,
  r: number,
  angle: number,
  side: "top" | "bottom",
): string {
  const half = angle / 2;
  const baseAngle = side === "top" ? -Math.PI / 2 : Math.PI / 2;
  const sweepFlag = side === "top" ? 1 : 0;
  const startAngle = baseAngle + (side === "top" ? -half : half);
  const endAngle = baseAngle + (side === "top" ? half : -half);
  const startX = cx + r * Math.cos(startAngle);
  const startY = cy + r * Math.sin(startAngle);
  const endX = cx + r * Math.cos(endAngle);
  const endY = cy + r * Math.sin(endAngle);
  return `M ${startX} ${startY} A ${r} ${r} 0 0 ${sweepFlag} ${endX} ${endY}`;
}

// ── Circle ─────────────────────────────────────────────────────────────

function circleContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
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
    textPathTop: pickArc({ side: "top", cx, cy, textR, size, opts }),
    textPathBottom: pickArc({ side: "bottom", cx, cy, textR, size, opts }),
    vertices,
  };
}

type PickArcConfig = {
  side: "top" | "bottom";
  cx: number;
  cy: number;
  textR: number;
  size: number;
  opts: ContourTextOpts | undefined;
  /** Override the per-side legacy cy multiplier (only used when no text is given). */
  legacyCyRatio?: number;
};

function pickArc(c: PickArcConfig): string {
  const text = c.side === "top" ? c.opts?.topText : c.opts?.bottomText;
  if (text) {
    const rawFontSize = c.opts?.fontSize;
    const fontSize =
      Number.isFinite(rawFontSize) && (rawFontSize as number) > 0
        ? (rawFontSize as number)
        : c.size * 0.09;
    const angle = arcAngleForText(text, fontSize, c.textR);
    return arcSized(c.cx, c.cy, c.textR, angle, c.side);
  }
  const legacyCyRatio =
    c.legacyCyRatio ??
    (c.side === "top" ? TEXT_ARC_TOP_CY_RATIO : TEXT_ARC_BOTTOM_CY_RATIO);
  const legacy = c.side === "top" ? topArc : bottomArc;
  return legacy(c.cx, c.cy * legacyCyRatio, c.textR);
}

// ── Hexagon ────────────────────────────────────────────────────────────

function hexagonContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
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
    textPathTop: pickArc({ side: "top", cx, cy, textR, size, opts }),
    textPathBottom: pickArc({ side: "bottom", cx, cy, textR, size, opts }),
    vertices,
  };
}

// ── Diamond ────────────────────────────────────────────────────────────

function diamondContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 0.7; // tighter arc for diamond's narrow shape

  return {
    outerPath: diamondPath(size, inset),
    innerPath: diamondPath(size, innerInset),
    textPathTop: pickArc({ side: "top", cx, cy, textR, size, opts }),
    textPathBottom: pickArc({ side: "bottom", cx, cy, textR, size, opts }),
    vertices: [
      { x: cx, y: cy - outerR }, // top
      { x: cx + outerR, y: cy }, // right
      { x: cx, y: cy + outerR }, // bottom
      { x: cx - outerR, y: cy }, // left
    ],
  };
}

// ── Star ───────────────────────────────────────────────────────────────

function starContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
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
    textPathTop: pickArc({
      side: "top",
      cx,
      cy,
      textR,
      size,
      opts,
      legacyCyRatio: 1.17,
    }),
    textPathBottom: pickArc({
      side: "bottom",
      cx,
      cy,
      textR,
      size,
      opts,
      legacyCyRatio: 0.94,
    }),
    vertices,
  };
}

// ── Shield ─────────────────────────────────────────────────────────────

function shieldContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
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
    textPathTop: pickArc({ side: "top", cx, cy, textR, size, opts }),
    textPathBottom: pickArc({
      side: "bottom",
      cx,
      cy,
      textR: textR * 0.8,
      size,
      opts,
    }),
    vertices: [
      { x: l, y: shoulderY }, // left shoulder
      { x: r, y: shoulderY }, // right shoulder
      { x: cx, y: b }, // bottom point
    ],
  };
}

// ── Rounded Rectangle ──────────────────────────────────────────────────

function roundedRectContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
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
    textPathTop: pickArc({ side: "top", cx, cy, textR, size, opts }),
    textPathBottom: pickArc({ side: "bottom", cx, cy, textR, size, opts }),
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
  (size: number, inset: number, opts?: ContourTextOpts) => ShapeContour
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
 * @param opts  - Optional text-aware sizing inputs. When provided, the top
 *                and bottom inscription arcs are sized to the text width
 *                and centered on the badge's vertical axis. Without opts
 *                the legacy fixed half-circle arcs are returned.
 */
export function generateContour(
  shape: BadgeShape,
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  return contourGenerators[shape](size, inset, opts);
}
