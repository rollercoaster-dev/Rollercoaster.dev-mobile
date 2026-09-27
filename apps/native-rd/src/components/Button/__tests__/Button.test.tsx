import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { Button } from "../Button";
import { resolveButtonColors } from "../Button.styles";
import { mockTheme } from "../../../__tests__/mocks/unistyles";
import { themeNames, themes } from "../../../themes/compose";

function idleStyle(testID: string) {
  const pressable = screen.getByTestId(testID);
  return StyleSheet.flatten(pressable.props.style);
}

describe("Button", () => {
  it("renders with label", () => {
    renderWithProviders(<Button label="Click me" onPress={jest.fn()} />);
    expect(screen.getByText("Click me")).toBeOnTheScreen();
  });

  it("uses the contrast-validated action colors for the default primary", () => {
    renderWithProviders(
      <Button label="Save" onPress={jest.fn()} testID="save" />,
    );
    expect(idleStyle("save").backgroundColor).toBe(
      mockTheme.action.actionPrimaryBg,
    );
    expect(StyleSheet.flatten(screen.getByText("Save").props.style).color).toBe(
      mockTheme.action.actionPrimaryFg,
    );
  });

  it("keeps the Badges primary legible on its celebration surface", () => {
    renderWithProviders(
      <Button
        label="See your goals"
        onPress={jest.fn()}
        testID="celebration"
        surface="celebration"
      />,
    );
    expect(idleStyle("celebration").backgroundColor).toBe(
      mockTheme.chrome.celebrationBg,
    );
    expect(
      StyleSheet.flatten(screen.getByText("See your goals").props.style).color,
    ).toBe(mockTheme.chrome.celebrationFg);
  });

  it("allows a long translated label to wrap beside an icon", () => {
    const label = "Vollständigen Nachweistitel und weitere Details lesen";
    renderWithProviders(<Button label={label} icon="+" onPress={jest.fn()} />);
    const style = StyleSheet.flatten(screen.getByText(label).props.style);
    expect(style.flexShrink).toBe(1);
    expect(screen.getByText(label).props.numberOfLines).toBeUndefined();
  });

  it("supports richer spoken action copy than the visible label", () => {
    renderWithProviders(
      <Button
        label="Set aside"
        accessibilityLabel="Set this step aside"
        onPress={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Set this step aside" }),
    ).toBeOnTheScreen();
  });

  it.each(themeNames)(
    "%s resolves every filled action from semantic contrast pairs",
    (name) => {
      const theme = themes[name];
      expect(resolveButtonColors(theme, "primary")).toEqual({
        background: theme.action.actionPrimaryBg,
        foreground: theme.action.actionPrimaryFg,
      });
      expect(resolveButtonColors(theme, "secondary")).toEqual({
        background: theme.action.actionSecondaryBg,
        foreground: theme.action.actionSecondaryFg,
      });
      expect(resolveButtonColors(theme, "destructive")).toEqual({
        background: theme.action.actionDestructiveBg,
        foreground: theme.action.actionDestructiveFg,
      });
      expect(resolveButtonColors(theme, "primary", "celebration")).toEqual({
        background: theme.chrome.celebrationBg,
        foreground: theme.chrome.celebrationFg,
      });
    },
  );

  it("uses the action foreground for a loading indicator and blocks presses", () => {
    const onPress = jest.fn();
    renderWithProviders(<Button label="Save" onPress={onPress} loading />);
    expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe(
      mockTheme.action.actionPrimaryFg,
    );
    fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onPress).not.toHaveBeenCalled();
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
  // text color and rendered invisibly on the primary button's dark fill. A
  // string icon must track the label color.
  it("colors a string icon to match the label", () => {
    renderWithProviders(<Button label="Add" icon="+" onPress={jest.fn()} />);
    // The icon run is accessibilityElementsHidden, so opt hidden elements in.
    const iconColor = StyleSheet.flatten(
      screen.getByText("+", { includeHiddenElements: true }).props.style,
    ).color;
    const labelColor = StyleSheet.flatten(
      screen.getByText("Add").props.style,
    ).color;
    expect(iconColor).toBeTruthy();
    expect(iconColor).toBe(labelColor);
  });

  // The element path exists so action icons can be Phosphor components instead
  // of emoji (design system Rule 8). An element must render as-is — wrapping it
  // in the string path's <Text> would break both its layout and its color.
  it("renders an element icon without wrapping it in a text run", () => {
    renderWithProviders(
      <Button
        label="Resume"
        icon={<View testID="button-icon-element" />}
        onPress={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId("button-icon-element", {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Resume")).toBeOnTheScreen();
  });

  // `icon=""` must not render an empty <Text> run: it would consume the
  // pressable's `gap` and offset the label as if an icon were there.
  it("renders no icon run for an empty string icon", () => {
    renderWithProviders(<Button label="Plain" icon="" onPress={jest.fn()} />);
    expect(
      screen.queryByTestId("button-icon-run", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.getByText("Plain")).toBeOnTheScreen();
  });

  // The counterpart: a non-empty string does produce the run, so the assertion
  // above is pinning the guard rather than a testID that never exists.
  it("renders the icon run for a non-empty string icon", () => {
    renderWithProviders(<Button label="Add" icon="+" onPress={jest.fn()} />);
    expect(
      screen.getByTestId("button-icon-run", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });
});
