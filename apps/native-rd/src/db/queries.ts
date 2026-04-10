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
import { Logger } from "../shims/rd-logger";
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

// Initialize logger for database operations
const logger = new Logger();

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
 * Create a new goal with given title
 * @param title - Goal title (trimmed and validated)
 * @returns Insert command
 * @throws Error if validation fails
 */
export function createGoal(title: string) {
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

  const parsedStatus = NonEmptyString1000.orThrow(GoalStatus.active);

  try {
    return evolu.insert("goal", {
      title: parsedTitle,
      status: parsedStatus,
    });
  } catch (error) {
    logger.error("Failed to insert goal", { title: parsedTitle, error });
    throw new Error("Failed to create goal. Please try again.");
  }
}

/**
 * Update goal title and/or description
 * @param id - Goal ID
 * @param fields - Fields to update (title, description)
 * @returns Update command
 * @throws Error if validation fails
 */
export function updateGoal(
  id: GoalId,
  fields: { title?: string; description?: string | null },
) {
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
  goalEvidence: Array<{ type: string | null }>,
) {
  if (!canCompleteGoal(goalEvidence)) {
    throw new Error(
      "Cannot complete goal: no evidence attached. Add at least one evidence item first.",
    );
  }

  const parsedStatus = NonEmptyString1000.orThrow(GoalStatus.completed);
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
      status: parsedStatus,
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
  const parsedStatus = NonEmptyString1000.orThrow(GoalStatus.active);

  try {
    return evolu.update("goal", {
      id,
      status: parsedStatus,
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
 * evidence item must match a planned type. If null, any evidence suffices.
 *
 * @param plannedEvidenceTypesJson - Value from step.plannedEvidenceTypes column (JSON string or null)
 * @param stepEvidence - All non-deleted evidence rows for this step
 * @returns true if the step can be completed
 */
export function canCompleteStep(
  plannedEvidenceTypesJson: string | null,
  stepEvidence: Array<{ type: string | null }>,
): boolean {
  const validEvidence = stepEvidence.filter((e) => e.type !== null);
  if (validEvidence.length === 0) return false;

  const plannedTypes = parsePlannedEvidenceTypes(
    plannedEvidenceTypesJson,
    logger,
  );
  if (plannedTypes === null) return true;

  return validEvidence.some((e) => plannedTypes.includes(e.type!));
}

/**
 * Check if a goal has at least one goal-level evidence item.
 *
 * @param goalEvidence - All non-deleted evidence rows attached directly to the goal
 * @returns true if the goal can be completed
 */
export function canCompleteGoal(
  goalEvidence: Array<{ type: string | null }>,
): boolean {
  return goalEvidence.some((e) => e.type !== null);
}

// Step CRUD

/**
 * Query all non-deleted steps for a goal, ordered by ordinal
 * @param goalId - Goal ID
 * @returns Query for steps ordered by ordinal ascending
 */
export const stepsByGoalQuery = (goalId: GoalId) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("step")
      .selectAll()
      .where("isDeleted", "is", null)
      .where("goalId", "=", goalId)
      .orderBy("ordinal", "asc"),
  );

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

  const parsedStatus = NonEmptyString1000.orThrow(StepStatus.pending);
  const serializedTypes = serializePlannedTypes(plannedEvidenceTypes);

  try {
    return evolu.insert("step", {
      goalId,
      title: parsedTitle,
      status: parsedStatus,
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
  },
) {
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
 * Mark step as completed with current timestamp
 * @param id - Step ID
 * @returns Update command
 * @throws Error if timestamp generation fails
 */
export function completeStep(
  id: StepId,
  plannedEvidenceTypesJson: string | null,
  stepEvidence: Array<{ type: string | null }>,
) {
  if (!canCompleteStep(plannedEvidenceTypesJson, stepEvidence)) {
    const hasAnyEvidence = stepEvidence.some((e) => e.type !== null);
    throw new Error(
      hasAnyEvidence
        ? "Cannot complete step: no evidence matching the planned types. Add a matching evidence item first."
        : "Cannot complete step: no evidence attached. Add at least one evidence item first.",
    );
  }

  const parsedStatus = NonEmptyString1000.orThrow(StepStatus.completed);
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
      status: parsedStatus,
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
  const parsedStatus = NonEmptyString1000.orThrow(StepStatus.pending);

  try {
    return evolu.update("step", {
      id,
      status: parsedStatus,
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
  try {
    return evolu.update("step", { id, isDeleted: sqliteTrue });
  } catch (error) {
    logger.error("Failed to delete step", { stepId: id, error });
    throw new Error("Failed to delete step. Please try again.");
  }
}

/**
 * Batch update step ordinals for drag-and-drop reordering
 * @param goalId - Goal ID (for context/logging)
 * @param stepIds - Array of step IDs in desired order
 * @throws Error if any ordinal update fails
 */
export function reorderSteps(goalId: GoalId, stepIds: StepId[]) {
  const failures: { index: number; stepId: string }[] = [];

  stepIds.forEach((stepId, index) => {
    const ordinal = Int.orNull(index);
    // Fixed: Check for null explicitly, not falsy (0 is valid!)
    if (ordinal !== null) {
      try {
        evolu.update("step", { id: stepId, ordinal });
      } catch (error) {
        logger.error("Failed to update step ordinal", {
          goalId,
          stepId,
          ordinal: index,
          error,
        });
        failures.push({ index, stepId });
      }
    } else {
      logger.warn("Failed to parse ordinal for step", {
        goalId,
        stepId,
        index,
      });
      failures.push({ index, stepId });
    }
  });

  if (failures.length > 0) {
    logger.error("Step reordering had failures", {
      goalId,
      totalSteps: stepIds.length,
      failureCount: failures.length,
      failures: failures.slice(0, 5), // Log first 5 to avoid huge payloads
    });
    throw new Error(
      `Failed to reorder ${failures.length} of ${stepIds.length} steps. Please try again.`,
    );
  }
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
      .select("step.title as stepTitle")
      .where("step.goalId", "=", goalId)
      .where("evidence.isDeleted", "is", null)
      .where("step.isDeleted", "is", null)
      .orderBy("evidence.createdAt", "desc"),
  );

/**
 * Create evidence attached to either a goal or a step
 * @param params - Evidence parameters
 * @param params.goalId - Goal ID (exactly one of goalId/stepId required)
 * @param params.stepId - Step ID (exactly one of goalId/stepId required)
 * @param params.type - Evidence type (photo, screenshot, text, etc.)
 * @param params.uri - Local file path or URL
 * @param params.description - Optional caption
 * @param params.metadata - Optional JSON metadata string
 * @returns Insert command
 * @throws Error if validation fails or constraint violated
 */
type StepEvidenceParams = { stepId: StepId; goalId?: never };
type GoalEvidenceParams = { goalId: GoalId; stepId?: never };
type CreateEvidenceBase = {
  type: string;
  uri: string;
  description?: string;
  metadata?: string;
};
export type CreateEvidenceParams = (StepEvidenceParams | GoalEvidenceParams) &
  CreateEvidenceBase;

export function createEvidence(params: CreateEvidenceParams) {
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

/**
 * Restore soft-deleted evidence (clears isDeleted flag).
 * Evolu's update type doesn't expose null for isDeleted, but the DB column
 * is nullOr(SqliteBoolean) and all queries filter on `isDeleted IS NULL`.
 * @param id - Evidence ID
 * @returns Update command
 */
export function restoreEvidence(id: EvidenceId) {
  try {
    return evolu.update("evidence", { id, isDeleted: null as never });
  } catch (error) {
    logger.error("Failed to restore evidence", { evidenceId: id, error });
    throw new Error("Failed to restore evidence. Please try again.");
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

/**
 * Update user settings fields
 * @param id - UserSettings ID (from userSettingsQuery)
 * @param fields - Fields to update (theme, density, animationPref, fontScale)
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
  },
) {
  const update: Record<string, unknown> = { id };

  if (fields.theme !== undefined) {
    if (fields.theme !== null) {
      const parsed = NonEmptyString1000.orNull(fields.theme);
      if (!parsed) {
        logger.error("UserSettings theme validation failed", {
          themeLength: fields.theme.length,
        });
        throw new Error(
          `Theme must be 1-1000 characters (received ${fields.theme.length})`,
        );
      }
      update.theme = parsed;
    } else {
      update.theme = null;
    }
  }

  if (fields.density !== undefined) {
    if (fields.density !== null) {
      const parsed = NonEmptyString1000.orNull(fields.density);
      if (!parsed) {
        logger.error("UserSettings density validation failed", {
          densityLength: fields.density.length,
        });
        throw new Error(
          `Density must be 1-1000 characters (received ${fields.density.length})`,
        );
      }
      update.density = parsed;
    } else {
      update.density = null;
    }
  }

  if (fields.animationPref !== undefined) {
    if (fields.animationPref !== null) {
      const parsed = NonEmptyString1000.orNull(fields.animationPref);
      if (!parsed) {
        logger.error("UserSettings animationPref validation failed", {
          animationPrefLength: fields.animationPref.length,
        });
        throw new Error(
          `Animation preference must be 1-1000 characters (received ${fields.animationPref.length})`,
        );
      }
      update.animationPref = parsed;
    } else {
      update.animationPref = null;
    }
  }

  if (fields.fontScale !== undefined) {
    if (fields.fontScale !== null) {
      const parsed = Int.orNull(fields.fontScale);
      if (parsed === null) {
        logger.error("UserSettings fontScale validation failed", {
          fontScale: fields.fontScale,
        });
        throw new Error(
          `Font scale must be an integer (received ${fields.fontScale})`,
        );
      }
      update.fontScale = parsed;
    } else {
      update.fontScale = null;
    }
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
