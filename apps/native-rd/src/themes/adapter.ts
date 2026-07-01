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
  darkShadow as pkgDarkShadow,
  shadowVariants as pkgShadowVariants,
  lightColors as pkgLightColors,
  darkColors as pkgDarkColors,
  variants as pkgVariants,
  narrativeModes as pkgNarrativeModes,
  narrativeVariants as pkgNarrativeVariants,
  lightChromeColors as pkgLightChromeColors,
  darkChromeColors as pkgDarkChromeColors,
  chromeVariants as pkgChromeVariants,
  lightActionColors as pkgLightActionColors,
  darkActionColors as pkgDarkActionColors,
  actionVariants as pkgActionVariants,
  lightSurfaceBorderColors as pkgLightSurfaceBorderColors,
  darkSurfaceBorderColors as pkgDarkSurfaceBorderColors,
  surfaceBorderVariants as pkgSurfaceBorderVariants,
  lightJourneyColors as pkgLightJourneyColors,
  darkJourneyColors as pkgDarkJourneyColors,
  journeyVariants as pkgJourneyVariants,
  lightEvidenceColors as pkgLightEvidenceColors,
  darkEvidenceColors as pkgDarkEvidenceColors,
  evidenceVariants as pkgEvidenceVariants,
  type ChromeColors as PkgChromeColors,
  type ChromeOverride as PkgChromeOverride,
  type ActionColors as PkgActionColors,
  type ActionOverride as PkgActionOverride,
  type SurfaceBorderColors as PkgSurfaceBorderColors,
  type SurfaceBorderOverride as PkgSurfaceBorderOverride,
  type JourneyColors as PkgJourneyColors,
  type JourneyOverride as PkgJourneyOverride,
  type EvidenceColors as PkgEvidenceColors,
  type EvidenceOverride as PkgEvidenceOverride,
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

// Feedback colors (success/warning/info + their on-colors) now flow per-theme
// from the package's unistyles output — see build-unistyles.js. `error` has no
// contrast pair and stays a flat palette value.
export const lightColors = {
  ...pkgLightColors,
  accentPrimary: pkgPalette.primaryDark,
  accentSecondary: pkgLightColors.accentMint,
  transparent: "transparent",
  error: pkgPalette.error,
};

export const darkColors = {
  ...pkgDarkColors,
  accentSecondary: pkgDarkColors.accentMint,
  transparent: "transparent",
  shadow: "#000000",
  textMuted: "#a89cc4",
  accentPurple: "#8d7eb0",
  error: pkgPalette.error,
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
// Action (buttons + interactive states) — per color mode + variant
// ---------------------------------------------------------------------------

export const lightActionColors = pkgLightActionColors;
export const darkActionColors = pkgDarkActionColors;
export const actionVariants = pkgActionVariants;
export type Action = PkgActionColors;
export type ActionOverride = PkgActionOverride;

// ---------------------------------------------------------------------------
// SurfaceBorder (cards, sheets, inputs, border hierarchy) — per color mode + variant
// ---------------------------------------------------------------------------

export const lightSurfaceBorderColors = pkgLightSurfaceBorderColors;
export const darkSurfaceBorderColors = pkgDarkSurfaceBorderColors;
export const surfaceBorderVariants = pkgSurfaceBorderVariants;
export type SurfaceBorder = PkgSurfaceBorderColors;
export type SurfaceBorderOverride = PkgSurfaceBorderOverride;

// ---------------------------------------------------------------------------
// Journey (timeline nodes + step states, progress, goal/completion) — per color
// mode + variant. The canonical state-color source for TimelineNode (#406).
// ---------------------------------------------------------------------------

export const lightJourneyColors = pkgLightJourneyColors;
export const darkJourneyColors = pkgDarkJourneyColors;
export const journeyVariants = pkgJourneyVariants;
export type Journey = PkgJourneyColors;
export type JourneyOverride = PkgJourneyOverride;

// ---------------------------------------------------------------------------
// Evidence (per-evidence-type proof-card tints) — #411. Consumed by ProofCard;
// per-variant overrides are added to the theme JSON layer as needed.
// ---------------------------------------------------------------------------

export const lightEvidenceColors = pkgLightEvidenceColors;
export const darkEvidenceColors = pkgDarkEvidenceColors;
export const evidenceVariants = pkgEvidenceVariants;
export type Evidence = PkgEvidenceColors;
export type EvidenceOverride = PkgEvidenceOverride;

// ---------------------------------------------------------------------------
// New token categories — pass through
// ---------------------------------------------------------------------------

export const borderWidth = pkgBorderWidth;
export const letterSpacing = pkgLetterSpacing;
export const fontFamily = pkgFontFamily;
export const transition = pkgTransition;
export const shadow = pkgShadow;
export const darkShadow = pkgDarkShadow;
export const shadowVariants = pkgShadowVariants;
