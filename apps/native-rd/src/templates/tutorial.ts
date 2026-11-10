import type { Namespace, TFunction } from "i18next";
import { EvidenceType } from "../db/schema";
import type { GoalTemplate, TemplateStep } from "./types";

export const TUTORIAL_TEMPLATE_ID = "find-your-footing";

// Explicit `{ ns }` on every call, so the builder works with whatever
// namespaces the caller's `t` was created for (same pattern as i18n/labels).
const TEMPLATES_NS = { ns: "templates" } as const;

/**
 * The tutorial's steps in order, each with the evidence it plans.
 *
 * Every step owes evidence, so each plans one type. Paper steps plan a text
 * note rather than a photo: a photo of the journal is welcome as extra
 * evidence but is never what a step waits on.
 */
const STEPS = [
  ["journal", EvidenceType.text],
  ["want", EvidenceType.text],
  ["threeSteps", EvidenceType.text],
  ["why", EvidenceType.voice_memo],
  ["setAside", EvidenceType.text],
  ["fiveMinutes", EvidenceType.text],
  ["yours", EvidenceType.text],
  ["paperOnly", EvidenceType.text],
  ["finish", EvidenceType.text],
] as const;

/**
 * "Find your footing" (#593): teaches the app alongside a paper goal journal.
 * The app leads the early steps and the journal takes over by the end.
 *
 * Built from the active language at the moment of insertion. The strings
 * become the user's own goal and step text from then on.
 */
export function buildTutorialTemplate<NS extends Namespace>(
  t: TFunction<NS>,
): GoalTemplate {
  return {
    id: TUTORIAL_TEMPLATE_ID,
    title: t("tutorial.title", TEMPLATES_NS),
    description: t("tutorial.description", TEMPLATES_NS),
    steps: STEPS.map(
      ([key, evidenceType]): TemplateStep => ({
        key,
        title: t(`tutorial.steps.${key}.title`, TEMPLATES_NS),
        description: t(`tutorial.steps.${key}.description`, TEMPLATES_NS),
        plannedEvidenceTypes: [evidenceType],
      }),
    ),
  };
}
