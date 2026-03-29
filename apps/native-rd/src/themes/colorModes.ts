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
  accentPurpleLight: string;
  accentMint: string;
  accentYellow: string;
  border: string;
  shadow: string;
  focusRing: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export const lightColors: Colors = _lightColors;
export const darkColors: Colors = _darkColors;

export interface ColorModeConfig {
  colors: Colors;
  shadows: { opacity: number };
}

export const colorModes: Record<ColorMode, ColorModeConfig> = colorModeConfigs;
