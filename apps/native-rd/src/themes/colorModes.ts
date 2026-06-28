/**
 * Color mode definitions for light and dark themes
 * Interfaces are app-owned; values come from design-tokens adapter
 */

import {
  lightColors as _lightColors,
  darkColors as _darkColors,
  colorModeConfigs,
} from "./adapter";

export type ColorMode = "light" | "dark";

/**
 * Colors interface - uses string type for flexibility in variant overrides
 */
export interface Colors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentPurple: string;
  accentPurpleFg: string;
  accentPurpleLight: string;
  accentMint: string;
  /** On-`accentMint` ink. Dark in light themes, off-white in dark mode where
   * mint becomes a dark surface. Pairs with the bottom-nav Slide knob (Badges). */
  accentMintFg: string;
  accentYellow: string;
  /** On-`accentYellow` ink. Locked dark in every theme (yellow does not flip).
   * Pairs with the bottom-nav Slide knob (Goals). */
  accentYellowFg: string;
  /** Attention surface (yellow band today). Themed per variant; emitted by
   * design-tokens unistyles output and present at runtime via the adapter. */
  highlight: string;
  /** On-`highlight` text. Themed per variant. */
  highlightForeground: string;
  border: string;
  shadow: string;
  focusRing: string;
  /** CSS `transparent` keyword. Use for reserved focus-ring borders and
   * other placeholder colors where the design token rule applies but a
   * literal `"transparent"` would otherwise leak in. */
  transparent: string;
  error: string;
  warning: string;
  /** On-`warning` text. Themed per variant; emitted by the design-tokens
   * unistyles output and present at runtime via the adapter. */
  warningForeground: string;
  success: string;
  /** On-`success` text. Themed per variant. */
  successForeground: string;
  info: string;
  /** On-`info` text. Themed per variant. */
  infoForeground: string;
}

export const lightColors: Colors = _lightColors;
export const darkColors: Colors = _darkColors;

export interface ColorModeConfig {
  colors: Colors;
  shadows: { opacity: number };
}

export const colorModes: Record<ColorMode, ColorModeConfig> = colorModeConfigs;
