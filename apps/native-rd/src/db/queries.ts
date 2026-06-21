/**
 * Kysely query definitions for all database tables
 *
 * All CRUD operations follow Evolu patterns with proper error handling:
 * - Queries use evolu.createQuery() for reactivity
 * - Inserts/updates throw on validation failure with proper logging
 * - Deletes are soft-deletes using isDeleted flag
 * - All strings validated with NonEmptyString1000
 * - All IDs are ULIDs (branded types)
 * - All errors logged with rd-logger for debugging and monitoring
 */
import {
  NonEmptyString1000,
  NonEmptyString,
  dateToDateIso,
  sqliteTrue,
  Int,
} from "@evolu/common";
import { breadcrumb } from "../services/sentry-report";
import { Logger } from "../shims/rd-logger";
import type { EvidenceTypeValue } from "../types/evidence";
import { parsePlannedEvidenceTypes } from "../utils/parsePlannedEvidenceTypes";
import { evolu } from "./evolu";
import {
  GoalId,
  GoalStatus,
  StepId,
  StepStatus,
  EvidenceId,
  BadgeId,
  UserSettingsId,
} from "./schema";

// Scope "db.queries" routes caught Evolu/Kysely errors through SCOPE_TO_AREA → db.write.
const logger = new Logger("db.queries");

// Goal CRUD

/** Query all non-deleted goals, ordered by creation date descending */
export const goalsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("goal")
    .selectAll()
    .where("isDeleted", "is", null)
    .orderBy("createdAt", "desc"),
);

/**
 * Used by the home Goals screen so completed goals don't clutter the
 * "what's next" surface — they live in the Badges tab instead.
 */
export const activeGoalsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("goal")
    .selectAll()
    .where("isDeleted", "is", null)
    .where("status", "=", GoalStatus.active)
    .orderBy("createdAt", "desc"),
);

/**
 * Steps for every active goal in a single subscription, grouped client-side
 * by goalId. Avoids the N+1 of calling stepsByGoalQuery per goal card on the
 * home screen.
 *
 * `parentStepId` is selected so the goal card can resolve the next pending
 * *leaf* (a sub-step) rather than the parent that contains it (#292). The
 * consumer (GoalsScreen) buckets the flat rows by `parentStepId`; flat order is
 * not relied on for hierarchy. The `createdAt` tie-break mirrors
 * {@link stepsByGoalQuery} so siblings sharing an ordinal (concurrent CRDT
 * writes) still sort deterministically.
 */
export const stepsForActiveGoalsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("step")
    .innerJoin("goal", "goal.id", "step.goalId")
    .select([
      "step.id",
      "step.goalId",
      "step.parentStepId",
      "step.title",
      "step.status",
    ])
    .where("step.isDeleted", "is", null)
    .where("goal.isDeleted", "is", null)
    .where("goal.status", "=", GoalStatus.active)
    .orderBy("step.goalId", "asc")
    .orderBy("step.ordinal", "asc")
    .orderBy("step.createdAt", "asc"),
);

/**
 * Create a new goal with given title
 * @param title - Goal title (trimmed and validated)
 * @returns Insert command
 * @throws Error if validation fails
 */
export function createGoal(title: string) {
  breadcrumb({ category: "goal", message: "create" });
  const parsedTitle = NonEmptyString1000.orNull(title.trim());
  if (!parsedTitle) {
    logger.error("Goal title validation failed", {
      titleLength: title.length,
      titleTrimmed: title.trim().length,
    });
    throw new Error(
      `Goal title must be 1-1000 characters (received ${title.length} characters)`,
    );
  }

  try {
    return evolu.insert("goal", {
      title: parsedTitle,
      status: GoalStatus.active,
    });
  } catch (error) {
    logger.error("Failed to insert goal", { title: parsedTitle, error });
    throw new Error("Failed to create goal. Please try again.");
  }
}

/**
 * Update goal title, description, and/or design
 * @param id - Goal ID
 * @param fields - Fields to update (title, description, design)
 * @returns Update command
 * @throws Error if validation fails
 */
export function updateGoal(
  id: GoalId,
  fields: {
    title?: string;
    description?: string | null;
    design?: string | null;
  },
) {
  breadcrumb({ category: "goal", message: "update" });
  const update: Record<string, unknown> = { id };

  if (fields.title !== undefined) {
    const parsed = NonEmptyString1000.orNull(fields.title.trim());
    if (!parsed) {
      logger.error("Goal title validation failed during update", {
        goalId: id,
        titleLength: fields.title.length,
      });
      throw new Error(
        `Goal title must be 1-1000 characters (received ${fields.title.length} characters)`,
      );
    }
    update.title = parsed;
  }

  if (fields.description !== undefined) {
    if (fields.description === null) {
      update.description = null;
    } else {
      const parsed = NonEmptyString1000.orNull(fields.description.trim());
      if (!parsed) {
        logger.error("Goal description validation failed during update", {
          goalId: id,
          descriptionLength: fields.description.length,
        });
        throw new Error(
          `Goal description must be 1-1000 characters (received ${fields.description.length} characters)`,
        );
      }
      update.description = parsed;
    }
  }

  if (fields.design !== undefined) {
    if (fields.design === null) {
      update.design = null;
    } else {
      const parsed = NonEmptyString.orNull(fields.design);
      if (!parsed) {
        logger.error("Goal design validation failed during update", {
          goalId: id,
          designLength: fields.design.length,
        });
        throw new Error(
          `Goal design must not be empty (received ${fields.design.length} characters)`,
        );
      }
      update.design = parsed;
    }
  }

  try {
    return evolu.update("goal", update as Parameters<typeof evolu.update>[1]);
  } catch (error) {
    logger.error("Failed to update goal", { goalId: id, fields, error });
    throw new Error("Failed to update goal. Please try again.");
  }
}

/**
 * Mark goal as completed with current timestamp
 * @param id - Goal ID
 * @returns Update command
 * @throws Error if timestamp generation fails
 */
export function completeGoal(
  id: GoalId,
  goalEvidence: { type: string | null }[],
) {
  breadcrumb({ category: "goal", message: "complete" });
  if (!canCompleteGoal(goalEvidence)) {
    throw new Error(
      "Cannot complete goal: no evidence attached. Add at least one evidence item first.",
    );
  }

  const now = dateToDateIso(new Date());

  if (!now.ok) {
    logger.error("Failed to generate completion timestamp", {
      goalId: id,
      dateValue: new Date().toISOString(),
    });
    throw new Error("Failed to record completion time. Please try again.");
  }

  try {
    return evolu.update("goal", {
      id,
      status: GoalStatus.completed,
      completedAt: now.value,
    });
  } catch (error) {
    logger.error("Failed to complete goal", { goalId: id, error });
    throw new Error("Failed to complete goal. Please try again.");
  }
}

/**
 * Mark goal as active and clear completion timestamp
 * @param id - Goal ID
 * @returns Update command
 */
export function uncompleteGoal(id: GoalId) {
  breadcrumb({ category: "goal", message: "update" });
  try {
    return evolu.update("goal", {
      id,
      status: GoalStatus.active,
      completedAt: null,
    });
  } catch (error) {
    logger.error("Failed to uncomplete goal", { goalId: id, error });
    throw new Error("Failed to uncomplete goal. Please try again.");
  }
}

/**
 * Soft-delete goal (sets isDeleted flag)
 * @param id - Goal ID
 * @returns Update command
 */
export function deleteGoal(id: GoalId) {
  breadcrumb({ category: "goal", message: "delete" });
  try {
    return evolu.update("goal", { id, isDeleted: sqliteTrue });
  } catch (error) {
    logger.error("Failed to delete goal", { goalId: id, error });
    throw new Error("Failed to delete goal. Please try again.");
  }
}

// Evidence gating helpers

/**
 * Serialize a planned evidence types array to a JSON string for storage.
 * Returns undefined when the value should not be updated (pass-through),
 * null to clear the field, or a validated NonEmptyString1000 JSON string.
 */
function serializePlannedTypes(
  types: readonly string[] | null | undefined,
): ReturnType<typeof NonEmptyString1000.orNull> | null | undefined {
  if (types === undefined) return undefined;
  if (types === null || types.length === 0) return null;
  const json = JSON.stringify(types);
  const result = NonEmptyString1000.orNull(json);
  if (!result) {
    logger.error("Serialized plannedEvidenceTypes exceeds 1000 chars", {
      typeCount: types.length,
      jsonLength: json.length,
    });
    throw new Error(
      `Planned evidence types are too long to store (${json.length} chars). Reduce the number of types.`,
    );
  }
  return result;
}

/**
 * Check if a step has sufficient evidence to be completed.
 *
 * If plannedEvidenceTypes is set (non-null JSON array), at least one
 * evidence item must match a planned type. If null, no step evidence is
 * required.
 *
 * @param plannedEvidenceTypesJson - Value from step.plannedEvidenceTypes column (JSON string or null)
 * @param stepEvidence - All non-deleted evidence rows for this step
 * @returns true if the step can be completed
 */
export function canCompleteStep(
  plannedEvidenceTypesJson: string | null,
  stepEvidence: { type: string | null }[],
): boolean {
  const plannedTypes = parsePlannedEvidenceTypes(
    plannedEvidenceTypesJson,
    logger,
  );
  if (plannedTypes === null) return true;

  const validEvidence = stepEvidence.filter((e) => e.type !== null);
  if (validEvidence.length === 0) return false;

  return validEvidence.some((e) => plannedTypes.includes(e.type!));
}

/**
 * Check if a goal has at least one goal-level evidence item.
 *
 * @param goalEvidence - All non-deleted evidence rows attached directly to the goal
 * @returns true if the goal can be completed
 */
export function canCompleteGoal(
  goalEvidence: { type: string | null }[],
): boolean {
  return goalEvidence.some((e) => e.type !== null);
}

// Step CRUD

export const isPendingStep = (s: { status: string | null }): boolean =>
  s.status === StepStatus.pending;

export const findFirstPendingIndex = (
  rows: readonly { status: string | null }[],
): number => rows.findIndex(isPendingStep);

/**
 * Query all non-deleted steps for a goal.
 *
 * Ordered by `(ordinal ASC, createdAt ASC)`. The createdAt tie-break makes the
 * display order deterministic when two siblings share an ordinal (e.g. from
 * concurrent CRDT writes). Results are flat — callers that need the parent →
 * children hierarchy run them through {@link groupStepsByParent} (#290).
 *
 * @param goalId - Goal ID
 * @returns Query for steps ordered by ordinal then createdAt ascending
 */
export const stepsByGoalQuery = (goalId: GoalId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("step")
      .selectAll()
      .where("isDeleted", "is", null)
      .where("goalId", "=", goalId)
      .orderBy("ordinal", "asc")
      .orderBy("createdAt", "asc"),
  );

/**
 * A step row plus its sub-steps. Depth is capped at one level — child nodes
 * always carry an empty `children` array (#290).
 */
export interface GroupedStep {
  id: StepId;
  // Evolu types every `selectAll` column as nullable in query results, so the
  // flat row this is built from carries `goalId` as nullable too.
  goalId: GoalId | null;
  parentStepId: StepId | null;
  title: string | null;
  ordinal: number | null;
  status: string | null;
  completedAt: string | null;
  plannedEvidenceTypes: string | null;
  children: GroupedStep[];
}

/** Structural subset of a step query row that {@link groupStepsByParent} reads. */
type StepRowLike = Omit<GroupedStep, "children">;

/**
 * Group a flat, already-ordered step list into a one-level parent → children
 * tree (D1, D10). Pure — no Evolu calls.
 *
 * The one-level depth cap is enforced defensively: a row whose `parentStepId`
 * does not point at a top-level (root) step is promoted to a root rather than
 * being dropped. This guards against orphans (parent soft-deleted) and would-be
 * grandchildren (parent is itself a child).
 *
 * Relative order within each sibling group is preserved from the input, so a
 * `(ordinal, createdAt)`-ordered query yields a `(ordinal, createdAt)`-ordered
 * tree.
 */
export function groupStepsByParent(
  rows: readonly StepRowLike[],
): GroupedStep[] {
  const rootIds = new Set(
    rows.filter((r) => r.parentStepId === null).map((r) => r.id),
  );
  const nodes = new Map<StepId, GroupedStep>(
    rows.map((r) => [r.id, { ...r, children: [] }]),
  );

  const roots: GroupedStep[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parentId = row.parentStepId;
    if (parentId !== null && rootIds.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      // Root, orphan, or would-be grandchild — all surface at the top level.
      roots.push(node);
    }
  }
  return roots;
}

/**
 * Flatten a grouped step tree into render order (D10): each root immediately
 * followed by its children. This is the shape StepList consumes. Pure.
 */
export function flattenGroupedSteps(
  grouped: readonly GroupedStep[],
): GroupedStep[] {
  const out: GroupedStep[] = [];
  for (const root of grouped) {
    out.push(root);
    out.push(...root.children);
  }
  return out;
}

/** Minimal step shape {@link resolveNextActionableStep} reads. */
export interface NextActionableStepInput {
  id: string;
  parentStepId: string | null;
  status: string | null;
}

/**
 * The single next actionable step, tagged by which of the four states it is.
 * `index` is the position of the actionable row in the input `rows` array.
 *
 * - `leaf`   — first pending child under a top-level step; `parentId` is the
 *              container step (use it for the "↳ in [parent]" context line).
 * - `invite` — all of a pending parent's children are done; `childCount` is how
 *              many are done (use it for the "all N substeps done" readout).
 * - `flat`   — a pending top-level step with no children.
 * - `none`   — nothing is pending.
 */
export type NextActionableStep =
  | { kind: "leaf"; index: number; parentId: string }
  | { kind: "invite"; index: number; childCount: number }
  | { kind: "flat"; index: number }
  | { kind: "none" };

/**
 * Resolve the single next actionable step for one goal from a flat row array.
 * Pure — no Evolu calls. Shared by FocusModeScreen (which wants the carousel
 * index) and GoalsScreen (which wants the next-step title + context), so the
 * leaf/invite/flat bucketing and its orphan-promotion rule live in one place
 * (#337) rather than being copy-pasted into each screen.
 *
 * Orphan promotion mirrors {@link groupStepsByParent}: a row whose
 * `parentStepId` is not a present top-level step (parent null, soft-deleted, or
 * itself a child) surfaces as top-level so its pending work stays reachable.
 * Without it a deleted parent would hide its children (#292).
 *
 * A pending child wins *before* its parent's own status is checked, so a
 * manually completed parent that still has pending sub-steps doesn't hide them
 * — step completion is per-step, not cascaded (see {@link completeStep}). A
 * completed top-level step with no pending child is skipped (subtree closed).
 *
 * @param rows Flat rows for a single goal, in the order callers want
 *   "first pending" to mean (e.g. `(ordinal, createdAt)`-ordered).
 */
export function resolveNextActionableStep(
  rows: readonly NextActionableStepInput[],
): NextActionableStep {
  const rootIds = new Set(
    rows.filter((r) => r.parentStepId == null).map((r) => r.id),
  );
  const childrenByParent = new Map<
    string,
    { index: number; status: string | null }[]
  >();
  const topLevel: { id: string; index: number; status: string | null }[] = [];
  rows.forEach((row, index) => {
    if (row.parentStepId != null && rootIds.has(row.parentStepId)) {
      const entry = { index, status: row.status };
      const list = childrenByParent.get(row.parentStepId);
      if (list) list.push(entry);
      else childrenByParent.set(row.parentStepId, [entry]);
    } else {
      topLevel.push({ id: row.id, index, status: row.status });
    }
  });

  for (const step of topLevel) {
    const children = childrenByParent.get(step.id) ?? [];
    const pendingChild = children.find(
      (c) => c.status !== StepStatus.completed,
    );
    // A pending leaf wins even under a completed parent — its work isn't hidden.
    if (pendingChild) {
      return { kind: "leaf", index: pendingChild.index, parentId: step.id };
    }
    // No pending child: skip once the step itself is complete (a flat step, or
    // a parent whose subtree is fully done). Otherwise it's the next action.
    if (step.status === StepStatus.completed) continue;
    // Still pending: a parent whose children are all done is the invite state;
    // a step with no children is a flat pending step.
    if (children.length > 0) {
      return { kind: "invite", index: step.index, childCount: children.length };
    }
    return { kind: "flat", index: step.index };
  }
  return { kind: "none" };
}

/**
 * Create a new step for a goal
 * @param goalId - Goal ID
 * @param title - Step title (trimmed and validated)
 * @param ordinal - Optional ordinal for ordering (defaults to null)
 * @returns Insert command
 * @throws Error if validation fails
 */
export function createStep(
  goalId: GoalId,
  title: string,
  ordinal?: number,
  plannedEvidenceTypes?: readonly string[] | null,
) {
  breadcrumb({ category: "step", message: "create" });
  const parsedTitle = NonEmptyString1000.orNull(title.trim());
  if (!parsedTitle) {
    logger.error("Step title validation failed", {
      goalId,
      titleLength: title.length,
    });
    throw new Error(
      `Step title must be 1-1000 characters (received ${title.length} characters)`,
    );
  }

  const serializedTypes = serializePlannedTypes(plannedEvidenceTypes);

  try {
    return evolu.insert("step", {
      goalId,
      title: parsedTitle,
      status: StepStatus.pending,
      ordinal: ordinal !== undefined ? Int.orNull(ordinal) : null,
      plannedEvidenceTypes:
        serializedTypes === undefined ? null : serializedTypes,
    });
  } catch (error) {
    logger.error("Failed to insert step", {
      goalId,
      title: parsedTitle,
      error,
    });
    throw new Error("Failed to create step. Please try again.");
  }
}

/**
 * Create a sub-step under an existing top-level step (#290).
 *
 * Mirrors {@link createStep}'s validation but stamps `parentStepId`. The
 * one-level depth cap is the caller's responsibility — `parentStepId` must be a
 * top-level step. `ordinal` is sibling-scoped; the caller computes it from the
 * parent's existing children (e.g. `maxChildOrdinal + 1`).
 *
 * @param goalId - Goal ID
 * @param parentStepId - Top-level step this sub-step belongs to
 * @param title - Sub-step title (trimmed and validated)
 * @param ordinal - Optional sibling ordinal (defaults to null)
 * @param plannedEvidenceTypes - Optional evidence requirement
 * @returns Insert command
 * @throws Error if validation fails
 */
export function createSubStep(
  goalId: GoalId,
  parentStepId: StepId,
  title: string,
  ordinal?: number,
  plannedEvidenceTypes?: readonly string[] | null,
) {
  breadcrumb({ category: "step", message: "create" });
  const parsedTitle = NonEmptyString1000.orNull(title.trim());
  if (!parsedTitle) {
    logger.error("Sub-step title validation failed", {
      goalId,
      parentStepId,
      titleLength: title.length,
    });
    throw new Error(
      `Step title must be 1-1000 characters (received ${title.length} characters)`,
    );
  }

  const serializedTypes = serializePlannedTypes(plannedEvidenceTypes);

  try {
    return evolu.insert("step", {
      goalId,
      parentStepId,
      title: parsedTitle,
      status: StepStatus.pending,
      ordinal: ordinal !== undefined ? Int.orNull(ordinal) : null,
      plannedEvidenceTypes:
        serializedTypes === undefined ? null : serializedTypes,
    });
  } catch (error) {
    logger.error("Failed to insert sub-step", {
      goalId,
      parentStepId,
      title: parsedTitle,
      error,
    });
    throw new Error("Failed to create sub-step. Please try again.");
  }
}

/**
 * Update step title and/or ordinal
 * @param id - Step ID
 * @param fields - Fields to update (title, ordinal)
 * @returns Update command
 * @throws Error if validation fails
 */
export function updateStep(
  id: StepId,
  fields: {
    title?: string;
    ordinal?: number | null;
    plannedEvidenceTypes?: readonly string[] | null;
    parentStepId?: StepId | null;
  },
) {
  breadcrumb({ category: "step", message: "update" });
  const update: Record<string, unknown> = { id };

  if (fields.title !== undefined) {
    const parsed = NonEmptyString1000.orNull(fields.title.trim());
    if (!parsed) {
      logger.error("Step title validation failed during update", {
        stepId: id,
        titleLength: fields.title.length,
      });
      throw new Error(
        `Step title must be 1-1000 characters (received ${fields.title.length} characters)`,
      );
    }
    update.title = parsed;
  }

  if (fields.ordinal !== undefined) {
    update.ordinal =
      fields.ordinal !== null ? Int.orNull(fields.ordinal) : null;
  }

  // Reparenting (#290, D9): null promotes a sub-step to top-level; a root
  // step's id demotes a leaf under it. The one-level depth guard lives in the
  // caller (StepList drag handler), not here.
  if (fields.parentStepId !== undefined) {
    update.parentStepId = fields.parentStepId;
  }

  const serializedTypes = serializePlannedTypes(fields.plannedEvidenceTypes);
  if (serializedTypes !== undefined) {
    update.plannedEvidenceTypes = serializedTypes;
  }

  try {
    return evolu.update("step", update as Parameters<typeof evolu.update>[1]);
  } catch (error) {
    logger.error("Failed to update step", { stepId: id, fields, error });
    throw new Error("Failed to update step. Please try again.");
  }
}

/**
 * Mark step as completed after evidence gating.
 *
 * Throws if {@link canCompleteStep} would reject the supplied evidence,
 * with a message that distinguishes "no evidence at all" from "no
 * evidence matching the planned types".
 */
export function completeStep(
  id: StepId,
  plannedEvidenceTypesJson: string | null,
  stepEvidence: { type: string | null }[],
) {
  breadcrumb({ category: "step", message: "toggle" });
  if (!canCompleteStep(plannedEvidenceTypesJson, stepEvidence)) {
    const hasAnyEvidence = stepEvidence.some((e) => e.type !== null);
    throw new Error(
      hasAnyEvidence
        ? "Cannot complete step: no evidence matching the planned types. Add a matching evidence item first."
        : "Cannot complete step: no evidence attached. Add at least one evidence item first.",
    );
  }

  const now = dateToDateIso(new Date());

  if (!now.ok) {
    logger.error("Failed to generate step completion timestamp", {
      stepId: id,
      dateValue: new Date().toISOString(),
    });
    throw new Error("Failed to record completion time. Please try again.");
  }

  try {
    return evolu.update("step", {
      id,
      status: StepStatus.completed,
      completedAt: now.value,
    });
  } catch (error) {
    logger.error("Failed to complete step", { stepId: id, error });
    throw new Error("Failed to complete step. Please try again.");
  }
}

/**
 * Mark step as pending and clear completion timestamp
 * @param id - Step ID
 * @returns Update command
 */
export function uncompleteStep(id: StepId) {
  breadcrumb({ category: "step", message: "toggle" });
  try {
    return evolu.update("step", {
      id,
      status: StepStatus.pending,
      completedAt: null,
    });
  } catch (error) {
    logger.error("Failed to uncomplete step", { stepId: id, error });
    throw new Error("Failed to uncomplete step. Please try again.");
  }
}

/**
 * Soft-delete step (sets isDeleted flag)
 * @param id - Step ID
 * @returns Update command
 */
export function deleteStep(id: StepId) {
  breadcrumb({ category: "step", message: "delete" });
  try {
    return evolu.update("step", { id, isDeleted: sqliteTrue });
  } catch (error) {
    logger.error("Failed to delete step", { stepId: id, error });
    throw new Error("Failed to delete step. Please try again.");
  }
}

/**
 * Assign sequential ordinals (0..n-1) to the supplied step IDs in order.
 * Shared by {@link reorderSteps} (top-level) and {@link reorderSubSteps}
 * (sibling-scoped). `context` is logging-only.
 * @throws Error if any ordinal update fails
 */
function applyStepOrdinals(
  context: { goalId: GoalId; parentStepId?: StepId },
  stepIds: StepId[],
) {
  const failures: { index: number; stepId: string }[] = [];

  stepIds.forEach((stepId, index) => {
    const ordinal = Int.orNull(index);
    // Check for null explicitly, not falsy (0 is valid!)
    if (ordinal !== null) {
      try {
        // Evolu mutations report validation/write failures via a { ok: false }
        // Result instead of throwing, so the Result must be checked or a failed
        // ordinal write would be silently dropped from `failures`.
        const result = evolu.update("step", { id: stepId, ordinal });
        if (!result.ok) {
          logger.error("Failed to update step ordinal", {
            ...context,
            stepId,
            ordinal,
            error: result.error,
          });
          failures.push({ index, stepId });
        }
      } catch (error) {
        logger.error("Failed to update step ordinal", {
          ...context,
          stepId,
          ordinal,
          error,
        });
        failures.push({ index, stepId });
      }
    } else {
      logger.warn("Failed to parse ordinal for step", {
        ...context,
        stepId,
        index,
      });
      failures.push({ index, stepId });
    }
  });

  if (failures.length > 0) {
    logger.error("Step reordering had failures", {
      ...context,
      totalSteps: stepIds.length,
      failureCount: failures.length,
      failures: failures.slice(0, 5), // Log first 5 to avoid huge payloads
    });
    throw new Error(
      `Failed to reorder ${failures.length} of ${stepIds.length} steps. Please try again.`,
    );
  }
}

/**
 * Batch update top-level step ordinals for drag-and-drop reordering
 * @param goalId - Goal ID (for context/logging)
 * @param stepIds - Array of step IDs in desired order
 * @throws Error if any ordinal update fails
 */
export function reorderSteps(goalId: GoalId, stepIds: StepId[]) {
  breadcrumb({ category: "step", message: "reorder" });
  applyStepOrdinals({ goalId }, stepIds);
}

/**
 * Batch update sub-step ordinals within a single parent's sibling group (D4).
 * Same mechanics as {@link reorderSteps}, scoped to one parent's children.
 * @param goalId - Goal ID (for context/logging)
 * @param parentStepId - Parent step whose children are being reordered
 * @param childStepIds - Array of child step IDs in desired order
 * @throws Error if any ordinal update fails
 */
export function reorderSubSteps(
  goalId: GoalId,
  parentStepId: StepId,
  childStepIds: StepId[],
) {
  breadcrumb({ category: "step", message: "reorder" });
  applyStepOrdinals({ goalId, parentStepId }, childStepIds);
}

// Evidence CRUD

/**
 * Query all non-deleted evidence for a goal
 * @param goalId - Goal ID
 * @returns Query for evidence ordered by creation date descending
 */
export const evidenceByGoalQuery = (goalId: GoalId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("evidence")
      .selectAll()
      .where("isDeleted", "is", null)
      .where("goalId", "=", goalId)
      .orderBy("createdAt", "desc"),
  );

/**
 * Query all non-deleted evidence for a step
 * @param stepId - Step ID
 * @returns Query for evidence ordered by creation date descending
 */
export const evidenceByStepQuery = (stepId: StepId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("evidence")
      .selectAll()
      .where("isDeleted", "is", null)
      .where("stepId", "=", stepId)
      .orderBy("createdAt", "desc"),
  );

/**
 * Query all non-deleted step-level evidence for a goal via join.
 * Returns all evidence rows whose step belongs to the given goal,
 * plus the step title for OB3 badge evidence naming.
 * @param goalId - Goal ID
 * @returns Query for step evidence ordered by creation date descending
 */
export const stepEvidenceByGoalQuery = (goalId: GoalId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("evidence")
      .innerJoin("step", "step.id", "evidence.stepId")
      .selectAll("evidence")
      .select(["step.title as stepTitle", "step.ordinal as stepOrdinal"])
      .where("step.goalId", "=", goalId)
      .where("evidence.isDeleted", "is", null)
      .where("step.isDeleted", "is", null)
      .orderBy("evidence.createdAt", "desc"),
  );

/**
 * Create evidence attached to either a goal or a step.
 *
 * Pass `{ goalId }` for goal-level evidence or `{ stepId }` for step-level
 * evidence. The type system enforces exactly one attachment target; a runtime
 * guard provides defense-in-depth for untyped callers.
 *
 * @param params.type - Evidence type (photo, text, link, etc.)
 * @param params.uri - Local file path or URL
 * @param params.description - Optional caption
 * @param params.metadata - Optional JSON metadata string
 * @returns Evolu insert command
 * @throws Error if validation fails or attachment constraint violated
 */
type StepEvidenceParams = { stepId: StepId; goalId?: never };
type GoalEvidenceParams = { goalId: GoalId; stepId?: never };
type CreateEvidenceBase = {
  type: EvidenceTypeValue;
  uri: string;
  description?: string;
  metadata?: string;
};
export type CreateEvidenceParams = (StepEvidenceParams | GoalEvidenceParams) &
  CreateEvidenceBase;

export function createEvidence(params: CreateEvidenceParams) {
  breadcrumb({ category: "evidence", message: "save", kind: params.type });
  const goalId = Object.hasOwn(params, "goalId")
    ? (params as GoalEvidenceParams).goalId
    : undefined;
  const stepId = Object.hasOwn(params, "stepId")
    ? (params as StepEvidenceParams).stepId
    : undefined;

  // Runtime defense-in-depth (type system prevents this at compile time)
  const hasBoth = goalId != null && stepId != null;
  const hasNeither = goalId == null && stepId == null;
  if (hasBoth || hasNeither) {
    logger.error("Evidence attachment constraint violation", {
      hasGoalId: goalId != null,
      hasStepId: stepId != null,
      goalId,
      stepId,
    });
    throw new Error(
      `Evidence must attach to exactly one of goalId or stepId. ` +
        `Received: goalId=${goalId || "null"}, stepId=${stepId || "null"}`,
    );
  }

  const parsedType = NonEmptyString1000.orNull(params.type);
  const parsedUri = NonEmptyString1000.orNull(params.uri);

  if (!parsedType) {
    logger.error("Evidence type validation failed", {
      typeLength: params.type?.length,
    });
    throw new Error(
      `Evidence type must be 1-1000 characters (received ${params.type?.length || 0})`,
    );
  }

  if (!parsedUri) {
    logger.error("Evidence URI validation failed", {
      uriLength: params.uri?.length,
    });
    throw new Error(
      `Evidence URI must be 1-1000 characters (received ${params.uri?.length || 0})`,
    );
  }

  let parsedDescription = null;
  if (params.description) {
    parsedDescription = NonEmptyString1000.orNull(params.description);
    if (!parsedDescription) {
      logger.error("Evidence description validation failed", {
        descriptionLength: params.description.length,
      });
      throw new Error(
        `Evidence description must be 1-1000 characters (received ${params.description.length})`,
      );
    }
  }

  let parsedMetadata = null;
  if (params.metadata) {
    parsedMetadata = NonEmptyString1000.orNull(params.metadata);
    if (!parsedMetadata) {
      logger.error("Evidence metadata validation failed", {
        metadataLength: params.metadata.length,
      });
      throw new Error(
        `Evidence metadata must be 1-1000 characters (received ${params.metadata.length})`,
      );
    }
  }

  try {
    return evolu.insert("evidence", {
      goalId: goalId || null,
      stepId: stepId || null,
      type: parsedType,
      uri: parsedUri,
      description: parsedDescription,
      metadata: parsedMetadata,
    });
  } catch (error) {
    logger.error("Failed to insert evidence", {
      goalId,
      stepId,
      type: parsedType,
      error,
    });
    throw new Error("Failed to create evidence. Please try again.");
  }
}

/**
 * Update evidence description and/or metadata
 * @param id - Evidence ID
 * @param fields - Fields to update (description, metadata)
 * @returns Update command
 */
export function updateEvidence(
  id: EvidenceId,
  fields: { description?: string | null; metadata?: string | null },
) {
  const update: Record<string, unknown> = { id };

  if (fields.description !== undefined) {
    if (fields.description !== null) {
      const parsed = NonEmptyString1000.orNull(fields.description);
      if (!parsed) {
        logger.error("Evidence description validation failed during update", {
          evidenceId: id,
          descriptionLength: fields.description.length,
        });
        throw new Error(
          `Evidence description must be 1-1000 characters (received ${fields.description.length})`,
        );
      }
      update.description = parsed;
    } else {
      update.description = null;
    }
  }

  if (fields.metadata !== undefined) {
    if (fields.metadata !== null) {
      const parsed = NonEmptyString1000.orNull(fields.metadata);
      if (!parsed) {
        logger.error("Evidence metadata validation failed during update", {
          evidenceId: id,
          metadataLength: fields.metadata.length,
        });
        throw new Error(
          `Evidence metadata must be 1-1000 characters (received ${fields.metadata.length})`,
        );
      }
      update.metadata = parsed;
    } else {
      update.metadata = null;
    }
  }

  try {
    return evolu.update(
      "evidence",
      update as Parameters<typeof evolu.update>[1],
    );
  } catch (error) {
    logger.error("Failed to update evidence", {
      evidenceId: id,
      fields,
      error,
    });
    throw new Error("Failed to update evidence. Please try again.");
  }
}

/**
 * Soft-delete evidence (sets isDeleted flag)
 * @param id - Evidence ID
 * @returns Update command
 */
export function deleteEvidence(id: EvidenceId) {
  try {
    return evolu.update("evidence", { id, isDeleted: sqliteTrue });
  } catch (error) {
    logger.error("Failed to delete evidence", { evidenceId: id, error });
    throw new Error("Failed to delete evidence. Please try again.");
  }
}

// Badge CRUD

/**
 * Query all non-deleted badges, ordered by creation date descending
 * @returns Query for all badges
 */
export const badgesQuery = evolu.createQuery((db) =>
  db
    .selectFrom("badge")
    .selectAll()
    .where("isDeleted", "is", null)
    .orderBy("createdAt", "desc"),
);

/**
 * Query badge for a specific goal
 * @param goalId - Goal ID
 * @returns Query for single badge (one badge per goal)
 */
export const badgeByGoalQuery = (goalId: GoalId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("badge")
      .selectAll()
      .where("isDeleted", "is", null)
      .where("goalId", "=", goalId)
      .limit(1),
  );

/**
 * Query a single badge by its ID
 * @param badgeId - Badge ID
 * @returns Query for single badge
 */
export const badgeByIdQuery = (badgeId: BadgeId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("badge")
      .selectAll()
      .where("isDeleted", "is", null)
      .where("id", "=", badgeId)
      .limit(1),
  );

/**
 * Query a single badge by ID joined with its goal data.
 * Returns badge fields plus goal title and completedAt in one query,
 * avoiding the need to load all goals.
 * @param badgeId - Badge ID
 * @returns Query for single badge with goal data
 */
export const badgeWithGoalQuery = (badgeId: BadgeId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("badge")
      .leftJoin("goal", (join) =>
        join
          .onRef("goal.id", "=", "badge.goalId")
          .on("goal.isDeleted", "is", null),
      )
      .select([
        "badge.id",
        "badge.goalId",
        "badge.credential",
        "badge.imageUri",
        "badge.design",
        "badge.createdAt",
        "goal.title as goalTitle",
        "goal.description as goalDescription",
        "goal.icon as goalIcon",
        "goal.completedAt",
        "goal.color as goalColor",
      ])
      .where("badge.isDeleted", "is", null)
      .where("badge.id", "=", badgeId)
      .limit(1),
  );

/**
 * Query all non-deleted badges joined with their goal title,
 * ordered by badge creation date descending (most recent first).
 * Used by the Badges tab list.
 */
export const badgesWithGoalsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("badge")
    .leftJoin("goal", (join) =>
      join
        .onRef("goal.id", "=", "badge.goalId")
        .on("goal.isDeleted", "is", null),
    )
    .select([
      "badge.id",
      "badge.goalId",
      "badge.imageUri",
      "badge.design",
      "badge.createdAt",
      "goal.title as goalTitle",
      "goal.description as goalDescription",
      "goal.completedAt",
    ])
    .where("badge.isDeleted", "is", null)
    .orderBy("badge.createdAt", "desc"),
);

/**
 * Create a badge for a completed goal
 * @param params - Badge parameters
 * @param params.goalId - Goal ID
 * @param params.credential - OB3 Verifiable Credential JSON string
 * @param params.imageUri - Local file path to baked badge image
 * @returns Insert command
 * @throws Error if validation fails
 */
export function createBadge(params: {
  goalId: GoalId;
  credential: string;
  imageUri: string;
  design?: string;
}) {
  const parsedCredential = NonEmptyString.orNull(params.credential);
  const parsedImageUri = NonEmptyString1000.orNull(params.imageUri);

  if (!parsedCredential) {
    logger.error("Badge credential validation failed", {
      credentialLength: params.credential?.length,
    });
    throw new Error(
      `Badge credential must not be empty (received ${params.credential?.length || 0} characters)`,
    );
  }

  if (!parsedImageUri) {
    logger.error("Badge imageUri validation failed", {
      imageUriLength: params.imageUri?.length,
    });
    throw new Error(
      `Badge imageUri must be 1-1000 characters (received ${params.imageUri?.length || 0})`,
    );
  }

  const parsedDesign = params.design
    ? NonEmptyString.orNull(params.design)
    : null;

  try {
    return evolu.insert("badge", {
      goalId: params.goalId,
      credential: parsedCredential,
      imageUri: parsedImageUri,
      design: parsedDesign,
    });
  } catch (error) {
    logger.error("Failed to insert badge", {
      goalId: params.goalId,
      error,
    });
    throw new Error("Failed to create badge. Please try again.");
  }
}

/**
 * Update badge credential and/or imageUri (for re-baking)
 * @param id - Badge ID
 * @param fields - Fields to update (credential, imageUri)
 * @returns Update command
 * @throws Error if validation fails
 */
export function updateBadge(
  id: BadgeId,
  fields: { credential?: string; imageUri?: string; design?: string | null },
) {
  const update: Record<string, unknown> = { id };

  if (fields.credential !== undefined) {
    const parsed = NonEmptyString.orNull(fields.credential);
    if (!parsed) {
      logger.error("Badge credential validation failed during update", {
        badgeId: id,
        credentialLength: fields.credential?.length,
      });
      throw new Error(
        `Badge credential must not be empty (received ${fields.credential?.length || 0} characters)`,
      );
    }
    update.credential = parsed;
  }

  if (fields.imageUri !== undefined) {
    const parsed = NonEmptyString1000.orNull(fields.imageUri);
    if (!parsed) {
      logger.error("Badge imageUri validation failed during update", {
        badgeId: id,
        imageUriLength: fields.imageUri?.length,
      });
      throw new Error(
        `Badge imageUri must be 1-1000 characters (received ${fields.imageUri?.length || 0})`,
      );
    }
    update.imageUri = parsed;
  }

  if (fields.design !== undefined) {
    if (fields.design !== null) {
      const parsed = NonEmptyString.orNull(fields.design);
      if (!parsed) {
        logger.error("Badge design validation failed during update", {
          badgeId: id,
          designLength: fields.design?.length,
        });
        throw new Error(
          `Badge design must not be empty (received ${fields.design?.length || 0} characters)`,
        );
      }
      update.design = parsed;
    } else {
      update.design = null;
    }
  }

  try {
    return evolu.update("badge", update as Parameters<typeof evolu.update>[1]);
  } catch (error) {
    logger.error("Failed to update badge", { badgeId: id, fields, error });
    throw new Error("Failed to update badge. Please try again.");
  }
}

/**
 * Soft-delete badge (sets isDeleted flag)
 * @param id - Badge ID
 * @returns Update command
 */
export function deleteBadge(id: BadgeId) {
  try {
    return evolu.update("badge", { id, isDeleted: sqliteTrue });
  } catch (error) {
    logger.error("Failed to delete badge", { badgeId: id, error });
    throw new Error("Failed to delete badge. Please try again.");
  }
}

// UserSettings CRUD

/**
 * Query the single settings row (singleton pattern)
 * @returns Query for user settings (one row expected)
 */
export const userSettingsQuery = evolu.createQuery((db) =>
  db
    .selectFrom("userSettings")
    .selectAll()
    .where("isDeleted", "is", null)
    .limit(1),
);

/**
 * Create default user settings row
 * Should only be called once during app initialization
 * @returns Insert command
 */
export function createUserSettings() {
  try {
    return evolu.insert("userSettings", {});
  } catch (error) {
    logger.error("Failed to create user settings", { error });
    throw new Error(
      "Failed to initialize app settings. Please reinstall the app.",
    );
  }
}

function validateString1000Field(
  value: string | null | undefined,
  fieldKey: string,
  errorLabel: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const parsed = NonEmptyString1000.orNull(value);
  if (!parsed) {
    logger.error(`UserSettings ${fieldKey} validation failed`, {
      [`${fieldKey}Length`]: value.length,
    });
    throw new Error(
      `${errorLabel} must be 1-1000 characters (received ${value.length})`,
    );
  }
  return parsed;
}

function validateIntField(
  value: number | null | undefined,
  fieldKey: string,
  errorLabel: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const parsed = Int.orNull(value);
  if (parsed === null) {
    logger.error(`UserSettings ${fieldKey} validation failed`, {
      [fieldKey]: value,
    });
    throw new Error(`${errorLabel} must be an integer (received ${value})`);
  }
  return parsed;
}

/**
 * Update user settings fields
 * @param id - UserSettings ID (from userSettingsQuery)
 * @param fields - Fields to update
 * @returns Update command
 * @throws Error if validation fails
 */
export function updateUserSettings(
  id: UserSettingsId,
  fields: {
    theme?: string | null;
    density?: string | null;
    animationPref?: string | null;
    fontScale?: number | null;
    focusTimelineHidden?: number | null;
  },
) {
  const update: Record<string, unknown> = { id };

  const theme = validateString1000Field(fields.theme, "theme", "Theme");
  if (theme !== undefined) update.theme = theme;

  const density = validateString1000Field(fields.density, "density", "Density");
  if (density !== undefined) update.density = density;

  const animationPref = validateString1000Field(
    fields.animationPref,
    "animationPref",
    "Animation preference",
  );
  if (animationPref !== undefined) update.animationPref = animationPref;

  const fontScale = validateIntField(
    fields.fontScale,
    "fontScale",
    "Font scale",
  );
  if (fontScale !== undefined) update.fontScale = fontScale;

  const focusTimelineHidden = validateIntField(
    fields.focusTimelineHidden,
    "focusTimelineHidden",
    "focusTimelineHidden",
  );
  if (focusTimelineHidden !== undefined) {
    update.focusTimelineHidden = focusTimelineHidden;
  }

  try {
    return evolu.update(
      "userSettings",
      update as Parameters<typeof evolu.update>[1],
    );
  } catch (error) {
    logger.error("Failed to update user settings", {
      settingsId: id,
      fields,
      error,
    });
    throw new Error("Failed to update settings. Please try again.");
  }
}

/**
 * Mark the welcome screen as seen.
 * Called once after the user taps "Get Started".
 * Idempotent — safe to call if already set.
 */
export function markWelcomeSeen(id: UserSettingsId) {
  return evolu.update("userSettings", {
    id,
    hasSeenWelcome: Int.orThrow(1),
  } as Parameters<typeof evolu.update>[1]);
}

/**
 * Store the keyId for the user's Ed25519 keypair
 * Called once after key generation — keyId references the key in SecureStore
 */
export function updateUserSettingsKey(id: UserSettingsId, keyId: string) {
  const parsed = NonEmptyString1000.orNull(keyId);
  if (!parsed) {
    throw new Error(
      `Key ID must be 1-1000 characters (received ${keyId.length})`,
    );
  }
  try {
    return evolu.update("userSettings", {
      id,
      keyId: parsed,
    } as Parameters<typeof evolu.update>[1]);
  } catch (error) {
    logger.error("Failed to store keyId in user settings", {
      settingsId: id,
      error,
    });
    throw new Error("Failed to save key reference. Please try again.");
  }
}

/**
 * Clear an orphaned keyId from user settings.
 * Called by useUserKey when the stored keyId points to a SecureStore entry
 * that no longer exists (e.g. after an iOS keychain wipe). Setting it to null
 * lets the generation effect re-run and produce a fresh keypair.
 */
export function clearUserSettingsKey(id: UserSettingsId) {
  try {
    return evolu.update("userSettings", {
      id,
      keyId: null,
    } as Parameters<typeof evolu.update>[1]);
  } catch (error) {
    logger.error("Failed to clear keyId in user settings", {
      settingsId: id,
      error,
    });
    throw new Error("Failed to clear key reference. Please try again.");
  }
}
