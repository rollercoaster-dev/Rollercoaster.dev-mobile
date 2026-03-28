/**
 * Rosette frame generator — circular geometric patterns at shape vertices.
 *
 * For each vertex in the shape contour, draws overlapping circles that
 * form a classic rosette flower pattern. Petal count is driven by
 * evidenceCount: more evidence → more petals (4–14 range).
 *
 * Circles are clipped to the frame band (outer shape minus inner shape)
 * using an even-odd clip path, matching the crossHatch pattern.
 */
import React from 'react';
import { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { generateContour } from '../shapes/contours';
import { generateShapePath } from '../shapes/paths';
import { DEFAULT_STROKE_COLOR, clamp } from './constants';
import type { FrameGenerator } from './types';

const ROSETTE_STROKE_WIDTH = 0.75;

let clipCounter = 0;

/** Compute petal count from evidence count (clamped 4–14) */
export function computePetalCount(evidenceCount: number): number {
  return clamp(Math.ceil(evidenceCount / 2), 4, 14);
}

/** Compute rosette radius as 60% of frame band width */
export function computeRosetteRadius(
  inset: number,
  innerInset: number,
): number {
  return (innerInset - inset) * 0.6;
}

export const rosetteGenerator: FrameGenerator = ({
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
        '[rosetteGenerator] Degenerate geometry: innerInset ' +
          `(${innerInset}) <= inset (${inset}). Frame skipped.`,
      );
    }
    return null;
  }

  const petalCount = computePetalCount(params.evidenceCount);
  const rosetteRadius = computeRosetteRadius(inset, innerInset);

  // Use mid-band inset so rosettes sit centered in the frame band
  const midBandInset = (inset + innerInset) / 2;
  const contour = generateContour(shape, size, midBandInset);

  // Clip to frame band (outer minus inner) using even-odd rule
  const outerPath = generateShapePath(shape, size, inset);
  const innerPath = generateShapePath(shape, size, innerInset);
  const clipId = `rosette-${++clipCounter}`;

  const circles: React.ReactElement[] = [];

  for (let vi = 0; vi < contour.vertices.length; vi++) {
    const v = contour.vertices[vi];
    for (let i = 0; i < petalCount; i++) {
      const angle = ((2 * Math.PI) / petalCount) * i;
      const cx = v.x + rosetteRadius * Math.cos(angle);
      const cy = v.y + rosetteRadius * Math.sin(angle);
      circles.push(
        React.createElement(Circle, {
          key: `r-${vi}-${i}`,
          cx,
          cy,
          r: rosetteRadius,
          fill: 'none',
          stroke: strokeColor,
          strokeWidth: ROSETTE_STROKE_WIDTH,
        }),
      );
    }
  }

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
      ...circles,
    ),
  );
};
