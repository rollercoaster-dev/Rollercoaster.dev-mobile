/**
 * Theme composition. composeTheme can build any pair for previews/tests, but
 * the runtime registry includes only the seven exposed product themes.
 */

import { colorModes, type ColorMode, type Colors } from "./colorModes";
import { variantOverrides, type Variant } from "./variants";
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
  darkShadow,
} from "./tokens";
import {
  narrativeModes,
  lightChromeColors,
  darkChromeColors,
  lightActionColors,
  darkActionColors,
  lightSurfaceBorderColors,
  darkSurfaceBorderColors,
  lightJourneyColors,
  darkJourneyColors,
  type Narrative,
  type Chrome,
  type Action,
  type SurfaceBorder,
  type Journey,
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
  action: Action;
  surfaceBorder: SurfaceBorder;
  journey: Journey;
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

  const baseChrome =
    colorMode === "light" ? lightChromeColors : darkChromeColors;
  let chrome: Chrome = { ...baseChrome };
  if (variantDef.chrome) {
    chrome = { ...chrome, ...variantDef.chrome };
  }

  const baseAction =
    colorMode === "light" ? lightActionColors : darkActionColors;
  let action: Action = { ...baseAction };
  if (variantDef.action) {
    action = { ...action, ...variantDef.action };
  }

  const baseSurfaceBorder =
    colorMode === "light" ? lightSurfaceBorderColors : darkSurfaceBorderColors;
  let surfaceBorder: SurfaceBorder = { ...baseSurfaceBorder };
  if (variantDef.surfaceBorder) {
    surfaceBorder = { ...surfaceBorder, ...variantDef.surfaceBorder };
  }

  const baseJourney =
    colorMode === "light" ? lightJourneyColors : darkJourneyColors;
  let journey: Journey = { ...baseJourney };
  if (variantDef.journey) {
    journey = { ...journey, ...variantDef.journey };
  }

  // Determine shadow opacity
  const shadowOpacity = variantDef.shadows?.opacity ?? base.shadows.opacity;

  // Shadow base is colorMode-specific; variant shadow maps are light-authored
  // deltas. Variants are a light-only product axis — dark ships solely as
  // dark-default (see productThemeEntries), which carries no variant.shadow, so
  // this overlay only ever fires in light mode for the seven real themes. A
  // dark-<variant> pair is composable for previews/tests but is NOT a product
  // theme, and the overlay there is intentionally cosmetic, not coherent — do
  // not "fix" it by gating on colorMode (that would split shadow from the
  // colors/chrome/etc. overlays above, which are light-authored the same way).
  let composedShadow = colorMode === "dark" ? darkShadow : shadow;
  if (variantDef.shadow) {
    composedShadow = variantDef.shadow;
  }

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
    action,
    surfaceBorder,
    journey,
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

export function getThemeName(
  colorMode: ColorMode,
  variant: Variant,
): AllThemeName {
  return `${colorMode}-${variant}` as AllThemeName;
}

export function parseThemeName(themeName: AllThemeName): {
  colorMode: ColorMode;
  variant: Variant;
} {
  const idx = themeName.indexOf("-");
  const colorMode = themeName.slice(0, idx) as ColorMode;
  const variant = themeName.slice(idx + 1) as Variant;
  return { colorMode, variant };
}

/** All possible generated theme names, including unsupported combinations. */
export type AllThemeName = `${ColorMode}-${Variant}`;

const productThemeEntries = [
  ["light-default", "light", "default"],
  ["dark-default", "dark", "default"],
  ["light-highContrast", "light", "highContrast"],
  ["light-dyslexia", "light", "dyslexia"],
  ["light-autismFriendly", "light", "autismFriendly"],
  ["light-lowVision", "light", "lowVision"],
  ["light-lowInfo", "light", "lowInfo"],
] as const satisfies readonly (readonly [AllThemeName, ColorMode, Variant])[];

/** Runtime-supported theme names exposed by product UI and persistence. */
export type ThemeName = (typeof productThemeEntries)[number][0];

export const themeNames: ThemeName[] = productThemeEntries.map(
  ([name]) => name,
);

/** The seven composed themes registered with Unistyles at runtime. */
export const themes = Object.fromEntries(
  productThemeEntries.map(([name, colorMode, variant]) => [
    name,
    composeTheme(colorMode, variant),
  ]),
) as Record<ThemeName, ComposedTheme>;

export type Themes = typeof themes;
