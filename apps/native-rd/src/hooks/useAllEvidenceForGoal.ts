import { useMemo } from "react";
import { useQuery } from "@evolu/react";
import {
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  EvidenceType,
  type GoalId,
} from "../db";
import {
  validateEvidenceType,
  type EvidenceTypeValue,
} from "../types/evidence";
import type { Evidence } from "../components/EvidenceThumbnail";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useAllEvidenceForGoal");

export type EvidenceSource = "step" | "goal";

/**
 * Combined evidence shape used by the viewer. The discriminant `source`
 * encodes which fields are present: goal-level rows never have a step,
 * step-level rows always carry their stepId.
 */
export type ViewerEvidence = Evidence &
  (
    | { source: "goal"; stepId: null; stepTitle: null }
    | { source: "step"; stepId: string; stepTitle: string | null }
  );

/**
 * Step evidence ordered by step.ordinal asc (createdAt desc within step),
 * followed by goal-level evidence (createdAt desc). Drives the viewer's
 * thumbnail strip.
 */
export function useAllEvidenceForGoal(goalId: GoalId): ViewerEvidence[] {
  const stepEvidenceRows = useQuery(stepEvidenceByGoalQuery(goalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId));

  return useMemo(() => {
    const stepItems = stepEvidenceRows
      .filter(
        (row): row is typeof row & { stepId: string } => row.stepId != null,
      )
      .map((row, idx) => ({
        item: {
          id: row.id,
          title: row.description ?? row.type ?? "Evidence",
          type: normalizeEvidenceType(row.type, row.id),
          uri: row.uri ?? undefined,
          metadata: row.metadata ?? undefined,
          source: "step",
          stepId: row.stepId,
          stepTitle: (row.stepTitle as string | null) ?? null,
        } satisfies ViewerEvidence,
        ordinal: parseStepOrdinal(row.stepOrdinal, row.id),
        idx,
      }));

    // Stable sort by ordinal; idx tiebreak keeps the createdAt-desc order
    // already enforced by stepEvidenceByGoalQuery, regardless of engine.
    stepItems.sort((a, b) => a.ordinal - b.ordinal || a.idx - b.idx);

    const goalItems: ViewerEvidence[] = goalEvidenceRows.map((row) => ({
      id: row.id,
      title: row.description ?? row.type ?? "Evidence",
      type: normalizeEvidenceType(row.type, row.id),
      uri: row.uri ?? undefined,
      metadata: row.metadata ?? undefined,
      source: "goal",
      stepId: null,
      stepTitle: null,
    }));

    return [...stepItems.map((s) => s.item), ...goalItems];
  }, [stepEvidenceRows, goalEvidenceRows]);
}

/**
 * Map a raw `evidence.type` to the validated enum value. Logs when a
 * non-null value falls back to `file`, which signals schema drift.
 */
function normalizeEvidenceType(
  rawType: string | null,
  evidenceId: string,
): EvidenceTypeValue {
  if (rawType == null) return EvidenceType.file;
  const validated = validateEvidenceType(rawType);
  if (validated === EvidenceType.file && rawType !== EvidenceType.file) {
    logger.warn("Unknown evidence type, falling back to 'file'", {
      evidenceId,
      rawType,
    });
  }
  return validated;
}

function parseStepOrdinal(value: unknown, evidenceId: string): number {
  if (typeof value === "number") return value;
  if (value == null) return Number.MAX_SAFE_INTEGER;
  logger.warn("Unexpected stepOrdinal type from join", {
    evidenceId,
    valueType: typeof value,
  });
  return Number.MAX_SAFE_INTEGER;
}
