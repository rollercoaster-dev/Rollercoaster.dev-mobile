import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useQuery } from "@evolu/react";
import { useUnistyles } from "react-native-unistyles";
import { userSettingsQuery, updateUserSettings } from "../db";
import { parseThemeName, type ThemeName } from "../themes/compose";
import { reportError } from "../services/sentry-report";
import { runEvoluMutation } from "../utils/evoluMutation";

export type AnimationPref = "full" | "reduced" | "none";

/** Display order for the Settings picker: most motion to least. */
export const animationPrefOptions: readonly AnimationPref[] = [
  "full",
  "reduced",
  "none",
];

/**
 * What is holding motion off regardless of the saved choice, if anything.
 * `theme` = Still Water (autism-friendly); `os` = the device's Reduce Motion.
 */
export type AnimationOverride = "theme" | "os" | null;

const VALID_PREFS = new Set<string>(animationPrefOptions);

/**
 * Resolves the effective animation preference from three sources:
 * 1. Autism-Friendly theme forces 'none' (highest priority)
 * 2. OS reduceMotion forces 'none' (maps to strictest level per WCAG 2.3.3)
 * 3. User's saved preference (default: 'full')
 */
export function useAnimationPref() {
  const rows = useQuery(userSettingsQuery);
  const settings = rows[0] ?? null;

  const [osReduceMotion, setOsReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setOsReduceMotion(enabled);
      })
      .catch(() => {
        // Default to false (animations enabled) if native bridge unavailable
      });

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (mounted) setOsReduceMotion(enabled);
      },
    );

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Detect autism-friendly theme. Reading `rt.themeName` (not
  // `UnistylesRuntime.themeName`) subscribes this hook to theme changes, so
  // switching into Still Water stops motion in views that are already mounted.
  const { rt } = useUnistyles();
  const themeName = (rt.themeName as ThemeName) || "light-default";
  const { variant } = parseThemeName(themeName);
  const isAutismFriendly = variant === "autismFriendly";

  // Validate database value against known prefs
  const rawPref = settings?.animationPref;
  const userPref: AnimationPref =
    typeof rawPref === "string" && VALID_PREFS.has(rawPref)
      ? (rawPref as AnimationPref)
      : "full";

  // Priority: autism-friendly theme > OS reduceMotion > user pref
  const override: AnimationOverride = isAutismFriendly
    ? "theme"
    : osReduceMotion
      ? "os"
      : null;
  const animationPref: AnimationPref = override ? "none" : userPref;

  // Returns false only when the Evolu write was attempted and failed, so the
  // Settings row can toast instead of looking saved (mirrors setDensity).
  const setAnimationPref = useCallback(
    (pref: AnimationPref): boolean => {
      if (!settings) return true;
      return runEvoluMutation(
        () => updateUserSettings(settings.id, { animationPref: pref }),
        (error) => {
          reportError(error, { area: "settings.motion" });
        },
      );
    },
    [settings],
  );

  return {
    animationPref,
    /** The saved choice, before any OS or theme override. */
    userPref,
    override,
    shouldAnimate: animationPref !== "none",
    shouldReduceMotion: animationPref !== "full",
    setAnimationPref,
  };
}
