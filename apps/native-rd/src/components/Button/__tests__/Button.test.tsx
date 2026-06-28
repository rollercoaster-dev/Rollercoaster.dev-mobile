import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { Button } from "../Button";

describe("Button", () => {
  it("renders with label", () => {
    renderWithProviders(<Button label="Click me" onPress={jest.fn()} />);
    expect(screen.getByText("Click me")).toBeOnTheScreen();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    renderWithProviders(<Button label="Press" onPress={onPress} />);
    fireEvent.press(screen.getByText("Press"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    renderWithProviders(<Button label="Disabled" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText("Disabled"));
    expect(onPress).not.toHaveBeenCalled();
  });

  // Regression: the icon run carried no color, so it fell back to the default
  // text color and rendered invisibly on the primary button's dark fill. The
  // icon must track the label color.
  it("colors the icon to match the label", () => {
    renderWithProviders(<Button label="Resume" icon="▶" onPress={jest.fn()} />);
    // The icon run is accessibilityElementsHidden, so opt hidden elements in.
    const iconColor = StyleSheet.flatten(
      screen.getByText("▶", { includeHiddenElements: true }).props.style,
    ).color;
    const labelColor = StyleSheet.flatten(
      screen.getByText("Resume").props.style,
    ).color;
    expect(iconColor).toBeTruthy();
    expect(iconColor).toBe(labelColor);
  });
});
