import { useCallback, useEffect, useRef } from "react";
import { UnistylesRuntime } from "react-native-unistyles";
import { updateUserSettings } from "../db";
import { useUserSettingsRow } from "./useUserSettingsRow";
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

  const densityLevel: DensityLevel =
    (settings?.density as DensityLevel) || "default";

  // Apply density to Unistyles themes when level changes
  useEffect(() => {
    if (densityLevel !== appliedLevel.current) {
      appliedLevel.current = densityLevel;
      applyDensityToAllThemes(densityLevel);
    }
  }, [densityLevel]);

  const setDensity = useCallback(
    (level: DensityLevel) => {
      if (!settings) return;
      updateUserSettings(settings.id, { density: level });
    },
    [settings],
  );

  return { densityLevel, setDensity };
}
