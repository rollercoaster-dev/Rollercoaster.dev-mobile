/**
 * Scale audit (#741): renders every shared Text variant at the largest iOS
 * accessibility size (AX5) and checks the size RN would draw against its cap.
 *
 * RN draws `fontSize × min(fontScale, maxFontSizeMultiplier)` and ignores a
 * multiplier below 1 (0 means "no limit"). The audit applies that rule to
 * the theme's fontSize and the multiplier read off the rendered host text,
 * so a variant whose cap is missing or ineffective fails here.
 */
import React from "react";
import { renderWithProviders, screen } from "./test-utils";
import { mockFontScale } from "./fontScale";
import { Text, type TextVariant } from "../components/Text";
import { composeTheme, type ComposedTheme } from "../themes/compose";
import { CAPS, CHROME_CAP } from "../utils/typeScale";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unistylesMock = require("react-native-unistyles");

// RN's fontScale for iOS's largest size (AX5); see RCTAccessibilityManager.mm.
const LARGEST_AX_SIZE = 3.571;
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
  const applied =
    maxFontSizeMultiplier >= 1
      ? Math.min(fontScale, maxFontSizeMultiplier)
      : fontScale;
  return theme.textStyles[variant].fontSize * applied;
}

describe("type-scale audit", () => {
  afterEach(() => {
    unistylesMock.useUnistyles.mockReturnValue({
      theme: unistylesMock.mockTheme,
      rt: unistylesMock.UnistylesRuntime,
    });
  });

  describe.each(themes)("%s theme at the largest AX size", (_name, theme) => {
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
