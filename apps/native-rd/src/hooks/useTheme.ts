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
 *
 * Display strings live in `common.theme.options.<id>` — consumers look them
 * up via `t("theme.options.<id>.label")` and `.description`.
 */
export const themeOptions: readonly { id: ThemeName }[] = [
  { id: "light-default" },
  { id: "dark-default" },
  { id: "light-highContrast" },
  { id: "light-dyslexia" },
  { id: "light-autismFriendly" },
  { id: "light-lowVision" },
  { id: "light-lowInfo" },
];

/** Supported theme names — the persistence layer's source of truth. */
export const VALID_THEME_NAMES: ReadonlySet<ThemeName> = new Set(
  themeOptions.map((o) => o.id),
);

/** Default fallback used when a persisted theme value is missing or invalid. */
export const FALLBACK_THEME_NAME: ThemeName = "light-default";

/** Type guard for persisted/runtime theme name validation. */
export function isValidThemeName(name: unknown): name is ThemeName {
  if (typeof name !== "string") return false;
  return VALID_THEME_NAMES.has(name as ThemeName);
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
  const { rt } = useUnistyles();

  // Reading `rt.themeName` subscribes this hook to Unistyles theme-name
  // changes. Reading `UnistylesRuntime.themeName` directly does not trigger a
  // React re-render, which leaves selected-state UI stale after setTheme().
  const runtimeThemeName = rt.themeName;
  const themeName = isValidThemeName(runtimeThemeName)
    ? runtimeThemeName
    : FALLBACK_THEME_NAME;
  const theme = themes[themeName];
  const isDark = themeName.startsWith("dark");
  const { variant } = parseThemeName(themeName);

  const setTheme = useCallback((name: ThemeName) => {
    UnistylesRuntime.setTheme(name);
  }, []);

  return { themeName, theme, isDark, variant, setTheme };
}
