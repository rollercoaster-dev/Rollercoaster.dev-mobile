/**
 * Theme composition - combines colorModes with variants
 * Generates all 14 theme combinations (2 colorModes × 7 variants)
 */

import { colorModes, type ColorMode, type Colors } from "./colorModes";
import { variantOverrides, variants, type Variant } from "./variants";
import {
  space,
  size,
  sizeL,
  radius,
  zIndex,
  fontWeight,
  lineHeight,
  lineHeightL,
  borderWidth,
  letterSpacing,
  fontFamily,
  transition,
  shadow,
  darkShadowOverrides,
} from "./tokens";
import {
  narrativeModes,
  lightChromeColors,
  darkChromeColors,
  type Narrative,
  type Chrome,
} from "./adapter";

/** Size scale type - either normal or large */
export type SizeScale = typeof size | typeof sizeL;

/** Line height scale type - either normal or large */
export type LineHeightScale = typeof lineHeight | typeof lineHeightL;

/** Resolved font family set for a theme variant */
export interface FontFamilyConfig {
  body: string;
  headline: string;
  mono: string;
}

/** Valid font weight values from design tokens */
type FontWeightValue = (typeof fontWeight)[keyof typeof fontWeight];

/** A single typography preset */
export interface TextStyle {
  fontSize: number;
  fontWeight: FontWeightValue;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
}

/** All typography presets */
export interface TextStyles {
  display: TextStyle;
  headline: TextStyle;
  title: TextStyle;
  body: TextStyle;
  caption: TextStyle;
  label: TextStyle;
  mono: TextStyle;
}

export interface ComposedTheme {
  colors: Colors;
  narrative: Narrative;
  chrome: Chrome;
  shadows: { opacity: number };
  space: typeof space;
  size: SizeScale;
  radius: typeof radius;
  zIndex: typeof zIndex;
  fontWeight: typeof fontWeight;
  lineHeight: LineHeightScale;
  borderWidth: typeof borderWidth;
  letterSpacing: typeof letterSpacing;
  fontFamily: FontFamilyConfig;
  transition: typeof transition;
  shadow: typeof shadow;
  textStyles: TextStyles;
  variant: Variant;
}

/**
 * Compose a theme from a colorMode and variant
 */
export function composeTheme(
  colorMode: ColorMode,
  variant: Variant,
): ComposedTheme {
  const base = colorModes[colorMode];
  const baseNarrative = narrativeModes[colorMode];
  const variantDef = variantOverrides[variant];

  // Start with base colors from colorMode
  let colors = { ...base.colors };

  // Apply variant color overrides (variants are defined as light-based diffs)
  if (variantDef.colors) {
    colors = { ...colors, ...variantDef.colors };
  }

  // Apply variant narrative overrides
  let narrative = baseNarrative;
  if (variantDef.narrative) {
    narrative = {
      climb: { ...baseNarrative.climb, ...variantDef.narrative.climb },
      drop: { ...baseNarrative.drop, ...variantDef.narrative.drop },
      stories: { ...baseNarrative.stories, ...variantDef.narrative.stories },
      relief: { ...baseNarrative.relief, ...variantDef.narrative.relief },
    };
  }

  // Compose chrome: base from colorMode, then variant overrides
  const baseChrome =
    colorMode === "light" ? lightChromeColors : darkChromeColors;
  let chrome: Chrome = { ...baseChrome };
  if (variantDef.chrome) {
    chrome = { ...chrome, ...variantDef.chrome };
  }

  // Determine shadow opacity
  const shadowOpacity = variantDef.shadows?.opacity ?? base.shadows.opacity;

  // Tier-1 shadows zero out in dark so the new bold border carries depth;
  // tier-2 modalElevation keeps its hard offset.
  const composedShadow =
    colorMode === "dark" ? { ...shadow, ...darkShadowOverrides } : shadow;

  // Determine size scale
  const sizeScale = variantDef.size ?? size;

  // Determine line height scale
  const lineHeightScale = variantDef.lineHeight ?? lineHeight;

  // Resolve font family per variant
  const resolvedFontFamily: FontFamilyConfig = variantDef.fontFamily
    ? {
        body: variantDef.fontFamily,
        headline: variantDef.fontFamily,
        mono: fontFamily.mono,
      }
    : {
        body: fontFamily.body,
        headline: fontFamily.headline,
        mono: fontFamily.mono,
      };

  // Build typography presets using resolved scales
  const s = sizeScale as Record<string, number>;
  const lh = lineHeightScale as Record<string, number>;
  const textStyles: TextStyles = {
    display: {
      fontSize: s["4xl"] ?? 40,
      fontWeight: fontWeight.black,
      lineHeight: Math.round((s["4xl"] ?? 40) * 1.05),
      letterSpacing: letterSpacing.tight,
      fontFamily: resolvedFontFamily.headline,
    },
    headline: {
      fontSize: s["2xl"] ?? 24,
      fontWeight: fontWeight.bold,
      lineHeight: Math.round((s["2xl"] ?? 24) * 1.3),
      letterSpacing: letterSpacing.tight,
      fontFamily: resolvedFontFamily.headline,
    },
    title: {
      fontSize: s.lg ?? 18,
      fontWeight: fontWeight.semibold,
      lineHeight: Math.round((s.lg ?? 18) * 1.3),
      letterSpacing: letterSpacing.normal,
      fontFamily: resolvedFontFamily.body,
    },
    body: {
      fontSize: s.md ?? 16,
      fontWeight: fontWeight.normal,
      lineHeight: Math.round((s.md ?? 16) * 1.6),
      letterSpacing: letterSpacing.normal,
      fontFamily: resolvedFontFamily.body,
    },
    caption: {
      fontSize: s.xs ?? 12,
      fontWeight: fontWeight.normal,
      lineHeight: Math.round((s.xs ?? 12) * 1.6),
      letterSpacing: letterSpacing.label,
      fontFamily: resolvedFontFamily.body,
    },
    label: {
      fontSize: s.sm ?? 14,
      fontWeight: fontWeight.medium,
      lineHeight: Math.round((s.sm ?? 14) * 1.3),
      letterSpacing: letterSpacing.wide,
      fontFamily: resolvedFontFamily.body,
    },
    mono: {
      fontSize: s.sm ?? 14,
      fontWeight: fontWeight.normal,
      lineHeight: Math.round((s.sm ?? 14) * 1.6),
      letterSpacing: letterSpacing.normal,
      fontFamily: resolvedFontFamily.mono,
    },
  };

  return {
    colors,
    narrative,
    chrome,
    shadows: { opacity: shadowOpacity },
    space,
    size: sizeScale,
    radius,
    zIndex,
    fontWeight,
    lineHeight: lineHeightScale,
    borderWidth,
    letterSpacing,
    fontFamily: resolvedFontFamily,
    transition,
    shadow: composedShadow,
    textStyles,
    variant,
  };
}

/**
 * Generate theme name from colorMode and variant
 */
export function getThemeName(
  colorMode: ColorMode,
  variant: Variant,
): ThemeName {
  return `${colorMode}-${variant}` as ThemeName;
}

/**
 * Parse theme name into colorMode and variant
 */
export function parseThemeName(themeName: ThemeName): {
  colorMode: ColorMode;
  variant: Variant;
} {
  const idx = themeName.indexOf("-");
  const colorMode = themeName.slice(0, idx) as ColorMode;
  const variant = themeName.slice(idx + 1) as Variant;
  return { colorMode, variant };
}

/** All possible theme names - derived from colorMode × variant */
export type ThemeName = `${ColorMode}-${Variant}`;

const colorModeList: ColorMode[] = ["light", "dark"];

export const themeNames: ThemeName[] = colorModeList.flatMap((cm) =>
  variants.map((v) => `${cm}-${v}` as ThemeName),
);

/** All 14 composed themes - derived from colorMode × variant */
export const themes = Object.fromEntries(
  colorModeList.flatMap((cm) =>
    variants.map((v) => [`${cm}-${v}`, composeTheme(cm, v)]),
  ),
) as Record<ThemeName, ComposedTheme>;

export type Themes = typeof themes;
