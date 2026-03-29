import React from "react";
import {
  guillochePerEdge,
  guillochePerEdgeWithDots,
} from "../frames/guillocheVariants";
import type { FrameGeneratorConfig } from "../frames/types";
import { BadgeShape } from "../types";
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

function findPaths(element: AnyElement): AnyElement[] {
  return flatChildren(element).filter((el) => el.props?.d !== undefined);
}

function findCircles(element: AnyElement): AnyElement[] {
  return flatChildren(element).filter(
    (el) => el.props?.cx !== undefined && el.props?.r !== undefined,
  );
}

const allShapes = Object.values(BadgeShape) as BadgeShape[];

describe("guillochePerEdge", () => {
  test("returns null for degenerate geometry", () => {
    expect(
      guillochePerEdge(
        makeConfig({ inset: INNER_INSET, innerInset: INNER_INSET }),
      ),
    ).toBeNull();
  });

  test("returns null for inverted geometry", () => {
    expect(
      guillochePerEdge(makeConfig({ inset: 50, innerInset: 10 })),
    ).toBeNull();
  });

  test.each(allShapes)('shape "%s" renders without throwing', (shape) => {
    const result = guillochePerEdge(makeConfig({ shape }));
    expect(result).not.toBeNull();
  });

  test('renders wave paths with fill="none"', () => {
    const result = guillochePerEdge(makeConfig())!;
    for (const path of findPaths(result)) {
      // Skip clip-path shape definitions
      if (path.props.fill === "none") {
        expect(path.props.stroke).toBeDefined();
      }
    }
  });

  test("applies custom strokeColor", () => {
    const result = guillochePerEdge(makeConfig({ strokeColor: "#ff0000" }))!;
    const wavePaths = findPaths(result).filter(
      (p) => p.props.fill === "none" && p.props.stroke,
    );
    expect(wavePaths.length).toBeGreaterThanOrEqual(2);
    for (const path of wavePaths) {
      expect(path.props.stroke).toBe("#ff0000");
    }
  });

  test("includes clip path defs", () => {
    const result = guillochePerEdge(makeConfig())!;
    const all = flatChildren(result);
    const hasClipPath = all.some((el) => el.props?.clipPath);
    expect(hasClipPath).toBe(true);
  });
});

describe("guillochePerEdgeWithDots", () => {
  test("returns null for degenerate geometry", () => {
    expect(
      guillochePerEdgeWithDots(
        makeConfig({ inset: INNER_INSET, innerInset: INNER_INSET }),
      ),
    ).toBeNull();
  });

  test.each(allShapes)('shape "%s" renders without throwing', (shape) => {
    const result = guillochePerEdgeWithDots(makeConfig({ shape }));
    expect(result).not.toBeNull();
  });

  test("non-circle shapes have corner dots", () => {
    const shapesWithCorners: BadgeShape[] = [
      BadgeShape.hexagon,
      BadgeShape.diamond,
      BadgeShape.star,
      BadgeShape.shield,
      BadgeShape.roundedRect,
    ];

    for (const shape of shapesWithCorners) {
      const result = guillochePerEdgeWithDots(makeConfig({ shape }))!;
      const circles = findCircles(result);
      expect(circles.length).toBeGreaterThan(0);
    }
  });

  test("circle has no corner dots", () => {
    const result = guillochePerEdgeWithDots(
      makeConfig({ shape: BadgeShape.circle }),
    )!;
    const circles = findCircles(result);
    expect(circles).toHaveLength(0);
  });

  test("dots have correct stroke styling", () => {
    const result = guillochePerEdgeWithDots(
      makeConfig({ shape: BadgeShape.hexagon }),
    )!;
    const circles = findCircles(result);
    for (const circle of circles) {
      expect(circle.props.fill).toBe("none");
      expect(circle.props.stroke).toBeDefined();
    }
  });
});
