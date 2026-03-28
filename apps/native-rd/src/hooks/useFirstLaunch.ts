import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@evolu/react';
import { userSettingsQuery, createUserSettings, markWelcomeSeen } from '../db';
import { Logger } from '../shims/rd-logger';

export interface FirstLaunchState {
  /** null = still loading, true = first launch, false = returning user */
  isFirstLaunch: boolean | null;
  markSeen: () => void;
}

/**
 * Reads the hasSeenWelcome flag from Evolu userSettings.
 * Returns loading state (null) until the first query resolves,
 * preventing a flash of the wrong screen during DB init.
 *
 * Follows the same singleton/init pattern as useDensity and useAnimationPref.
 */
const logger = new Logger('useFirstLaunch');

export function useFirstLaunch(): FirstLaunchState {
  const rows = useQuery(userSettingsQuery);
  const settings = rows[0] ?? null;
  const didInit = useRef(false);

  // Ensure a settings row exists (singleton pattern)
  useEffect(() => {
    if (!settings && !didInit.current) {
      didInit.current = true;
      createUserSettings();
    }
  }, [settings]);

  const markSeen = useCallback(() => {
    if (!settings) return;
    try {
      markWelcomeSeen(settings.id);
    } catch (error) {
      logger.error('Failed to mark welcome as seen', { error });
    }
  }, [settings]);

  // Loading: Evolu hasn't resolved yet
  if (rows.length === 0) {
    return { isFirstLaunch: null, markSeen };
  }

  // hasSeenWelcome is null or 0 → first launch; 1 → returning user
  const isFirstLaunch = !settings?.hasSeenWelcome;

  return { isFirstLaunch, markSeen };
}
