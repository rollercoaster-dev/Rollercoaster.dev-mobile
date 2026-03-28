import React from 'react';
import {
  guillocheGenerator,
  makeRoundedRectSampler,
  makeShieldSampler,
  POINTS_PER_WAVE,
} from '../frames/guilloche';
import { frameRegistry } from '../frames';
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

function makeConfig(overrides: Partial<FrameGeneratorConfig> = {}): FrameGeneratorConfig {
  return {
    shape: BadgeShape.circle,
    size: SIZE,
    inset: INSET,
    innerInset: INNER_INSET,
    params: defaultParams,
    ...overrides,
  };
}

type SvgPathProps = { stroke: string; fill: string; d: string; opacity: number; strokeWidth: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React element typing requires any
type AnyElement = React.ReactElement<any>;

function flatChildren(element: AnyElement): AnyElement[] {
  return React.Children.toArray(element.props.children).flatMap((child) => {
    const el = child as AnyElement;
    if (el.props?.children) {
      return [el, ...flatChildren(el)];
    }
    return [el];
  });
}

function getWavePaths(element: AnyElement): React.ReactElement<SvgPathProps>[] {
  return flatChildren(element).filter(
    (el) => el.props?.d !== undefined && el.props?.fill === 'none' && el.props?.stroke !== undefined,
  ) as React.ReactElement<SvgPathProps>[];
}

describe('guillocheGenerator', () => {
  describe('parametric sampler continuity', () => {
    test('rounded-rect sampler is periodic at t=1 seam', () => {
      const sampler = makeRoundedRectSampler(SIZE, (INSET + INNER_INSET) / 2);
      const p0 = sampler(0);
      const p1 = sampler(1);
      expect(Math.abs(p0.x - p1.x)).toBeLessThan(0.0001);
      expect(Math.abs(p0.y - p1.y)).toBeLessThan(0.0001);
    });

    test('shield sampler is periodic at t=1 seam', () => {
      const sampler = makeShieldSampler(SIZE, (INSET + INNER_INSET) / 2);
      const p0 = sampler(0);
      const p1 = sampler(1);
      expect(Math.abs(p0.x - p1.x)).toBeLessThan(0.0001);
      expect(Math.abs(p0.y - p1.y)).toBeLessThan(0.0001);
    });
  });

  describe('wave count scaling', () => {
    test.each([
      { stepCount: 0, expectedWaves: 3, label: 'minimum clamp' },
      { stepCount: 2, expectedWaves: 3, label: '2*1.5=3' },
      { stepCount: 5, expectedWaves: 8, label: '5*1.5=7.5→8' },
      { stepCount: 10, expectedWaves: 14, label: 'maximum clamp' },
    ])('stepCount $stepCount → $expectedWaves waves ($label)', ({ stepCount, expectedWaves }) => {
      const config = makeConfig({ params: { ...defaultParams, stepCount } });
      const result = guillocheGenerator(config);
      expect(result).not.toBeNull();
      expect(getWavePaths(result!)).toHaveLength(2);
      // Verify actual wave count via C command count in path
      const path = getWavePaths(result!)[0].props.d;
      const cCount = (path.match(/\bC\b/g) ?? []).length;
      expect(cCount).toBe(expectedWaves * POINTS_PER_WAVE);
    });
  });

  describe('all shapes', () => {
    const allShapes = Object.values(BadgeShape) as BadgeShape[];

    test.each(allShapes)('shape "%s" renders without throwing', (shape) => {
      const config = makeConfig({ shape });
      const result = guillocheGenerator(config);
      expect(result).not.toBeNull();
    });
  });

  test('returns null for degenerate geometry (inset === innerInset)', () => {
    const config = makeConfig({ inset: INNER_INSET, innerInset: INNER_INSET });
    expect(guillocheGenerator(config)).toBeNull();
  });

  test('returns null for inverted geometry (inset > innerInset)', () => {
    const config = makeConfig({ inset: 50, innerInset: 10 });
    expect(guillocheGenerator(config)).toBeNull();
  });

  test('both paths have fill="none"', () => {
    const result = guillocheGenerator(makeConfig())!;
    for (const child of getWavePaths(result)) {
      expect(child.props.fill).toBe('none');
    }
  });

  test('strokeColor is applied to both paths', () => {
    const result = guillocheGenerator(makeConfig({ strokeColor: '#ff0000' }))!;
    for (const child of getWavePaths(result)) {
      expect(child.props.stroke).toBe('#ff0000');
    }
  });

  test('default strokeColor is black', () => {
    const result = guillocheGenerator(makeConfig())!;
    expect(getWavePaths(result)[0].props.stroke).toBe('#000000');
  });

  test('paths have correct strokeWidth and opacity', () => {
    const result = guillocheGenerator(makeConfig())!;
    for (const child of getWavePaths(result)) {
      expect(child.props.strokeWidth).toBe(1.0);
      expect(child.props.opacity).toBe(0.85);
    }
  });

  test('paths start with M and end with Z', () => {
    const result = guillocheGenerator(makeConfig())!;
    for (const child of getWavePaths(result)) {
      expect(child.props.d).toMatch(/^M /);
      expect(child.props.d).toMatch(/ Z$/);
    }
  });

  test('two paths are distinct (wave vs anti-phase wave)', () => {
    const result = guillocheGenerator(makeConfig())!;
    const children = getWavePaths(result);
    expect(children[0].props.d).not.toBe(children[1].props.d);
  });

  test('includes clip path defs for outer-boundary clipping', () => {
    const result = guillocheGenerator(makeConfig({ shape: BadgeShape.star }))!;
    const all = flatChildren(result);
    const hasClipPath = all.some((el) => el.props?.clipPath);
    expect(hasClipPath).toBe(true);
  });

  describe('visual complexity', () => {
    test('high stepCount produces longer paths than low stepCount', () => {
      const lowResult = guillocheGenerator(
        makeConfig({ params: { ...defaultParams, stepCount: 1 } }),
      )!;
      const highResult = guillocheGenerator(
        makeConfig({ params: { ...defaultParams, stepCount: 9 } }),
      )!;
      const lowPath = getWavePaths(lowResult)[0].props.d;
      const highPath = getWavePaths(highResult)[0].props.d;
      // More waves = more C commands = longer path string
      expect(highPath.length).toBeGreaterThan(lowPath.length);
    });
  });

  test('star shape enforces enough waves to avoid flat edge segments', () => {
    const result = guillocheGenerator(makeConfig({ shape: BadgeShape.star, params: { ...defaultParams, stepCount: 1 } }))!;
    const path = getWavePaths(result)[0].props.d;
    const cCount = (path.match(/\bC\b/g) ?? []).length;
    expect(cCount).toBe(5 * POINTS_PER_WAVE);
  });
});

describe('frameRegistry', () => {
  test('guilloche entry is guillocheGenerator', () => {
    expect(frameRegistry.guilloche).toBe(guillocheGenerator);
  });

  test('guilloche returns non-null for default config', () => {
    const config = makeConfig();
    expect(frameRegistry.guilloche(config)).not.toBeNull();
  });
});
