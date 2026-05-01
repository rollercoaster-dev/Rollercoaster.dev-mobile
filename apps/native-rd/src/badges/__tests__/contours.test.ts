/**
 * Tests for the shape contour system.
 *
 * Verifies path validity, inner < outer geometry, correct vertex counts,
 * open text arcs, and bounding-box containment for all 6 badge shapes.
 */
import {
  FRAME_BAND_RATIO,
  generateContour,
  getPathTextCenterY,
  getPathTextRadius,
  type ShapeContour,
} from "../shapes/contours";
import { getBadgeLayoutMetrics, ICON_SIZE_RATIO } from "../layout";
import { PATH_TEXT_FONT_SIZE_RATIO } from "../text/PathText";
import { BadgeShape } from "../types";
import { type Point, pointInPolygon } from "./_geometryHelpers";
import { outlinePolygon } from "./_shapePolygons";

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
const NON_STAR_SHAPES = ALL_SHAPES.filter((shape) => shape !== BadgeShape.star);
const RENDER_STROKE_INSET = 1.5;

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq),
  );
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function distanceToPolygon(point: Point, polygon: Point[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i++) {
    min = Math.min(
      min,
      distanceToSegment(point, polygon[i]!, polygon[(i + 1) % polygon.length]!),
    );
  }
  return min;
}

function parseArc(d: string): { start: Point; end: Point; r: number } {
  const match = d.match(
    /^M\s+([-\d.]+)\s+([-\d.]+)\s+A\s+([-\d.]+)\s+[-\d.]+\s+0\s+0\s+[01]\s+([-\d.]+)\s+([-\d.]+)/,
  );
  if (!match) throw new Error(`unparseable arc: ${d}`);
  return {
    start: { x: Number(match[1]), y: Number(match[2]) },
    r: Number(match[3]),
    end: { x: Number(match[4]), y: Number(match[5]) },
  };
}

function sampleArc(
  d: string,
  size: number,
  sampleCount = 48,
  centerY = size / 2,
): Point[] {
  const { start, end, r } = parseArc(d);
  const cx = size / 2;
  const cy = centerY;
  const startAngle = Math.atan2(start.y - cy, start.x - cx);
  const endAngle = Math.atan2(end.y - cy, end.x - cx);

  return Array.from({ length: sampleCount + 1 }, (_, i) => {
    const t = i / sampleCount;
    const angle = startAngle + (endAngle - startAngle) * t;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

function pathTextFixture(shape: BadgeShape, size = SIZE) {
  const design = {
    shape,
    frame: "boldBorder" as const,
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: "regular" as const,
    title: "Test Badge",
    centerMode: "icon" as const,
    pathText: "TOP PATH",
    pathTextBottom: "BOTTOM TEST",
    pathTextPosition: "both" as const,
    banner: { text: "BAZINGA! YOOP", position: "bottom" as const },
    bottomLabel: "FfdasdgagA",
  };
  const innerInset = RENDER_STROKE_INSET + size * FRAME_BAND_RATIO;
  const metrics = getBadgeLayoutMetrics(
    design,
    size,
    RENDER_STROKE_INSET,
    innerInset,
  );
  const fontSize = size * PATH_TEXT_FONT_SIZE_RATIO * metrics.pathTextFontScale;
  return {
    contour: generateContour(shape, size, metrics.pathTextInset, {
      topText: design.pathText,
      bottomText: design.pathTextBottom,
      fontSize,
    }),
    fontSize,
    innerInset,
  };
}

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

  test.each(NON_STAR_SHAPES)(
    "%s: text radius contracts inside the frame band",
    (shape) => {
      const innerFrameRadius = SIZE / 2 - INSET - SIZE * FRAME_BAND_RATIO;
      expect(getPathTextRadius(shape, SIZE, INSET, "top")).toBeLessThan(
        innerFrameRadius,
      );
      expect(getPathTextRadius(shape, SIZE, INSET, "bottom")).toBeLessThan(
        innerFrameRadius,
      );
    },
  );

  it("star text radius expands outside the frame band", () => {
    const outerR = SIZE / 2 - INSET;
    expect(getPathTextRadius("star", SIZE, INSET, "top")).toBeGreaterThan(
      outerR,
    );
    expect(getPathTextRadius("star", SIZE, INSET, "bottom")).toBeGreaterThan(
      outerR,
    );
  });

  test.each(ALL_SHAPES)("%s: path text clears the center icon", (shape) => {
    const metrics = getBadgeLayoutMetrics(
      {
        shape,
        frame: "none",
        color: "#a78bfa",
        iconName: "Trophy",
        iconWeight: "regular",
        title: "Test Badge",
        centerMode: "icon",
        pathText: "TOP",
        pathTextBottom: "BOTTOM",
        pathTextPosition: "both",
      },
      SIZE,
      INSET,
      INSET + SIZE * FRAME_BAND_RATIO,
    );
    const iconHalf = (SIZE * ICON_SIZE_RATIO * metrics.centerContentScale) / 2;
    const textHalf =
      (SIZE * PATH_TEXT_FONT_SIZE_RATIO * metrics.pathTextFontScale) / 2;
    expect(
      getPathTextRadius(shape, SIZE, INSET, "top") - textHalf,
    ).toBeGreaterThan(iconHalf);
    expect(
      getPathTextRadius(shape, SIZE, INSET, "bottom") - textHalf,
    ).toBeGreaterThan(iconHalf);
  });

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

describe("path text shape-intersection clearance", () => {
  test.each([BadgeShape.hexagon, BadgeShape.diamond])(
    "%s top text band stays inside the inner frame boundary",
    (shape) => {
      const { contour, fontSize, innerInset } = pathTextFixture(shape);
      const innerFrame = outlinePolygon(shape, SIZE, innerInset);
      const textBandRadius = fontSize;

      for (const point of sampleArc(
        contour.textPathTop,
        SIZE,
        48,
        getPathTextCenterY(shape, SIZE, "top"),
      )) {
        const clearance = distanceToPolygon(point, innerFrame);
        expect(pointInPolygon(point, innerFrame)).toBe(true);
        expect(clearance).toBeGreaterThan(textBandRadius);
      }
    },
  );

  it("star top text band stays outside the star silhouette", () => {
    const { contour, fontSize } = pathTextFixture(BadgeShape.star);
    const outerStar = outlinePolygon(
      BadgeShape.star,
      SIZE,
      RENDER_STROKE_INSET,
    );
    const textBandRadius = fontSize * 0.1;

    const centralTextSpan = sampleArc(
      contour.textPathTop,
      SIZE,
      48,
      getPathTextCenterY(BadgeShape.star, SIZE, "top"),
    ).slice(20, 29);
    for (const point of centralTextSpan) {
      const clearance = distanceToPolygon(point, outerStar);
      expect(pointInPolygon(point, outerStar)).toBe(false);
      expect(clearance).toBeGreaterThan(textBandRadius);
    }
  });
});

describe("getPathTextCenterY", () => {
  // Pinning per-shape offsets prevents an accidental future tweak from
  // silently shifting one shape's text into the frame band — visual
  // regressions surface as a one-line failure here instead of a wall of
  // matrix overlap errors.
  const SIZE = 200;
  const cy = SIZE / 2;
  const expected: Record<BadgeShape, { top: number; bottom: number }> = {
    circle: { top: cy - 4, bottom: cy + 3 },
    hexagon: { top: cy - 4, bottom: cy + 3 },
    diamond: { top: cy - 4, bottom: cy + 3 },
    shield: { top: cy - 4, bottom: cy + 3 },
    roundedRect: { top: cy - 4, bottom: cy + 3 },
    star: { top: cy - 8, bottom: cy + 3 },
  };

  test.each(ALL_SHAPES)(
    "%s: top and bottom offsets match the table",
    (shape) => {
      expect(getPathTextCenterY(shape, SIZE, "top")).toBe(expected[shape].top);
      expect(getPathTextCenterY(shape, SIZE, "bottom")).toBe(
        expected[shape].bottom,
      );
    },
  );
});
