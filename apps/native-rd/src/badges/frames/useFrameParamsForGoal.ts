import { useQuery } from "@evolu/react";
import { useMemo } from "react";
import {
  stepsByGoalQuery,
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
} from "../../db/queries";
import type { GoalId } from "../../db/schema";
import type { FrameDataParams } from "../types";
import { computeFrameParams } from "./dataMapper";

/** Sentinel for the brief window before goal data hydrates. */
const PLACEHOLDER_GOAL_ID = "" as GoalId;

/**
 * Returns derived FrameDataParams for a goal. When `goalId` or `createdAt`
 * is null (data still hydrating), returns null — callers should refrain
 * from writing frameParams onto a design until real values land.
 */
export function useFrameParamsForGoal(
  goalId: GoalId | null,
  createdAt: string | null,
  completedAt: string | null,
): FrameDataParams | null {
  const queryGoalId = goalId ?? PLACEHOLDER_GOAL_ID;
  const stepsQuery = useMemo(
    () => stepsByGoalQuery(queryGoalId),
    [queryGoalId],
  );
  const goalEvidenceQuery = useMemo(
    () => evidenceByGoalQuery(queryGoalId),
    [queryGoalId],
  );
  const stepEvidenceQuery = useMemo(
    () => stepEvidenceByGoalQuery(queryGoalId),
    [queryGoalId],
  );

  const steps = useQuery(stepsQuery);
  const goalEvidence = useQuery(goalEvidenceQuery);
  const stepEvidence = useQuery(stepEvidenceQuery);

  return useMemo(() => {
    if (goalId === null || createdAt === null) return null;
    const stepNames = steps.map((s: { title: string | null }) =>
      String(s.title),
    );
    const allEvidence = [...goalEvidence, ...stepEvidence];
    const uniqueTypes = new Set(allEvidence.map((e) => String(e.type)));

    return computeFrameParams({
      stepCount: steps.length,
      stepNames,
      evidenceCount: allEvidence.length,
      evidenceTypes: uniqueTypes.size,
      createdAt,
      completedAt,
    });
  }, [goalId, steps, goalEvidence, stepEvidence, createdAt, completedAt]);
}
