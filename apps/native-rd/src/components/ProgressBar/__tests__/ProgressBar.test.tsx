import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { ProgressBar } from "../ProgressBar";

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({ animationPref: "none" as const }),
}));

describe("ProgressBar", () => {
  it('has accessibilityRole="progressbar"', () => {
    renderWithProviders(<ProgressBar progress={0.5} />);
    expect(screen.getByRole("progressbar")).toBeOnTheScreen();
  });

  it.each([
    { input: 0.5, expected: 50 },
    { input: 0, expected: 0 },
    { input: 1, expected: 100 },
  ])(
    "sets accessibilityValue to {min:0, max:100, now:$expected} for progress=$input",
    ({ input, expected }) => {
      renderWithProviders(<ProgressBar progress={input} />);
      const bar = screen.getByRole("progressbar");
      expect(bar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: expected,
      });
    },
  );

  it.each([
    { input: -0.5, expected: 0 },
    { input: -1, expected: 0 },
    { input: 1.5, expected: 100 },
    { input: 2, expected: 100 },
  ])(
    "clamps out-of-range progress=$input to $expected",
    ({ input, expected }) => {
      renderWithProviders(<ProgressBar progress={input} />);
      const bar = screen.getByRole("progressbar");
      expect(bar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: expected,
      });
    },
  );
});
