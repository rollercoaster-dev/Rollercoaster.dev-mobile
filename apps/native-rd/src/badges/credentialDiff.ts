/**
 * Detection helpers for the "completion-only baking" invariant.
 *
 * A baked badge is a proof artifact of a completion event. It is immutable
 * except by another completion event. These helpers decide whether the next
 * completion of a goal should produce a fresh credential + PNG (a "rebake")
 * or short-circuit because the current badge already matches the user's state.
 *
 * See: apps/native-rd/docs/plans/2026-05-14-badge-rebake-on-reopen.md
 */

const EVIDENCE_ID_PREFIX = "urn:ulid:";

/**
 * Pull the evidence ID set out of a stored OB3 credential.
 *
 * The credential builder emits evidence IDs as `urn:ulid:<rawId>`; we strip
 * that prefix here so callers can set-compare against raw DB IDs without
 * leaking serialization details.
 *
 * Throws on malformed JSON — a credential we cannot parse means we can't
 * make a safe decision about rebake, and silently treating that as "no
 * change" would leave the user with a stale baked artifact.
 */
function extractEvidenceIdsFromCredential(credentialJson: string): Set<string> {
  const parsed: unknown = JSON.parse(credentialJson);
  const evidence = (parsed as { evidence?: unknown })?.evidence;
  if (!Array.isArray(evidence)) return new Set();

  const ids = new Set<string>();
  for (const entry of evidence) {
    const id = (entry as { id?: unknown })?.id;
    if (typeof id !== "string") continue;
    ids.add(
      id.startsWith(EVIDENCE_ID_PREFIX)
        ? id.slice(EVIDENCE_ID_PREFIX.length)
        : id,
    );
  }
  return ids;
}

/** True when the evidence IDs in the stored credential differ from current evidence. */
export function evidenceIdsDifferFromCredential(
  credentialJson: string,
  currentEvidence: readonly { id: string }[],
): boolean {
  const credentialIds = extractEvidenceIdsFromCredential(credentialJson);
  const currentIds = new Set(currentEvidence.map((e) => e.id));

  if (credentialIds.size !== currentIds.size) return true;
  for (const id of currentIds) {
    if (!credentialIds.has(id)) return true;
  }
  return false;
}

/**
 * True when the badge row has been updated after creation.
 *
 * The only mutation that updates an existing badge row is the Designer
 * saving a new `design` (the bake pipeline always inserts a new row).
 * Evolu maintains `createdAt` and `updatedAt` as system columns, so this
 * is a free signal with no schema change.
 *
 * A small (sub-second) skew between the two is treated as "no change"
 * because Evolu's update path can touch `updatedAt` on no-op writes; the
 * 1s grace window is well below any human-visible delay between insert
 * and the first design save.
 */
const DESIGN_CHANGE_THRESHOLD_MS = 1000;

export function designChangedSinceBake(badge: {
  createdAt: string | null;
  updatedAt: string | null;
}): boolean {
  if (!badge.updatedAt || !badge.createdAt) return false;
  const created = Date.parse(badge.createdAt);
  const updated = Date.parse(badge.updatedAt);
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return updated - created > DESIGN_CHANGE_THRESHOLD_MS;
}

/**
 * Combined rebake trigger: re-completion should produce a fresh credential
 * iff evidence has changed since the bake OR the design has been edited.
 */
export function shouldRebake(
  badge: {
    credential: string;
    createdAt: string | null;
    updatedAt: string | null;
  },
  currentEvidence: readonly { id: string }[],
): boolean {
  if (designChangedSinceBake(badge)) return true;
  return evidenceIdsDifferFromCredential(badge.credential, currentEvidence);
}
