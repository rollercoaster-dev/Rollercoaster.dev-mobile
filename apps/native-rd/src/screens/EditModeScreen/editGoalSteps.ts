import type { TFunction } from "i18next";
import {
  StepStatus,
  groupStepsByParent,
  resolveStepDependencyBand,
} from "../../db";
import type {
  EditGoalStep,
  EditGoalSubStep,
  EditGoalDateDepChip,
  EditGoalTiming,
} from "../../components/EditGoalView";
import type { StepDayMark } from "../../components/StepDayGrid";
import type { StepTimingCandidate } from "../../components/StepTimingEditor";
import {
  validateEvidenceType,
  type EvidenceTypeValue,
} from "../../types/evidence";
import { resolvePlannedEvidenceTypes } from "../../utils/parsePlannedEvidenceTypes";
import { formatDate, toLetterOrdinal } from "../../utils/format";
import { dateIsoToLocalDayKey } from "../../utils/localDay";

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
 * One entry in the goal-wide timing population: the candidate every *other*
 * row may depend on, plus the one column the omission rule reads.
 *
 * `afterStepId` is kept alongside rather than on the candidate because it is
 * not the editor's business — it exists so a candidate that already points at
 * the row being edited can be left out of that row's list (#576/D8).
 */
interface TimingEntry {
  candidate: StepTimingCandidate;
  afterStepId: string | null;
}

/**
 * DB rows → EditGoalView's one-level step tree.
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
  const grouped = groupStepsByParent(stepRows);
  // One flat pass over the whole goal, ordinals and all, so each row's
  // candidate list is a filter over this rather than its own traversal (D9).
  const population = buildTimingPopulation(grouped, language);

  return grouped.map((root) => ({
    id: root.id,
    title: root.title ?? "",
    plannedEvidenceTypes: toPlannedEvidenceTypes(root.plannedEvidenceTypes),
    dateDepChips: buildDateDepChips(root, stepRows, t, language, now),
    isCompleted: root.status === StepStatus.completed,
    timing: buildTiming(root, population, language),
    // Sub-steps are full timing participants (#575/D4), so everything the
    // parent row gets, a sub-row gets too — including the chips and status
    // #575 added to the shape but left for this issue to populate.
    subSteps: root.children.map(
      (child): EditGoalSubStep => ({
        id: child.id,
        title: child.title ?? "",
        plannedEvidenceTypes: toPlannedEvidenceTypes(
          child.plannedEvidenceTypes,
        ),
        dateDepChips: buildDateDepChips(child, stepRows, t, language, now),
        isCompleted: child.status === StepStatus.completed,
        timing: buildTiming(child, population, language),
      }),
    ),
  }));
}

/**
 * Every step and sub-step in the goal as a `depends on` candidate, in list
 * order, labelled the way the row itself is numbered: "1", "2", … for roots
 * (matching `EditGoalStepRow`'s `stepNumber = index + 1`) and "a", "b", … for
 * each parent's children (the same `toLetterOrdinal` the Timeline sub-spine
 * uses). Flat, not scoped to one parent's siblings — a step may depend on
 * anything else in the goal (D8).
 */
function buildTimingPopulation(
  grouped: ReturnType<typeof groupStepsByParent>,
  language: string,
): TimingEntry[] {
  const entries: TimingEntry[] = [];
  grouped.forEach((root, rootIndex) => {
    entries.push(toTimingEntry(root, String(rootIndex + 1), false, language));
    root.children.forEach((child, childIndex) => {
      entries.push(
        toTimingEntry(child, toLetterOrdinal(childIndex), true, language),
      );
    });
  });
  return entries;
}

function toTimingEntry(
  row: StepRow,
  label: string,
  isSubStep: boolean,
  language: string,
): TimingEntry {
  return {
    candidate: {
      id: row.id,
      title: row.title ?? "",
      label,
      isSubStep,
      isCompleted: row.status === StepStatus.completed,
      // The editor and its grid speak plain local `YYYY-MM-DD`; the column is a
      // DateIso timestamp. An unparseable value degrades to "no day".
      dueDate: row.dueAt ? dateIsoToLocalDayKey(row.dueAt) : null,
      dueDateLabel: row.dueAt ? formatDate(row.dueAt, language) : undefined,
    },
    afterStepId: row.afterStepId,
  };
}

/**
 * One row's editor bundle: the candidates it may depend on, the draft it opens
 * with, and the strings the editor cannot derive.
 *
 * Two omissions from the candidate list, both quiet — no disabled row, no
 * refusal copy (ADR-0010/0012): the row itself, and any candidate whose own
 * `afterStepId` already points back at it. The second is the two-step-cycle
 * case; deeper cycles are deliberately not detected (#576, Not in Scope).
 *
 * The draft's `afterStepId` is resolved **through the candidate list**, not
 * read straight off the column, so what the picker shows and what `Done`
 * commits can never disagree — a dangling dependency (deleted target) or the
 * far side of a mutual cycle reads as `nothing`, exactly as it renders.
 */
function buildTiming(
  row: StepRow,
  population: readonly TimingEntry[],
  language: string,
): EditGoalTiming {
  const candidates: StepTimingCandidate[] = [];
  const marks: StepDayMark[] = [];
  for (const entry of population) {
    if (entry.candidate.id === row.id) continue;
    if (entry.afterStepId === row.id) continue;
    candidates.push(entry.candidate);
    // Same pass as the candidate list (D9) — the badges on the grid are the
    // days these very candidates sit on.
    if (entry.candidate.dueDate !== null) {
      marks.push({
        date: entry.candidate.dueDate,
        label: entry.candidate.label,
      });
    }
  }

  const selected =
    candidates.find((candidate) => candidate.id === row.afterStepId) ?? null;

  return {
    value: {
      dueDate: row.dueAt ? dateIsoToLocalDayKey(row.dueAt) : null,
      afterStepId: selected?.id ?? null,
    },
    candidates,
    afterStepTitle: selected?.title ?? null,
    afterStepIsCompleted: selected?.isCompleted ?? false,
    dueDateLabel: row.dueAt ? formatDate(row.dueAt, language) : null,
    marks,
  };
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
