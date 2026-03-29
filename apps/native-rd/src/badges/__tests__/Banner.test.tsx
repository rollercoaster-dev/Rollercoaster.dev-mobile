import React from "react";
import {
  Banner,
  BANNER_HEIGHT_RATIO,
  BANNER_WIDTH_RATIO,
  BANNER_SHADOW_OFFSET,
  BANNER_TOP_VISIBLE_RATIO,
  BANNER_FONT_SIZE_RATIO,
  BANNER_BORDER_WIDTH,
  getBannerTopY,
} from "../text/Banner";
import type { BannerProps } from "../text/Banner";
import type { BannerData } from "../types";

const DARK_BADGE = "#1a1a2e"; // dark → banner fill #FFFFFF, text fill #000000
const LIGHT_BADGE = "#fef3c7"; // light → banner fill #000000, text fill #FFFFFF
const SIZE = 256;

function makeProps(overrides: Partial<BannerProps> = {}): BannerProps {
  return {
    banner: { text: "ACHIEVED", position: "center" },
    size: SIZE,
    badgeColor: DARK_BADGE,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helpers need to traverse unknown element trees
type AnyElement = React.ReactElement<any>;

/** Flatten the element tree into a flat array of React elements */
function flatElements(el: AnyElement): AnyElement[] {
  const result: AnyElement[] = [el];
  const children = React.Children.toArray(el.props.children);
  for (const child of children) {
    if (React.isValidElement(child)) {
      result.push(...flatElements(child as AnyElement));
    }
  }
  return result;
}

/** Find all elements matching a type name */
function findByType(el: AnyElement, typeName: string): AnyElement[] {
  const all = flatElements(el);
  return all.filter((e) => {
    const type = e.type as { displayName?: string; name?: string } | string;
    if (typeof type === "string") return type === typeName;
    return type.displayName === typeName || type.name === typeName;
  });
}

describe("Banner", () => {
  // ── Null guards ──────────────────────────────────────────────────────

  it("returns null when banner is undefined", () => {
    expect(Banner(makeProps({ banner: undefined }))).toBeNull();
  });

  it("returns null when banner text is empty", () => {
    expect(
      Banner(makeProps({ banner: { text: "", position: "center" } })),
    ).toBeNull();
  });

  it("returns null when banner text is whitespace", () => {
    expect(
      Banner(makeProps({ banner: { text: "   ", position: "center" } })),
    ).toBeNull();
  });

  // ── Position geometry ──────────────────────────────────────────────

  it.each([["center"], ["bottom"]] as const)(
    'positions banner at correct y for "%s"',
    (position) => {
      const banner: BannerData = { text: "TEST", position };
      const el = Banner(makeProps({ banner }))!;
      const rects = findByType(el, "Rect");
      // Second rect is the main banner (first is shadow)
      const mainRect = rects[1];
      const expectedY = getBannerTopY(position, SIZE);
      expect(mainRect.props.y).toBeCloseTo(expectedY, 5);
    },
  );

  it("keeps only 5% of the center banner inside the badge", () => {
    const el = Banner(
      makeProps({ banner: { text: "TEST", position: "center" } }),
    )!;
    const rects = findByType(el, "Rect");
    const mainRect = rects[1];
    const expectedH = SIZE * BANNER_HEIGHT_RATIO;
    expect(mainRect.props.y).toBeCloseTo(
      -expectedH * (1 - BANNER_TOP_VISIBLE_RATIO),
      5,
    );
  });

  it("keeps only 5% of the bottom banner inside the badge (mirrors top)", () => {
    const el = Banner(
      makeProps({ banner: { text: "TEST", position: "bottom" } }),
    )!;
    const rects = findByType(el, "Rect");
    const mainRect = rects[1];
    const bannerH = SIZE * BANNER_HEIGHT_RATIO;
    // Bottom banner: top edge at size - bannerH * visibleRatio
    // So (size - bannerY) / bannerH ≈ visibleRatio (5%)
    const visibleAboveBadge = SIZE - mainRect.props.y;
    expect(visibleAboveBadge / bannerH).toBeCloseTo(
      BANNER_TOP_VISIBLE_RATIO,
      2,
    );
  });

  // ── Banner dimensions ──────────────────────────────────────────────

  it("scales width and height from size", () => {
    const el = Banner(makeProps())!;
    const rects = findByType(el, "Rect");
    const mainRect = rects[1];
    expect(mainRect.props.width).toBe(SIZE * BANNER_WIDTH_RATIO);
    expect(mainRect.props.height).toBe(SIZE * BANNER_HEIGHT_RATIO);
  });

  it("centers banner horizontally", () => {
    const el = Banner(makeProps())!;
    const rects = findByType(el, "Rect");
    const mainRect = rects[1];
    const expectedX = (SIZE - SIZE * BANNER_WIDTH_RATIO) / 2;
    expect(mainRect.props.x).toBeCloseTo(expectedX, 5);
  });

  // ── Shadow ─────────────────────────────────────────────────────────

  it("shadow rect is offset by BANNER_SHADOW_OFFSET", () => {
    const el = Banner(makeProps())!;
    const rects = findByType(el, "Rect");
    const shadowRect = rects[0];
    const mainRect = rects[1];
    expect(shadowRect.props.x).toBe(
      Number(mainRect.props.x) + BANNER_SHADOW_OFFSET,
    );
    expect(shadowRect.props.y).toBe(
      Number(mainRect.props.y) + BANNER_SHADOW_OFFSET,
    );
  });

  it("shadow fill is black", () => {
    const el = Banner(makeProps())!;
    const rects = findByType(el, "Rect");
    expect(rects[0].props.fill).toBe("#000000");
  });

  it("omits shadow rect when showShadow is false", () => {
    const el = Banner(makeProps({ showShadow: false }))!;
    const rects = findByType(el, "Rect");
    // Only the main banner rect, no shadow
    expect(rects).toHaveLength(1);
    expect(rects[0].props.stroke).toBeDefined(); // main rect has stroke
  });

  // ── Neo-brutalist styling ──────────────────────────────────────────

  it("banner rect has correct border width and no border radius", () => {
    const el = Banner(makeProps())!;
    const rects = findByType(el, "Rect");
    const mainRect = rects[1];
    expect(mainRect.props.strokeWidth).toBe(BANNER_BORDER_WIDTH);
    expect(mainRect.props.rx).toBeUndefined();
    expect(mainRect.props.ry).toBeUndefined();
  });

  // ── Color derivation ──────────────────────────────────────────────

  it("uses white banner fill on dark badge color", () => {
    const el = Banner(makeProps({ badgeColor: DARK_BADGE }))!;
    const rects = findByType(el, "Rect");
    expect(rects[1].props.fill).toBe("#FFFFFF");
  });

  it("uses black banner fill on light badge color", () => {
    const el = Banner(makeProps({ badgeColor: LIGHT_BADGE }))!;
    const rects = findByType(el, "Rect");
    expect(rects[1].props.fill).toBe("#000000");
  });

  it("text fill contrasts with banner fill", () => {
    // Dark badge → white banner → black text
    const el = Banner(makeProps({ badgeColor: DARK_BADGE }))!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fill).toBe("#000000");
  });

  // ── Text ───────────────────────────────────────────────────────────

  it("centers text horizontally", () => {
    const el = Banner(makeProps())!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.x).toBe(SIZE / 2);
    expect(texts[0].props.textAnchor).toBe("middle");
  });

  it("positions text at vertical center of banner", () => {
    const el = Banner(makeProps())!;
    const texts = findByType(el, "Text");
    const rects = findByType(el, "Rect");
    const mainRect = rects[1];
    expect(texts[0].props.y).toBe(
      Number(mainRect.props.y) + Number(mainRect.props.height) / 2,
    );
  });

  // ── Font ───────────────────────────────────────────────────────────

  it.each([128, 256, 512])("scales font size for badge size %d", (size) => {
    const el = Banner(makeProps({ size }))!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fontSize).toBe(size * BANNER_FONT_SIZE_RATIO);
  });

  it("uses DM Mono by default", () => {
    const el = Banner(makeProps())!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fontFamily).toBe("DM Mono");
  });

  it("accepts custom fontFamily", () => {
    const el = Banner(makeProps({ fontFamily: "Lexend" }))!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fontFamily).toBe("Lexend");
  });

  it("accepts custom borderColor", () => {
    const el = Banner(makeProps({ borderColor: "#ff0000" }))!;
    const rects = findByType(el, "Rect");
    expect(rects[1].props.stroke).toBe("#ff0000");
  });

  // ── Text content ───────────────────────────────────────────────────

  it("trims whitespace from banner text", () => {
    const el = Banner(
      makeProps({ banner: { text: "  HELLO  ", position: "center" } }),
    )!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.children).toBe("HELLO");
  });
});
