import {
  getBadgeLayoutBoxes,
  DEFAULT_STROKE_WIDTH,
  SHADOW_OFFSET,
} from "../layoutBoxes";
import type { BadgeDesign } from "../types";
import { ICON_SIZE_RATIO } from "../layout";

const SIZE = 256;

function makeDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: "circle",
    frame: "none",
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: "regular",
    title: "Test Badge",
    centerMode: "icon",
    ...overrides,
  };
}

describe("getBadgeLayoutBoxes — viewport", () => {
  it("includes shadow offset in viewBox width/height by default", () => {
    const { viewBox } = getBadgeLayoutBoxes(makeDesign(), SIZE);
    expect(viewBox.w).toBe(SIZE + SHADOW_OFFSET);
    expect(viewBox.h).toBeGreaterThanOrEqual(SIZE + SHADOW_OFFSET);
  });

  it("omits shadow offset when hasShadow is false", () => {
    const { viewBox } = getBadgeLayoutBoxes(makeDesign(), SIZE, {
      hasShadow: false,
    });
    expect(viewBox.w).toBe(SIZE);
  });

  it("extends viewBox upward (negative y) when banner sits at top", () => {
    const { viewBox } = getBadgeLayoutBoxes(
      makeDesign({ banner: { text: "ELITE", position: "top" } }),
      SIZE,
    );
    expect(viewBox.y).toBeLessThan(0);
  });

  it("extends viewBox downward (h > size+shadow) for bottom label", () => {
    const baseline = getBadgeLayoutBoxes(makeDesign(), SIZE).viewBox.h;
    const withLabel = getBadgeLayoutBoxes(
      makeDesign({ bottomLabel: "Expert" }),
      SIZE,
    ).viewBox.h;
    expect(withLabel).toBeGreaterThan(baseline);
  });
});

describe("getBadgeLayoutBoxes — shape + frame", () => {
  it("shape box is inset by half the stroke width", () => {
    const { shape } = getBadgeLayoutBoxes(makeDesign(), SIZE);
    const inset = DEFAULT_STROKE_WIDTH / 2;
    expect(shape.x).toBeCloseTo(inset, 5);
    expect(shape.y).toBeCloseTo(inset, 5);
    expect(shape.w).toBeCloseTo(SIZE - inset * 2, 5);
  });

  it("frame is null for frame: none", () => {
    const { frame } = getBadgeLayoutBoxes(makeDesign({ frame: "none" }), SIZE);
    expect(frame).toBeNull();
  });

  it("frame box matches shape box when frame is set", () => {
    const { frame, shape } = getBadgeLayoutBoxes(
      makeDesign({ frame: "boldBorder" }),
      SIZE,
    );
    expect(frame).toEqual(shape);
  });
});

describe("getBadgeLayoutBoxes — center content", () => {
  it("icon is horizontally centered", () => {
    const { iconOrMonogram } = getBadgeLayoutBoxes(makeDesign(), SIZE);
    expect(iconOrMonogram.cx).toBeCloseTo(SIZE / 2, 5);
  });

  it("icon size matches ICON_SIZE_RATIO at default density", () => {
    const { iconOrMonogram } = getBadgeLayoutBoxes(makeDesign(), SIZE);
    expect(iconOrMonogram.size).toBe(Math.round(SIZE * ICON_SIZE_RATIO));
  });

  it("monogram cy matches metrics.centerY (inside the badge)", () => {
    const { iconOrMonogram, shape } = getBadgeLayoutBoxes(
      makeDesign({ centerMode: "monogram", monogram: "AB" }),
      SIZE,
    );
    expect(iconOrMonogram.cy).toBeGreaterThan(shape.y);
    expect(iconOrMonogram.cy).toBeLessThan(shape.y + shape.h);
  });
});

describe("getBadgeLayoutBoxes — path text bands", () => {
  it("returns null bands when no pathText is set", () => {
    const boxes = getBadgeLayoutBoxes(makeDesign(), SIZE);
    expect(boxes.pathTextTop).toBeNull();
    expect(boxes.pathTextBottom).toBeNull();
  });

  it("returns top-only band for default pathTextPosition", () => {
    const boxes = getBadgeLayoutBoxes(makeDesign({ pathText: "HELLO" }), SIZE);
    expect(boxes.pathTextTop).not.toBeNull();
    expect(boxes.pathTextBottom).toBeNull();
  });

  it("returns both bands for pathTextPosition: 'both'", () => {
    const boxes = getBadgeLayoutBoxes(
      makeDesign({
        pathText: "TOP",
        pathTextBottom: "BOTTOM",
        pathTextPosition: "both",
      }),
      SIZE,
    );
    expect(boxes.pathTextTop).not.toBeNull();
    expect(boxes.pathTextBottom).not.toBeNull();
  });

  it("top band sits in upper half, bottom band in lower half", () => {
    const boxes = getBadgeLayoutBoxes(
      makeDesign({
        pathText: "TOP",
        pathTextBottom: "BOTTOM",
        pathTextPosition: "both",
      }),
      SIZE,
    );
    expect(boxes.pathTextTop!.y).toBeLessThan(SIZE / 2);
    expect(boxes.pathTextBottom!.y + boxes.pathTextBottom!.h).toBeGreaterThan(
      SIZE / 2,
    );
  });
});

describe("getBadgeLayoutBoxes — banner", () => {
  it("returns null when no banner is configured", () => {
    expect(getBadgeLayoutBoxes(makeDesign(), SIZE).banner).toBeNull();
  });

  it("top banner is positioned above the badge (negative y)", () => {
    const { banner } = getBadgeLayoutBoxes(
      makeDesign({ banner: { text: "ELITE", position: "top" } }),
      SIZE,
    );
    expect(banner!.y).toBeLessThan(0);
  });

  it("bottom banner is positioned near the bottom of the badge", () => {
    const { banner } = getBadgeLayoutBoxes(
      makeDesign({ banner: { text: "ELITE", position: "bottom" } }),
      SIZE,
    );
    expect(banner!.y).toBeGreaterThan(SIZE * 0.8);
  });
});

describe("getBadgeLayoutBoxes — bottom label", () => {
  it("returns null when no bottomLabel is set", () => {
    expect(getBadgeLayoutBoxes(makeDesign(), SIZE).bottomLabel).toBeNull();
  });

  it("bottom label sits below the shape", () => {
    const boxes = getBadgeLayoutBoxes(
      makeDesign({ bottomLabel: "Expert" }),
      SIZE,
    );
    expect(boxes.bottomLabel!.y).toBeGreaterThan(boxes.shape.y + boxes.shape.h);
  });

  it("star badges push the bottom label further down (extra offset)", () => {
    const circleY = getBadgeLayoutBoxes(
      makeDesign({ bottomLabel: "Expert" }),
      SIZE,
    ).bottomLabel!.y;
    const starY = getBadgeLayoutBoxes(
      makeDesign({ shape: "star", bottomLabel: "Expert" }),
      SIZE,
    ).bottomLabel!.y;
    expect(starY).toBeGreaterThan(circleY);
  });
});

describe("getBadgeLayoutBoxes — density propagation", () => {
  it("exposes the same density as getBadgeLayoutMetrics", () => {
    const heavy = getBadgeLayoutBoxes(
      makeDesign({
        pathText: "TOP",
        pathTextBottom: "BOTTOM",
        pathTextPosition: "both",
        bottomLabel: "Expert",
        banner: { text: "ELITE", position: "top" },
      }),
      SIZE,
    );
    expect(heavy.density).toBe("compact");
  });
});
