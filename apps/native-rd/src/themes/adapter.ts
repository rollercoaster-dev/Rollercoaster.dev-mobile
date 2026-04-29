/**
 * Adapter layer: bridges @rollercoaster-dev/design-tokens into native-rd's theme shapes.
 * This is the ONLY file that imports from the package.
 */
import {
  palette as pkgPalette,
  space as pkgSpace,
  size as pkgSize,
  sizeL as pkgSizeL,
  radius as pkgRadius,
  zIndex as pkgZIndex,
  fontWeight as pkgFontWeight,
  lineHeight as pkgLineHeight,
  lineHeightL as pkgLineHeightL,
  borderWidth as pkgBorderWidth,
  letterSpacing as pkgLetterSpacing,
  fontFamily as pkgFontFamily,
  transition as pkgTransition,
  shadow as pkgShadow,
  lightColors as pkgLightColors,
  darkColors as pkgDarkColors,
  variants as pkgVariants,
  narrativeModes as pkgNarrativeModes,
  narrativeVariants as pkgNarrativeVariants,
  lightChromeColors as pkgLightChromeColors,
  darkChromeColors as pkgDarkChromeColors,
  chromeVariants as pkgChromeVariants,
  type ChromeColors as PkgChromeColors,
  type ChromeOverride as PkgChromeOverride,
  type Narrative as PkgNarrative,
  type NarrativeOverride as PkgNarrativeOverride,
  type VariantOverride as PkgVariantOverride,
} from "@rollercoaster-dev/design-tokens/unistyles";

// ---------------------------------------------------------------------------
// Palette — package colors + app-specific additions + name aliases
// ---------------------------------------------------------------------------

export const palette = {
  ...pkgPalette,

  // App-specific colors not in the package
  cream100: "#f8f5e4",
  cream200: "#f0edd6",
  purpleDesaturated: "#b4a7d6",
  mintDesaturated: "#c8e6d4",
  yellow200: "#f0e68c",
  green600: "#16a34a",

  // Name aliases for backward compat with native-rd palette references
  purple300: pkgPalette.secondaryLight, // '#c4b5fd'
  purple400: pkgPalette.accentPurple, // '#a78bfa'
  mint200: pkgPalette.accentMint, // '#d4f4e7'
  mint600: pkgPalette.success, // '#059669'
  yellow300: pkgPalette.accentYellow, // '#ffe50c'
  blue600: pkgPalette.info, // '#2563eb'
  red600: pkgPalette.error, // '#dc2626'
} as const;

// ---------------------------------------------------------------------------
// Space — pass through (extra keys are harmless)
// ---------------------------------------------------------------------------

export const space = pkgSpace;

// ---------------------------------------------------------------------------
// Size / SizeL — pass through
// ---------------------------------------------------------------------------

export const size = pkgSize;
export const sizeL = pkgSizeL;

// ---------------------------------------------------------------------------
// Radius — package + backward-compat alias
// ---------------------------------------------------------------------------

export const radius = {
  ...pkgRadius,
  full: pkgRadius.pill,
} as const;

// ---------------------------------------------------------------------------
// zIndex — package semantic names + legacy numeric keys
// ---------------------------------------------------------------------------

export const zIndex = {
  ...pkgZIndex,
  0: 0,
  1: 100,
  2: 200,
  3: 300,
  4: 400,
  5: 500,
} as const;

// ---------------------------------------------------------------------------
// Font weight — pass through (strings after fix 1.2)
// ---------------------------------------------------------------------------

export const fontWeight = pkgFontWeight;

// ---------------------------------------------------------------------------
// Line heights — compute absolute px values (RN needs absolute, not multipliers)
// ---------------------------------------------------------------------------

// Keys that match between native-rd size scale and what we want in lineHeight
const sizeKeys = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;

function computeLineHeights(
  sizeScale: Record<string, number>,
  multiplier: number,
) {
  const result: Record<string, number> = {};
  for (const k of sizeKeys) {
    if (k in sizeScale) {
      result[k] = Math.round(sizeScale[k] * multiplier);
    }
  }
  return result;
}

export const lineHeight = computeLineHeights(
  pkgSize as unknown as Record<string, number>,
  pkgLineHeight.normal,
) as Record<(typeof sizeKeys)[number], number>;

export const lineHeightL = computeLineHeights(
  pkgSizeL as unknown as Record<string, number>,
  pkgLineHeightL?.relaxed ?? pkgLineHeight.relaxed,
) as Record<(typeof sizeKeys)[number], number>;

// ---------------------------------------------------------------------------
// Color modes — wrap package colors into ColorModeConfig shape
// Add semantic colors to both modes
// ---------------------------------------------------------------------------

export const lightColors = {
  ...pkgLightColors,
  accentPrimary: pkgPalette.primaryDark,
  accentSecondary: pkgLightColors.accentMint,
  error: pkgPalette.error,
  warning: pkgPalette.warning,
  success: pkgPalette.success,
  info: pkgPalette.info,
};

export const darkColors = {
  ...pkgDarkColors,
  accentSecondary: pkgDarkColors.accentMint,
  shadow: "#000000",
  textMuted: "#a89cc4",
  accentPurple: "#8d7eb0",
  error: pkgPalette.error,
  warning: pkgPalette.warning,
  success: pkgPalette.success,
  info: pkgPalette.info,
};

export const colorModeConfigs = {
  light: {
    colors: lightColors,
    shadows: { opacity: 1.0 },
  },
  dark: {
    colors: darkColors,
    shadows: { opacity: 1.0 },
  },
} as const;

// ---------------------------------------------------------------------------
// Variant color overrides — sourced from design-tokens
// ---------------------------------------------------------------------------

export const variantColors = pkgVariants;
export type VariantOverride = PkgVariantOverride;

export const narrativeModes = pkgNarrativeModes;
export const narrativeVariants = pkgNarrativeVariants;
export type Narrative = PkgNarrative;
export type NarrativeOverride = PkgNarrativeOverride;

// ---------------------------------------------------------------------------
// Chrome (app shell: top bar, header, modal, tab bar) — per color mode + variant
// ---------------------------------------------------------------------------

export const lightChromeColors = pkgLightChromeColors;
export const darkChromeColors = pkgDarkChromeColors;
export const chromeVariants = pkgChromeVariants;
export type Chrome = PkgChromeColors;
export type ChromeOverride = PkgChromeOverride;

// ---------------------------------------------------------------------------
// New token categories — pass through
// ---------------------------------------------------------------------------

export const borderWidth = pkgBorderWidth;
export const letterSpacing = pkgLetterSpacing;
export const fontFamily = pkgFontFamily;
export const transition = pkgTransition;
export const shadow = pkgShadow;
