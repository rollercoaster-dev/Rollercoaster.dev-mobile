import React from "react";
import { Text } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { IconButton, type IconButtonTone } from "../IconButton";
import { resolveIconColor } from "../IconButton.styles";
import { composeTheme } from "../../../themes/compose";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unistylesMock = require("react-native-unistyles");

describe("IconButton", () => {
  it("renders the icon and is accessible", () => {
    renderWithProviders(
      <IconButton
        icon={<Text>X</Text>}
        onPress={jest.fn()}
        accessibilityLabel="Close"
      />,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(screen.getByText("X")).toBeOnTheScreen();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <IconButton
        icon={<Text>+</Text>}
        onPress={onPress}
        accessibilityLabel="Add"
      />,
    );
    fireEvent.press(screen.getByRole("button", { name: "Add" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <IconButton
        icon={<Text>+</Text>}
        onPress={onPress}
        accessibilityLabel="Add"
        disabled
      />,
    );
    fireEvent.press(screen.getByRole("button", { name: "Add" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  describe("tone × theme matrix — owns icon foreground color", () => {
    // Representative themes covering both color modes plus the a11y variants
    // most likely to push the action/surfaceBorder/chrome tokens away from
    // their light-default values.
    const themes = [
      composeTheme("light", "default"),
      composeTheme("dark", "default"),
      composeTheme("light", "highContrast"),
      composeTheme("dark", "highContrast"),
      composeTheme("light", "dyslexia"),
    ] as const;
    const themeNames = [
      "light-default",
      "dark-default",
      "light-highContrast",
      "dark-highContrast",
      "light-dyslexia",
    ] as const;
    const tones: IconButtonTone[] = [
      "chrome",
      "ghost",
      "surface",
      "primary",
      "destructive",
    ];

    afterEach(() => {
      // Reset to the default theme returned by the mock
      unistylesMock.useUnistyles.mockReturnValue({
        theme: unistylesMock.mockTheme,
      });
    });

    test.each(
      themes.flatMap((theme, themeIdx) =>
        tones.map((tone) => [themeNames[themeIdx], theme, tone] as const),
      ),
    )(
      "%s %s tone injects resolved icon color (caller passes none)",
      (_themeName, theme, tone) => {
        unistylesMock.useUnistyles.mockReturnValue({ theme });

        const expected = resolveIconColor(theme, tone);

        renderWithProviders(
          <IconButton
            icon={<Text testID="icon-target">·</Text>}
            tone={tone}
            onPress={jest.fn()}
            accessibilityLabel={`${tone} button`}
          />,
        );

        const icon = screen.getByTestId("icon-target");
        const flatStyle = Array.isArray(icon.props.style)
          ? Object.assign(
              {},
              ...icon.props.style.flat(Infinity).filter(Boolean),
            )
          : icon.props.style;
        expect(flatStyle.color).toBe(expected);
      },
    );

    it("overrides any color the caller passed on the icon", () => {
      const theme = composeTheme("dark", "default");
      unistylesMock.useUnistyles.mockReturnValue({ theme });

      // Source the caller-passed color from a token so the test obeys the
      // monorepo's no-raw-colors rule. Pick a token that is guaranteed to
      // differ from resolveIconColor(theme, "primary") so the override
      // assertion remains meaningful.
      const callerColor = theme.surfaceBorder.borderDestructive;

      renderWithProviders(
        <IconButton
          icon={
            <Text testID="icon-target" style={{ color: callerColor }}>
              ·
            </Text>
          }
          tone="primary"
          onPress={jest.fn()}
          accessibilityLabel="primary button"
        />,
      );

      const icon = screen.getByTestId("icon-target");
      const flatStyle = Array.isArray(icon.props.style)
        ? Object.assign({}, ...icon.props.style.flat(Infinity).filter(Boolean))
        : icon.props.style;
      expect(flatStyle.color).toBe(resolveIconColor(theme, "primary"));
      expect(flatStyle.color).not.toBe(callerColor);
    });
  });
});
