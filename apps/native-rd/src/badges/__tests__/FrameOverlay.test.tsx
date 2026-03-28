/**
 * Tests for the FrameOverlay component.
 *
 * Verifies null guards, delegation to generators, and prop pass-through.
 */
import React from 'react';
import { FrameOverlay } from '../frames/FrameOverlay';
import type { FrameOverlayProps } from '../frames/FrameOverlay';
import { BadgeShape } from '../types';
import type { FrameDataParams } from '../types';

const SIZE = 256;
const INSET = 4;
const INNER_INSET = 30;

const defaultParams: FrameDataParams = {
  variant: 0,
  stepCount: 3,
  evidenceCount: 5,
  daysToComplete: 30,
  evidenceTypes: 3,
  stepNames: ['Learn', 'Build', 'Ship'],
};

function makeProps(overrides: Partial<FrameOverlayProps> = {}): FrameOverlayProps {
  return {
    frame: 'boldBorder',
    shape: BadgeShape.circle,
    size: SIZE,
    inset: INSET,
    innerInset: INNER_INSET,
    params: defaultParams,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Null guards
// ---------------------------------------------------------------------------

describe('FrameOverlay null guards', () => {
  it('returns null when frame is "none"', () => {
    const result = FrameOverlay(makeProps({ frame: 'none' }));
    expect(result).toBeNull();
  });

  it('returns null when frame is "none" even with params', () => {
    const result = FrameOverlay(makeProps({ frame: 'none', params: defaultParams }));
    expect(result).toBeNull();
  });

  it('returns null when params is undefined', () => {
    const result = FrameOverlay(makeProps({ params: undefined }));
    expect(result).toBeNull();
  });

  it('returns null when params is undefined for any non-none frame', () => {
    const result = FrameOverlay(makeProps({ frame: 'guilloche', params: undefined }));
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Delegation (integration smoke tests with real generators)
// ---------------------------------------------------------------------------

describe('FrameOverlay delegation', () => {
  it('renders boldBorder frame for valid config', () => {
    const result = FrameOverlay(makeProps({ frame: 'boldBorder' }));
    expect(result).not.toBeNull();
  });

  it('renders crossHatch frame for valid config', () => {
    const result = FrameOverlay(makeProps({ frame: 'crossHatch' }));
    expect(result).not.toBeNull();
  });

  it('renders guilloche frame for valid config', () => {
    const result = FrameOverlay(makeProps({ frame: 'guilloche' }));
    expect(result).not.toBeNull();
  });

  it('renders rosette frame for valid config', () => {
    const result = FrameOverlay(makeProps({ frame: 'rosette' }));
    expect(result).not.toBeNull();
  });

  it('renders microprint frame for valid config', () => {
    const result = FrameOverlay(makeProps({ frame: 'microprint' }));
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Prop pass-through
// ---------------------------------------------------------------------------

describe('FrameOverlay prop pass-through', () => {
  it('passes strokeColor to the generator', () => {
    const customColor = '#ff0000';
    const result = FrameOverlay(makeProps({ frame: 'boldBorder', strokeColor: customColor }));
    // boldBorder uses strokeColor for its Path stroke
    expect(result).not.toBeNull();
    // Verify the color made it through by checking the rendered element
    const children = React.Children.toArray(
      (result as React.ReactElement<{ children?: React.ReactNode }>).props.children,
    );
    const hasCustomColor = JSON.stringify(children).includes(customColor);
    expect(hasCustomColor).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error resilience
// ---------------------------------------------------------------------------

describe('FrameOverlay error resilience', () => {
  it('returns null when generator throws (does not crash)', () => {
    // Use a Proxy that throws on any property access to actually exercise
    // the try/catch path — degenerate geometry alone just returns null
    // without hitting the catch branch.
    const throwingParams = new Proxy(defaultParams, {
      get() {
        throw new Error('boom');
      },
    }) as unknown as FrameDataParams;

    const result = FrameOverlay(
      makeProps({
        frame: 'boldBorder',
        params: throwingParams,
      }),
    );
    expect(result).toBeNull();
  });
});
