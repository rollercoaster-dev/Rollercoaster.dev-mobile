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

/**
 * Convenience hook: queries Evolu for goal steps and evidence,
 * then derives FrameDataParams via computeFrameParams.
 */
export function useFrameParamsForGoal(
  goalId: GoalId,
  createdAt: string,
  completedAt: string | null,
): FrameDataParams {
  const stepsQuery = useMemo(() => stepsByGoalQuery(goalId), [goalId]);
  const goalEvidenceQuery = useMemo(
    () => evidenceByGoalQuery(goalId),
    [goalId],
  );
  const stepEvidenceQuery = useMemo(
    () => stepEvidenceByGoalQuery(goalId),
    [goalId],
  );

  const steps = useQuery(stepsQuery);
  const goalEvidence = useQuery(goalEvidenceQuery);
  const stepEvidence = useQuery(stepEvidenceQuery);

  return useMemo(() => {
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
  }, [steps, goalEvidence, stepEvidence, createdAt, completedAt]);
}
