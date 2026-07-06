import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { TimelineNode } from "../TimelineNode";

describe("TimelineNode", () => {
  const baseProps = {
    status: "pending" as const,
    stepNumber: 1,
    accessibilityLabel: "Step 1: Read docs",
  };

  it.each([
    { status: "pending" as const, expected: "1" },
    { status: "in-progress" as const, expected: "1" },
    { status: "paused" as const, expected: "\u23f8" },
    { status: "completed" as const, expected: "\u2713" },
  ])('renders "$expected" for $status status', ({ status, expected }) => {
    renderWithProviders(<TimelineNode {...baseProps} status={status} />);
    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it("renders star for goal node", () => {
    renderWithProviders(<TimelineNode {...baseProps} isGoalNode />);
    expect(screen.getByText("\u2605")).toBeOnTheScreen();
  });

  it("renders the same star glyph when celebrating (#452 \u2014 celebrate only recolors)", () => {
    renderWithProviders(<TimelineNode {...baseProps} isGoalNode celebrate />);
    expect(screen.getByText("\u2605")).toBeOnTheScreen();
  });

  it("renders the label override instead of the step number", () => {
    renderWithProviders(<TimelineNode {...baseProps} label="a" />);
    expect(screen.getByText("a")).toBeOnTheScreen();
    expect(screen.queryByText("1")).toBeNull();
  });

  it("completed check mark takes precedence over a label", () => {
    renderWithProviders(
      <TimelineNode {...baseProps} status="completed" label="a" />,
    );
    expect(screen.getByText("\u2713")).toBeOnTheScreen();
    expect(screen.queryByText("a")).toBeNull();
  });

  it("renders blank — not '0' or 'undefined' — when given no number or label", () => {
    renderWithProviders(
      <TimelineNode status="pending" accessibilityLabel="Empty node" />,
    );
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("undefined")).toBeNull();
  });

  it("renders a small lettered child node that stays interactive", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <TimelineNode
        {...baseProps}
        size="sm"
        label="b"
        status="in-progress"
        accessibilityLabel="Go to step b"
        onPress={onPress}
      />,
    );
    expect(screen.getByText("b")).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText("Go to step b"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    renderWithProviders(<TimelineNode {...baseProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText("Step 1: Read docs"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("has correct accessibility label", () => {
    renderWithProviders(
      <TimelineNode {...baseProps} accessibilityLabel="Go to step 1" />,
    );
    expect(screen.getByLabelText("Go to step 1")).toBeOnTheScreen();
  });

  // State-word badge (showStateBadge, #406 D7). Labels come from live i18n
  // (src/i18n/index.ts is a Jest setupFile), so these are the real `t()` values.
  it.each([
    { status: "pending" as const, label: "Pending" },
    { status: "in-progress" as const, label: "In Progress" },
    { status: "paused" as const, label: "Paused" },
    { status: "completed" as const, label: "Completed" },
  ])(
    'renders the "$label" state badge for $status when showStateBadge',
    ({ status, label }) => {
      renderWithProviders(
        <TimelineNode {...baseProps} status={status} showStateBadge />,
      );
      expect(screen.getByText(label)).toBeOnTheScreen();
    },
  );

  it("does not render the state badge by default (live-consumer no-regression)", () => {
    renderWithProviders(<TimelineNode {...baseProps} status="in-progress" />);
    expect(screen.queryByText("In Progress")).toBeNull();
  });

  it("does not render the state badge on a goal node even when showStateBadge is set", () => {
    renderWithProviders(
      <TimelineNode
        {...baseProps}
        status="completed"
        isGoalNode
        showStateBadge
      />,
    );
    expect(screen.queryByText("Completed")).toBeNull();
  });
});
