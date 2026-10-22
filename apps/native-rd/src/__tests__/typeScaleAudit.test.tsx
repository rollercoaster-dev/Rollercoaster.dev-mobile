/**
 * Scale audit (#741): renders every shared Text variant at the largest iOS
 * accessibility size and checks the size RN would draw against its cap.
 *
 * RN draws `fontSize × min(fontScale, maxFontSizeMultiplier)`; the audit
 * applies that rule to the theme's own fontSize and the multiplier read off
 * the rendered host text, so a variant that loses its cap fails here.
 */
import React from "react";
import { renderWithProviders, screen } from "./test-utils";
import { mockFontScale } from "./fontScale";
import { Text, type TextVariant } from "../components/Text";
import { composeTheme, type ComposedTheme } from "../themes/compose";
import { CAPS, CHROME_CAP } from "../utils/typeScale";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unistylesMock = require("react-native-unistyles");

const LARGEST_AX_SIZE = 3.1;
const defaultTheme = composeTheme("light", "default");
const themes: [string, ComposedTheme][] = [
  ["default", defaultTheme],
  ["lowVision", composeTheme("light", "lowVision")],
];
const variants = Object.keys(CAPS) as TextVariant[];

function renderedSize(
  theme: ComposedTheme,
  variant: TextVariant,
  fontScale: number,
  chrome = false,
) {
  unistylesMock.useUnistyles.mockReturnValue({ theme });
  mockFontScale(fontScale);
  renderWithProviders(
    <Text variant={variant} chrome={chrome}>
      Audit
    </Text>,
  );
  const { maxFontSizeMultiplier } = screen.getByText("Audit").props;
  return (
    theme.textStyles[variant].fontSize *
    Math.min(fontScale, maxFontSizeMultiplier)
  );
}

describe("type-scale audit", () => {
  afterEach(() => {
    unistylesMock.useUnistyles.mockReturnValue({
      theme: unistylesMock.mockTheme,
    });
  });

  describe.each(themes)("%s theme at fontScale 3.1", (_name, theme) => {
    test.each(variants)("%s stays within its cap", (variant) => {
      const base = defaultTheme.textStyles[variant].fontSize;
      expect(renderedSize(theme, variant, LARGEST_AX_SIZE)).toBeLessThanOrEqual(
        base * CAPS[variant] + 1e-9,
      );
    });

    test.each(variants)("%s as chrome stays within 1.3x", (variant) => {
      const base = defaultTheme.textStyles[variant].fontSize;
      expect(
        renderedSize(theme, variant, LARGEST_AX_SIZE, true),
      ).toBeLessThanOrEqual(base * CHROME_CAP + 1e-9);
    });
  });

  test.each(themes)(
    "body reaches 2.0x its default base at OS 200% (%s)",
    (_name, theme) => {
      const base = defaultTheme.textStyles.body.fontSize;
      expect(renderedSize(theme, "body", 2)).toBeCloseTo(base * 2);
    },
  );
});
