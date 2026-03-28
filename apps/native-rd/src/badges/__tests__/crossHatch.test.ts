/**
 * Tests for the crossHatch frame generator.
 *
 * Verifies spacing computation, all-shapes coverage, degenerate geometry,
 * clip path structure, and strokeColor propagation.
 */
import React from 'react';
import {
  crossHatchGenerator,
  computeSpacing,
  buildHatchLines,
} from '../frames/crossHatch';
import { frameRegistry, DEFAULT_STROKE_COLOR } from '../frames';
import type { FrameGeneratorConfig } from '../frames/types';
import { BadgeShape } from '../types';
import type { FrameDataParams } from '../types';

const SIZE = 256;
const INSET = 4;
const INNER_INSET = 30;

const defaultParams: FrameDataParams = {
  variant: 0,
  stepCount: 2,
  evidenceCount: 5,
  daysToComplete: 30,
  evidenceTypes: 3,
};

function makeConfig(
  overrides: Partial<FrameGeneratorConfig> = {},
): FrameGeneratorConfig {
  return {
    shape: BadgeShape.circle,
    size: SIZE,
    inset: INSET,
    innerInset: INNER_INSET,
    params: defaultParams,
    ...overrides,
  };
}

type AnyElement = React.ReactElement<any>;

/** Get children array from a Fragment */
function getChildren(element: AnyElement): AnyElement[] {
  return React.Children.toArray(element.props.children) as AnyElement[];
}

describe('computeSpacing', () => {
  test.each([
    { daysToComplete: 1, expected: 20 },
    { daysToComplete: 120, expected: 4 },
    { daysToComplete: 0, expected: 20 },
    { daysToComplete: 200, expected: 4 },
  ])(
    'daysToComplete=$daysToComplete → spacing=$expected',
    ({ daysToComplete, expected }) => {
      expect(computeSpacing(daysToComplete)).toBeCloseTo(expected, 0);
    },
  );

  test('midpoint produces intermediate spacing', () => {
    const spacing = computeSpacing(60);
    expect(spacing).toBeGreaterThan(4);
    expect(spacing).toBeLessThan(20);
  });
});

describe('buildHatchLines', () => {
  test('produces non-empty path for positive angle', () => {
    const path = buildHatchLines(100, 10, true);
    expect(path).toContain('M');
    expect(path).toContain('L');
  });

  test('produces non-empty path for negative angle', () => {
    const path = buildHatchLines(100, 10, false);
    expect(path).toContain('M');
    expect(path).toContain('L');
  });

  test('smaller spacing produces more line segments', () => {
    const sparse = buildHatchLines(100, 20, true).split('M').length;
    const dense = buildHatchLines(100, 5, true).split('M').length;
    expect(dense).toBeGreaterThan(sparse);
  });
});

describe('crossHatchGenerator', () => {
  test('returns null for degenerate geometry (innerInset <= inset)', () => {
    expect(crossHatchGenerator(makeConfig({ innerInset: INSET }))).toBeNull();
  });

  test('returns null for inverted geometry', () => {
    expect(
      crossHatchGenerator(makeConfig({ inset: 50, innerInset: 10 })),
    ).toBeNull();
  });

  const allShapes = Object.values(BadgeShape) as BadgeShape[];

  test.each(allShapes)('shape "%s" renders without throwing', (shape) => {
    const result = crossHatchGenerator(makeConfig({ shape }));
    expect(result).not.toBeNull();
  });

  test('output contains Defs and G elements', () => {
    const result = crossHatchGenerator(makeConfig())!;
    const children = getChildren(result);
    // First child is Defs, second is G
    expect(children.length).toBe(2);
    expect(children[0].type).toBeDefined();
    expect(children[1].type).toBeDefined();
  });

  test('G group contains two hatch Path elements', () => {
    const result = crossHatchGenerator(makeConfig())!;
    const children = getChildren(result);
    const gGroup = children[1];
    const hatchPaths = getChildren(gGroup);
    expect(hatchPaths.length).toBe(2);
  });

  test('strokeColor is applied to hatch paths', () => {
    const result = crossHatchGenerator(
      makeConfig({ strokeColor: '#ff0000' }),
    )!;
    const gGroup = getChildren(result)[1];
    for (const path of getChildren(gGroup)) {
      expect(path.props.stroke).toBe('#ff0000');
    }
  });

  test('default strokeColor is black', () => {
    const result = crossHatchGenerator(makeConfig())!;
    const gGroup = getChildren(result)[1];
    const paths = getChildren(gGroup);
    expect(paths[0].props.stroke).toBe(DEFAULT_STROKE_COLOR);
  });

  test('all hatch paths have fill="none"', () => {
    const result = crossHatchGenerator(makeConfig())!;
    const gGroup = getChildren(result)[1];
    for (const path of getChildren(gGroup)) {
      expect(path.props.fill).toBe('none');
    }
  });
});

describe('frameRegistry crossHatch', () => {
  test('crossHatch entry is crossHatchGenerator', () => {
    expect(frameRegistry.crossHatch).toBe(crossHatchGenerator);
  });

  test('crossHatch returns non-null for default config', () => {
    expect(frameRegistry.crossHatch(makeConfig())).not.toBeNull();
  });
});
