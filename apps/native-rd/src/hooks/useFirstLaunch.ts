import { useCallback } from "react";
import { markWelcomeSeen } from "../db";
import { useUserSettingsRow } from "./useUserSettingsRow";
import { Logger } from "../shims/rd-logger";

export interface FirstLaunchState {
  /** null = still loading, true = first launch, false = returning user */
  isFirstLaunch: boolean | null;
  markSeen: () => void;
}

/**
 * Reads the hasSeenWelcome flag from Evolu userSettings.
 * Returns loading state (null) until the first query resolves,
 * preventing a flash of the wrong screen during DB init.
 */
const logger = new Logger("useFirstLaunch");

export function useFirstLaunch(): FirstLaunchState {
  const { settings, isLoading } = useUserSettingsRow();

  const markSeen = useCallback(() => {
    if (!settings) return;
    try {
      markWelcomeSeen(settings.id);
    } catch (error) {
      logger.error("Failed to mark welcome as seen", { error });
    }
  }, [settings]);

  if (isLoading) {
    return { isFirstLaunch: null, markSeen };
  }

  // hasSeenWelcome is null or 0 → first launch; 1 → returning user
  const isFirstLaunch = !settings?.hasSeenWelcome;

  return { isFirstLaunch, markSeen };
}
