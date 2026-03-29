jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { Checkbox } from "../Checkbox";

describe("Checkbox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders label text", () => {
    renderWithProviders(
      <Checkbox checked={false} onToggle={jest.fn()} label="Accept terms" />,
    );
    expect(screen.getByText("Accept terms")).toBeOnTheScreen();
  });

  it("shows checkmark when checked=true", () => {
    renderWithProviders(
      <Checkbox checked={true} onToggle={jest.fn()} label="Done" />,
    );
    expect(screen.getByText("✓")).toBeOnTheScreen();
  });

  it("does not show checkmark when checked=false", () => {
    renderWithProviders(
      <Checkbox checked={false} onToggle={jest.fn()} label="Done" />,
    );
    expect(screen.queryByText("✓")).toBeNull();
  });

  it("calls onToggle when the checkbox box is pressed", () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <Checkbox checked={false} onToggle={onToggle} label="Accept terms" />,
    );
    fireEvent.press(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle when label is pressed and no onLabelPress is provided", () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <Checkbox checked={false} onToggle={onToggle} label="Accept terms" />,
    );
    fireEvent.press(screen.getByText("Accept terms"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onLabelPress (not onToggle) when label is pressed and onLabelPress is provided", () => {
    const onToggle = jest.fn();
    const onLabelPress = jest.fn();
    renderWithProviders(
      <Checkbox
        checked={false}
        onToggle={onToggle}
        label="Step title"
        onLabelPress={onLabelPress}
      />,
    );
    fireEvent.press(screen.getByText("Step title"));
    expect(onLabelPress).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('has accessibilityRole="checkbox" on the box', () => {
    renderWithProviders(
      <Checkbox checked={false} onToggle={jest.fn()} label="Check me" />,
    );
    expect(screen.getByRole("checkbox")).toBeOnTheScreen();
  });

  test.each([true, false])(
    "sets accessibilityState.checked=%s when checked=%s",
    (checked) => {
      renderWithProviders(
        <Checkbox checked={checked} onToggle={jest.fn()} label="Done" />,
      );
      expect(screen.getByRole("checkbox")).toHaveProp("accessibilityState", {
        checked,
        disabled: false,
      });
    },
  );

  it("calls onToggle even when haptics rejects", async () => {
    const Haptics = require("expo-haptics");
    Haptics.impactAsync.mockRejectedValueOnce(new Error("no haptics"));
    const onToggle = jest.fn();
    renderWithProviders(
      <Checkbox checked={false} onToggle={onToggle} label="Accept terms" />,
    );
    fireEvent.press(screen.getByRole("checkbox"));
    await Promise.resolve();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('sets label accessibilityLabel to "Edit {label}" when onLabelPress is provided', () => {
    renderWithProviders(
      <Checkbox
        checked={false}
        onToggle={jest.fn()}
        label="My step"
        onLabelPress={jest.fn()}
      />,
    );
    expect(screen.getByLabelText("Edit My step")).toBeOnTheScreen();
  });
});
