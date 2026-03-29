import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { CenterModeSelector } from "../CenterModeSelector";
import { BadgeCenterMode } from "../types";

describe("CenterModeSelector", () => {
  const onSelectMode = jest.fn();
  const onChangeMonogram = jest.fn();

  const defaultProps = {
    selectedMode: BadgeCenterMode.icon,
    monogram: "",
    onSelectMode,
    onChangeMonogram,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders both icon and monogram options", () => {
    renderWithProviders(<CenterModeSelector {...defaultProps} />);

    expect(screen.getByLabelText("Icon center")).toBeOnTheScreen();
    expect(screen.getByLabelText("Monogram center")).toBeOnTheScreen();
  });

  it("has radiogroup accessibility on container", () => {
    renderWithProviders(<CenterModeSelector {...defaultProps} />);

    const container = screen.getByLabelText("Badge center mode");
    expect(container).toBeOnTheScreen();
    expect(container.props.accessibilityRole).toBe("radiogroup");
  });

  it("marks icon as checked when icon mode selected", () => {
    renderWithProviders(<CenterModeSelector {...defaultProps} />);

    expect(
      screen.getByLabelText("Icon center").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true }));
    expect(
      screen.getByLabelText("Monogram center").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: false }));
  });

  it("marks monogram as checked when monogram mode selected", () => {
    renderWithProviders(
      <CenterModeSelector
        {...defaultProps}
        selectedMode={BadgeCenterMode.monogram}
      />,
    );

    expect(
      screen.getByLabelText("Monogram center").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true }));
    expect(
      screen.getByLabelText("Icon center").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: false }));
  });

  it("calls onSelectMode when icon option pressed", () => {
    renderWithProviders(
      <CenterModeSelector
        {...defaultProps}
        selectedMode={BadgeCenterMode.monogram}
      />,
    );

    fireEvent.press(screen.getByLabelText("Icon center"));
    expect(onSelectMode).toHaveBeenCalledWith(BadgeCenterMode.icon);
  });

  it("calls onSelectMode when monogram option pressed", () => {
    renderWithProviders(<CenterModeSelector {...defaultProps} />);

    fireEvent.press(screen.getByLabelText("Monogram center"));
    expect(onSelectMode).toHaveBeenCalledWith(BadgeCenterMode.monogram);
  });

  it("shows text input when monogram mode is selected", () => {
    renderWithProviders(
      <CenterModeSelector
        {...defaultProps}
        selectedMode={BadgeCenterMode.monogram}
      />,
    );

    expect(screen.getByLabelText("Monogram text")).toBeOnTheScreen();
  });

  it("hides text input when icon mode is selected", () => {
    renderWithProviders(<CenterModeSelector {...defaultProps} />);

    expect(screen.queryByLabelText("Monogram text")).toBeNull();
  });

  it("text input has maxLength 3", () => {
    renderWithProviders(
      <CenterModeSelector
        {...defaultProps}
        selectedMode={BadgeCenterMode.monogram}
      />,
    );

    expect(screen.getByLabelText("Monogram text").props.maxLength).toBe(3);
  });

  it("calls onChangeMonogram when text input changes", () => {
    renderWithProviders(
      <CenterModeSelector
        {...defaultProps}
        selectedMode={BadgeCenterMode.monogram}
        monogram="AB"
      />,
    );

    fireEvent.changeText(screen.getByLabelText("Monogram text"), "ABC");
    expect(onChangeMonogram).toHaveBeenCalledWith("ABC");
  });
});
