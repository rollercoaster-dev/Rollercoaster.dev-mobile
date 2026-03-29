import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FAB } from "../FAB";

const defaultProps = {
  isOpen: false,
  onToggle: jest.fn(),
};

describe("FAB", () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows "+" when closed', () => {
    renderWithProviders(<FAB {...defaultProps} />);
    expect(screen.getByText("+")).toBeOnTheScreen();
  });

  it('shows "+" rotated when open (still + character with rotation)', () => {
    renderWithProviders(<FAB {...defaultProps} isOpen />);
    // The + is still rendered but visually rotated 45deg to form ×
    expect(screen.getByText("+")).toBeOnTheScreen();
  });

  it("calls onToggle on press", () => {
    const onToggle = jest.fn();
    renderWithProviders(<FAB isOpen={false} onToggle={onToggle} />);
    fireEvent.press(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('has "Add evidence" label when closed', () => {
    renderWithProviders(<FAB {...defaultProps} />);
    expect(screen.getByLabelText("Add evidence")).toBeOnTheScreen();
  });

  it('has "Close evidence menu" label when open', () => {
    renderWithProviders(<FAB {...defaultProps} isOpen />);
    expect(screen.getByLabelText("Close evidence menu")).toBeOnTheScreen();
  });

  it("reflects expanded state in accessibility", () => {
    renderWithProviders(<FAB {...defaultProps} isOpen />);
    expect(screen.getByRole("button")).toHaveProp("accessibilityState", {
      expanded: true,
    });
  });
});
