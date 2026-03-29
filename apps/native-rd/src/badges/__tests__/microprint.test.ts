/**
 * Tests for the microprint frame generator.
 *
 * Verifies content building, ring count computation, all-shapes coverage,
 * degenerate geometry guard, clip path structure, and text rendering.
 */
import React from "react";
import {
  microprintGenerator,
  buildMicroprintContent,
  computeRingCount,
  MICROPRINT_FONT_SIZE_RATIO,
  MICROPRINT_OPACITY,
} from "../frames/microprint";
import { DEFAULT_STROKE_COLOR } from "../frames";
import type { FrameGeneratorConfig } from "../frames/types";
import { BadgeShape } from "../types";
import type { FrameDataParams } from "../types";

const SIZE = 256;
const INSET = 4;
const INNER_INSET = 30;

const defaultParams: FrameDataParams = {
  variant: 0,
  stepCount: 3,
  evidenceCount: 5,
  daysToComplete: 30,
  evidenceTypes: 3,
  stepNames: ["Learn SVG", "Build frames", "Ship it"],
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

function getChildren(element: AnyElement): AnyElement[] {
  return React.Children.toArray(element.props.children) as AnyElement[];
}

// ---------------------------------------------------------------------------
// buildMicroprintContent
// ---------------------------------------------------------------------------

describe("buildMicroprintContent", () => {
  it("joins step names with bullet separators", () => {
    const result = buildMicroprintContent(["A", "B", "C"], 10);
    expect(result).toContain("A \u2022 B \u2022 C \u2022 ");
  });

  it("repeats content to reach minLength", () => {
    const result = buildMicroprintContent(["Hi"], 100);
    expect(result.length).toBeGreaterThanOrEqual(100);
  });

  it("falls back to bullet pattern for empty stepNames", () => {
    const result = buildMicroprintContent([], 50);
    expect(result).toContain("\u2022");
    expect(result.length).toBeGreaterThanOrEqual(50);
  });

  it("falls back to bullet pattern for undefined stepNames", () => {
    const result = buildMicroprintContent(undefined, 50);
    expect(result).toContain("\u2022");
    expect(result.length).toBeGreaterThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// computeRingCount
// ---------------------------------------------------------------------------

describe("computeRingCount", () => {
  test.each([
    [0, 2],
    [4, 2],
    [5, 3],
    [6, 3],
    [12, 4],
    [13, 4],
    [100, 4],
  ])("evidenceCount %i → %i rings", (evidenceCount, expected) => {
    expect(computeRingCount(evidenceCount)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// microprintGenerator
// ---------------------------------------------------------------------------

describe("microprintGenerator", () => {
  it("returns null for degenerate geometry (innerInset <= inset)", () => {
    expect(microprintGenerator(makeConfig({ innerInset: INSET }))).toBeNull();
  });

  it("returns null for inverted geometry (innerInset < inset)", () => {
    expect(
      microprintGenerator(makeConfig({ innerInset: INSET - 1 })),
    ).toBeNull();
  });

  const allShapes = Object.values(BadgeShape);

  test.each(allShapes)('shape "%s" renders without throwing', (shape) => {
    const result = microprintGenerator(makeConfig({ shape }));
    expect(result).not.toBeNull();
  });

  it("returns a Fragment with [Defs, G] children", () => {
    const result = microprintGenerator(makeConfig())!;
    const children = getChildren(result);
    expect(children).toHaveLength(2);
    expect(children[0].type).toHaveProperty("displayName");
    expect(children[1].type).toHaveProperty("displayName");
  });

  it("Defs contains ClipPath and ring path elements", () => {
    const result = microprintGenerator(makeConfig())!;
    const [defs] = getChildren(result);
    const defsChildren = getChildren(defs);
    // 1 ClipPath + N ring paths (2 rings for evidenceCount=5)
    expect(defsChildren.length).toBeGreaterThanOrEqual(3);
  });

  it("G contains Text elements matching ring count", () => {
    const result = microprintGenerator(makeConfig())!;
    const [, g] = getChildren(result);
    const texts = getChildren(g);
    const expectedRings = computeRingCount(defaultParams.evidenceCount);
    expect(texts).toHaveLength(expectedRings);
  });

  it("applies strokeColor as fill on Text elements", () => {
    const customColor = "#ff0000";
    const result = microprintGenerator(
      makeConfig({ strokeColor: customColor }),
    )!;
    const [, g] = getChildren(result);
    const texts = getChildren(g);
    texts.forEach((text) => {
      expect(text.props.fill).toBe(customColor);
    });
  });

  it("uses DEFAULT_STROKE_COLOR when no strokeColor provided", () => {
    const result = microprintGenerator(makeConfig())!;
    const [, g] = getChildren(result);
    const texts = getChildren(g);
    texts.forEach((text) => {
      expect(text.props.fill).toBe(DEFAULT_STROKE_COLOR);
    });
  });

  it("produces more rings with higher evidenceCount", () => {
    const lowEvidence = microprintGenerator(
      makeConfig({ params: { ...defaultParams, evidenceCount: 2 } }),
    )!;
    const highEvidence = microprintGenerator(
      makeConfig({ params: { ...defaultParams, evidenceCount: 20 } }),
    )!;

    const lowRings = getChildren(getChildren(lowEvidence)[1]);
    const highRings = getChildren(getChildren(highEvidence)[1]);
    expect(highRings.length).toBeGreaterThan(lowRings.length);
  });

  it("applies MICROPRINT_OPACITY to the G group", () => {
    const result = microprintGenerator(makeConfig())!;
    const [, g] = getChildren(result);
    expect(g.props.opacity).toBe(MICROPRINT_OPACITY);
  });

  it("sets correct fontSize based on size", () => {
    const result = microprintGenerator(makeConfig())!;
    const [, g] = getChildren(result);
    const texts = getChildren(g);
    const expectedFontSize = SIZE * MICROPRINT_FONT_SIZE_RATIO;
    texts.forEach((text) => {
      expect(text.props.fontSize).toBe(expectedFontSize);
    });
  });
});

// ---------------------------------------------------------------------------
// frameRegistry integration
// ---------------------------------------------------------------------------

describe("frameRegistry microprint", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { frameRegistry } = require("../frames");

  it("maps to microprintGenerator (not unimplemented stub)", () => {
    const result = frameRegistry.microprint(makeConfig());
    expect(result).not.toBeNull();
  });
});
