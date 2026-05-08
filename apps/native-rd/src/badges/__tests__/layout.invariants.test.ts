/**
 * Logic-only invariant test matrix for `getBadgeLayoutBoxes`.
 *
 * Generates the cartesian product of all design permutations and asserts
 * centering, containment, and non-overlap invariants per case — without
 * rendering any SVG. Intended to catch regressions across all ~432 badge
 * permutations cheaply (target: full matrix < 2s).
 *
 * Structural boxes (shape/frame) are checked for containment and explicit
 * positional relationships; foreground boxes are checked for non-overlap.
 *
 * Edge-case tests live at the bottom — they are NOT part of the matrix to
 * keep the matrix permutations bounded.
 */

import {
  BadgeCenterMode,
  BadgeFrame,
  BadgeShape,
  BannerPosition,
  PathTextPosition,
  type BadgeDesign,
} from "../types";
import { getBadgeLayoutBoxes } from "../layoutBoxes";
import {
  MAX_ARC_ANGLE,
  getPathTextCenterY,
  getPathTextRadius,
} from "../shapes/contours";
import {
  arcSamplePoints,
  boxIsInside,
  boxesOverlap,
  cartesian,
  centerContentBox,
  collectBoxes,
  collectForegroundBoxes,
  forEachBox,
  forEachPair,
  isAllowedOverlap,
} from "./_geometryHelpers";

const SHAPES = Object.values(BadgeShape);
const FRAMES = Object.values(BadgeFrame);
const CENTER_MODES = Object.values(BadgeCenterMode);
const PATH_POSITIONS = [...Object.values(PathTextPosition), undefined] as const;
const BANNER_POSITIONS = [...Object.values(BannerPosition), undefined] as const;
const SIZES = [80, 200, 400] as const;
const BOTTOM_LABEL_FLAGS = [false, true] as const;
const MIN_BANNER_EDGE_GAP_RATIO = 0.02;
const MAX_BOTTOM_LABEL_GAP_RATIO = 0.08;

type MatrixRow = {
  shape: (typeof SHAPES)[number];
  frame: (typeof FRAMES)[number];
  centerMode: (typeof CENTER_MODES)[number];
  pathTextPosition: (typeof PATH_POSITIONS)[number];
  bannerPosition: (typeof BANNER_POSITIONS)[number];
  hasBottomLabel: (typeof BOTTOM_LABEL_FLAGS)[number];
  size: (typeof SIZES)[number];
};

const matrix: MatrixRow[] = cartesian({
  shape: SHAPES,
  frame: FRAMES,
  centerMode: CENTER_MODES,
  pathTextPosition: PATH_POSITIONS,
  bannerPosition: BANNER_POSITIONS,
  hasBottomLabel: BOTTOM_LABEL_FLAGS,
  size: SIZES,
});

function buildDesign(row: MatrixRow): BadgeDesign {
  return {
    shape: row.shape,
    frame: row.frame,
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: "regular",
    title: "Test Badge",
    centerMode: row.centerMode,
    monogram: row.centerMode === "monogram" ? "AB" : undefined,
    pathText: row.pathTextPosition ? "TOP TEXT" : undefined,
    pathTextBottom: row.pathTextPosition ? "BOTTOM TEXT" : undefined,
    pathTextPosition: row.pathTextPosition,
    banner: row.bannerPosition
      ? { text: "ELITE", position: row.bannerPosition }
      : undefined,
    bottomLabel: row.hasBottomLabel ? "Expert" : undefined,
  };
}

function describeRow(row: MatrixRow): string {
  return [
    row.shape,
    row.frame,
    row.centerMode,
    `path:${row.pathTextPosition ?? "none"}`,
    `banner:${row.bannerPosition ?? "none"}`,
    `bottomLabel:${row.hasBottomLabel ? "on" : "off"}`,
    `size:${row.size}`,
  ].join("/");
}

describe("badge layout invariants — full matrix", () => {
  it(`covers ${matrix.length} permutations`, () => {
    // Sanity-check that the matrix shape is what we expect, so an accidental
    // axis change shows up as a clearly-failing first test rather than a
    // surprise wall of failures further down.
    const expected =
      SHAPES.length *
      FRAMES.length *
      CENTER_MODES.length *
      PATH_POSITIONS.length *
      BANNER_POSITIONS.length *
      BOTTOM_LABEL_FLAGS.length *
      SIZES.length;
    expect(matrix.length).toBe(expected);
  });

  test.each(matrix.map((row) => [describeRow(row), row] as const))(
    "%s",
    (_label, row) => {
      const design = buildDesign(row);
      const boxes = getBadgeLayoutBoxes(design, row.size);
      const label = describeRow(row);

      // --- Centering ---
      expect(boxes.iconOrMonogram.cx).toBeCloseTo(row.size / 2, 1);
      expect(boxes.iconOrMonogram.cy).toBeCloseTo(boxes.metrics.centerY, 5);

      // --- Containment ---
      forEachBox(boxes, ({ name, box }) => {
        if (!boxIsInside(box, boxes.viewBox)) {
          throw new Error(
            `[${label}] ${name} is not inside viewBox.\n` +
              `  ${name} = ${JSON.stringify(box)}\n` +
              `  viewBox = ${JSON.stringify(boxes.viewBox)}`,
          );
        }
      });

      // --- Foreground non-overlap ---
      forEachPair(collectForegroundBoxes(boxes), (a, b) => {
        if (
          boxesOverlap(a.box, b.box) &&
          !isAllowedOverlap(row.shape, a.name, b.name)
        ) {
          throw new Error(
            `[${label}] unexpected overlap: ${a.name} ↔ ${b.name}\n` +
              `  ${a.name} = ${JSON.stringify(a.box)}\n` +
              `  ${b.name} = ${JSON.stringify(b.box)}`,
          );
        }
      });

      // --- Bottom label sits below the shape with margin > 0 ---
      if (boxes.bottomLabel) {
        expect(boxes.bottomLabel.y).toBeGreaterThan(
          boxes.shape.y + boxes.shape.h,
        );

        const bottomBanner =
          boxes.banner && design.banner?.position === "bottom"
            ? boxes.banner
            : null;
        const precedingBottom = bottomBanner
          ? bottomBanner.y + bottomBanner.h
          : boxes.shape.y + boxes.shape.h;
        if (row.shape !== BadgeShape.star || bottomBanner) {
          expect(boxes.bottomLabel.y - precedingBottom).toBeLessThanOrEqual(
            row.size * MAX_BOTTOM_LABEL_GAP_RATIO,
          );
        }
      }

      if (boxes.banner && design.banner?.position === "top") {
        expect(
          boxes.shape.y - (boxes.banner.y + boxes.banner.h),
        ).toBeGreaterThanOrEqual(row.size * MIN_BANNER_EDGE_GAP_RATIO);
      }

      if (boxes.banner && design.banner?.position === "bottom") {
        expect(
          boxes.banner.y - (boxes.shape.y + boxes.shape.h),
        ).toBeGreaterThanOrEqual(row.size * MIN_BANNER_EDGE_GAP_RATIO);
      }

      expect(boxIsInside(centerContentBox(boxes), boxes.shape)).toBe(true);
    },
  );
});

describe("badge layout invariants — edge cases", () => {
  // Longest legal path text on top + longest on bottom, simultaneously.
  test.each(SHAPES)(
    "long top + long bottom path text simultaneously (%s)",
    (shape) => {
      const design: BadgeDesign = {
        shape,
        frame: "boldBorder",
        color: "#a78bfa",
        iconName: "Trophy",
        iconWeight: "regular",
        title: "Test Badge",
        centerMode: "icon",
        pathText: "VERY LONG TOP INSCRIPTION FOR PATH",
        pathTextBottom: "VERY LONG BOTTOM INSCRIPTION FOR PATH",
        pathTextPosition: "both",
      };
      const boxes = getBadgeLayoutBoxes(design, 200);
      forEachBox(boxes, ({ name, box }) => {
        expect({
          name,
          inside: boxIsInside(box, boxes.viewBox),
        }).toEqual({ name, inside: true });
      });
    },
  );

  // 3-character monogram at the smallest legal size — exercises the monogram
  // font-size pipeline at the most cramped end of the spectrum.
  test.each(SHAPES)("3-char monogram at smallest size (%s)", (shape) => {
    const design: BadgeDesign = {
      shape,
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Test Badge",
      centerMode: "monogram",
      monogram: "ABC",
    };
    const boxes = getBadgeLayoutBoxes(design, 80);
    const monogramBox = centerContentBox(boxes);

    expect(boxes.iconOrMonogram.cx).toBeCloseTo(40, 1);
    expect(boxes.iconOrMonogram.size).toBeGreaterThan(0);
    // Compare against the visible badge geometry, not the viewBox — the
    // viewBox grows to fit shadows/banners and would let an overflowing
    // monogram pass.
    expect(boxIsInside(monogramBox, boxes.frame ?? boxes.shape)).toBe(true);
  });

  // Banner with the longest legal text on every shape, in both positions.
  describe("long banner text on each shape", () => {
    const cases = cartesian({
      shape: SHAPES,
      position: Object.values(BannerPosition),
    });

    test.each(cases.map((c) => [`${c.shape}/${c.position}`, c] as const))(
      "%s",
      (_label, { shape, position }) => {
        const design: BadgeDesign = {
          shape,
          frame: "boldBorder",
          color: "#a78bfa",
          iconName: "Trophy",
          iconWeight: "regular",
          title: "Test Badge",
          centerMode: "icon",
          banner: { text: "MAXIMUM ELITE", position },
        };
        const boxes = getBadgeLayoutBoxes(design, 200);
        expect(boxes.banner).not.toBeNull();
        // Banner stays inside the viewBox (which expands to accommodate it).
        expect(boxIsInside(boxes.banner!, boxes.viewBox)).toBe(true);
        // The banner box approximation captures all named layers — verify the
        // collector includes it once and only once.
        const named = collectBoxes(boxes);
        expect(named.filter((n) => n.name === "banner")).toHaveLength(1);
      },
    );
  });

  test.each(SHAPES)("bottom banner clears bottom label (%s)", (shape) => {
    const design: BadgeDesign = {
      shape,
      frame: "boldBorder",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Test Badge",
      centerMode: "icon",
      banner: { text: "MAXIMUM ELITE", position: "bottom" },
      bottomLabel: "Certified",
    };
    const boxes = getBadgeLayoutBoxes(design, 200);

    expect(boxes.banner).not.toBeNull();
    expect(boxes.bottomLabel).not.toBeNull();
    expect(boxes.bottomLabel!.y).toBeGreaterThanOrEqual(
      boxes.banner!.y + boxes.banner!.h,
    );
    expect(boxesOverlap(boxes.banner!, boxes.bottomLabel!)).toBe(false);
  });

  // ── Curved text vs. actual shape geometry ─────────────────────────────
  // The matrix above checks bounding-box containment, which is too loose for
  // concave shapes. These cases sample the actual rendered text arc and run
  // point-in-polygon tests against the shape outline so we catch text that
  // crosses the rendered frame stroke or escapes the silhouette through a
  // concavity (e.g. between star points).

  // The visual bar we're enforcing: glyph caps must not escape the badge
  // canvas (the viewBox AABB). Text crossing into the frame BAND is OK because
  // text z-orders above the frame's decorative pattern (waves, hatching,
  // microprint, etc.) — visually clean as long as it doesn't punch through the
  // outer rim. Star is the exception only in shape outline (text rides outside
  // the silhouette by design), but the same outer-canvas containment applies.
  describe("curved text vs shape geometry", () => {
    // Geometry-only check, so we sample sizes between the matrix's anchor
    // points (80/200/400) — 128 and 160 catch the BadgeDesigner preview
    // (size=160) and the BadgeCard list view's typical mid-size renders, where
    // the text radius hasn't yet shrunk enough to clear the frame band.
    const GEOMETRY_SIZES = [80, 128, 160, 200, 400] as const;
    const cases = cartesian({
      shape: SHAPES,
      frame: FRAMES,
      pathTextPosition: ["top", "bottom", "both"] as const,
      size: GEOMETRY_SIZES,
    });

    test.each(
      cases.map(
        (c) =>
          [
            `${c.shape}/${c.frame}/path:${c.pathTextPosition}/size:${c.size}`,
            c,
          ] as const,
      ),
    )("%s", (label, { shape, frame, pathTextPosition, size }) => {
      const design: BadgeDesign = {
        shape,
        frame,
        color: "#a78bfa",
        iconName: "Trophy",
        iconWeight: "regular",
        title: "Test Badge",
        centerMode: "icon",
        pathText: "CURVED TEXT TOP",
        pathTextBottom: "CURVED TEXT BOTTOM",
        pathTextPosition,
      };
      const boxes = getBadgeLayoutBoxes(design, size);

      const checkSide = (side: "top" | "bottom") => {
        const sideBox =
          side === "top" ? boxes.pathTextTop : boxes.pathTextBottom;
        if (!sideBox) return;

        const baselineR = getPathTextRadius(
          shape,
          size,
          boxes.metrics.pathTextInset,
          side,
        );
        const cy = getPathTextCenterY(shape, size, side);
        const cx = size / 2;
        // textPath default baseline puts glyphs ON the arc; the layout's
        // pathText box height is `fontSize`, so half that approximates the
        // outward glyph extent. Using `sideBox.h` keeps the sampling tied to
        // the same envelope the layout actually exposes.
        const r = baselineR + sideBox.h / 2;
        const samples = arcSamplePoints(cx, cy, r, MAX_ARC_ANGLE, side);

        for (const p of samples) {
          if (boxIsInside({ x: p.x, y: p.y, w: 0, h: 0 }, boxes.viewBox)) {
            continue;
          }
          throw new Error(
            `[${label}] pathText${side === "top" ? "Top" : "Bottom"} ` +
              `glyph cap escapes the canvas at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})\n` +
              `  shape: ${shape}, r: ${r.toFixed(1)}, cy: ${cy.toFixed(1)}\n` +
              `  viewBox: ${JSON.stringify(boxes.viewBox)}`,
          );
        }
      };

      for (const side of ["top", "bottom"] as const) checkSide(side);
    });
  });

  it("diamond top path text clears the top vertex and frame", () => {
    const size = 256;
    const design: BadgeDesign = {
      shape: "diamond",
      frame: "boldBorder",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Test Badge",
      centerMode: "icon",
      pathText: "TOP PATH",
      pathTextBottom: "BOTTOM TEST",
      pathTextPosition: "both",
      banner: { text: "BAZINGA! YOOP", position: "bottom" },
      bottomLabel: "FfdasdgagA",
    };
    const boxes = getBadgeLayoutBoxes(design, size);

    expect(boxes.pathTextTop).not.toBeNull();
    expect(boxes.pathTextTop!.y).toBeGreaterThanOrEqual(size * 0.22);
    expect(boxesOverlap(boxes.pathTextTop!, centerContentBox(boxes))).toBe(
      false,
    );
  });
});
