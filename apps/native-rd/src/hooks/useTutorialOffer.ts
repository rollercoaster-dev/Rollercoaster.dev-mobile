import { useRef } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@evolu/react";
import {
  goalFromTemplateQuery,
  hideTutorialOffer,
  type userSettingsQuery,
} from "../db";
import type { GoalId } from "../db/schema";
import { reportError } from "../services/sentry-report";
import { Logger } from "../shims/rd-logger";
import {
  TUTORIAL_TEMPLATE_ID,
  buildTutorialTemplate,
  insertTemplate,
} from "../templates";
import { runEvoluMutation } from "../utils/evoluMutation";

const logger = new Logger("useTutorialOffer");

type SettingsRow = typeof userSettingsQuery.Row;

const tutorialGoalQuery = goalFromTemplateQuery(TUTORIAL_TEMPLATE_ID);

/**
 * The Goals-screen tutorial offer (#593): whether to show it, and its two
 * actions.
 *
 * Offered until the user starts the tutorial or declines it. Both write the
 * one-way `userSettings.tutorialOfferHidden` flag. A tutorial goal that
 * already exists also withdraws the offer, whatever its state: that covers a
 * tutorial started before the flag existed, and it means the offer cannot
 * return once the tutorial goal is finished or deleted. It is not offered
 * while the settings row is still loading, rather than flashed and withdrawn.
 *
 * @param settings - the settings singleton, or null while it loads
 * @param onStarted - called with the new goal once the tutorial is seeded
 */
export function useTutorialOffer(
  settings: SettingsRow | null,
  onStarted: (goalId: GoalId) => void,
) {
  const { t } = useTranslation(["goals"]);
  // The card stays up until Evolu echoes the flag, so a fast second tap would
  // otherwise seed a second tutorial goal.
  const isStartingRef = useRef(false);

  const hasTutorialGoal = useQuery(tutorialGoalQuery).length > 0;

  const isOffered =
    settings !== null && !settings.tutorialOfferHidden && !hasTutorialGoal;

  function dismiss() {
    if (!settings) return;
    runEvoluMutation(
      () => hideTutorialOffer(settings.id),
      (error) => {
        logger.error("Failed to hide the tutorial offer", { error });
        reportError(error, { area: "db.write" });
      },
    );
  }

  function start() {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    const result = insertTemplate(buildTutorialTemplate(t));
    if (!result.ok) {
      isStartingRef.current = false;
      reportError(result.error, { area: "goal.mutate", kind: "create" });
      Alert.alert(
        t("goals:tutorialOffer.startFailed.title"),
        t("goals:tutorialOffer.startFailed.message"),
      );
      return;
    }
    dismiss();
    onStarted(result.goalId);
  }

  return { isOffered, start, dismiss };
}
