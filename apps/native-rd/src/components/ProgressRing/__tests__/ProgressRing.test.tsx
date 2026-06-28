import React from "react";
import { StyleSheet } from "react-native";
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

  // Regression: on small rings the fixed 40px display label overflowed the
  // stroke. The label must auto-shrink (numberOfLines=1 + adjustsFontSizeToFit)
  // and its base size must scale with the ring rather than stay fixed. Mirrors
  // the cockpit hero geometry (size 124 / strokeWidth 10).
  it("scales the center label to the ring and lets it shrink to fit", () => {
    renderWithProviders(
      <ProgressRing
        progress={0.5}
        size={124}
        strokeWidth={10}
        centerLabel="100%"
      />,
    );
    const label = screen.getByText("100%");
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    const flattened = StyleSheet.flatten(label.props.style);
    expect(flattened.fontSize).toBe(Math.round(124 * 0.25));
    expect(flattened.maxWidth).toBe(124 - 10 * 2);
  });

  // Regression: strokeWidth >= size made (size - strokeWidth) / 2 negative,
  // producing an invalid SVG radius (blank ring + RN warnings). Both the radius
  // and the label's maxWidth (innerDiameter) must clamp to 0 instead.
  it("clamps geometry to non-negative when strokeWidth >= size", () => {
    renderWithProviders(
      <ProgressRing
        progress={0.5}
        size={40}
        strokeWidth={60}
        centerLabel="50%"
      />,
    );
    expect(screen.getByRole("progressbar")).toBeOnTheScreen();
    const flattened = StyleSheet.flatten(screen.getByText("50%").props.style);
    expect(flattened.maxWidth).toBe(0);
  });
});
