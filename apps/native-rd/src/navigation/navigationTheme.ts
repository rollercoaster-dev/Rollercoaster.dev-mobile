import { DefaultTheme, type Theme } from "@react-navigation/native";
import type { ComposedTheme } from "../themes/compose";

/**
 * React Navigation's theme, derived from the active app theme. Shared by
 * App.tsx and Storybook's PhoneShell so composed-screen previews paint the
 * navigator the way the app does.
 */
export function navigationTheme(theme: ComposedTheme, isDark: boolean): Theme {
  return {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.backgroundSecondary,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.accentPrimary,
      notification: theme.colors.accentPrimary,
    },
  };
}
