import { useCallback } from "react";
import { updateUserSettings } from "../db";
import { useUserSettingsRow } from "./useUserSettingsRow";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useFocusModePrefs");

export function useFocusModePrefs() {
  const { settings } = useUserSettingsRow();

  const timelineHidden = settings?.focusTimelineHidden === 1;

  const setTimelineHidden = useCallback(
    (hidden: boolean) => {
      if (!settings) {
        logger.error("setTimelineHidden called before settings row exists");
        return;
      }
      try {
        updateUserSettings(settings.id, {
          focusTimelineHidden: hidden ? 1 : null,
        });
      } catch (error) {
        logger.error("Failed to update focusTimelineHidden", { error });
      }
    },
    [settings],
  );

  return { timelineHidden, setTimelineHidden };
}
