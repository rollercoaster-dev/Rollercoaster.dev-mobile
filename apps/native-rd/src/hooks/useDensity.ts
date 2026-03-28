import { useCallback, useEffect, useRef } from 'react';
import { UnistylesRuntime } from 'react-native-unistyles';
import { useQuery } from '@evolu/react';
import { userSettingsQuery, createUserSettings, updateUserSettings } from '../db';
import { scaleSpacing, type DensityLevel } from '../utils/density';
import { space as baseSpace } from '../themes/tokens';
import { themeNames, parseThemeName, type ThemeName } from '../themes/compose';

function applyDensityToAllThemes(level: DensityLevel) {
  const scaled = scaleSpacing(baseSpace, level);
  for (const name of themeNames) {
    UnistylesRuntime.updateTheme(name as ThemeName, (current) => ({
      ...current,
      space: scaled,
    }));
  }
  // Force StyleSheet re-evaluation by toggling themes.
  // setTheme to the same name is a no-op, so we switch away and back.
  const current = UnistylesRuntime.themeName as ThemeName;
  const { colorMode } = parseThemeName(current);
  const temp = themeNames.find((n) => n !== current && n.startsWith(colorMode))!;
  UnistylesRuntime.setTheme(temp);
  UnistylesRuntime.setTheme(current);
}

export function useDensity() {
  const rows = useQuery(userSettingsQuery);
  const settings = rows[0] ?? null;
  const didInit = useRef(false);
  const appliedLevel = useRef<DensityLevel>('default');

  // Ensure a settings row exists (singleton pattern)
  useEffect(() => {
    if (!settings && !didInit.current) {
      didInit.current = true;
      createUserSettings();
    }
  }, [settings]);

  const densityLevel: DensityLevel =
    (settings?.density as DensityLevel) || 'default';

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
