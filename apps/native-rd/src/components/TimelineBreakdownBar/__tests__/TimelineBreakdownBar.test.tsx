import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { TimelineBreakdownBar } from "../TimelineBreakdownBar";
import type { StepStateMapKey } from "../../TimelineNode/stepStateColorMap";

const ZERO: Record<StepStateMapKey, number> = {
  completed: 0,
  "in-progress": 0,
  pending: 0,
  paused: 0,
};

describe("TimelineBreakdownBar", () => {
  // Legend labels come from live i18n (src/i18n is a Jest setupFile), so these
  // are the real en `t()` values for each state's "{{count}} <label>" template.
  it.each<{ state: StepStateMapKey; count: number; text: string }>([
    { state: "completed", count: 3, text: "3 done" },
    { state: "in-progress", count: 1, text: "1 in motion" },
    { state: "pending", count: 2, text: "2 to come" },
    { state: "paused", count: 1, text: "1 set aside" },
  ])("renders '$text' for $state when count > 0", ({ state, count, text }) => {
    renderWithProviders(
      <TimelineBreakdownBar counts={{ ...ZERO, [state]: count }} />,
    );
    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it("renders no legend chip for a zero-count state (drop-out contract)", () => {
    renderWithProviders(
      <TimelineBreakdownBar counts={{ ...ZERO, completed: 4 }} />,
    );
    expect(screen.getByText("4 done")).toBeOnTheScreen();
    // The three zero-count states must not surface "0 in motion" etc.
    expect(screen.queryByText(/in motion/)).toBeNull();
    expect(screen.queryByText(/to come/)).toBeNull();
    expect(screen.queryByText(/set aside/)).toBeNull();
  });

  it("renders all four legend chips for a mixed-counts breakdown", () => {
    renderWithProviders(
      <TimelineBreakdownBar
        counts={{ completed: 3, "in-progress": 1, pending: 3, paused: 1 }}
      />,
    );
    expect(screen.getByText("3 done")).toBeOnTheScreen();
    expect(screen.getByText("1 in motion")).toBeOnTheScreen();
    expect(screen.getByText("3 to come")).toBeOnTheScreen();
    expect(screen.getByText("1 set aside")).toBeOnTheScreen();
  });
});
