import { createContext, useContext, useCallback } from "react";
import { useUnistyles, UnistylesRuntime } from "react-native-unistyles";
import {
  themes,
  parseThemeName,
  type ThemeName,
  type ComposedTheme,
} from "../themes/compose";
import type { Variant } from "../themes/variants";

/**
 * The 7 peer themes from @rollercoaster-dev/design-tokens.
 * Dark mode ("Night Ride") is one of the 7 — not a separate axis.
 *
 * These are the seven product themes registered with Unistyles and accepted
 * by persistence. composeTheme can still build unsupported combinations for
 * previews/tests, but they are not runtime theme names.
 */
export const themeOptions: {
  id: ThemeName;
  label: string;
  description: string;
}[] = [
  {
    id: "light-default",
    label: "The Full Ride",
    description: "Standard theme",
  },
  { id: "dark-default", label: "Night Ride", description: "Dark mode" },
  {
    id: "light-highContrast",
    label: "Bold Ink",
    description: "High contrast (WCAG AAA)",
  },
  {
    id: "light-dyslexia",
    label: "Warm Studio",
    description: "Dyslexia-friendly",
  },
  {
    id: "light-autismFriendly",
    label: "Still Water",
    description: "Autism-friendly",
  },
  {
    id: "light-lowVision",
    label: "Loud & Clear",
    description: "Low vision support",
  },
  {
    id: "light-lowInfo",
    label: "Clean Signal",
    description: "Reduced visual noise",
  },
];

/** Supported theme names — the persistence layer's source of truth. */
export const VALID_THEME_NAMES: ReadonlySet<ThemeName> = new Set(
  themeOptions.map((o) => o.id),
);

/** Default fallback used when a persisted theme value is missing or invalid. */
export const FALLBACK_THEME_NAME: ThemeName = "light-default";

/** Type guard for persisted/runtime theme name validation. */
export function isValidThemeName(name: unknown): name is ThemeName {
  return typeof name === "string" && VALID_THEME_NAMES.has(name as ThemeName);
}

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
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * Reads from the static `themes` map (plain strings) rather than the live
 * theme proxy returned by useUnistyles() — those values are C++ proxies that
 * can't be passed across the JS boundary safely.
 *
 * Call once at App root, then share via ThemeProvider.
 */
export function useTheme() {
  useUnistyles();

  const themeName =
    (UnistylesRuntime.themeName as ThemeName) || "light-default";
  const theme = themes[themeName];
  const isDark = themeName.startsWith("dark");
  const { variant } = parseThemeName(themeName);

  const setTheme = useCallback((name: ThemeName) => {
    UnistylesRuntime.setTheme(name);
  }, []);

  return { themeName, theme, isDark, variant, setTheme };
}
