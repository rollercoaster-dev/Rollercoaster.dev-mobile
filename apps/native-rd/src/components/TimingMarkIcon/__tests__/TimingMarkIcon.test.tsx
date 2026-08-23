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
