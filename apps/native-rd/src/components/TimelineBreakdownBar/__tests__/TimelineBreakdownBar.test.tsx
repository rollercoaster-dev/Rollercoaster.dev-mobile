import React from "react";
import { StyleSheet } from "react-native";
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

  it("orders legend chips completed → in-progress → pending → paused", () => {
    renderWithProviders(
      <TimelineBreakdownBar
        counts={{ completed: 3, "in-progress": 1, pending: 3, paused: 1 }}
      />,
    );
    // getAllByText returns matches in render order, so this locks both the
    // presence of all four chips AND the fixed left-to-right SEGMENT_ORDER
    // (which intentionally differs from TimelineNode's state ordering).
    const labels = screen
      .getAllByText(/done|in motion|to come|set aside/)
      .map((node) => node.props.children);
    expect(labels).toEqual([
      "3 done",
      "1 in motion",
      "3 to come",
      "1 set aside",
    ]);
  });

  it("sizes each bar segment's flex to its count", () => {
    // The colored segments — not the legend text — are the bar's actual output.
    // Locking flex:count here means an equal-width (flex:1) or mis-ordered
    // regression fails; every other test only exercises the legend chips.
    renderWithProviders(
      <TimelineBreakdownBar
        counts={{ completed: 3, "in-progress": 1, pending: 3, paused: 1 }}
      />,
    );
    const flexOf = (state: StepStateMapKey) =>
      (
        StyleSheet.flatten(
          screen.getByTestId(`timeline-breakdown-segment-${state}`).props.style,
        ) as { flex?: number }
      ).flex;
    expect(flexOf("completed")).toBe(3);
    expect(flexOf("in-progress")).toBe(1);
    expect(flexOf("pending")).toBe(3);
    expect(flexOf("paused")).toBe(1);
  });

  it("renders an empty track with no legend chips when every count is 0", () => {
    // Total of 0 → every segment is flex:0 (an empty bordered track, no
    // NaN-width crash) and the count > 0 drop-out filter removes every chip.
    // A render that doesn't throw covers the no-NaN path; the queryByText-null
    // below is the real drop-out assertion.
    renderWithProviders(<TimelineBreakdownBar counts={ZERO} />);
    expect(screen.queryByText(/done|in motion|to come|set aside/)).toBeNull();
  });
});
