import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { EvidenceItem } from "../EvidenceItem";

const defaultProps = {
  id: "evidence-1",
  type: "photo" as const,
  label: "My photo",
  onLongPress: jest.fn(),
};

describe("EvidenceItem", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders icon and label", () => {
    renderWithProviders(<EvidenceItem {...defaultProps} />);
    expect(screen.getByText("My photo")).toBeOnTheScreen();
  });

  it("truncates labels longer than 20 characters", () => {
    renderWithProviders(
      <EvidenceItem
        {...defaultProps}
        label="This is a very long label that should be truncated"
      />,
    );
    expect(screen.getByText("This is a very long \u2026")).toBeOnTheScreen();
  });

  it("calls onLongPress with id", () => {
    const onLongPress = jest.fn();
    renderWithProviders(
      <EvidenceItem {...defaultProps} onLongPress={onLongPress} />,
    );
    fireEvent(screen.getByRole("button"), "onLongPress");
    expect(onLongPress).toHaveBeenCalledWith("evidence-1");
  });

  it("renders without error when isGoal is true", () => {
    renderWithProviders(<EvidenceItem {...defaultProps} isGoal />);
    expect(screen.getByLabelText("photo evidence: My photo")).toBeOnTheScreen();
  });

  it("has correct accessibility label including type and content", () => {
    renderWithProviders(<EvidenceItem {...defaultProps} />);
    expect(screen.getByLabelText("photo evidence: My photo")).toBeOnTheScreen();
  });

  it("has long press hint for accessibility", () => {
    renderWithProviders(<EvidenceItem {...defaultProps} />);
    expect(screen.getByRole("button")).toHaveProp(
      "accessibilityHint",
      "Long press to delete",
    );
  });
});
