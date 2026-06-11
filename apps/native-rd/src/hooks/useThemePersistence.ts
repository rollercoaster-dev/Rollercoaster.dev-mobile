import { useCallback, useEffect, useRef } from "react";
import { UnistylesRuntime } from "react-native-unistyles";
import { updateUserSettings } from "../db";
import { useUserSettingsRow } from "./useUserSettingsRow";
import { FALLBACK_THEME_NAME, isValidThemeName } from "./useTheme";
import { useAppStateGuard } from "./useAppStateGuard";
import type { ThemeName } from "../themes/compose";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useThemePersistence");

/**
 * Persists the selected theme to Evolu `userSettings.theme` and restores it
 * on app start.
 *
 * Must be called inside `EvoluAppProvider` (mirrors `useDensity`). The outer
 * `useTheme()` at App.tsx root continues to drive Unistyles state; this hook
 * augments it with a persisting `setTheme` and pushes the saved value into
 * `UnistylesRuntime` once Evolu hydrates.
 *
 * Validation: any saved value not in `VALID_THEME_NAMES` (e.g. a legacy
 * `dark-dyslexia` from earlier builds) is treated as missing and resolved
 * to `FALLBACK_THEME_NAME`. We do NOT auto-write the fallback back to Evolu
 * — that would clobber a value the user might recover by upgrading to a
 * build that re-supports it.
 */
export function useThemePersistence() {
  const { settings } = useUserSettingsRow();
  const lastAppliedRef = useRef<ThemeName | null>(null);
  const inFlightThemeRef = useRef<ThemeName | null>(null);
  const { runWhenActive } = useAppStateGuard();

  const savedRaw = settings?.theme ?? null;

  useEffect(() => {
    if (savedRaw === null) return;

    if (!isValidThemeName(savedRaw)) {
      logger.warn("Ignoring invalid persisted theme name", {
        savedRaw,
        fallback: FALLBACK_THEME_NAME,
      });
      if (lastAppliedRef.current !== FALLBACK_THEME_NAME) {
        // Set the ref before queueing so re-runs of this effect with the
        // same invalid value (e.g. a duplicate Evolu emission) are deduped
        // even while the deferred call is still pending.
        lastAppliedRef.current = FALLBACK_THEME_NAME;
        runWhenActive(() => UnistylesRuntime.setTheme(FALLBACK_THEME_NAME));
      }
      return;
    }

    if (lastAppliedRef.current === savedRaw) return;
    lastAppliedRef.current = savedRaw;
    runWhenActive(() => UnistylesRuntime.setTheme(savedRaw));
  }, [savedRaw, runWhenActive]);

  const setTheme = useCallback(
    (name: ThemeName) => {
      if (!isValidThemeName(name)) {
        logger.warn("Refusing to set unsupported theme", { name });
        return;
      }
      // Drop the call when another setTheme is mid-flight. Rapid foreground
      // taps used to dispatch back-to-back onPlatformDependenciesChange
      // callbacks that raced inside the shadow-tree commit and triggered a
      // double-free SIGABRT. The dropped tap's intent is lost; the user must
      // re-tap once the in-flight call settles (foreground: next tick;
      // backgrounded: after the AppState resume flushes the queued call).
      //
      // Do NOT touch lastAppliedRef here: it tracks what was actually
      // committed to Unistyles, and leaving it pointing at the in-flight
      // value lets the read-effect dedup a subsequent Evolu re-emit of that
      // same value (sync echo) instead of queueing a second deferred
      // setTheme that would fire alongside the original on resume.
      if (inFlightThemeRef.current !== null) {
        return;
      }
      inFlightThemeRef.current = name;
      lastAppliedRef.current = name;
      // try/finally is load-bearing: if UnistylesRuntime.setTheme throws the
      // ref must still clear, or every subsequent setTheme call is silently
      // dropped for the lifetime of this hook instance.
      runWhenActive(() => {
        try {
          UnistylesRuntime.setTheme(name);
        } finally {
          inFlightThemeRef.current = null;
        }
      });
      if (!settings) return;
      try {
        updateUserSettings(settings.id, { theme: name });
      } catch (error) {
        logger.error("Failed to persist theme", { name, error });
      }
    },
    [settings, runWhenActive],
  );

  return { setTheme };
}
