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
 * - Demote onto a root is an explicit dwell: the armed target id is passed in.
 *   Existing parents remain valid targets so a root can receive more than one
 *   child through the same gesture.
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

  const currentParent = parentOf(dragged);

  // A root with children moves as one group. Hovering either another root or
  // any of its children targets that whole root group; the child rows remain
  // attached through parentStepId and need no individual reorder writes.
  if (currentParent === null && draggedHasChildren) {
    const hovered = steps[dropIndex];
    if (!hovered) return { kind: "none" };

    const targetRootId = parentOf(hovered) ?? hovered.id;
    if (targetRootId === dragged.id) return { kind: "none" };

    const rootIds = steps
      .filter((step) => parentOf(step) === null)
      .map((step) => step.id);
    const draggedRootIndex = rootIds.indexOf(dragged.id);
    const targetRootIndex = rootIds.indexOf(targetRootId);
    if (draggedRootIndex < 0 || targetRootIndex < 0) return { kind: "none" };

    const orderedIds = rootIds.filter((id) => id !== dragged.id);
    const targetIndexAfterRemoval = orderedIds.indexOf(targetRootId);
    const insertIndex =
      targetIndexAfterRemoval + (targetRootIndex > draggedRootIndex ? 1 : 0);
    orderedIds.splice(insertIndex, 0, dragged.id);

    return { kind: "reorder", parentStepId: null, orderedIds };
  }

  // --- Positional reorder / promote --------------------------------------
  // A slot immediately before a row belongs to that row's sibling group. This
  // is essential for placing a child first: the row above is its root parent,
  // but the child at the slot carries the intended parent. At the end of the
  // list there is no row at the slot, so inherit from the row above instead.
  const working = steps.filter((_, i) => i !== draggedIndex);
  const atSlot = working[dropIndex];
  const above = dropIndex > 0 ? working[dropIndex - 1] : null;
  const positionalParent = atSlot
    ? parentOf(atSlot)
    : above
      ? parentOf(above)
      : null;

  // One-level cap: a parent-with-children can't become someone's child.
  if (positionalParent !== null && draggedHasChildren) {
    return { kind: "none" };
  }

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
