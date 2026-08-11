import type { TFunction } from "i18next";
import { groupStepsByParent, resolveStepDependencyBand } from "../../db";
import type {
  EditGoalStep,
  EditGoalDateDepChip,
} from "../../components/EditGoalView";
import {
  validateEvidenceType,
  type EvidenceTypeValue,
} from "../../types/evidence";
import { resolvePlannedEvidenceTypes } from "../../utils/parsePlannedEvidenceTypes";
import { formatDate } from "../../utils/format";

/** The `stepsByGoalQuery` rows this module reads. */
type StepRow = Parameters<typeof groupStepsByParent>[0][number];

/**
 * A step's planned evidence, ready for the editor's chips (D5). Never null:
 * `resolvePlannedEvidenceTypes` resolves the unset case to `["text"]`, which
 * `EditGoalStep.plannedEvidenceTypes` (a required, non-empty array) demands.
 * De-duplicated because the picker's toggle treats the list as a set — a
 * repeated type would render twice and take two taps to clear.
 */
function toPlannedEvidenceTypes(raw: string | null): EvidenceTypeValue[] {
  return [
    ...new Set(resolvePlannedEvidenceTypes(raw).map(validateEvidenceType)),
  ];
}

/**
 * DB rows → EditGoalView's one-level step tree.
 *
 * No status/completed field (D3): the redesigned editor is pure
 * structure-editing, not a progress view — `EditGoalStep` carries no such
 * field to map onto.
 *
 * `now` is supplied by the caller (#571), keeping this module clock-free: every
 * step in one build judges "has this expected date passed?" against the same
 * instant.
 */
export function buildEditGoalSteps(
  stepRows: readonly StepRow[],
  t: TFunction<["editGoal", "common"]>,
  language: string,
  now: Date,
): EditGoalStep[] {
  return groupStepsByParent(stepRows).map((root) => ({
    id: root.id,
    title: root.title ?? "",
    plannedEvidenceTypes: toPlannedEvidenceTypes(root.plannedEvidenceTypes),
    dateDepChips: buildDateDepChips(root, stepRows, t, language, now),
    // Sub-steps carry no C/B band (#407 OQ-2) — EditGoalSubStep has no
    // dateDepChips field at all.
    subSteps: root.children.map((child) => ({
      id: child.id,
      title: child.title ?? "",
      plannedEvidenceTypes: toPlannedEvidenceTypes(child.plannedEvidenceTypes),
    })),
  }));
}

/**
 * The C·B band (#454) as display chips — the third caller of the same resolver
 * after Timeline and Focus, so all three read a step's dependencies
 * identically.
 *
 * At most one dependency chip: waiting-on outranks after, mirroring
 * MetadataBand's C-line precedence. `due` is independent of both. Returns
 * `undefined` rather than `[]` when nothing is set, so the row renders no chip
 * row at all instead of an "unset" placeholder (D6).
 */
function buildDateDepChips(
  step: StepRow,
  stepRows: readonly StepRow[],
  t: TFunction<["editGoal", "common"]>,
  language: string,
  now: Date,
): EditGoalDateDepChip[] | undefined {
  const band = resolveStepDependencyBand(step, stepRows, now);
  const chips: EditGoalDateDepChip[] = [];

  if (band.waitingOnLabel) {
    chips.push({
      // Still the "waiting" tone once the date has passed (#571): the wait is
      // ongoing, only the date reads as behind us. A past expected date gets no
      // tone of its own — that would be the urgency ADR-0012 rules out.
      tone: "waiting",
      text: band.waitingOnExpectedAt
        ? t(
            band.waitingOnExpectedIsPast
              ? "editGoal:stepList.dateDepChips.wasExpected"
              : "editGoal:stepList.dateDepChips.waitingOnExpected",
            {
              who: band.waitingOnLabel,
              date: formatDate(band.waitingOnExpectedAt, language),
            },
          )
        : t("editGoal:stepList.dateDepChips.waitingOn", {
            who: band.waitingOnLabel,
          }),
    });
  } else if (band.afterStepTitle) {
    chips.push({
      tone: "after",
      text: t("editGoal:stepList.dateDepChips.after", {
        title: band.afterStepTitle,
      }),
    });
  }

  if (band.dueAt) {
    chips.push({
      tone: "due",
      text: t("editGoal:stepList.dateDepChips.due", {
        date: formatDate(band.dueAt, language),
      }),
    });
  }

  return chips.length > 0 ? chips : undefined;
}
