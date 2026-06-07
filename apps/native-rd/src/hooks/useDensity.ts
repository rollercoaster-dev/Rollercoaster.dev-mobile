import { useCallback, useEffect, useRef } from "react";
import { UnistylesRuntime } from "react-native-unistyles";
import { updateUserSettings } from "../db";
import { useUserSettingsRow } from "./useUserSettingsRow";
import { useAppStateGuard } from "./useAppStateGuard";
import { scaleSpacing, type DensityLevel } from "../utils/density";
import { space as baseSpace } from "../themes/tokens";
import { themeNames } from "../themes/compose";

function applyDensityToAllThemes(level: DensityLevel) {
  const scaled = scaleSpacing(baseSpace, level);
  for (const name of themeNames) {
    UnistylesRuntime.updateTheme(name, (current) => ({
      ...current,
      space: scaled,
    }));
  }
}

export function useDensity() {
  const { settings } = useUserSettingsRow();
  const appliedLevel = useRef<DensityLevel>("default");
  const { runWhenActive } = useAppStateGuard();

  const densityLevel: DensityLevel =
    (settings?.density as DensityLevel) || "default";

  // Apply density to Unistyles themes when level changes. The updateTheme
  // loop touches all 7 themes in tight succession, which is the same
  // back-to-back shadow-tree mutation pattern that triggers NATIVE-RD-4
  // when fired against a backgrounded runtime — so route through the
  // AppState guard.
  useEffect(() => {
    if (densityLevel !== appliedLevel.current) {
      runWhenActive(() => {
        applyDensityToAllThemes(densityLevel);
        appliedLevel.current = densityLevel;
      });
    }
  }, [densityLevel, runWhenActive]);

  const setDensity = useCallback(
    (level: DensityLevel) => {
      if (!settings) return;
      updateUserSettings(settings.id, { density: level });
    },
    [settings],
  );

  return { densityLevel, setDensity };
}
