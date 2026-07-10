/**
 * flattenEditGoalSteps — pure adapter (issue #496, R7) that converts the
 * redesigned editor's nested `EditGoalStep[]` model into the flat
 * `ClassifyStep[]` render-order shape `classifyDrop` consumes (R1 — reused
 * unchanged from StepList). The redesigned model nests `subSteps[]` under a
 * parent; `classifyDrop` expects one flat column where each root is
 * immediately followed by its children. No `parentStepId` is added to
 * `EditGoalStep` (R6) — this adapter owns the flat shape.
 *
 * Render order: parent then its `subSteps[]`, then the next parent, etc. A
 * parent with no sub-steps contributes just itself. Ids are assumed unique
 * across steps and sub-steps (an existing invariant of the redesigned editor).
 */
import type { ClassifyStep } from "../StepList/classifyDrop";
import type { EditGoalStep } from "./EditGoalView";

export function flattenEditGoalSteps(
  steps: readonly EditGoalStep[],
): ClassifyStep[] {
  const flat: ClassifyStep[] = [];
  for (const step of steps) {
    flat.push({ id: step.id, parentStepId: null });
    for (const sub of step.subSteps ?? []) {
      flat.push({ id: sub.id, parentStepId: step.id });
    }
  }
  return flat;
}
