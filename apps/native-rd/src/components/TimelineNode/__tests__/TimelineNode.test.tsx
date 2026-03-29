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
    { status: "completed" as const, expected: "\u2713" },
  ])('renders "$expected" for $status status', ({ status, expected }) => {
    renderWithProviders(<TimelineNode {...baseProps} status={status} />);
    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it("renders star for goal node", () => {
    renderWithProviders(<TimelineNode {...baseProps} isGoalNode />);
    expect(screen.getByText("\u2605")).toBeOnTheScreen();
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
});
