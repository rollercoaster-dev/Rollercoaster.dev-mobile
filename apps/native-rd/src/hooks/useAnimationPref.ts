import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useQuery } from "@evolu/react";
import { UnistylesRuntime } from "react-native-unistyles";
import { userSettingsQuery, updateUserSettings } from "../db";
import { parseThemeName, type ThemeName } from "../themes/compose";

export type AnimationPref = "full" | "reduced" | "none";

const VALID_PREFS = new Set<string>(["full", "reduced", "none"]);

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

  // Detect autism-friendly theme
  const themeName =
    (UnistylesRuntime.themeName as ThemeName) || "light-default";
  const { variant } = parseThemeName(themeName);
  const isAutismFriendly = variant === "autismFriendly";

  // Validate database value against known prefs
  const rawPref = settings?.animationPref;
  const userPref: AnimationPref =
    typeof rawPref === "string" && VALID_PREFS.has(rawPref)
      ? (rawPref as AnimationPref)
      : "full";

  // Priority: autism-friendly theme > OS reduceMotion > user pref
  let animationPref: AnimationPref;
  if (isAutismFriendly) {
    animationPref = "none";
  } else if (osReduceMotion) {
    animationPref = "none";
  } else {
    animationPref = userPref;
  }

  const setAnimationPref = useCallback(
    (pref: AnimationPref) => {
      if (!settings) return;
      try {
        updateUserSettings(settings.id, { animationPref: pref });
      } catch {
        // Settings update failed — preference won't persist but app continues
      }
    },
    [settings],
  );

  return {
    animationPref,
    shouldAnimate: animationPref !== "none",
    shouldReduceMotion: animationPref !== "full",
    setAnimationPref,
  };
}
