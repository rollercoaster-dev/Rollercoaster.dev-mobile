import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { TimingMarkIcon, type TimingMarkTone } from "../TimingMarkIcon";

const TONES: TimingMarkTone[] = ["after", "waiting", "due"];

describe("TimingMarkIcon", () => {
  test.each(TONES)("renders a mark for the %s tone", (tone) => {
    renderWithProviders(<TimingMarkIcon tone={tone} />);

    expect(
      screen.getByTestId(`timing-mark-${tone}`, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
  });

  /**
   * The whole reason this component exists. `⏳` (U+23F3) and — on iOS — `↩`
   * (U+21A9) resolve to the platform's color emoji font, which ignores `color`
   * and every one of the seven accessibility variants. A regression to a text
   * run has to fail here rather than ship as a blue-boxed arrow.
   */
  test.each(TONES)("ships no emoji glyph for the %s tone", (tone) => {
    renderWithProviders(<TimingMarkIcon tone={tone} />);

    for (const glyph of ["↩", "⏳", "▦"]) {
      expect(
        screen.queryByText(glyph, { includeHiddenElements: true }),
      ).toBeNull();
    }
  });

  // The line's own text already says "after …" / "due …", so the mark is
  // decoration and must not be a second thing to swipe past.
  test.each(TONES)("hides the %s mark from assistive tech", (tone) => {
    renderWithProviders(<TimingMarkIcon tone={tone} />);

    const mark = screen.getByTestId(`timing-mark-${tone}`, {
      includeHiddenElements: true,
    });
    expect(mark.props.accessibilityElementsHidden).toBe(true);
    expect(mark.props.importantForAccessibility).toBe("no");
  });

  it("lets a caller scope the testID to its own row", () => {
    renderWithProviders(<TimingMarkIcon tone="due" testID="row-7-mark-due" />);

    expect(
      screen.getByTestId("row-7-mark-due", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId("timing-mark-due", { includeHiddenElements: true }),
    ).toBeNull();
  });
});
