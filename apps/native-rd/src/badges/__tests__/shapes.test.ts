/**
 * Tests for SVG shape path generation.
 *
 * These tests verify the pure path-generation functions produce valid SVG
 * path strings with correct geometry for each badge shape.
 */
import {
  circlePath,
  shieldPath,
  hexagonPath,
  roundedRectPath,
  starPath,
  diamondPath,
  generateShapePath,
} from "../shapes/paths";
import { BadgeShape } from "../types";

/** Standard test size and inset */
const SIZE = 256;
const INSET = 2;

/** Verify path is non-empty, starts with M, and ends with Z (closed path) */
function expectClosedPath(d: string) {
  expect(d.length).toBeGreaterThan(0);
  expect(d).toMatch(/^M /);
  expect(d).toMatch(/Z$/);
}

/**
 * Parse all numeric coordinate values from a path string.
 * Returns an array of numbers found in the d attribute.
 */
function extractNumbers(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe("circlePath", () => {
  const d = circlePath(SIZE, INSET);

  test("produces a closed path", () => {
    expectClosedPath(d);
  });

  test("contains arc commands", () => {
    expect(d).toContain("A ");
  });

  test("all coordinates stay within bounding box", () => {
    const nums = extractNumbers(d);
    for (const n of nums) {
      // Arc radii and flags can be small, so only check coords > 10
      // (radius values are reused but still within bounds)
      if (n > 10) {
        expect(n).toBeLessThanOrEqual(SIZE);
      }
    }
  });
});

describe("shieldPath", () => {
  const d = shieldPath(SIZE, INSET);

  test("produces a closed path", () => {
    expectClosedPath(d);
  });

  test("contains quadratic curves (Q commands)", () => {
    expect(d).toContain("Q ");
  });

  test("is vertically taller shape — bottom point is near bottom edge", () => {
    const nums = extractNumbers(d);
    const maxY = Math.max(...nums.filter((_, i) => i % 2 === 1));
    expect(maxY).toBeGreaterThan(SIZE * 0.8);
  });
});

describe("hexagonPath", () => {
  const d = hexagonPath(SIZE, INSET);

  test("produces a closed path", () => {
    expectClosedPath(d);
  });

  test("has exactly 6 vertices (1 M + 5 L commands)", () => {
    const lineCommands = d.match(/L /g) ?? [];
    expect(lineCommands).toHaveLength(5);
  });

  test("all coordinates stay within bounding box", () => {
    const nums = extractNumbers(d);
    for (const n of nums) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(SIZE);
    }
  });
});

describe("roundedRectPath", () => {
  const d = roundedRectPath(SIZE, INSET);

  test("produces a closed path", () => {
    expectClosedPath(d);
  });

  test("contains 4 quadratic curves for corners", () => {
    const qCommands = d.match(/Q /g) ?? [];
    expect(qCommands).toHaveLength(4);
  });

  test("all coordinates stay within bounding box", () => {
    const nums = extractNumbers(d);
    for (const n of nums) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(SIZE);
    }
  });
});

describe("starPath", () => {
  const d = starPath(SIZE, INSET);

  test("produces a closed path", () => {
    expectClosedPath(d);
  });

  test("has 10 vertices (1 M + 9 L commands) for 5-pointed star", () => {
    const lineCommands = d.match(/L /g) ?? [];
    expect(lineCommands).toHaveLength(9);
  });

  test("top point is near the top of the bounding box", () => {
    // First point should be at the top (star starts from -90° = top)
    const firstCoords = d.match(/^M\s+([\d.]+)\s+([\d.]+)/);
    expect(firstCoords).not.toBeNull();
    const y = parseFloat(firstCoords![2]);
    expect(y).toBeLessThan(SIZE * 0.15);
  });
});

describe("diamondPath", () => {
  const d = diamondPath(SIZE, INSET);

  test("produces a closed path", () => {
    expectClosedPath(d);
  });

  test("has 4 vertices (1 M + 3 L commands)", () => {
    const lineCommands = d.match(/L /g) ?? [];
    expect(lineCommands).toHaveLength(3);
  });

  test("is centered in bounding box", () => {
    const nums = extractNumbers(d);
    const cx = SIZE / 2;
    // Top point should be at cx
    expect(nums[0]).toBe(cx);
    // Right point should be at cx + r
    expect(nums[2]).toBeGreaterThan(cx);
    // Bottom point should be at cx
    expect(nums[4]).toBe(cx);
    // Left point should be at cx - r
    expect(nums[6]).toBeLessThan(cx);
  });
});

describe("generateShapePath", () => {
  const allShapes: BadgeShape[] = [
    BadgeShape.circle,
    BadgeShape.shield,
    BadgeShape.hexagon,
    BadgeShape.roundedRect,
    BadgeShape.star,
    BadgeShape.diamond,
  ];

  test.each(allShapes)('generates a valid closed path for "%s"', (shape) => {
    const d = generateShapePath(shape, SIZE, INSET);
    expectClosedPath(d);
  });

  test("different shapes produce different paths", () => {
    const paths = allShapes.map((s) => generateShapePath(s, SIZE, INSET));
    const unique = new Set(paths);
    expect(unique.size).toBe(allShapes.length);
  });

  test("scaling works — larger size produces different coordinates", () => {
    const small = generateShapePath(BadgeShape.circle, 100, 2);
    const large = generateShapePath(BadgeShape.circle, 400, 2);
    expect(small).not.toBe(large);
  });

  test("inset affects path coordinates", () => {
    const noInset = generateShapePath(BadgeShape.diamond, 256, 0);
    const withInset = generateShapePath(BadgeShape.diamond, 256, 10);
    expect(noInset).not.toBe(withInset);
  });

  describe("degenerate inputs", () => {
    test("size=0 still produces a closed path string", () => {
      for (const shape of allShapes) {
        const d = generateShapePath(shape, 0, 0);
        // Path is still syntactically valid (starts with M, ends with Z)
        // even though geometry is degenerate (zero-area)
        expectClosedPath(d);
      }
    });

    test("inset >= size/2 produces a closed path (negative radius scenario)", () => {
      for (const shape of allShapes) {
        const d = generateShapePath(shape, 100, 60);
        // Inset of 60 on a size-100 shape means radius = -10.
        // Functions still return a syntactically valid path string
        // with potentially inverted or overlapping coordinates.
        expectClosedPath(d);
      }
    });
  });
});
