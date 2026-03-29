import type { FrameDataParams } from "../types";

const MS_PER_DAY = 86_400_000;

/** Input shape for the pure computeFrameParams function. */
export type ComputeFrameParamsInput = {
  stepCount: number;
  stepNames: string[];
  evidenceCount: number;
  evidenceTypes: number;
  createdAt: string;
  completedAt: string | null;
};

/**
 * Pure function: maps raw goal journey stats to FrameDataParams.
 *
 * - Pass-through fields: stepCount, evidenceCount, evidenceTypes
 * - stepNames: included when non-empty, undefined when empty
 * - daysToComplete: whole-day diff between createdAt and completedAt (or now)
 * - variant: always 0 (reserved for future use)
 */
export function computeFrameParams(
  input: ComputeFrameParamsInput,
): FrameDataParams {
  const startMs = Date.parse(input.createdAt);
  const endMs =
    input.completedAt !== null ? Date.parse(input.completedAt) : Date.now();

  let daysToComplete = 0;
  if (!isNaN(startMs) && !isNaN(endMs)) {
    daysToComplete = Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));
  }

  return {
    variant: 0,
    stepCount: input.stepCount,
    evidenceCount: input.evidenceCount,
    evidenceTypes: input.evidenceTypes,
    daysToComplete,
    ...(input.stepNames.length > 0 ? { stepNames: input.stepNames } : {}),
  };
}
