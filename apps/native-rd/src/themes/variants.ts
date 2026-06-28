/**
 * Theme variant overrides
 * Each variant defines what it changes from the base colorMode
 */

import {
  size,
  sizeL,
  lineHeight,
  lineHeightL,
  shadowVariants,
  type Shadow,
} from "./tokens";
import {
  variantColors,
  narrativeVariants,
  chromeVariants,
  actionVariants,
  surfaceBorderVariants,
  type VariantOverride as TokenVariantOverride,
  type NarrativeOverride,
  type ChromeOverride,
  type ActionOverride,
  type SurfaceBorderOverride,
} from "./adapter";

export type Variant =
  | "default"
  | "highContrast"
  | "largeText"
  | "dyslexia"
  | "lowVision"
  | "autismFriendly"
  | "lowInfo";

export const variants: Variant[] = [
  "default",
  "highContrast",
  "largeText",
  "dyslexia",
  "lowVision",
  "autismFriendly",
  "lowInfo",
];

interface VariantOverride {
  colors?: TokenVariantOverride;
  narrative?: NarrativeOverride;
  chrome?: ChromeOverride;
  action?: ActionOverride;
  surfaceBorder?: SurfaceBorderOverride;
  shadows?: { opacity: number };
  // A complete per-theme shadow map (already carries the semantic elevation
  // roles via withSemanticShadows). Sourced from `shadowVariants`, but typed as
  // the full Shadow shape since compose.ts consumes it as a whole-map override.
  shadow?: Shadow;
  size?: typeof size | typeof sizeL;
  lineHeight?: typeof lineHeight | typeof lineHeightL;
  fontFamily?: string;
}

/**
 * Variant override definitions
 * Each variant can override colors (per colorMode), shadows, size scale, and fontFamily
 */
export const variantOverrides: Record<Variant, VariantOverride> = {
  /**
   * Default - no overrides, uses base colorMode as-is
   */
  default: {},

  /**
   * High Contrast - maximum contrast for WCAG AAA compliance
   * Values are sourced from design-tokens
   */
  highContrast: {
    colors: variantColors.highContrast,
    narrative: narrativeVariants.highContrast,
    chrome: chromeVariants.highContrast,
    action: actionVariants.highContrast,
    surfaceBorder: surfaceBorderVariants.highContrast,
    shadows: { opacity: 0 },
    shadow: shadowVariants.highContrast,
  },

  /**
   * Large Text - 1.25x text size scale for improved readability
   */
  largeText: {
    size: sizeL,
  },

  /**
   * Dyslexia-Friendly - cream background reduces visual stress
   * Values are sourced from design-tokens; font is app-owned
   */
  dyslexia: {
    colors: variantColors.dyslexiaFriendly,
    narrative: narrativeVariants.dyslexiaFriendly,
    chrome: chromeVariants.dyslexiaFriendly,
    action: actionVariants.dyslexiaFriendly,
    surfaceBorder: surfaceBorderVariants.dyslexiaFriendly,
    shadow: shadowVariants.dyslexiaFriendly,
    lineHeight: lineHeightL,
    fontFamily: "Lexend",
  },

  /**
   * Low Vision - high contrast + large text + clear focus indicators
   * Values are sourced from design-tokens; font is app-owned
   */
  lowVision: {
    colors: variantColors.lowVision,
    narrative: narrativeVariants.lowVision,
    chrome: chromeVariants.lowVision,
    action: actionVariants.lowVision,
    surfaceBorder: surfaceBorderVariants.lowVision,
    shadows: { opacity: 0 },
    shadow: shadowVariants.lowVision,
    size: sizeL,
    fontFamily: "Atkinson Hyperlegible",
  },

  /**
   * Autism-Friendly - muted/desaturated colors to reduce sensory overload
   */
  autismFriendly: {
    colors: variantColors.autismFriendly,
    narrative: narrativeVariants.autismFriendly,
    chrome: chromeVariants.autismFriendly,
    action: actionVariants.autismFriendly,
    surfaceBorder: surfaceBorderVariants.autismFriendly,
    shadows: { opacity: 0 },
    shadow: shadowVariants.autismFriendly,
  },

  /**
   * Low Info - reduced visual noise
   * Values are sourced from design-tokens
   */
  lowInfo: {
    colors: variantColors.lowInfo,
    narrative: narrativeVariants.lowInfo,
    chrome: chromeVariants.lowInfo,
    action: actionVariants.lowInfo,
    surfaceBorder: surfaceBorderVariants.lowInfo,
    shadow: shadowVariants.lowInfo,
  },
};

export const variantOptions: {
  id: Variant;
  label: string;
  description: string;
}[] = [
  { id: "default", label: "The Full Ride", description: "Standard theme" },
  {
    id: "highContrast",
    label: "Bold Ink",
    description: "High contrast (WCAG AAA)",
  },
  {
    id: "largeText",
    label: "Same Ride, Bigger Seat",
    description: "1.25x text size",
  },
  {
    id: "dyslexia",
    label: "Warm Studio",
    description: "Dyslexia-friendly",
  },
  {
    id: "lowVision",
    label: "Loud & Clear",
    description: "Low vision support",
  },
  {
    id: "autismFriendly",
    label: "Still Water",
    description: "Autism-friendly",
  },
  {
    id: "lowInfo",
    label: "Clean Signal",
    description: "Reduced visual noise",
  },
];
