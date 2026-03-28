// Re-export tokens and palette
export * from './tokens';
export * from './palette';

// Re-export colorModes
export { colorModes, lightColors, darkColors } from './colorModes';
export type { ColorMode, Colors, ColorModeConfig } from './colorModes';

// Re-export variants
export { variantOverrides, variants, variantOptions } from './variants';
export type { Variant } from './variants';

// Re-export compose functions and themes
export {
  themes,
  themeNames,
  composeTheme,
  getThemeName,
  parseThemeName,
} from './compose';
export type {
  ThemeName, ComposedTheme, Themes,
  FontFamilyConfig, TextStyle, TextStyles,
} from './compose';

// Convenience: export AppTheme as an alias for ComposedTheme
import type { ComposedTheme, ThemeName } from './compose';
export type AppTheme = ComposedTheme;

// Module augmentation for react-native-unistyles
declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends Record<ThemeName, ComposedTheme> {}
}
