/**
 * Guilloche per-edge variant generators for visual comparison.
 *
 * Uses per-shape geometric corner info (not detection) to split the contour
 * into edges. Each edge gets an integer number of half-cycles so waves
 * start/end at zero. Clip path constrains waves to the frame band.
 *
 * 1. Per-edge + clip — clean wave segments, clipped to frame band
 * 2. Per-edge + clip + dots — same, with decorative circles at vertices
 */
import React from "react";
import { Circle, ClipPath, Defs, G, Path } from "react-native-svg";
import type { BadgeShape } from "../types";
import { generateShapePath } from "../shapes/paths";
import { DEFAULT_STROKE_COLOR } from "./constants";
import type { FrameGenerator } from "./types";
import {
  type SamplePoint,
  POINTS_PER_WAVE,
  AMPLITUDE_RATIO,
  WAVE_STROKE_WIDTH,
  WAVE_OPACITY,
  sampleShapeContour,
  buildWavePaths,
  makeRoundedRectSampler,
  makeShieldSampler,
} from "./guilloche";

let clipCounter = 0;

function shapeAmplitudeScale(shape: BadgeShape): number {
  if (shape === "shield" || shape === "roundedRect") {
    return 0.75;
  }
  return 1;
}

function coreWaveParams(
  shape: BadgeShape,
  inset: number,
  innerInset: number,
  stepCount: number,
) {
  const waveCount = Math.max(3, Math.min(14, Math.round(stepCount * 1.5)));
  const bandMidInset = (inset + innerInset) / 2;
  const amplitude =
    (innerInset - inset) * AMPLITUDE_RATIO * shapeAmplitudeScale(shape);
  const n = waveCount * POINTS_PER_WAVE;
  return { waveCount, bandMidInset, amplitude, n };
}

function pathProps(strokeColor: string) {
  return {
    fill: "none" as const,
    stroke: strokeColor,
    strokeWidth: WAVE_STROKE_WIDTH,
    opacity: WAVE_OPACITY,
  };
}

// ---------------------------------------------------------------------------
// Per-shape geometric corner computation
// ---------------------------------------------------------------------------

/** Uniform corner indices for regular shapes (all edges equal length) */
function uniformCorners(count: number, n: number): number[] {
  const corners: number[] = [];
  for (let i = 0; i < count; i++) {
    corners.push(Math.round((n * i) / count));
  }
  return corners;
}

/**
 * Compute exact corner indices by running the same dense parametric sampling
 * and arc-length computation that the contour sampler uses.
 * segmentCount is how many equal-parametric-width segments the sampler uses.
 * The dense sampler must match the one in guilloche.ts exactly.
 */
function parametricCorners(
  denseSampler: (t: number) => { x: number; y: number },
  segmentCount: number,
  n: number,
): number[] {
  const DENSE = 1000;

  // Dense sampling in [0, 1) (same closed-loop model as arcLengthResample).
  const dense: { x: number; y: number }[] = [];
  for (let i = 0; i < DENSE; i++) {
    dense.push(denseSampler(i / DENSE));
  }
  if (dense.length < 2) return [];

  // Cumulative arc length over closed contour
  const denseClosed = [...dense, dense[0]];
  const cumLen: number[] = [0];
  for (let i = 1; i < denseClosed.length; i++) {
    const dx = denseClosed[i].x - denseClosed[i - 1].x;
    const dy = denseClosed[i].y - denseClosed[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = cumLen[cumLen.length - 1];

  // Find sample index at each parametric segment boundary
  const corners: number[] = [];
  for (let s = 0; s < segmentCount; s++) {
    const t = s / segmentCount;
    const denseIdx = Math.round(t * (DENSE - 1));
    const arcLenAtBoundary = cumLen[denseIdx];
    corners.push(Math.round((arcLenAtBoundary / totalLen) * n));
  }

  return corners;
}

// Parametric dense samplers imported from guilloche.ts (makeRoundedRectSampler, makeShieldSampler)

/**
 * Get corner indices for each shape.
 * Polyline shapes: uniform distribution (all edges equal).
 * Parametric shapes: exact arc-length computation matching the contour sampler.
 */
function getShapeCornerIndices(
  shape: BadgeShape,
  size: number,
  inset: number,
  n: number,
): number[] {
  switch (shape) {
    case "circle":
      return [];
    case "hexagon":
      return uniformCorners(6, n);
    case "diamond":
      return uniformCorners(4, n);
    case "star":
      return uniformCorners(10, n);
    case "roundedRect":
      return parametricCorners(makeRoundedRectSampler(size, inset), 8, n);
    case "shield":
      return parametricCorners(makeShieldSampler(size, inset), 7, n);
    default: {
      const _exhaustive: never = shape;
      throw new Error(`Unknown shape: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Per-edge wave builder
// ---------------------------------------------------------------------------

type Edge = {
  start: number;
  length: number;
  halfWaves: number;
};

/**
 * Build two wave paths using per-edge phase alignment.
 * Each edge gets an integer number of half-cycles → zero crossings at corners.
 * Falls back to continuous wave when no corners exist (circle).
 */
function buildPerEdgeWavePaths(
  samples: SamplePoint[],
  corners: number[],
  waveCount: number,
  amplitude: number,
): [string, string] {
  const n = samples.length;

  if (corners.length === 0) {
    return buildWavePaths(samples, waveCount, amplitude);
  }

  // Build edge definitions
  const edgeCount = corners.length;
  const edges: Edge[] = [];
  for (let i = 0; i < edgeCount; i++) {
    const start = corners[i];
    const end = corners[(i + 1) % edgeCount];
    const length = (end - start + n) % n;
    const proportion = length / n;
    const desiredHalfWaves = proportion * waveCount * 2;
    const halfWaves = Math.max(1, Math.round(desiredHalfWaves));
    edges.push({ start, length, halfWaves });
  }

  // Build SEPARATE open paths per edge. Each edge gets its own M + cubic
  // bezier sequence with independent Catmull-Rom — no wrap-around artifact.
  const wave1Commands: string[] = [];
  const wave2Commands: string[] = [];

  for (const edge of edges) {
    // Compute wave points for this edge
    const pts1: { x: number; y: number }[] = [];
    const pts2: { x: number; y: number }[] = [];

    for (let j = 0; j <= edge.length; j++) {
      const idx = (edge.start + j) % n;
      const pt = samples[idx];
      const t = j / edge.length;
      const phase = Math.PI * edge.halfWaves * t;
      const offset = Math.sin(phase) * amplitude;
      pts1.push({ x: pt.x + pt.nx * offset, y: pt.y + pt.ny * offset });
      pts2.push({ x: pt.x - pt.nx * offset, y: pt.y - pt.ny * offset });
    }

    wave1Commands.push(buildOpenPath(pts1));
    wave2Commands.push(buildOpenPath(pts2));
  }

  return [wave1Commands.join(" "), wave2Commands.join(" ")];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an open SVG subpath (M + lines, no Z) from a sequence of points.
 * Linear interpolation avoids spline overshoot near shape transitions.
 */
function buildOpenPath(pts: { x: number; y: number }[]): string {
  const m = pts.length;
  if (m < 2) return "";

  const commands: string[] = [
    `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`,
  ];
  for (let i = 1; i < m; i++) {
    commands.push(`L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`);
  }

  return commands.join(" ");
}

// ---------------------------------------------------------------------------
// Clip path helper (constrains waves to the outer shape boundary)
// ---------------------------------------------------------------------------

function makeClipElements(
  shape: BadgeShape,
  size: number,
  inset: number,
): { clipId: string; defsElement: React.ReactElement } {
  const outerPath = generateShapePath(shape, size, inset);
  const clipId = `guilloche-pe-${++clipCounter}`;

  const defsElement = React.createElement(
    Defs,
    null,
    React.createElement(
      ClipPath,
      { id: clipId },
      React.createElement(Path, { d: outerPath }),
    ),
  );

  return { clipId, defsElement };
}

// ---------------------------------------------------------------------------
// 1. Per-edge + clip (no decoration)
// ---------------------------------------------------------------------------

export const guillochePerEdge: FrameGenerator = ({
  shape,
  size,
  inset,
  innerInset,
  params,
  strokeColor = DEFAULT_STROKE_COLOR,
}) => {
  if (innerInset <= inset) return null;

  const { waveCount, bandMidInset, amplitude, n } = coreWaveParams(
    shape,
    inset,
    innerInset,
    params.stepCount,
  );
  const samples = sampleShapeContour(shape, size, bandMidInset, n);
  const corners = getShapeCornerIndices(shape, size, bandMidInset, n);
  const [wave1, wave2] = buildPerEdgeWavePaths(
    samples,
    corners,
    waveCount,
    amplitude,
  );

  const props = pathProps(strokeColor);
  const { clipId, defsElement } = makeClipElements(shape, size, inset);

  return React.createElement(
    React.Fragment,
    null,
    defsElement,
    React.createElement(
      G,
      { clipPath: `url(#${clipId})` },
      React.createElement(Path, { key: "g-0", d: wave1, ...props }),
      React.createElement(Path, { key: "g-1", d: wave2, ...props }),
    ),
  );
};

// ---------------------------------------------------------------------------
// 2. Per-edge + clip + corner dots
// ---------------------------------------------------------------------------

export const guillochePerEdgeWithDots: FrameGenerator = ({
  shape,
  size,
  inset,
  innerInset,
  params,
  strokeColor = DEFAULT_STROKE_COLOR,
}) => {
  if (innerInset <= inset) return null;

  const { waveCount, bandMidInset, amplitude, n } = coreWaveParams(
    shape,
    inset,
    innerInset,
    params.stepCount,
  );
  const samples = sampleShapeContour(shape, size, bandMidInset, n);
  const corners = getShapeCornerIndices(shape, size, bandMidInset, n);
  const [wave1, wave2] = buildPerEdgeWavePaths(
    samples,
    corners,
    waveCount,
    amplitude,
  );

  const props = pathProps(strokeColor);
  const dotRadius = amplitude * 0.35;
  const { clipId, defsElement } = makeClipElements(shape, size, inset);

  // Corner dots (drawn outside clip so they're always visible)
  const dots: React.ReactElement[] = [];
  for (let i = 0; i < corners.length; i++) {
    const pt = samples[corners[i]];
    dots.push(
      React.createElement(Circle, {
        key: `dot-${i}`,
        cx: pt.x,
        cy: pt.y,
        r: dotRadius,
        fill: "none",
        stroke: strokeColor,
        strokeWidth: WAVE_STROKE_WIDTH,
        opacity: WAVE_OPACITY,
      }),
    );
  }

  return React.createElement(
    React.Fragment,
    null,
    defsElement,
    React.createElement(
      G,
      { clipPath: `url(#${clipId})` },
      React.createElement(Path, { key: "g-0", d: wave1, ...props }),
      React.createElement(Path, { key: "g-1", d: wave2, ...props }),
    ),
    ...dots,
  );
};
