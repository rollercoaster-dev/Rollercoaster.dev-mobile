/**
 * Is a goal sealed — completed, with its badge on record?
 *
 * A sealed goal's finishing flow is over: `CompletionFlowScreen` opens it on
 * the read-only reveal (#563), so every entry into that flow (the Timeline's
 * `FinishLine`, Focus Mode's all-complete card) must offer "View badge"
 * rather than promise a design pass (#653). One predicate, so the three
 * screens cannot drift on what "sealed" means.
 *
 * Like `evidenceGate.ts`, this is a pure function over row shapes with no
 * Evolu runtime dependency, imported from this leaf module rather than the
 * `db` barrel.
 *
 * A completed goal with no badge row (legacy data — the live bake writes the
 * badge before it flips the goal) is deliberately *not* sealed: the flow must
 * stay walkable so the user can still bake.
 */
import { GoalStatus } from "./schema";

/** The one goal column the predicate reads. */
export interface GoalSealGoal {
  readonly status: string | null;
}

export function isGoalSealed(
  goal: GoalSealGoal | null | undefined,
  badgeRow: object | null | undefined,
): boolean {
  if (!goal) return false;
  return goal.status === GoalStatus.completed && badgeRow != null;
}
