# Rebake badge on reopen + update, with a strict "completion-only baking" rule

**Status:** Active — opened 2026-05-14
**Tracking issue:** [#15](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/15)

## Context

Today, when a user reopens a completed goal (`CompletionFlowScreen.tsx:209` → `uncompleteGoal`), adds new evidence in FocusMode, and returns to CompletionFlow to complete it again, the badge silently stays as the original baked artifact. `useCreateBadge.ts:125-130` short-circuits on `existingBadge` and reports `done` against a credential that no longer reflects the user's evidence.

There is a deeper invariant we want to make explicit and enforce in this work:

> **Only goal completion may bake.** The Badge Designer updates the `design` JSON only. It never touches the signed credential or the baked PNG. A baked badge is a proof artifact of a completion event — it is immutable except by another completion event.

That rule has a user-visible consequence: when a user redesigns a badge in the Designer without reopening the goal, the visible baked image stays as it was. We need to communicate this state honestly without breaking the invariant.

The goal of this plan is to land all three threads at once: (1) make re-completion produce a fresh signed credential and PNG, (2) preserve the prior credential as audit history, (3) signal to the user when the visible badge is out of sync with their current design and point them at the action that resolves it.

## Decisions

| Question | Decision | Why |
| --- | --- | --- |
| When is the user warned? | **Alert at Reopen**, not at re-complete | Decision belongs at the destructive act. Keeps the celebration moment clean. ND-friendly: no modal interrupts at the payoff. |
| When is the rebake confirmed? | **Never** — `useCreateBadge` auto-detects | Reopen already expressed intent. Re-asking is friction. |
| What triggers a rebake at re-completion? | `evidenceChanged OR designChangedSinceBake` | Both states justify a new credential. Same-evidence + same-design = same-credential = short-circuit. |
| How is "evidence changed" detected? | Compare evidence ID set in `existingBadge.credential.evidence[].id` against current `goalEvidence ∪ stepEvidence` IDs | Robust to add/remove. Edge case (description-only edits) deliberately deferred. |
| How is "design changed since bake" detected? | `badge.updatedAt > badge.createdAt` — Evolu maintains both as system columns | Free signal, no schema change. The only mutation that updates an existing badge row is the Designer saving a new `design`. |
| What does "rebake" do at the row level? | Insert a new `badge` row, then soft-delete the old | Audit trail; `badgeByGoalQuery` already filters `isDeleted IS NULL` so the new row becomes canonical. |
| Order of mutations | `createBadge` first, then `deleteBadge` | If signing/baking throws, the old row stays intact. No partial state. |
| Does the Designer ever bake? | **No.** | Strict invariant. Designer updates `design` JSON only. |
| How is an "outdated" canonical badge signaled? | **Dashed amber frame** + caption **"Design updated · Reopen to re-issue"** on BadgeDetail | Belt-and-suspenders: visible state + explicit text. Caption doubles as the next-action prompt. |
| Badge history surface | **In scope** — version chip + read-only modal listing prior versions on BadgeDetail | Without this the "saved to history" message is hollow. |
| Restore-a-previous-version | Out of scope (follow-up) | v1 is read-only history. |
| Live-rendering `design` JSON in BadgeDetail | Rejected | Would violate the strict rule (the visible artifact would drift from the baked PNG silently). |

## User flows

**Reopen → re-complete with new evidence (canonical rebake)**

```
1. User on CompletionFlowScreen, goal completed, badge present
2. Tap Reopen Goal
3. Alert: "Reopen this goal? You can add evidence and complete
          it again to issue an updated badge. The current badge
          stays in your history."
          [Cancel | Reopen]
4. Reopen → uncompleteGoal → navigate to FocusMode
5. User adds evidence
6. Navigate back to CompletionFlowScreen
7. Tap Complete Goal
8. useCreateBadge: existingBadge present; evidenceChanged = true
   → run bake pipeline → createBadge(new) → deleteBadge(old)
9. Celebration: "Badge updated with your new evidence ✦"
```

**Reopen → re-complete without changes (no-op short-circuit)**

```
1-4. Same as above
5. User adds nothing
6. Back to CompletionFlowScreen
7. Tap Complete Goal
8. useCreateBadge: existingBadge present; evidenceChanged = false;
   designChangedSinceBake = false → short-circuit → done
9. No new badge row, no destruction. Original badge displayed.
```

**Redesign in Designer → outdated marker → reopen path**

```
1. User on BadgeDetail viewing the issued badge
2. Tap Customize Badge → BadgeDesignerScreen (redesign mode)
3. Edit design → Save → updateBadge({ design }) only
4. Navigate back to BadgeDetail
5. BadgeDetail detects badge.updatedAt > badge.createdAt
   → renders the badge with dashed amber border
   → caption "Design updated · Reopen to re-issue" with a tap target
6. Tap caption → navigate to CompletionFlow for that goal
7. Reopen Alert → Reopen → (optionally add evidence) → Complete
8. useCreateBadge: designChangedSinceBake = true (and possibly
   evidenceChanged) → rebake → new badge picks up the new design
9. Old badge soft-deleted, joins version history
```

**Version history on BadgeDetail**

```
1. BadgeDetail loads canonical badge via badgeByGoalQuery
2. Also queries badgeVersionsByGoalQuery(goalId) — returns all
   rows (deleted + active) for that goal
3. If versions.length > 1: render chip "v{N} of {M} · History"
4. Tap chip → BadgeVersionHistoryModal
   - List entries ordered by createdAt desc
   - Each row: thumbnail, issuedOn (from credential), "current" /
     "v1 / v2 / ..." label
   - Tap a prior row → read-only credential JSON viewer
5. No restore action. Read-only.
```

## Detection helpers (small, pure functions)

Place in `src/badges/credentialDiff.ts` (new file):

```ts
/** True when the evidence IDs in the stored credential differ from current evidence. */
function evidenceIdsDifferFromCredential(
  credentialJson: string,
  currentEvidence: ReadonlyArray<{ id: string }>,
): boolean { /* parse credential.evidence[].id, set-compare */ }

/** True when the badge row has been updated after creation (i.e., design changed). */
function designChangedSinceBake(
  badge: { createdAt: string | null; updatedAt: string | null },
): boolean { /* updatedAt && updatedAt > createdAt */ }

/** Combined rebake trigger. */
function shouldRebake(
  badge: { credential: string; createdAt: string | null; updatedAt: string | null },
  currentEvidence: ReadonlyArray<{ id: string }>,
): boolean
```

These three live together because they're the policy that governs the bake-once invariant.

## Critical files

| File | Change |
| --- | --- |
| `src/hooks/useCreateBadge.ts` | Replace bare `existingBadge` short-circuit with `shouldRebake`-aware branch. When `shouldRebake` is true: capture `previousBadgeId` into a ref, run the full bake, `createBadge(...)`, then `deleteBadge(previousBadgeId)`. Return value gains `rebaked: boolean` |
| `src/badges/credentialDiff.ts` (new) | Pure detection helpers above |
| `src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` | `handleReopenGoal` shows `Alert.alert` with the new copy and only calls `uncompleteGoal` + navigate on confirm. Celebration copy switches on `result.rebaked` |
| `src/db/queries.ts` | Add `badgeVersionsByGoalQuery(goalId)` — same as `badgeByGoalQuery` but without the `isDeleted IS NULL` filter, ordered by `createdAt` desc |
| `src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx` | (a) Compute `designChangedSinceBake(badge)`; when true, render the badge inside a dashed amber frame and show the caption tap-target that navigates to CompletionFlow for that goal. (b) Query versions; if `versions.length > 1` render the version chip → opens history modal |
| `src/screens/BadgeDetailScreen/BadgeVersionHistoryModal.tsx` (new) | Read-only list + credential viewer for prior versions |
| Tests (mirrored under `__tests__/`) | See Tests section |

## Tests

- **`src/badges/__tests__/credentialDiff.test.ts`** (new)
  - `evidenceIdsDifferFromCredential`: same set → false; added id → true; removed id → true; replaced id → true; empty current → true when credential has any; malformed credential → throws / returns true (decide and document)
  - `designChangedSinceBake`: equal timestamps → false; updatedAt > createdAt → true; null updatedAt → false
- **`src/hooks/__tests__/useCreateBadge.test.ts`** (extend)
  - First-time bake unchanged
  - `existingBadge` + evidence unchanged + design unchanged → short-circuit (`rebaked: false`, no mutations)
  - `existingBadge` + evidence changed → rebake: `createBadge`, then `deleteBadge(old)`, `completeGoal`; result has `rebaked: true`
  - `existingBadge` + design changed (updatedAt > createdAt) → rebake regardless of evidence
  - `createBadge` throws during rebake → `deleteBadge` never called; old row intact
  - Fresh credential `id` (new `urn:uuid`) and fresh `issuedOn` on rebake
- **`src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.test.tsx`** (extend)
  - Tapping Reopen invokes `Alert.alert` with the new copy
  - Cancel → no state change, no `uncompleteGoal` call
  - Reopen confirmed → `uncompleteGoal` called, navigates to FocusMode
  - Celebration copy varies on `rebaked` flag from the hook
- **`src/db/__tests__/queries.badge.test.ts`** (extend)
  - `badgeVersionsByGoalQuery` returns soft-deleted siblings (mock Evolu accordingly)
- **`src/screens/BadgeDetailScreen/__tests__/BadgeDetailScreen.test.tsx`** (extend)
  - When `updatedAt > createdAt`: outdated frame + caption rendered; tap navigates to CompletionFlow for the badge's goal
  - When `versions.length > 1`: version chip renders; tap opens `BadgeVersionHistoryModal`

## Reused, do not reinvent

- `createBadge` — `src/db/queries.ts:909-967`
- `deleteBadge` (soft-delete) — `src/db/queries.ts:1041-1048`
- `badgeByGoalQuery` (canonical, soft-delete-filtered) — `src/db/queries.ts:828-836`
- Credential builder — `src/badges/credentialBuilder.ts`
- Signing — `keyProvider.sign` via `src/crypto`
- Baking — `bakePNG`, `saveBadgePNG`, `generateBadgeImagePNG` (`src/badges/`)
- Sentry breadcrumbs — `breadcrumb({ category: "badge", message: "..." })` already wired per stage; add `message: "rebake"` to mark the rebake entry path
- Designer flow — `BadgeDesignerScreen.tsx:487-502` is **correct as-is** and remains unchanged (Designer never bakes)

## Out of scope (track as follow-up issues per [[feedback_followup_issues]])

1. Restoring a previous badge version from history (read-only in v1).
2. Description-only evidence edits triggering a rebake (v1 only diffs evidence ID sets, not contents).
3. Editing the redesign-to-reopen path so the Designer can offer a one-tap "Reopen and re-issue with this design" shortcut (currently the user must tap the BadgeDetail caption).

## Verification

1. **Pure helpers**: `bun test --testPathPatterns credentialDiff`
2. **Hook**: `bun test --testPathPatterns useCreateBadge`
3. **Screens**: `bun test --testPathPatterns 'CompletionFlowScreen|BadgeDetailScreen'`
4. **Full suite**: `bun run test:ci`
5. **Types**: `bun run type-check`
6. **Lint**: `bun run lint`
7. **End-to-end on simulator** (`npx expo run:ios`):
   1. Create goal, attach one evidence item, complete → badge created.
   2. From CompletionFlow, tap **Reopen Goal** → confirm new Alert copy.
   3. Cancel → goal stays completed, no change. Tap Reopen again → confirm.
   4. In FocusMode add a second evidence item.
   5. Return to CompletionFlow → **Complete Goal** → no Alert this time, celebration screen reads "Badge updated with your new evidence ✦".
   6. Open BadgeDetail → verify version chip "v2 of 2 · History"; open modal; confirm v1 row shows original credential with single evidence; v2 row shows current credential with both.
   7. From BadgeDetail tap **Customize Badge** → change a color → Save → return to BadgeDetail. Verify dashed amber frame + "Design updated · Reopen to re-issue" caption appear.
   8. Tap the caption → lands on CompletionFlow → Reopen Alert → confirm → return immediately to CompletionFlow → Complete Goal → silent rebake (designChangedSinceBake = true). Frame returns to normal. Version count increments to v3.
   9. Confirm in the DB inspector: three badge rows for the goal — v1 and v2 soft-deleted, v3 canonical.
8. **Maestro E2E**: extend `2026-04-21-goal-lifecycle-e2e-flow.md` with: reopen + add evidence + re-complete + assert version chip appears.
