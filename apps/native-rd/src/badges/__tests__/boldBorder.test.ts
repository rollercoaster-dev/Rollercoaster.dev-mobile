/**
 * Tests for the boldBorder frame generator.
 *
 * Verifies ring count by stepCount threshold, all-shapes coverage,
 * degenerate geometry handling, and strokeColor propagation.
 */
import React from "react";
import { boldBorderGenerator } from "../frames/boldBorder";
import { frameRegistry } from "../frames";
import type { FrameGeneratorConfig } from "../frames/types";
import { BadgeFrame, BadgeShape } from "../types";
import type { FrameDataParams } from "../types";

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

type SvgPathProps = {
  stroke: string;
  strokeWidth: number;
  fill: string;
  d: string;
  children?: React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = React.ReactElement<any>;

/** Count children of a Fragment returned by the generator */
function countChildren(element: AnyElement): number {
  return React.Children.count(element.props.children);
}

/** Get children array with typed props */
function getChildren(element: AnyElement): React.ReactElement<SvgPathProps>[] {
  return React.Children.toArray(
    element.props.children,
  ) as React.ReactElement<SvgPathProps>[];
}

describe("boldBorderGenerator", () => {
  describe("ring count by stepCount", () => {
    test.each([
      { stepCount: 1, expected: 2 },
      { stepCount: 2, expected: 2 },
      { stepCount: 3, expected: 2 },
      { stepCount: 4, expected: 3 },
      { stepCount: 10, expected: 3 },
    ])("stepCount $stepCount → $expected rings", ({ stepCount, expected }) => {
      const config = makeConfig({ params: { ...defaultParams, stepCount } });
      const result = boldBorderGenerator(config);
      expect(result).not.toBeNull();
      expect(countChildren(result!)).toBe(expected);
    });
  });

  describe("all shapes", () => {
    const allShapes = Object.values(BadgeShape) as BadgeShape[];

    test.each(allShapes)('shape "%s" renders without throwing', (shape) => {
      const config = makeConfig({ shape });
      const result = boldBorderGenerator(config);
      expect(result).not.toBeNull();
    });
  });

  test("degenerate inset returns null when rings reach innerInset", () => {
    // When inset >= innerInset, no room for rings inside the content boundary
    const config = makeConfig({ inset: INNER_INSET });
    expect(boldBorderGenerator(config)).toBeNull();
  });

  test("stepCount 0 produces 2 rings", () => {
    const config = makeConfig({ params: { ...defaultParams, stepCount: 0 } });
    const result = boldBorderGenerator(config);
    expect(result).not.toBeNull();
    expect(countChildren(result!)).toBe(2);
  });

  test("strokeColor is applied to Path elements", () => {
    const config = makeConfig({ strokeColor: "#ff0000" });
    const result = boldBorderGenerator(config)!;
    for (const child of getChildren(result)) {
      expect(child.props.stroke).toBe("#ff0000");
    }
  });

  test("default strokeColor is black", () => {
    const config = makeConfig();
    const result = boldBorderGenerator(config)!;
    const children = getChildren(result);
    expect(children[0].props.stroke).toBe("#000000");
  });

  test("stroke widths decrease for inner rings", () => {
    const config = makeConfig({ params: { ...defaultParams, stepCount: 5 } });
    const result = boldBorderGenerator(config)!;
    const widths = getChildren(result).map((c) => c.props.strokeWidth);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeLessThan(widths[i - 1]);
    }
  });

  test('all paths have fill="none"', () => {
    const config = makeConfig();
    const result = boldBorderGenerator(config)!;
    for (const child of getChildren(result)) {
      expect(child.props.fill).toBe("none");
    }
  });

  test("renders when rings fit inside innerInset boundary", () => {
    // Large innerInset gives plenty of room
    const config = makeConfig({ inset: 4, innerInset: 100 });
    expect(boldBorderGenerator(config)).not.toBeNull();
  });

  test("returns null when innerInset is too tight for rings", () => {
    // innerInset barely past inset leaves no room for spacing
    const config = makeConfig({ inset: 10, innerInset: 11 });
    expect(boldBorderGenerator(config)).toBeNull();
  });
});

describe("frameRegistry", () => {
  test("has an entry for every BadgeFrame value", () => {
    for (const frame of Object.values(BadgeFrame)) {
      expect(frameRegistry).toHaveProperty(frame);
    }
  });

  test("boldBorder entry is the boldBorderGenerator", () => {
    expect(frameRegistry.boldBorder).toBe(boldBorderGenerator);
  });

  test("none returns null", () => {
    expect(frameRegistry.none(makeConfig())).toBeNull();
  });

  test.each(["guilloche", "crossHatch", "rosette", "microprint"] as const)(
    "%s returns non-null (implemented)",
    (frame) => {
      expect(frameRegistry[frame](makeConfig())).not.toBeNull();
    },
  );
});
