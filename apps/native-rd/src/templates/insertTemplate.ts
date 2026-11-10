import type { DateIso } from "@evolu/common";
import {
  createGoal,
  createStep,
  createSubStep,
  updateGoal,
  updateStep,
} from "../db/queries";
import type { GoalId, StepId } from "../db/schema";
import { localDate, localDayKeyToDateIso, toDayKey } from "../utils/localDay";
import type {
  GoalTemplate,
  TemplateStepTiming,
  TemplateSubStep,
} from "./types";
import { validateTemplate } from "./validateTemplate";

export type InsertTemplateResult =
  | { ok: true; goalId: GoalId }
  | { ok: false; error: unknown };

/** The local day `days` after `now`, as the `DateIso` a due date is stored as. */
function dayOffsetToDateIso(now: Date, days: number): DateIso {
  const day = localDate(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
  );
  const result = localDayKeyToDateIso(toDayKey(day));
  if (!result.ok) throw new Error(`Invalid day offset: ${days}`);
  return result.value;
}

/**
 * Insert a template as a goal with its steps and sub-steps.
 *
 * Rows go in sequentially, each insert's id feeding the next as a foreign key
 * — the same composition `NewGoalScreen.handleStartWorking` uses. Timing is
 * written in a second pass, once every key has a real id to resolve to.
 *
 * Evolu reports a failed write two ways (a throw from a validation guard, and
 * an `{ ok: false }` Result); both come back here as `{ ok: false }`. The
 * insert stops at the first failure and rows already written stay — the
 * mutation layer has no transaction to roll them back with.
 *
 * @param now - The day offsets are measured from. Injectable for tests.
 */
export function insertTemplate(
  template: GoalTemplate,
  now: Date = new Date(),
): InsertTemplateResult {
  try {
    const problems = validateTemplate(template);
    if (problems.length > 0) {
      throw new Error(
        `Template "${template.id}" is invalid: ${problems.join("; ")}`,
      );
    }

    const goalResult = createGoal(template.title, { templateId: template.id });
    if (!goalResult.ok) return { ok: false, error: goalResult.error };
    const goalId = goalResult.value.id as GoalId;

    if (template.description !== undefined) {
      const described = updateGoal(goalId, {
        description: template.description,
      });
      if (!described.ok) return { ok: false, error: described.error };
    }

    const idByKey = new Map<string, StepId>();
    const timed: TemplateSubStep[] = [];
    const track = (step: TemplateSubStep, id: StepId) => {
      idByKey.set(step.key, id);
      if (hasTiming(step)) timed.push(step);
    };

    for (const [index, step] of template.steps.entries()) {
      const stepResult = createStep(
        goalId,
        step.title,
        index,
        step.plannedEvidenceTypes,
        step.description,
      );
      if (!stepResult.ok) return { ok: false, error: stepResult.error };
      const stepId = stepResult.value.id as StepId;
      track(step, stepId);

      for (const [subIndex, sub] of (step.subSteps ?? []).entries()) {
        const subResult = createSubStep(
          goalId,
          stepId,
          sub.title,
          subIndex,
          sub.plannedEvidenceTypes,
          sub.description,
        );
        if (!subResult.ok) return { ok: false, error: subResult.error };
        track(sub, subResult.value.id as StepId);
      }
    }

    for (const step of timed) {
      const timingResult = updateStep(idByKey.get(step.key)!, {
        ...(step.after !== undefined && {
          afterStepId: idByKey.get(step.after)!,
        }),
        ...(step.dueInDays !== undefined && {
          dueAt: dayOffsetToDateIso(now, step.dueInDays),
        }),
        ...(step.waitingOn && {
          waitingOnLabel: step.waitingOn.label,
          ...(step.waitingOn.expectedInDays !== undefined && {
            waitingOnExpectedAt: dayOffsetToDateIso(
              now,
              step.waitingOn.expectedInDays,
            ),
          }),
        }),
      });
      if (!timingResult.ok) return { ok: false, error: timingResult.error };
    }

    return { ok: true, goalId };
  } catch (error) {
    return { ok: false, error };
  }
}

function hasTiming(step: TemplateStepTiming): boolean {
  return (
    step.after !== undefined ||
    step.dueInDays !== undefined ||
    step.waitingOn !== undefined
  );
}
