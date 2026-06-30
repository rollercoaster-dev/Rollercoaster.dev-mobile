import { themes, type ThemeName } from "../../themes/compose";

/**
 * Per-theme colors for a 3-stripe theme swatch (background + two accent
 * stripes) plus the chip's name-bar treatment. Single-sourced here so
 * ThemeChipGrid and ThemeSwatchRail extract identical colors and never drift.
 */
export interface ChipSwatch {
  stripeBg: string;
  stripe1: string;
  stripe2: string;
  nameBarBg: string;
  nameBarBorder: string;
  nameBarText: string;
}

export function getSwatch(themeName: ThemeName): ChipSwatch {
  const c = themes[themeName].colors;
  return {
    stripeBg: c.background,
    stripe1: c.accentPurple,
    stripe2: c.text,
    nameBarBg: c.backgroundSecondary,
    nameBarBorder: c.border,
    nameBarText: c.text,
  };
}

/** `[stripe1%, stripe2%]` widths per theme; the background fills the remainder. */
export const stripeWidths: Record<ThemeName, [number, number]> = {
  "light-default": [30, 25],
  "dark-default": [30, 25],
  "light-highContrast": [50, 25],
  "light-dyslexia": [30, 25],
  "light-autismFriendly": [35, 30],
  "light-lowVision": [60, 20],
  "light-lowInfo": [40, 25],
};
