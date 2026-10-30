import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { Text, type TextVariant } from "../Text";
import { composeTheme } from "../../../themes/compose";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unistylesMock = require("react-native-unistyles");

describe("Text", () => {
  const variants: TextVariant[] = [
    "screenTitle",
    "taskTitle",
    "display",
    "headline",
    "title",
    "body",
    "caption",
    "label",
    "metadata",
    "mono",
  ];

  test.each(variants)('renders variant "%s" without crashing', (variant) => {
    renderWithProviders(<Text variant={variant}>Sample</Text>);
    expect(screen.getByText("Sample")).toBeOnTheScreen();
  });

  it("passes additional TextProps through (testID, numberOfLines)", () => {
    renderWithProviders(
      <Text testID="my-text" numberOfLines={2}>
        Truncated
      </Text>,
    );
    expect(screen.getByTestId("my-text")).toBeOnTheScreen();
  });

  it("allows style override without throwing", () => {
    renderWithProviders(<Text style={{ color: "red" }}>Styled</Text>);
    expect(screen.getByText("Styled")).toBeOnTheScreen();
  });

  describe("maxFontSizeMultiplier", () => {
    afterEach(() => {
      unistylesMock.useUnistyles.mockReturnValue({
        theme: unistylesMock.mockTheme,
        rt: unistylesMock.UnistylesRuntime,
      });
    });

    test.each([
      ["display", 1],
      ["headline", 1],
      ["title", 2],
      ["body", 2],
      ["caption", 2],
      ["label", 2],
      ["mono", 2],
    ] as const)("%s defaults to its role cap %s", (variant, cap) => {
      renderWithProviders(<Text variant={variant}>Capped</Text>);
      expect(screen.getByText("Capped").props.maxFontSizeMultiplier).toBe(cap);
    });

    it("caps chrome text at 1.3 whatever the variant", () => {
      renderWithProviders(
        <Text variant="body" chrome>
          Tab
        </Text>,
      );
      expect(screen.getByText("Tab").props.maxFontSizeMultiplier).toBe(1.3);
    });

    it("divides the cap by Low Vision's 1.25x theme scale", () => {
      unistylesMock.useUnistyles.mockReturnValue({
        theme: composeTheme("light", "lowVision"),
      });
      renderWithProviders(<Text variant="body">Low vision</Text>);
      expect(
        screen.getByText("Low vision").props.maxFontSizeMultiplier,
      ).toBeCloseTo(1.6);
    });

    it("lets an explicit caller value win", () => {
      renderWithProviders(
        <Text variant="headline" maxFontSizeMultiplier={3}>
          Override
        </Text>,
      );
      expect(screen.getByText("Override").props.maxFontSizeMultiplier).toBe(3);
    });
  });
});
