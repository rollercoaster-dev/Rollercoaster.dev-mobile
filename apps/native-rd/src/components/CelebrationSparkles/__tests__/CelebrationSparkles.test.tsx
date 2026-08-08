import React from "react";

import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { CelebrationSparkles } from "../CelebrationSparkles";

/** The layer is a11y-hidden by design, so every query opts into hidden nodes. */
const hidden = { includeHiddenElements: true } as const;

describe("CelebrationSparkles", () => {
  it("hides the whole layer from screen readers and from touch", () => {
    renderWithProviders(<CelebrationSparkles color="#111111" />);
    const layer = screen.getByTestId("celebration-sparkles", hidden);
    expect(layer.props.accessibilityElementsHidden).toBe(true);
    expect(layer.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(layer.props.pointerEvents).toBe("none");
  });

  // The band layout is the Badge Detail prototype's six fixed-pixel glyphs;
  // the screen layout spreads more of them by percentage so a full-height
  // surface doesn't bunch its decoration at the top.
  it.each([
    ["band", 6],
    ["screen", 10],
  ] as const)("renders the %s layout's glyph count", (layout, count) => {
    renderWithProviders(
      <CelebrationSparkles color="#111111" layout={layout} />,
    );
    const layer = screen.getByTestId("celebration-sparkles", hidden);
    expect(layer.children).toHaveLength(count);
  });

  it("positions the screen layout in percentages so it scales with height", () => {
    renderWithProviders(
      <CelebrationSparkles color="#111111" layout="screen" />,
    );
    const layer = screen.getByTestId("celebration-sparkles", hidden);
    const offsets = (layer.children as unknown[])
      .flatMap((child) => {
        const style = (child as { props?: { style?: unknown } }).props?.style;
        return Array.isArray(style) ? style : [style];
      })
      .flatMap((entry) => {
        const s = entry as Record<string, unknown>;
        return [s?.top, s?.bottom, s?.left, s?.right];
      })
      .filter((v) => v !== undefined);
    expect(offsets.length).toBeGreaterThan(0);
    offsets.forEach((v) => expect(String(v)).toMatch(/%$/));
  });

  it("accepts a caller testID so two layers can coexist in one tree", () => {
    renderWithProviders(
      <CelebrationSparkles color="#111111" testID="finish-reveal-sparkles" />,
    );
    expect(
      screen.getByTestId("finish-reveal-sparkles", hidden),
    ).toBeOnTheScreen();
  });
});
