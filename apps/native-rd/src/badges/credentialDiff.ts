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
 *   - the set of evidence ids (folded current goal + step evidence, vs the
 *     credential's `evidence[].id` which is serialized as `urn:ulid:<id>`)
 *   - `credentialSubject.achievement.name` vs goal.title
 *   - `credentialSubject.achievement.description` vs the same fallback rule
 *     used at bake time
 *
 * Step evidence rows are folded into the credential's `evidence[]` array
 * at bake time (see credentialBuilder), so the merged set is the right
 * thing to diff. Callers should pass the same merged array they'd pass
 * to buildUnsignedCredential.
 *
 * NOT compared (known limitation): per-evidence description / stepTitle /
 * genre / name edits where the id set is unchanged. A user who edits the
 * description of an existing row without adding or removing rows will be
 * silently re-completed against the stale credential. Tracked separately.
 */
const EVIDENCE_ID_PREFIX = "urn:ulid:";

function currentEvidenceIdSet(
  rows: readonly EvidenceRow[],
): ReadonlySet<string> {
  return new Set(rows.map((row) => `${EVIDENCE_ID_PREFIX}${row.id}`));
}

function credentialEvidenceIdSet(
  evidence: readonly unknown[],
): ReadonlySet<string> | null {
  const ids = new Set<string>();
  for (const item of evidence) {
    if (!item || typeof item !== "object") return null;
    const id = (item as Record<string, unknown>).id;
    if (typeof id !== "string") return null;
    ids.add(id);
  }
  return ids;
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

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

  const credentialIds = credentialEvidenceIdSet(evidence);
  if (!credentialIds) return true;
  if (!setsEqual(credentialIds, currentEvidenceIdSet(currentEvidence)))
    return true;

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
