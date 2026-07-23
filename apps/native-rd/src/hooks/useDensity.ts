import { useCallback, useEffect, useMemo, useRef } from "react";
import { UnistylesRuntime } from "react-native-unistyles";
import { updateUserSettings } from "../db";
import { useUserSettingsRow } from "./useUserSettingsRow";
import { useAppStateGuard } from "./useAppStateGuard";
import {
  narrowDensity,
  scaleSpacing,
  type DensityLevel,
} from "../utils/density";
import { space as baseSpace } from "../themes/tokens";
import { themeNames } from "../themes/compose";
import { reportError } from "../services/sentry-report";
import { runEvoluMutation } from "../utils/evoluMutation";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useDensity");

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

  const rawDensity = settings?.density;
  const narrowed = useMemo(() => narrowDensity(rawDensity), [rawDensity]);
  const densityLevel: DensityLevel = narrowed.value;

  // Log corruption once per distinct unknown value, not once per render. The
  // narrowed memo is stable across re-renders that don't touch rawDensity,
  // so a steady bad row produces exactly one Sentry event.
  //
  // The raw shape goes in the Error message because the rd-logger shim only
  // forwards the Error to Sentry — meta args are dropped. JSON.stringify keeps
  // object/array/empty-string shapes legible (`{}`, `[]`, `""`); the typeof
  // fallback catches values JSON can't serialise (undefined, functions, BigInt).
  useEffect(() => {
    if (narrowed.isUnknown) {
      const serialized =
        JSON.stringify(narrowed.raw) ?? `<${typeof narrowed.raw}>`;
      logger.error(new Error(`Unknown density value in DB: ${serialized}`));
    }
  }, [narrowed]);

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

  // Returns true when the density change was persisted (or there is no settings
  // row yet, so there is nothing to persist); false only when the Evolu write
  // was attempted and failed. The calling UI shows a toast on false — this hook
  // can't, because it runs above <ToastProvider> in the tree (see #503 D2).
  const setDensity = useCallback(
    (level: DensityLevel): boolean => {
      if (!settings) return true;
      return runEvoluMutation(
        () => updateUserSettings(settings.id, { density: level }),
        (error) => {
          reportError(error, { area: "settings.density" });
        },
      );
    },
    [settings],
  );

  return { densityLevel, setDensity };
}
