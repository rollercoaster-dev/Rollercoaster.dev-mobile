# Badge Rebake on Reopen + Re-Completion

**Status:** Tracked on GitHub
**Tracking issue:** [#15](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/15)
**Created:** 2026-05-14
**Related:** [2026-05-14-android-bug-triage.md](./2026-05-14-android-bug-triage.md) — same session; the reopen-loop fix landed there, this is the follow-up feature it surfaced.

## Context

After the reopen-loop fix in `FocusModeScreen.tsx:247`, a user can now reopen a completed goal, add evidence / steps, and re-complete it without being force-navigated to the celebration screen. **However, on legitimate re-completion the badge is not re-baked.**

Current behavior in `useCreateBadge.ts:125-130`:

```ts
if (existingBadge) {
  setStatus("done");
  return;
}
```

When a badge already exists, `useCreateBadge` short-circuits to `"done"` and the BadgeEarnedModal pops with the original (now stale) badge image and credential — even though the user added new evidence after reopening. The credential's `evidence[]` is frozen at the time of the first bake.

We want: when a user reopens a goal, **updates** it, and re-completes, prompt them to overwrite the original badge with a freshly-baked one based on the latest state.

## Desired behavior

1. **Detect "rebake needed":** existing badge + `goal.status === active` (reopen) + the credential's snapshot diverges from the current goal/evidence state.
2. **Confirmation prompt:** native `Alert.alert` (or in-screen card) with:
   - Title: _"Rebake your badge?"_
   - Body: _"You reopened this goal and made changes. Re-completing will replace your original badge with a new one based on the latest evidence. The old badge cannot be recovered."_
   - Buttons: `[Cancel]` `[Rebake & overwrite]`
3. **On Rebake:** rebuild credential with current evidence, re-sign, re-bake PNG, persist via `updateBadge` (already exists at `db/queries.ts:976` and supports `credential` + `imageUri`), then `completeGoal`. BadgeEarnedModal then shows the new image.
4. **On Cancel:** `navigation.goBack()` to `FocusMode`. Goal stays `active`. User can come back to it later.
5. **Reopen + re-complete with NO changes** (e.g. user reopened by accident): silent `completeGoal`, no prompt, modal shows the original badge unchanged.

## Open design decisions

| Question                  | Recommended default                                                                                                                                  | Alternative                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| What counts as "updated"? | Diff vs credential snapshot: `evidence[]` count, `goal.title`, `goal.description`. Catches the common "added evidence" case.                         | Full structural diff including step rows; track an explicit `goal.dirtySinceBake` column. Heavier. |
| Cancel UX                 | Back to FocusMode, goal stays `active`.                                                                                                              | Mark goal completed but skip rebake (keep old badge). Confusing — stale badge with new evidence.   |
| Rebake design source      | Reuse `existingBadge.design` if set, else `createDefaultBadgeDesign(goal.title, goal.color)`. Re-capture offscreen the same way the first bake does. | Open BadgeDesigner so user can re-design before rebake. More friction.                             |
| Where confirmation lives  | Native `Alert.alert` triggered from `CompletionFlowScreen` when `useCreateBadge` returns the new status.                                             | In-screen card replacing the celebration content. More design work.                                |
| New status name           | `"rebake-required"`                                                                                                                                  | `"awaiting-overwrite-confirmation"` (verbose)                                                      |

## Implementation sketch

### 1. `hooks/useCreateBadge.ts`

- Extend `BadgeCreationStatus` with `"rebake-required"`.
- Add a `confirmRebake?: boolean` option (`undefined` = waiting, `true` = user confirmed).
- Helper: `hasChangesSinceBake(credentialJson, currentGoal, currentEvidence)` — parse credential JSON, compare evidence count + goal title/description.
- Restructure the effect:
  ```ts
  if (existingBadge) {
    if (goal.status === completed) { setStatus("done"); return; }
    if (!hasChangesSinceBake(...)) {
      // accidental reopen, silent re-complete
      completeGoal(goalId, evidence);
      setStatus("done");
      return;
    }
    if (!options.confirmRebake) {
      setStatus("rebake-required");
      return;
    }
    // confirmed — fall through to bake IIFE, branch on existingBadge inside
  }
  ```
- In the bake IIFE, swap `createBadge({...})` for `updateBadge(existingBadge.id, { credential, imageUri })` when `existingBadge` is set. `design` field stays untouched on the existing row.

### 2. `screens/CompletionFlowScreen/CompletionFlowScreen.tsx`

- New local state `rebakeConfirmed: boolean`.
- Pass `confirmRebake: rebakeConfirmed` to `useCreateBadge`.
- When `badgeStatus === "rebake-required"`, fire `Alert.alert` with the two buttons described above.
- Cancel → `navigation.goBack()`.
- Confirm → `setRebakeConfirmed(true)` (effect re-runs, bake proceeds).
- Offscreen fallback design: when rebaking, prefer `parseBadgeDesign(existingBadge.design)` over the default. Keeps the user's customized badge look.

### 3. Tests

- `useCreateBadge.test.ts`:
  - When `existingBadge` + `goal.status === active` + changes detected → returns `"rebake-required"`, does NOT call `updateBadge`/`completeGoal`.
  - Same precondition + `confirmRebake: true` → calls `updateBadge` (not `createBadge`), then `completeGoal`.
  - Same precondition + no changes detected → silently calls `completeGoal`, status `"done"`.
  - `existingBadge` + `goal.status === completed` → idempotent `"done"`, no DB writes.
- `CompletionFlowScreen.test.tsx`:
  - Renders rebake Alert when status is `"rebake-required"`.
  - Confirm tap sets `confirmRebake` and re-renders.
  - Cancel tap calls `navigation.goBack()`.

## Critical files

- `apps/native-rd/src/hooks/useCreateBadge.ts` — status + branching + rebake path
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` — Alert + state + fallback design override
- `apps/native-rd/src/db/queries.ts:976` — `updateBadge` (already supports the fields we need; no change)

## Verification

1. `bun run type-check && bun run lint && npx jest --no-coverage --testPathPatterns "useCreateBadge|CompletionFlow"`
2. Manual flow on a connected Android device (load `native-rd-build` skill for build commands):
   - Create goal, design badge, add evidence, complete → badge appears.
   - Reopen the goal from the celebration screen.
   - Add an additional piece of evidence.
   - Complete final step → CompletionFlow → Alert appears.
   - Tap Cancel → returns to FocusMode, goal stays `active`.
   - Re-complete → Alert again → tap Rebake → new badge image bakes, modal shows the new credential, goal is `completed`.
3. Regression: complete a fresh goal — no Alert, normal flow still works.
