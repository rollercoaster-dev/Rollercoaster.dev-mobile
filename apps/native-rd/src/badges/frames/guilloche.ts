import React from 'react';
import { ClipPath, Defs, G, Path } from 'react-native-svg';
import { generateShapePath } from '../shapes/paths';
import type { BadgeShape } from '../types';
import { DEFAULT_STROKE_COLOR } from './constants';
import type { FrameGenerator } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A sampled point on the shape contour with outward-facing normal */
export type SamplePoint = { x: number; y: number; nx: number; ny: number };

/** Sample points per wave cycle — enough for smooth Catmull-Rom interpolation */
export const POINTS_PER_WAVE = 24;

/** Amplitude as a fraction of the full frame band width (innerInset − inset) */
export const AMPLITUDE_RATIO = 0.35;

/** Dense sample count for arc-length re-parameterization */
const ARC_LENGTH_DENSITY = 1000;

/** Stroke width for guilloche wave paths */
export const WAVE_STROKE_WIDTH = 1.0;

/** Opacity for guilloche wave paths — slight transparency emphasizes interlocking */
export const WAVE_OPACITY = 0.85;

let clipCounter = 0;

// ---------------------------------------------------------------------------
// Contour samplers
// ---------------------------------------------------------------------------

function sampleCircle(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const pts: SamplePoint[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    pts.push({ x: cx + r * cos, y: cy + r * sin, nx: cos, ny: sin });
  }
  return pts;
}

/**
 * Sample n points at equal arc-length intervals along a closed polyline.
 * Computes outward-facing normals perpendicular to each edge.
 */
function samplePolylineContour(
  verts: { x: number; y: number }[],
  cx: number,
  cy: number,
  n: number,
): SamplePoint[] {
  const sides = verts.length;

  // Compute edge vectors and total perimeter
  const edges: { dx: number; dy: number; len: number }[] = [];
  let perimeter = 0;
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const dx = verts[next].x - verts[i].x;
    const dy = verts[next].y - verts[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    edges.push({ dx, dy, len });
    perimeter += len;
  }

  // Sample n points at equal arc-length intervals
  const pts: SamplePoint[] = [];
  for (let i = 0; i < n; i++) {
    const target = (perimeter * i) / n;
    let cumulative = 0;
    for (let e = 0; e < sides; e++) {
      const edge = edges[e];
      // Fallback to last edge on floating-point accumulation overshoot
      if (cumulative + edge.len > target || e === sides - 1) {
        const t = (target - cumulative) / edge.len;
        const x = verts[e].x + edge.dx * t;
        const y = verts[e].y + edge.dy * t;
        // Normal perpendicular to edge, ensure outward via dot product with center offset
        const enx = -edge.dy / edge.len;
        const eny = edge.dx / edge.len;
        const dot = enx * (x - cx) + eny * (y - cy);
        const sign = dot >= 0 ? 1 : -1;
        pts.push({ x, y, nx: enx * sign, ny: eny * sign });
        break;
      }
      cumulative += edge.len;
    }
  }
  return pts;
}

function sampleRegularPolygon(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  angleOffset: number,
  n: number,
): SamplePoint[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const a = angleOffset + (2 * Math.PI * i) / sides;
    verts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return samplePolylineContour(verts, cx, cy, n);
}

function sampleHexagon(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  return sampleRegularPolygon(cx, cy, r, 6, -Math.PI / 6, n);
}

function sampleDiamond(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  return sampleRegularPolygon(cx, cy, r, 4, -Math.PI / 2, n);
}

function sampleStar(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerR = outerR * 0.4;

  // 10 vertices alternating outer/inner, starting at top (-π/2)
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (2 * Math.PI * i) / 10 - Math.PI / 2;
    verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }

  return samplePolylineContour(verts, cx, cy, n);
}

/**
 * Arc-length re-sampling for shapes defined by parametric curves.
 * Takes a dense parametric sampler and re-samples at uniform arc-length intervals.
 */
function arcLengthResample(
  denseSampler: (t: number) => { x: number; y: number },
  cx: number,
  cy: number,
  n: number,
): SamplePoint[] {
  // 1. Dense sampling in [0, 1) to avoid a duplicate endpoint artifact at t=1.
  const dense: { x: number; y: number }[] = [];
  for (let i = 0; i < ARC_LENGTH_DENSITY; i++) {
    dense.push(denseSampler(i / ARC_LENGTH_DENSITY));
  }
  if (dense.length < 2) return [];

  // 2. Compute cumulative arc length on the CLOSED contour.
  const denseClosed = [...dense, dense[0]];
  const cumLen: number[] = [0];
  for (let i = 1; i < denseClosed.length; i++) {
    const dx = denseClosed[i].x - denseClosed[i - 1].x;
    const dy = denseClosed[i].y - denseClosed[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = cumLen[cumLen.length - 1];

  // 3. Re-sample at uniform arc-length intervals
  // denseIdx is not reset per iteration because targetLen increases monotonically
  const pts: SamplePoint[] = [];
  let denseIdx = 0;
  for (let i = 0; i < n; i++) {
    const targetLen = (totalLen * i) / n;
    while (denseIdx < cumLen.length - 2 && cumLen[denseIdx + 1] < targetLen) {
      denseIdx++;
    }
    const segLen = cumLen[denseIdx + 1] - cumLen[denseIdx];
    const t = segLen > 0 ? (targetLen - cumLen[denseIdx]) / segLen : 0;
    const pA = denseClosed[denseIdx];
    const pB = denseClosed[denseIdx + 1];
    const x = pA.x + (pB.x - pA.x) * t;
    const y = pA.y + (pB.y - pA.y) * t;

    // Approximate tangent from neighboring dense samples, wrapping at seam.
    const baseIdx = denseIdx % dense.length;
    const prev = (baseIdx - 1 + dense.length) % dense.length;
    const next = (baseIdx + 1) % dense.length;
    const tx = dense[next].x - dense[prev].x;
    const ty = dense[next].y - dense[prev].y;
    const tLen = Math.sqrt(tx * tx + ty * ty) || 1;
    // Normal perpendicular to tangent, ensure outward
    let nx = -ty / tLen;
    let ny = tx / tLen;
    const dot = nx * (x - cx) + ny * (y - cy);
    if (dot < 0) {
      nx = -nx;
      ny = -ny;
    }
    pts.push({ x, y, nx, ny });
  }
  return pts;
}

/**
 * Factory for the shield dense parametric sampler.
 * Shared by sampleShield (arc-length resampling) and guillocheVariants (corner detection).
 */
export function makeShieldSampler(
  size: number,
  inset: number,
): (t: number) => { x: number; y: number } {
  const l = inset;
  const right = size - inset;
  const top = inset;
  const bottom = size - inset;
  const w = right - l;
  const h = bottom - top;
  const shoulderY = top + h * 0.1;
  const waistY = top + h * 0.55;
  const cx = l + w / 2;

  return (param: number) => {
    const p = ((param % 1) + 1) % 1;
    const seg = p * 7;
    const s = seg % 1;
    if (seg < 1) {
      const x0 = l + w * 0.075;
      const x1 = l + w * 0.925;
      return { x: x0 + (x1 - x0) * s, y: top };
    } else if (seg < 2) {
      const u = 1 - s;
      return {
        x: u * u * (l + w * 0.925) + 2 * u * s * right + s * s * right,
        y: u * u * top + 2 * u * s * top + s * s * shoulderY,
      };
    } else if (seg < 3) {
      return { x: right, y: shoulderY + (waistY - shoulderY) * s };
    } else if (seg < 4) {
      const u = 1 - s;
      return {
        x: u * u * right + 2 * u * s * right + s * s * cx,
        y: u * u * waistY + 2 * u * s * (bottom - h * 0.15) + s * s * bottom,
      };
    } else if (seg < 5) {
      const u = 1 - s;
      return {
        x: u * u * cx + 2 * u * s * l + s * s * l,
        y: u * u * bottom + 2 * u * s * (bottom - h * 0.15) + s * s * waistY,
      };
    } else if (seg < 6) {
      return { x: l, y: waistY + (shoulderY - waistY) * s };
    } else {
      const u = 1 - s;
      return {
        x: u * u * l + 2 * u * s * l + s * s * (l + w * 0.075),
        y: u * u * shoulderY + 2 * u * s * top + s * s * top,
      };
    }
  };
}

function sampleShield(size: number, inset: number, n: number): SamplePoint[] {
  const l = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  return arcLengthResample(makeShieldSampler(size, inset), l + w / 2, inset + h / 2, n);
}

/**
 * Factory for the rounded-rect dense parametric sampler.
 * Shared by sampleRoundedRect (arc-length resampling) and guillocheVariants (corner detection).
 */
export function makeRoundedRectSampler(
  size: number,
  inset: number,
): (t: number) => { x: number; y: number } {
  const left = inset;
  const top = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const cr = Math.min(w, h) * 0.12;

  return (param: number) => {
    const p = ((param % 1) + 1) % 1;
    const seg = p * 8;
    const s = seg % 1;
    if (seg < 1) {
      return { x: left + cr + (w - 2 * cr) * s, y: top };
    } else if (seg < 2) {
      const a = -Math.PI / 2 + (Math.PI / 2) * s;
      return { x: left + w - cr + cr * Math.cos(a), y: top + cr + cr * Math.sin(a) };
    } else if (seg < 3) {
      return { x: left + w, y: top + cr + (h - 2 * cr) * s };
    } else if (seg < 4) {
      const a = (Math.PI / 2) * s;
      return { x: left + w - cr + cr * Math.cos(a), y: top + h - cr + cr * Math.sin(a) };
    } else if (seg < 5) {
      return { x: left + w - cr - (w - 2 * cr) * s, y: top + h };
    } else if (seg < 6) {
      const a = Math.PI / 2 + (Math.PI / 2) * s;
      return { x: left + cr + cr * Math.cos(a), y: top + h - cr + cr * Math.sin(a) };
    } else if (seg < 7) {
      return { x: left, y: top + h - cr - (h - 2 * cr) * s };
    } else {
      const a = Math.PI + (Math.PI / 2) * s;
      return { x: left + cr + cr * Math.cos(a), y: top + cr + cr * Math.sin(a) };
    }
  };
}

function sampleRoundedRect(size: number, inset: number, n: number): SamplePoint[] {
  const w = size - inset * 2;
  const h = size - inset * 2;
  return arcLengthResample(makeRoundedRectSampler(size, inset), inset + w / 2, inset + h / 2, n);
}

/** Dispatch to shape-specific sampler */
export function sampleShapeContour(shape: BadgeShape, size: number, inset: number, n: number): SamplePoint[] {
  switch (shape) {
    case 'circle':
      return sampleCircle(size, inset, n);
    case 'hexagon':
      return sampleHexagon(size, inset, n);
    case 'diamond':
      return sampleDiamond(size, inset, n);
    case 'star':
      return sampleStar(size, inset, n);
    case 'shield':
      return sampleShield(size, inset, n);
    case 'roundedRect':
      return sampleRoundedRect(size, inset, n);
    default: {
      const _exhaustive: never = shape;
      throw new Error(`Unknown badge shape: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Sine wave path builder
// ---------------------------------------------------------------------------

/**
 * Convert 4 sequential Catmull-Rom points to cubic bezier control points.
 * Uses uniform Catmull-Rom with tension = 1/6.
 * Returns [cp1, cp2] for the segment between p1 and p2.
 */
export function catmullRomToCubic(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): [{ x: number; y: number }, { x: number; y: number }] {
  // Centripetal Catmull-Rom reduces loop/overshoot artifacts on uneven point spacing.
  const alpha = 0.5;
  const epsilon = 1e-6;

  const d01 = Math.max(epsilon, Math.pow(Math.hypot(p1.x - p0.x, p1.y - p0.y), alpha));
  const d12 = Math.max(epsilon, Math.pow(Math.hypot(p2.x - p1.x, p2.y - p1.y), alpha));
  const d23 = Math.max(epsilon, Math.pow(Math.hypot(p3.x - p2.x, p3.y - p2.y), alpha));

  const t0 = 0;
  const t1 = t0 + d01;
  const t2 = t1 + d12;
  const t3 = t2 + d23;

  const dt20 = t2 - t0;
  const dt31 = t3 - t1;
  const dt21 = t2 - t1;

  if (dt20 <= epsilon || dt31 <= epsilon || dt21 <= epsilon) {
    const t = 1 / 6;
    return [
      { x: p1.x + (p2.x - p0.x) * t, y: p1.y + (p2.y - p0.y) * t },
      { x: p2.x - (p3.x - p1.x) * t, y: p2.y - (p3.y - p1.y) * t },
    ];
  }

  const m1x = (p2.x - p0.x) / dt20;
  const m1y = (p2.y - p0.y) / dt20;
  const m2x = (p3.x - p1.x) / dt31;
  const m2y = (p3.y - p1.y) / dt31;

  const cp1 = {
    x: p1.x + (m1x * dt21) / 3,
    y: p1.y + (m1y * dt21) / 3,
  };
  const cp2 = {
    x: p2.x - (m2x * dt21) / 3,
    y: p2.y - (m2y * dt21) / 3,
  };

  return [cp1, cp2];
}

/**
 * Build two closed SVG paths (wave + anti-phase wave) from contour samples.
 * Exploits sin(t + π) = -sin(t) to compute both waves in a single pass.
 */
export function buildWavePaths(
  samples: SamplePoint[],
  waveCount: number,
  amplitude: number,
): [string, string] {
  const n = samples.length;

  // Compute offset points for both waves in a single pass
  const wave1Pts: { x: number; y: number }[] = new Array(n);
  const wave2Pts: { x: number; y: number }[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const pt = samples[i];
    const t = (2 * Math.PI * waveCount * i) / n;
    const offset = Math.sin(t) * amplitude;
    wave1Pts[i] = { x: pt.x + pt.nx * offset, y: pt.y + pt.ny * offset };
    // sin(t + π) = -sin(t), so anti-phase wave uses negated offset
    wave2Pts[i] = { x: pt.x - pt.nx * offset, y: pt.y - pt.ny * offset };
  }

  return [buildPathFromPoints(wave1Pts), buildPathFromPoints(wave2Pts)];
}

function buildWavePathsLinear(
  samples: SamplePoint[],
  waveCount: number,
  amplitude: number,
): [string, string] {
  const n = samples.length;
  const wave1Pts: { x: number; y: number }[] = new Array(n);
  const wave2Pts: { x: number; y: number }[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const pt = samples[i];
    const t = (2 * Math.PI * waveCount * i) / n;
    const offset = Math.sin(t) * amplitude;
    wave1Pts[i] = { x: pt.x + pt.nx * offset, y: pt.y + pt.ny * offset };
    wave2Pts[i] = { x: pt.x - pt.nx * offset, y: pt.y - pt.ny * offset };
  }

  return [buildLinearPathFromPoints(wave1Pts), buildLinearPathFromPoints(wave2Pts)];
}

type ShapeWaveProfile = {
  anchorCount: number;
  useCornerEnvelope: boolean;
  useLinearPath: boolean;
  amplitudeScale: number;
};

function getShapeWaveProfile(shape: BadgeShape): ShapeWaveProfile {
  switch (shape) {
    case 'hexagon':
      return { anchorCount: 6, useCornerEnvelope: true, useLinearPath: false, amplitudeScale: 1 };
    case 'diamond':
      return { anchorCount: 4, useCornerEnvelope: true, useLinearPath: false, amplitudeScale: 1 };
    case 'star':
      return { anchorCount: 10, useCornerEnvelope: true, useLinearPath: false, amplitudeScale: 1 };
    case 'circle':
      return { anchorCount: 0, useCornerEnvelope: false, useLinearPath: false, amplitudeScale: 1 };
    case 'roundedRect':
      return { anchorCount: 0, useCornerEnvelope: false, useLinearPath: true, amplitudeScale: 0.75 };
    case 'shield':
      return { anchorCount: 0, useCornerEnvelope: false, useLinearPath: true, amplitudeScale: 0.75 };
    default: {
      const _exhaustive: never = shape;
      throw new Error(`Unknown shape: ${_exhaustive}`);
    }
  }
}

function uniformAnchorIndices(anchorCount: number, n: number): number[] {
  const anchors: number[] = [];
  for (let i = 0; i < anchorCount; i++) {
    anchors.push(Math.round((n * i) / anchorCount));
  }
  return anchors;
}

function getShapeWaveAnchorIndices(shape: BadgeShape, n: number): number[] {
  const profile = getShapeWaveProfile(shape);
  if (profile.anchorCount === 0) {
    return [];
  }
  return uniformAnchorIndices(profile.anchorCount, n);
}

function normalizeAnchorIndices(anchorIndices: number[], n: number): number[] {
  const unique = new Set<number>();
  for (const index of anchorIndices) {
    const normalized = ((Math.round(index) % n) + n) % n;
    unique.add(normalized);
  }
  return [...unique].sort((a, b) => a - b);
}

function distributeHalfWaves(edgeLengths: number[], totalHalfWaves: number): number[] {
  if (edgeLengths.length === 0 || totalHalfWaves <= 0) {
    return edgeLengths.map(() => 0);
  }

  const totalLength = edgeLengths.reduce((sum, edgeLength) => sum + edgeLength, 0);
  if (totalLength <= 0) {
    return edgeLengths.map(() => 0);
  }

  // Rounded cumulative allocation keeps the total exact and distributes naturally by arc length.
  const allocation = new Array(edgeLengths.length).fill(0);
  let cumulativeLength = 0;
  let prevRoundedTarget = 0;
  for (let i = 0; i < edgeLengths.length; i++) {
    cumulativeLength += edgeLengths[i];
    const roundedTarget = Math.round((cumulativeLength / totalLength) * totalHalfWaves);
    allocation[i] = Math.max(0, roundedTarget - prevRoundedTarget);
    prevRoundedTarget = roundedTarget;
  }

  return allocation;
}

type EdgePhaseSpec = {
  start: number;
  length: number;
  halfWaves: number;
};

function buildEdgePhaseSpecs(
  anchorIndices: number[],
  n: number,
  totalHalfWaves: number,
): EdgePhaseSpec[] {
  const edges: Omit<EdgePhaseSpec, 'halfWaves'>[] = [];
  for (let i = 0; i < anchorIndices.length; i++) {
    const start = anchorIndices[i];
    const end = anchorIndices[(i + 1) % anchorIndices.length];
    const length = ((end - start) + n) % n;
    if (length > 0) {
      edges.push({ start, length });
    }
  }

  const halfWavesPerEdge = distributeHalfWaves(
    edges.map((edge) => edge.length),
    totalHalfWaves,
  );
  return edges.map((edge, i) => ({ ...edge, halfWaves: halfWavesPerEdge[i] }));
}

function buildAnchoredWavePaths(
  samples: SamplePoint[],
  anchorIndices: number[],
  waveCount: number,
  amplitude: number,
  useCornerEnvelope: boolean,
): [string, string] {
  const n = samples.length;
  if (n === 0) {
    return ['', ''];
  }

  const anchors = normalizeAnchorIndices(anchorIndices, n);
  if (anchors.length < 2) {
    return buildWavePaths(samples, waveCount, amplitude);
  }

  const totalHalfWaves = waveCount * 2;
  const edges = buildEdgePhaseSpecs(anchors, n, totalHalfWaves);
  if (edges.length === 0) {
    return buildWavePaths(samples, waveCount, amplitude);
  }

  const wave1Pts: { x: number; y: number }[] = new Array(n);
  const wave2Pts: { x: number; y: number }[] = new Array(n);
  let phaseStart = 0;

  for (const edge of edges) {
    for (let j = 0; j < edge.length; j++) {
      const index = (edge.start + j) % n;
      const pt = samples[index];
      const progress = j / edge.length;
      const phase = phaseStart + Math.PI * edge.halfWaves * progress;
      const envelope = useCornerEnvelope ? Math.sin(Math.PI * progress) : 1;
      const offset = Math.sin(phase) * amplitude * envelope;
      wave1Pts[index] = { x: pt.x + pt.nx * offset, y: pt.y + pt.ny * offset };
      wave2Pts[index] = { x: pt.x - pt.nx * offset, y: pt.y - pt.ny * offset };
    }
    phaseStart += Math.PI * edge.halfWaves;
  }

  // Defensive fallback for any index not covered by edge traversal.
  for (let i = 0; i < n; i++) {
    if (!wave1Pts[i] || !wave2Pts[i]) {
      const pt = samples[i];
      wave1Pts[i] = { x: pt.x, y: pt.y };
      wave2Pts[i] = { x: pt.x, y: pt.y };
    }
  }

  return [buildPathFromPoints(wave1Pts), buildPathFromPoints(wave2Pts)];
}

function buildShapeAwareWavePaths(
  shape: BadgeShape,
  samples: SamplePoint[],
  waveCount: number,
  amplitude: number,
): [string, string] {
  const profile = getShapeWaveProfile(shape);
  const anchors = getShapeWaveAnchorIndices(shape, samples.length);
  if (anchors.length === 0) {
    if (profile.useLinearPath) {
      return buildWavePathsLinear(samples, waveCount, amplitude);
    }
    return buildWavePaths(samples, waveCount, amplitude);
  }
  return buildAnchoredWavePaths(samples, anchors, waveCount, amplitude, profile.useCornerEnvelope);
}

function makeOuterClip(
  shape: BadgeShape,
  size: number,
  inset: number,
): { clipId: string; defsElement: React.ReactElement } {
  const clipId = `guilloche-${++clipCounter}`;
  const outerPath = generateShapePath(shape, size, inset);
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

/** Build a closed SVG path string from offset points using Catmull-Rom smoothing */
export function buildPathFromPoints(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 3) return '';
  const commands: string[] = new Array(n + 2);
  commands[0] = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const [cp1, cp2] = catmullRomToCubic(p0, p1, p2, p3);
    commands[i + 1] =
      `C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  commands[n + 1] = 'Z';
  return commands.join(' ');
}

function buildLinearPathFromPoints(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 2) return '';
  const commands: string[] = new Array(n + 2);
  commands[0] = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < n; i++) {
    commands[i] = `L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  commands[n] = `L ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  commands[n + 1] = 'Z';
  return commands.join(' ');
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Guilloche frame: two interlocking sine waves following the badge shape contour.
 *
 * Wave count scales with stepCount (3–14). A second wave at anti-phase
 * creates the classic currency-style interlocking pattern.
 */
export const guillocheGenerator: FrameGenerator = ({
  shape,
  size,
  inset,
  innerInset,
  params,
  strokeColor = DEFAULT_STROKE_COLOR,
}) => {
  if (innerInset <= inset) {
    if (__DEV__) {
      console.warn(
        '[guillocheGenerator] Degenerate geometry: innerInset ' +
          `(${innerInset}) <= inset (${inset}). Frame skipped.`,
      );
    }
    return null;
  }

  const baseWaveCount = Math.max(3, Math.min(14, Math.round(params.stepCount * 1.5)));
  const profile = getShapeWaveProfile(shape);
  const minWaveCountForAnchors = profile.anchorCount > 0 ? Math.ceil(profile.anchorCount / 2) : 3;
  const waveCount = Math.max(baseWaveCount, minWaveCountForAnchors);
  const bandMidInset = (inset + innerInset) / 2;
  const amplitude = (innerInset - inset) * AMPLITUDE_RATIO * profile.amplitudeScale;
  const n = waveCount * POINTS_PER_WAVE;

  const samples = sampleShapeContour(shape, size, bandMidInset, n);
  const [wave1, wave2] = buildShapeAwareWavePaths(shape, samples, waveCount, amplitude);

  const pathProps = {
    fill: 'none' as const,
    stroke: strokeColor,
    strokeWidth: WAVE_STROKE_WIDTH,
    opacity: WAVE_OPACITY,
  };
  const { clipId, defsElement } = makeOuterClip(shape, size, inset);

  return React.createElement(
    React.Fragment,
    null,
    defsElement,
    React.createElement(
      G,
      { clipPath: `url(#${clipId})` },
      React.createElement(Path, { key: 'guilloche-0', d: wave1, ...pathProps }),
      React.createElement(Path, { key: 'guilloche-1', d: wave2, ...pathProps }),
    ),
  );
};
