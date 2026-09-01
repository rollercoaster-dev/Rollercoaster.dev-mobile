/**
 * The strict evidence tier: has a step — and by extension a goal — captured
 * everything its plan asked for?
 *
 * Split out of `queries.ts` on purpose. These are pure functions over row
 * shapes with no Evolu dependency, so the UI layers that gate on them
 * (`CompletionFlowScreen`, and `FocusCurrentTaskCard` via
 * `isEvidencePlanSatisfied`) can import them without pulling the database
 * runtime along. `queries.ts` keeps the *floors* — `canCompleteStep` and
 * `canCompleteGoal` — which do touch the DB layer's own contracts; each pair's
 * docstrings cross-reference the other.
 */
import { Logger } from "../shims/rd-logger";
import {
  isEvidencePlanSatisfied,
  validateEvidenceType,
} from "../types/evidence";
import { resolvePlannedEvidenceTypes } from "../utils/parsePlannedEvidenceTypes";

const logger = new Logger("db.evidenceGate");

/**
 * The strict evidence tier for one step, read off its stored columns.
 *
 * Same resolution `canCompleteStep` applies — an *unset* plan resolves to the
 * default of one text note rather than exempting the step (#466 D4) — then
 * {@link isEvidencePlanSatisfied} decides. So this is `canCompleteStep`'s
 * stricter sibling on identical inputs: it wants *every* planned type, not
 * *some*.
 *
 * @param plannedEvidenceTypesJson - Value from step.plannedEvidenceTypes column (JSON string or null)
 * @param stepEvidence - All non-deleted evidence rows for this step
 * @returns true if every type the step planned has been captured
 */
export function isStepEvidenceComplete(
  plannedEvidenceTypesJson: string | null,
  stepEvidence: readonly { type: string | null }[],
): boolean {
  const plannedTypes = resolvePlannedEvidenceTypes(
    plannedEvidenceTypesJson,
    logger,
  ).map(validateEvidenceType);

  const capturedTypes = stepEvidence
    .filter((e) => e.type !== null)
    .map((e) => validateEvidenceType(e.type!));

  return isEvidencePlanSatisfied(plannedTypes, capturedTypes);
}

/**
 * The strict evidence tier for a whole goal: every step has captured every type
 * it planned (#635 D1).
 *
 * This is the completion contract the badge gate reads — the tier
 * `FocusCurrentTaskCard` has enforced per-step since #497 D1, lifted one level.
 * It is evidence-only by construction: it never reads `step.status`, so it does
 * not gate a goal on its steps being *marked* done, only on the evidence its
 * structure said it would collect (ADR-0014).
 *
 * A goal with no steps is not complete, for the same reason an empty plan is
 * not: `[].every(...)` is `true`, and a stepless goal would otherwise bake with
 * nothing behind it (D3).
 *
 * Goal-*scoped* evidence — the closing note on `FinishCelebrateStage` — is
 * deliberately not an input. It is a reflection on the ride, not proof that any
 * step happened, so it cannot unblock one. Contrast `queries.ts`'s
 * `canCompleteGoal`, the data-layer floor that accepts any single typed row
 * anywhere.
 *
 * @param steps - All non-deleted steps for the goal (needs `plannedEvidenceTypes`)
 * @param stepEvidence - All non-deleted step-scoped evidence rows for the goal
 * @returns true if the goal's every step has all its planned evidence
 */
export function isGoalEvidenceComplete(
  steps: readonly { id: string; plannedEvidenceTypes: string | null }[],
  stepEvidence: readonly { stepId: string | null; type: string | null }[],
): boolean {
  if (steps.length === 0) return false;

  const evidenceByStep = new Map<string, { type: string | null }[]>();
  for (const row of stepEvidence) {
    if (row.stepId === null) continue;
    const bucket = evidenceByStep.get(row.stepId);
    if (bucket) bucket.push(row);
    else evidenceByStep.set(row.stepId, [row]);
  }

  return steps.every((step) =>
    isStepEvidenceComplete(
      step.plannedEvidenceTypes,
      evidenceByStep.get(step.id) ?? [],
    ),
  );
}
