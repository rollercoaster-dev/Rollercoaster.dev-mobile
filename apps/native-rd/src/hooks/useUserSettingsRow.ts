import { useEffect } from "react";
import { useQuery } from "@evolu/react";
import { userSettingsQuery, createUserSettings } from "../db";

// Module-level guard so multiple hook instances mounting in the same render
// pass (useDensity + useFirstLaunch + useUserKey + useFocusModePrefs all run
// during ThemedApp's first render) cannot each fire createUserSettings()
// before Evolu's insert propagates back through the query — that would
// produce duplicate rows and the `limit(1)` query would serve them
// non-deterministically.
let didStartInit = false;

export function useUserSettingsRow() {
  const rows = useQuery(userSettingsQuery);
  const settings = rows[0] ?? null;

  useEffect(() => {
    if (!settings && !didStartInit) {
      didStartInit = true;
      createUserSettings();
    }
  }, [settings]);

  return { settings, isLoading: rows.length === 0 };
}

/** Test-only: resets the module-level init guard so each test can exercise
 *  the first-mount path independently. */
export function __resetUserSettingsRowInitForTests() {
  didStartInit = false;
}
