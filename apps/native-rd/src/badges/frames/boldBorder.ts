import React from 'react';
import { Path } from 'react-native-svg';
import { generateShapePath } from '../shapes/paths';
import { DEFAULT_STROKE_COLOR } from './constants';
import type { FrameGenerator } from './types';

/** Proportional gap between concentric rings (fraction of badge size) */
const RING_SPACING_RATIO = 0.04;

/** Stroke widths per ring, outer to inner (tuple enforces max 3 rings) */
const STROKE_WIDTHS: [number, number, number] = [2.5, 1.5, 1.0];

/** stepCount at or above this threshold adds a third ring */
const THREE_RING_THRESHOLD = 4;

/**
 * Bold-border frame: renders 2 or 3 concentric shape-following stroke paths.
 *
 * - stepCount 1-3 → 2 rings
 * - stepCount 4+  → 3 rings
 *
 * Returns null if the innermost ring would overlap the content area
 * (defined by `innerInset`).
 */
export const boldBorderGenerator: FrameGenerator = ({
  shape,
  size,
  inset,
  innerInset,
  params,
  strokeColor = DEFAULT_STROKE_COLOR,
}) => {
  const ringCount = params.stepCount >= THREE_RING_THRESHOLD ? 3 : 2;
  const spacing = size * RING_SPACING_RATIO;

  // Check that the innermost ring stays outside the content area
  const innermostInset = inset + spacing * (ringCount - 1);
  if (innermostInset >= innerInset) {
    if (__DEV__) {
      console.warn(
        '[boldBorderGenerator] Degenerate geometry: innermost ring inset ' +
          `(${innermostInset}) >= innerInset (${innerInset}). Frame skipped.`,
      );
    }
    return null;
  }

  const rings = Array.from({ length: ringCount }, (_, i) => {
    const ringInset = inset + spacing * i;
    const d = generateShapePath(shape, size, ringInset);
    return React.createElement(Path, {
      key: `bold-border-${i}`,
      d,
      fill: 'none',
      stroke: strokeColor,
      strokeWidth: STROKE_WIDTHS[i],
    });
  });

  return React.createElement(React.Fragment, null, ...rings);
};
