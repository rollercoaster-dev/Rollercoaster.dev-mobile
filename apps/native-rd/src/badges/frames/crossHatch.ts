/**
 * CrossHatch frame generator — intersecting diagonal line patterns.
 *
 * Two sets of lines (45° and -45°) fill the frame band, clipped to the
 * shape boundary. Spacing is driven by daysToComplete: quick goals get
 * sparse bold hatching, long journeys get fine tight mesh.
 */
import React from 'react';
import { ClipPath, Defs, G, Path } from 'react-native-svg';
import { generateShapePath } from '../shapes/paths';
import { DEFAULT_STROKE_COLOR, clamp } from './constants';
import type { FrameGenerator } from './types';

let clipCounter = 0;

/** Linear interpolation: maps value from [inMin, inMax] to [outMin, outMax] */
function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Compute hatch line spacing from daysToComplete (1–120 → 20–4, clamped) */
export function computeSpacing(daysToComplete: number): number {
  const raw = mapRange(daysToComplete, 1, 120, 20, 4);
  return clamp(raw, 4, 20);
}

/** Compute stroke width — thicker lines for sparser hatching (scales with spacing) */
function computeStrokeWidth(spacing: number): number {
  return 0.75 + ((spacing - 4) / 16) * 1.25;
}

/**
 * Build a compound SVG path string for parallel diagonal lines.
 *
 * @param size    - bounding box dimension
 * @param spacing - distance between parallel lines
 * @param positive - true for 45° (slope +1), false for -45° (slope -1)
 */
export function buildHatchLines(
  size: number,
  spacing: number,
  positive: boolean,
): string {
  if (spacing <= 0) return '';

  const segments: string[] = [];

  // Lines span from -size to size*2 to guarantee full coverage after clipping
  for (let c = -size; c <= size * 2; c += spacing) {
    if (positive) {
      // y = x - c  →  line from (0, -c) to (size, size - c)
      segments.push(`M 0 ${-c} L ${size} ${size - c}`);
    } else {
      // y = -x + c  →  line from (0, c) to (size, c - size)
      segments.push(`M 0 ${c} L ${size} ${c - size}`);
    }
  }

  return segments.join(' ');
}

export const crossHatchGenerator: FrameGenerator = ({
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
        '[crossHatchGenerator] Degenerate geometry: innerInset ' +
          `(${innerInset}) <= inset (${inset}). Frame skipped.`,
      );
    }
    return null;
  }

  const spacing = computeSpacing(params.daysToComplete);
  const strokeWidth = computeStrokeWidth(spacing);

  const outerPath = generateShapePath(shape, size, inset);
  const innerPath = generateShapePath(shape, size, innerInset);
  const clipId = `crosshatch-${++clipCounter}`;

  const hatch45 = buildHatchLines(size, spacing, true);
  const hatchNeg45 = buildHatchLines(size, spacing, false);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Defs,
      null,
      React.createElement(
        ClipPath,
        { id: clipId },
        React.createElement(Path, {
          d: `${outerPath} ${innerPath}`,
          clipRule: 'evenodd',
          fillRule: 'evenodd',
        }),
      ),
    ),
    React.createElement(
      G,
      { clipPath: `url(#${clipId})` },
      React.createElement(Path, {
        key: 'h-45',
        d: hatch45,
        fill: 'none',
        stroke: strokeColor,
        strokeWidth,
      }),
      React.createElement(Path, {
        key: 'h-neg45',
        d: hatchNeg45,
        fill: 'none',
        stroke: strokeColor,
        strokeWidth,
      }),
    ),
  );
};
