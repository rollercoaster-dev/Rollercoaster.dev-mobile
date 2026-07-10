/**
 * applyReparent — pure nested-reparent helper for stateful stories/tests
 * (issue #496, R9). Removes a step (root or sub-step) from its source sibling
 * group and appends it to the destination group: `newParentId === null`
 * promotes to the end of the root array; otherwise the step is appended to the
 * target parent's `subSteps[]`. Returns a new `EditGoalStep[]` (immutable).
 *
 * Refuses (returns the input array unchanged) when the move would violate the
 * one-level hierarchy cap — a parent that itself has children cannot be
 * demoted (mirrors `classifyDrop`'s guard, for story safety so a stateful
 * story never produces grandchildren). Production code emits only the
 * `onReparentStep` callback; persistence/ordinal normalization is the
 * [Integrate] issue's (#446) job.
 */
import type { EditGoalStep } from "./EditGoalView";

export function applyReparent(
  steps: readonly EditGoalStep[],
  stepId: string,
  newParentId: string | null,
): EditGoalStep[] {
  // A parent-with-children can never be demoted (one-level cap).
  if (newParentId !== null) {
    const dragged = steps.find((s) => s.id === stepId);
    if (dragged && (dragged.subSteps?.length ?? 0) > 0) {
      return [...steps];
    }
    // Can't nest under a non-existent parent, or under self.
    const target = steps.find((s) => s.id === newParentId);
    if (!target || newParentId === stepId) return [...steps];
  }

  // Pull the moved step out of its source location and strip its sub-steps on
  // promote (a promoted step carries no children — it was a leaf child).
  let movedStep: EditGoalStep | undefined;
  const withoutSource: EditGoalStep[] = [];
  for (const step of steps) {
    if (step.id === stepId) {
      // The dragged step is a root — only valid for a demote, which keeps its
      // (empty) sub-steps. A leaf root has none.
      movedStep = step;
      continue;
    }
    const subIdx = step.subSteps?.findIndex((ss) => ss.id === stepId) ?? -1;
    if (subIdx >= 0 && step.subSteps) {
      movedStep = {
        id: step.subSteps[subIdx].id,
        title: step.subSteps[subIdx].title,
        plannedEvidenceTypes: step.subSteps[subIdx].plannedEvidenceTypes,
        // A promoted sub-step becomes a root with no children of its own.
        subSteps: newParentId === null ? [] : undefined,
      };
      const remainingSubs = step.subSteps.filter((_, i) => i !== subIdx);
      withoutSource.push({
        ...step,
        subSteps: remainingSubs,
      });
    } else {
      withoutSource.push(step);
    }
  }
  if (!movedStep) return [...steps];

  if (newParentId === null) {
    // Promote: append to the root array.
    return [...withoutSource, movedStep];
  }
  // Demote / move-between-parents: append to the target parent's sub-steps.
  return withoutSource.map((step) =>
    step.id === newParentId
      ? {
          ...step,
          subSteps: [
            ...(step.subSteps ?? []),
            {
              id: movedStep!.id,
              title: movedStep!.title,
              plannedEvidenceTypes: movedStep!.plannedEvidenceTypes,
            },
          ],
        }
      : step,
  );
}
