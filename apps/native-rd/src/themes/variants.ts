/**
 * Theme variant overrides
 * Each variant defines what it changes from the base colorMode
 */

import { size, sizeL, lineHeight, lineHeightL } from "./tokens";
import {
  variantColors,
  narrativeVariants,
  type VariantOverride as TokenVariantOverride,
  type NarrativeOverride,
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
  shadows?: { opacity: number };
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
    shadows: { opacity: 0 },
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
    shadows: { opacity: 0 },
    size: sizeL,
    fontFamily: "AtkinsonHyperlegible",
  },

  /**
   * Autism-Friendly - muted/desaturated colors to reduce sensory overload
   */
  autismFriendly: {
    colors: variantColors.autismFriendly,
    narrative: narrativeVariants.autismFriendly,
    shadows: { opacity: 0 },
  },

  /**
   * Low Info - reduced visual noise
   * Values are sourced from design-tokens
   */
  lowInfo: {
    colors: variantColors.lowInfo,
    narrative: narrativeVariants.lowInfo,
  },
};

export const variantOptions: Array<{
  id: Variant;
  label: string;
  description: string;
}> = [
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
