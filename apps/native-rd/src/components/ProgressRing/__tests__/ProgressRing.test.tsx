import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { ProgressRing } from "../ProgressRing";

describe("ProgressRing", () => {
  it('has accessibilityRole="progressbar"', () => {
    renderWithProviders(<ProgressRing progress={0.5} />);
    expect(screen.getByRole("progressbar")).toBeOnTheScreen();
  });

  it.each([
    { input: 0, expected: 0 },
    { input: 0.5, expected: 50 },
    { input: 1, expected: 100 },
  ])(
    "sets accessibilityValue now=$expected for progress=$input",
    ({ input, expected }) => {
      renderWithProviders(<ProgressRing progress={input} />);
      expect(screen.getByRole("progressbar").props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: expected,
      });
    },
  );

  it.each([
    { input: -0.5, expected: 0 },
    { input: 1.5, expected: 100 },
  ])(
    "clamps out-of-range progress=$input to $expected",
    ({ input, expected }) => {
      renderWithProviders(<ProgressRing progress={input} />);
      expect(screen.getByRole("progressbar").props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: expected,
      });
    },
  );

  it("renders center labels when provided", () => {
    renderWithProviders(
      <ProgressRing
        progress={0.5}
        centerLabel="50%"
        centerSublabel="3 / 6 steps"
      />,
    );
    expect(screen.getByText("50%")).toBeOnTheScreen();
    expect(screen.getByText("3 / 6 steps")).toBeOnTheScreen();
  });
});
