/**
 * Tests for the shape contour system.
 *
 * Verifies path validity, inner < outer geometry, correct vertex counts,
 * open text arcs, and bounding-box containment for all 6 badge shapes.
 */
import { generateContour, type ShapeContour } from "../shapes/contours";
import { BadgeShape } from "../types";

const SIZE = 256;
const INSET = 2;

/** Verify path is non-empty, starts with M, and ends with Z (closed). */
function expectClosedPath(d: string) {
  expect(d.length).toBeGreaterThan(0);
  expect(d).toMatch(/^M /);
  expect(d).toMatch(/Z$/);
}

/** Verify path is an open arc: starts with M, contains A, does NOT end with Z. */
function expectOpenArc(d: string) {
  expect(d.length).toBeGreaterThan(0);
  expect(d).toMatch(/^M /);
  expect(d).toContain(" A ");
  expect(d).not.toMatch(/Z\s*$/);
}

/** Parse all numeric values from a path string. */
function parseCoords(d: string): number[] {
  return (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
}

/** Expected vertex count per shape. */
const EXPECTED_VERTICES: Record<string, number> = {
  circle: 8,
  shield: 3,
  hexagon: 6,
  roundedRect: 4,
  star: 5,
  diamond: 4,
};

const ALL_SHAPES: BadgeShape[] = [
  "circle",
  "shield",
  "hexagon",
  "roundedRect",
  "star",
  "diamond",
];

describe("generateContour", () => {
  const contours: Record<string, ShapeContour> = {};

  beforeAll(() => {
    for (const shape of ALL_SHAPES) {
      contours[shape] = generateContour(shape, SIZE, INSET);
    }
  });

  test.each(ALL_SHAPES)("%s: outerPath is a valid closed path", (shape) => {
    expectClosedPath(contours[shape].outerPath);
  });

  test.each(ALL_SHAPES)("%s: innerPath is a valid closed path", (shape) => {
    expectClosedPath(contours[shape].innerPath);
  });

  test.each(ALL_SHAPES)("%s: textPathTop is a valid open arc", (shape) => {
    expectOpenArc(contours[shape].textPathTop);
  });

  test.each(ALL_SHAPES)("%s: textPathBottom is a valid open arc", (shape) => {
    expectOpenArc(contours[shape].textPathBottom);
  });

  test.each(ALL_SHAPES)("%s: has correct number of vertices", (shape) => {
    expect(contours[shape].vertices).toHaveLength(EXPECTED_VERTICES[shape]);
  });

  test.each(ALL_SHAPES)(
    "%s: all vertices are within bounding box [0, size]",
    (shape) => {
      for (const v of contours[shape].vertices) {
        expect(v.x).toBeGreaterThanOrEqual(0);
        expect(v.x).toBeLessThanOrEqual(SIZE);
        expect(v.y).toBeGreaterThanOrEqual(0);
        expect(v.y).toBeLessThanOrEqual(SIZE);
      }
    },
  );

  test.each(ALL_SHAPES)("%s: innerPath differs from outerPath", (shape) => {
    expect(contours[shape].innerPath).not.toBe(contours[shape].outerPath);
  });

  it("accepts all BadgeShape values without throwing", () => {
    for (const shape of ALL_SHAPES) {
      expect(() => generateContour(shape, SIZE, INSET)).not.toThrow();
    }
  });

  test.each(ALL_SHAPES)(
    "%s: innerPath coordinates are tighter than outerPath",
    (shape) => {
      const outerCoords = parseCoords(contours[shape].outerPath);
      const innerCoords = parseCoords(contours[shape].innerPath);
      const outerSpread = Math.max(...outerCoords) - Math.min(...outerCoords);
      const innerSpread = Math.max(...innerCoords) - Math.min(...innerCoords);
      expect(innerSpread).toBeLessThan(outerSpread);
    },
  );

  it("all shapes produce distinct outerPaths", () => {
    const paths = ALL_SHAPES.map((s) => contours[s].outerPath);
    expect(new Set(paths).size).toBe(ALL_SHAPES.length);
  });

  it("textPathTop uses sweep-flag=1 (CW arc tracing upward through cy-r)", () => {
    // sweep-flag=1 means CW on screen (right-to-left = upward arc)
    const c = contours["circle"];
    expect(c.textPathTop).toMatch(/A\s+[\d.]+\s+[\d.]+\s+0\s+0\s+1\s+/);
  });

  it("textPathBottom uses sweep-flag=0 (bottom semicircle in SVG coords)", () => {
    const c = contours["circle"];
    expect(c.textPathBottom).toMatch(/A\s+[\d.]+\s+[\d.]+\s+0\s+0\s+0\s+/);
  });

  it("larger inset produces tighter inner coordinates", () => {
    const small = generateContour("circle", SIZE, 2);
    const large = generateContour("circle", SIZE, 20);

    // The inner coords of larger inset should be more constrained
    const smallCoords = parseCoords(small.innerPath);
    const largeCoords = parseCoords(large.innerPath);

    const smallSpread = Math.max(...smallCoords) - Math.min(...smallCoords);
    const largeSpread = Math.max(...largeCoords) - Math.min(...largeCoords);

    expect(largeSpread).toBeLessThan(smallSpread);
  });
});

// ─────────────────────────────────────────────────────────────────────
// TDD: bug #2 — path text appears bunched on right side, not centered.
// User-supplied screenshot shows "PATH TOP"/"PATH BOTTOM" running along
// the right hemisphere of the badge instead of curving across the top
// and bottom.
//
// Diagnosis: generateContour produces a fixed half-circle for both top
// and bottom arcs, regardless of text. PathText.tsx then relies on SVG
// textPath's `startOffset="50%"` + `textAnchor="middle"` to center the
// text along that fixed path. On react-native-svg + iOS this positioning
// is not reliably honored, so text starts at the path's start point
// (cx + r, ...) — the right side — and reads along the arc from there.
//
// Fix direction (per design intent — "the arcs need to be centered which
// means they need to know their length"): arc geometry must be a
// function of the text content so the path spans the exact angular
// range needed for the text and is positioned symmetrically around the
// badge's vertical centerline. That makes rendering correct
// independent of textPath positioning quirks.
// ─────────────────────────────────────────────────────────────────────
describe("text-aware arc sizing", () => {
  it("top arc geometry varies with the text it must contain", () => {
    // Today, generateContour ignores text — short and long inscriptions
    // get the same fixed half-circle path. A correctly centered arc
    // must span an angular range proportional to text length, so these
    // two calls must produce different `textPathTop` strings.
    const short = (
      generateContour as unknown as (
        shape: string,
        size: number,
        inset: number,
        opts?: { topText?: string; bottomText?: string },
      ) => ShapeContour
    )("circle", SIZE, 0, { topText: "AB" });
    const long = (
      generateContour as unknown as (
        shape: string,
        size: number,
        inset: number,
        opts?: { topText?: string; bottomText?: string },
      ) => ShapeContour
    )("circle", SIZE, 0, { topText: "ACHIEVEMENT UNLOCKED" });

    expect(short.textPathTop).not.toBe(long.textPathTop);
  });

  it("bottom arc geometry varies with the text it must contain", () => {
    const short = (
      generateContour as unknown as (
        shape: string,
        size: number,
        inset: number,
        opts?: { topText?: string; bottomText?: string },
      ) => ShapeContour
    )("circle", SIZE, 0, { bottomText: "X" });
    const long = (
      generateContour as unknown as (
        shape: string,
        size: number,
        inset: number,
        opts?: { topText?: string; bottomText?: string },
      ) => ShapeContour
    )("circle", SIZE, 0, { bottomText: "MMXXVI ANNUAL EDITION" });

    expect(short.textPathBottom).not.toBe(long.textPathBottom);
  });

  // Text-awareness must apply to every shape — a refactor that drops `opts`
  // from one generator's signature would otherwise silently fall back to
  // the legacy half-circle for that shape only.
  test.each(ALL_SHAPES)(
    "%s: top arc geometry depends on topText (text-aware applies to all shapes)",
    (shape) => {
      const noText = generateContour(shape, SIZE, 0);
      const withText = (
        generateContour as unknown as (
          shape: string,
          size: number,
          inset: number,
          opts?: { topText?: string },
        ) => ShapeContour
      )(shape, SIZE, 0, { topText: "INSCRIBED" });
      expect(withText.textPathTop).not.toBe(noText.textPathTop);
    },
  );

  test.each(ALL_SHAPES)(
    "%s: bottom arc geometry depends on bottomText",
    (shape) => {
      const noText = generateContour(shape, SIZE, 0);
      const withText = (
        generateContour as unknown as (
          shape: string,
          size: number,
          inset: number,
          opts?: { bottomText?: string },
        ) => ShapeContour
      )(shape, SIZE, 0, { bottomText: "INSCRIBED" });
      expect(withText.textPathBottom).not.toBe(noText.textPathBottom);
    },
  );

  // The PR's central claim: removing the 180° rotation works because both
  // arcs are written left-to-right. Pin start.x < end.x for both sides so
  // a regression that flips a sweep flag is caught directly.
  it("text-sized arcs are written left-to-right", () => {
    const c = (
      generateContour as unknown as (
        shape: string,
        size: number,
        inset: number,
        opts?: { topText?: string; bottomText?: string },
      ) => ShapeContour
    )("circle", SIZE, 0, { topText: "TOP", bottomText: "BOTTOM" });

    const parseEndpoints = (d: string) => {
      const match = d.match(
        /^M\s+([-\d.]+)\s+([-\d.]+)\s+A\s+[-\d.]+\s+[-\d.]+\s+0\s+0\s+[01]\s+([-\d.]+)\s+([-\d.]+)/,
      );
      if (!match) throw new Error(`unparseable arc: ${d}`);
      return {
        startX: Number(match[1]),
        startY: Number(match[2]),
        endX: Number(match[3]),
        endY: Number(match[4]),
      };
    };

    const top = parseEndpoints(c.textPathTop);
    const bottom = parseEndpoints(c.textPathBottom);
    expect(top.startX).toBeLessThan(top.endX);
    expect(bottom.startX).toBeLessThan(bottom.endX);
  });
});
