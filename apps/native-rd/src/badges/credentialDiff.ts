/**
 * credentialDiff
 *
 * Compares a baked credential's frozen snapshot against the current goal +
 * evidence state to decide whether a re-completion warrants offering a
 * rebake.
 *
 * Conservative: parse errors or unrecognised shapes return `true` so the
 * user is offered a rebake rather than silently completing against a
 * stale badge.
 */
import type { GoalData, EvidenceRow } from "./credentialBuilder";
import { expectedAchievementDescription } from "./expectedAchievementDescription";

/**
 * Returns true when the goal/evidence state has diverged from the
 * credential's snapshot.
 *
 * Compared fields:
 *   - top-level `evidence[]` length
 *   - `credentialSubject.achievement.name` vs goal.title
 *   - `credentialSubject.achievement.description` vs the same fallback rule
 *     used at bake time
 *
 * Step evidence rows are folded into the credential's `evidence[]` array
 * at bake time (see credentialBuilder), so the merged count is the right
 * thing to diff. Callers should pass the same merged array they'd pass
 * to buildUnsignedCredential.
 */
export function hasChangesSinceBake(
  credentialJson: string | null | undefined,
  currentGoal: GoalData,
  currentEvidence: readonly EvidenceRow[],
): boolean {
  if (!credentialJson) return true;

  let parsed: unknown;
  try {
    parsed = JSON.parse(credentialJson);
  } catch {
    return true;
  }
  if (!parsed || typeof parsed !== "object") return true;

  const credential = parsed as Record<string, unknown>;

  const evidence = Array.isArray(credential.evidence)
    ? credential.evidence
    : null;
  if (!evidence) return true;
  if (evidence.length !== currentEvidence.length) return true;

  const subject = credential.credentialSubject as
    | Record<string, unknown>
    | undefined;
  const achievement = subject?.achievement as
    | Record<string, unknown>
    | undefined;
  if (!achievement) return true;

  if (achievement.name !== currentGoal.title) return true;
  if (achievement.description !== expectedAchievementDescription(currentGoal))
    return true;

  return false;
}
