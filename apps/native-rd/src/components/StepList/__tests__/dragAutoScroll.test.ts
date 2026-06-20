import {
  AUTO_SCROLL_MAX_PX_PER_FRAME,
  clampScrollOffset,
  getAutoScrollVelocity,
  getEffectiveTranslationY,
  type DragScrollMetrics,
} from "../dragAutoScroll";

const metrics: DragScrollMetrics = {
  offsetY: 200,
  viewportTop: 100,
  viewportHeight: 600,
  contentHeight: 1200,
};

describe("dragAutoScroll", () => {
  it("returns progressive velocity in the top and bottom edge zones", () => {
    const deepTopVelocity = getAutoScrollVelocity(110, metrics);
    const shallowTopVelocity = getAutoScrollVelocity(165, metrics);
    expect(deepTopVelocity).toBeLessThan(0);
    expect(Math.abs(deepTopVelocity)).toBeGreaterThan(
      Math.abs(shallowTopVelocity),
    );
    expect(getAutoScrollVelocity(690, metrics)).toBeGreaterThan(0);
    expect(Math.abs(getAutoScrollVelocity(100, metrics))).toBe(
      AUTO_SCROLL_MAX_PX_PER_FRAME,
    );
    expect(getAutoScrollVelocity(400, metrics)).toBe(0);
  });

  it("stops at both content boundaries", () => {
    expect(getAutoScrollVelocity(100, { ...metrics, offsetY: 0 })).toBe(0);
    expect(
      getAutoScrollVelocity(700, {
        ...metrics,
        offsetY: metrics.contentHeight - metrics.viewportHeight,
      }),
    ).toBe(0);
  });

  it("clamps offsets and includes scroll movement in drag translation", () => {
    expect(clampScrollOffset(-10, metrics)).toBe(0);
    expect(clampScrollOffset(900, metrics)).toBe(600);
    expect(getEffectiveTranslationY(40, 260, 200)).toBe(100);
  });
});
