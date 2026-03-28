import { createContext, useContext, useCallback, useState } from 'react';
import { useUnistyles, UnistylesRuntime } from 'react-native-unistyles';
import { themes, parseThemeName, type ThemeName, type ComposedTheme } from '../themes/compose';
import type { Variant } from '../themes/variants';

/**
 * The 7 peer themes from @rollercoaster-dev/design-tokens.
 * Dark mode ("Night Ride") is one of the 7 — not a separate axis.
 */
export const themeOptions: Array<{
  id: ThemeName;
  label: string;
  description: string;
}> = [
  { id: 'light-default', label: 'The Full Ride', description: 'Standard theme' },
  { id: 'dark-default', label: 'Night Ride', description: 'Dark mode' },
  {
    id: 'light-highContrast',
    label: 'Bold Ink',
    description: 'High contrast (WCAG AAA)',
  },
  {
    id: 'light-dyslexia',
    label: 'Warm Studio',
    description: 'Dyslexia-friendly',
  },
  {
    id: 'light-autismFriendly',
    label: 'Still Water',
    description: 'Autism-friendly',
  },
  {
    id: 'light-lowVision',
    label: 'Loud & Clear',
    description: 'Low vision support',
  },
  {
    id: 'light-lowInfo',
    label: 'Clean Signal',
    description: 'Reduced visual noise',
  },
];

interface ThemeContextValue {
  themeName: ThemeName;
  theme: ComposedTheme;
  isDark: boolean;
  variant: Variant;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ThemeContext.Provider;

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return ctx;
}

/**
 * Single-dimension theme hook.
 *
 * Uses useUnistyles() as the re-render trigger (proven reactive in Unistyles v3),
 * then reads UnistylesRuntime.themeName and looks up the static themes map
 * for plain-string color values (not C++ proxies).
 *
 * A useState counter is kept as a belt-and-suspenders fallback to guarantee
 * a React re-render even if useUnistyles() doesn't fire synchronously.
 *
 * Call once at App root, then share via ThemeProvider.
 */
export function useTheme() {
  // Primary re-render trigger: Unistyles v3 reactive hook
  useUnistyles();

  // Fallback re-render trigger
  const [, bump] = useState(0);

  // Read current theme from Unistyles runtime (always fresh after re-render)
  const themeName = (UnistylesRuntime.themeName as ThemeName) || 'light-default';
  const theme = themes[themeName];
  const isDark = themeName.startsWith('dark');
  const { variant } = parseThemeName(themeName);

  const setTheme = useCallback((name: ThemeName) => {
    UnistylesRuntime.setTheme(name);
    // Force React re-render in case useUnistyles() doesn't fire synchronously
    bump((n) => n + 1);
  }, []);

  return { themeName, theme, isDark, variant, setTheme };
}
