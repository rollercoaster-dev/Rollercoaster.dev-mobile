/**
 * Tests for the rosette frame generator.
 *
 * Verifies petal count computation, all-shapes coverage, vertex placement,
 * degenerate geometry handling, clip path structure, and strokeColor propagation.
 */
import React from 'react';
import {
  rosetteGenerator,
  computePetalCount,
  computeRosetteRadius,
} from '../frames/rosette';
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
  evidenceCount: 8,
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

/** Get children array from a Fragment or group element */
function getChildren(element: AnyElement): AnyElement[] {
  return React.Children.toArray(element.props.children) as AnyElement[];
}

/** Get the circle elements from inside the clip group (Defs + G structure) */
function getCircles(result: AnyElement): AnyElement[] {
  const children = getChildren(result);
  // Structure: Fragment > [Defs, G > circles]
  const gGroup = children[1];
  return getChildren(gGroup);
}

describe('computePetalCount', () => {
  test.each([
    { evidenceCount: 0, expected: 4 },
    { evidenceCount: 1, expected: 4 },
    { evidenceCount: 8, expected: 4 },
    { evidenceCount: 14, expected: 7 },
    { evidenceCount: 28, expected: 14 },
    { evidenceCount: 100, expected: 14 },
  ])(
    'evidenceCount=$evidenceCount → petalCount=$expected',
    ({ evidenceCount, expected }) => {
      expect(computePetalCount(evidenceCount)).toBe(expected);
    },
  );
});

describe('computeRosetteRadius', () => {
  test('returns 60% of band width', () => {
    expect(computeRosetteRadius(4, 30)).toBeCloseTo((30 - 4) * 0.6);
  });
});

describe('rosetteGenerator', () => {
  test('returns null for degenerate geometry (innerInset <= inset)', () => {
    expect(rosetteGenerator(makeConfig({ innerInset: INSET }))).toBeNull();
  });

  test('returns null for inverted geometry', () => {
    expect(
      rosetteGenerator(makeConfig({ inset: 50, innerInset: 10 })),
    ).toBeNull();
  });

  const allShapes = Object.values(BadgeShape) as BadgeShape[];

  test.each(allShapes)('shape "%s" renders without throwing', (shape) => {
    const result = rosetteGenerator(makeConfig({ shape }));
    expect(result).not.toBeNull();
  });

  test('output contains Defs and G elements', () => {
    const result = rosetteGenerator(makeConfig())!;
    const children = getChildren(result);
    expect(children.length).toBe(2);
    expect(children[0].type).toBeDefined();
    expect(children[1].type).toBeDefined();
  });

  // Vertex count per shape × petal count = total circles
  const vertexCounts: Record<string, number> = {
    circle: 8,
    hexagon: 6,
    diamond: 4,
    star: 5,
    shield: 3,
    roundedRect: 4,
  };

  test.each(Object.entries(vertexCounts))(
    '%s: correct number of circles (%i vertices × petalCount)',
    (shape, vertexCount) => {
      const petalCount = computePetalCount(defaultParams.evidenceCount);
      const result = rosetteGenerator(
        makeConfig({ shape: shape as BadgeShape }),
      )!;
      const circles = getCircles(result);
      expect(circles.length).toBe(vertexCount * petalCount);
    },
  );

  test('all circles have fill="none"', () => {
    const result = rosetteGenerator(makeConfig())!;
    for (const child of getCircles(result)) {
      expect(child.props.fill).toBe('none');
    }
  });

  test('strokeColor is applied to all circles', () => {
    const result = rosetteGenerator(
      makeConfig({ strokeColor: '#ff0000' }),
    )!;
    for (const child of getCircles(result)) {
      expect(child.props.stroke).toBe('#ff0000');
    }
  });

  test('default strokeColor is black', () => {
    const result = rosetteGenerator(makeConfig())!;
    const circles = getCircles(result);
    expect(circles[0].props.stroke).toBe(DEFAULT_STROKE_COLOR);
  });

  test('higher evidenceCount produces more petals per vertex', () => {
    const lowEvidence = rosetteGenerator(
      makeConfig({ params: { ...defaultParams, evidenceCount: 2 } }),
    )!;
    const highEvidence = rosetteGenerator(
      makeConfig({ params: { ...defaultParams, evidenceCount: 20 } }),
    )!;
    expect(getCircles(highEvidence).length).toBeGreaterThan(
      getCircles(lowEvidence).length,
    );
  });
});

describe('frameRegistry rosette', () => {
  test('rosette entry is rosetteGenerator', () => {
    expect(frameRegistry.rosette).toBe(rosetteGenerator);
  });

  test('rosette returns non-null for default config', () => {
    expect(frameRegistry.rosette(makeConfig())).not.toBeNull();
  });
});
