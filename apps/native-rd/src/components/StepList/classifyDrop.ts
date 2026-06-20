/**
 * Pure drop-classifier for StepList's vertical-only + dwell-to-demote drag
 * gesture (D8). Given the flat render-order list, where a row was picked up,
 * where it came to rest, and whether a demote target was armed by dwelling on
 * it, decide what the drop means — with no gesture or animation state. Kept
 * pure so the one-level-depth rules are unit-testable in isolation (Step 8).
 *
 * Model (revised D8 — see dev plan):
 * - The list is one flat vertical column in render order: each root step is
 *   immediately followed by its children.
 * - Reorder and promote fall out of the resting position — the dragged step's
 *   parent becomes the parent of the row directly above the drop slot.
 * - Demote under a *childless* root can't be expressed by position alone, so
 *   it is an explicit dwell: the armed target id is passed in.
 * - One-level cap: a step that itself has children can never become a child
 *   (would create grandchildren); such drops are refused and snap back.
 */

export interface ClassifyStep {
  id: string;
  parentStepId?: string | null;
}

export type DropResult =
  | { kind: "none" }
  | { kind: "reorder"; parentStepId: string | null; orderedIds: string[] }
  | { kind: "reparent"; stepId: string; newParentStepId: string | null };

function parentOf(step: ClassifyStep): string | null {
  return step.parentStepId ?? null;
}

/**
 * @param steps        flat list in render order (parent then its children)
 * @param draggedIndex index the dragged row was picked up from
 * @param dropIndex    resting index in the same flat list (0..steps.length-1)
 * @param armedTargetId root step id armed by dwell, or null for a plain drop
 */
export function classifyDrop(
  steps: readonly ClassifyStep[],
  draggedIndex: number,
  dropIndex: number,
  armedTargetId: string | null = null,
): DropResult {
  const dragged = steps[draggedIndex];
  if (!dragged) return { kind: "none" };

  const draggedHasChildren = steps.some((s) => parentOf(s) === dragged.id);

  // --- Dwell-to-demote: explicit nest under an armed root target ----------
  if (armedTargetId != null) {
    const target = steps.find((s) => s.id === armedTargetId);
    const valid =
      !!target &&
      parentOf(target) === null && // target must be a root (one-level cap)
      target.id !== dragged.id &&
      !draggedHasChildren; // a parent-with-children can't be demoted
    return valid
      ? { kind: "reparent", stepId: dragged.id, newParentStepId: armedTargetId }
      : { kind: "none" }; // refused: snap back, no data change
  }

  // --- Positional reorder / promote --------------------------------------
  // Parent = parent of the row directly above the drop slot, computed on the
  // list with the dragged row removed (same model as the existing reorder).
  const working = steps.filter((_, i) => i !== draggedIndex);
  const above = dropIndex > 0 ? working[dropIndex - 1] : null;
  const positionalParent = above ? parentOf(above) : null;

  // One-level cap: a parent-with-children can't become someone's child.
  if (positionalParent !== null && draggedHasChildren) {
    return { kind: "none" };
  }

  const currentParent = parentOf(dragged);

  if (positionalParent !== currentParent) {
    // Parent changed → promote (to null) or move into another group's children.
    return {
      kind: "reparent",
      stepId: dragged.id,
      newParentStepId: positionalParent,
    };
  }

  // Same group → sibling reorder. Build the post-move flat order and pull out
  // this sibling group's ids in their new sequence.
  const postMove = [...working];
  postMove.splice(dropIndex, 0, dragged);
  const orderedIds = postMove
    .filter((s) => s.id === dragged.id || parentOf(s) === positionalParent)
    .map((s) => s.id);

  // No actual movement within the group → no-op.
  const before = steps
    .filter((s) => parentOf(s) === currentParent)
    .map((s) => s.id);
  if (
    before.length === orderedIds.length &&
    before.every((id, i) => id === orderedIds[i])
  ) {
    return { kind: "none" };
  }

  return { kind: "reorder", parentStepId: positionalParent, orderedIds };
}
