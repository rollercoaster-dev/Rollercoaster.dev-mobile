# Development Plan: Issue #60

## Issue Summary

**Title**: Configured badge design is lost on completion after app restart (falls back to default)
**Type**: bug (`priority:high`, `app:native-rd`)
**Complexity**: SMALL
**Estimated Lines**: ~120 lines (schema 1, queries 19, designer 22, completion 17, tests ~60)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] After creating a new goal and configuring a non-default badge in `BadgeDesignerScreen` (new-goal mode), force-quitting the app, reopening, completing the goal, adding evidence, and tapping **Bake It** — the baked badge matches the configuration, not the default.
- [ ] After the same cold-start sequence, tapping **Redesign First** on the completion screen re-enters the designer pre-loaded with the user's previously configured design, not the default.
- [ ] **Skip — Use Default** still produces a default-baked badge after cold start (the user's choice of "I want the default" also survives).
- [ ] `goal.design` is populated whenever the user passes through the new-goal designer save (Use This Design or Skip), so any future device that syncs via Evolu can render/bake the same badge.

## Dependencies

No dependencies detected. The issue stands alone and the fix is contained to `apps/native-rd`.

**Status**: All dependencies met.

## Context & Root Cause

The configured design captured in `BadgeDesignerScreen` (new-goal mode) is only stored in `pendingDesignStore` — an in-memory `Map<goalId, …>` (`apps/native-rd/src/stores/pendingDesignStore.ts`). The store's own comment acknowledges the assumption: _"Resets on app restart (intentional — goal creation and completion happen in the same session)."_ That assumption breaks in the natural flow (create today, complete tomorrow; force-quit; Metro reload; OS reclaim of backgrounded app).

A **secondary bug** surfaced during exploration: even the _read_ side of the designer re-entry path is broken. `BadgeDesignerContentNewGoal.initialDesign` (`BadgeDesignerScreen.tsx:600-609` before fix) reads only `pendingDesignStore`. After cold start, "Redesign First" re-enters the designer showing the default — same root cause, different symptom. Fixed in the same patch.

Post-bake editing already persists correctly via `BadgeDesignerContentBadge → updateBadge({ design })` — only the pre-bake path is broken.

## Approach

Option 1 from the issue: add a `design` column to `goal`, write it from the new-goal designer save, read it as a 2nd-tier fallback (after `pendingDesignStore`, before the synthesized default) at both designer re-entry and completion-flow bake.

### Three-tier read precedence (preserved at every read site)

1. **`pendingDesignStore`** — warm-session source; carries the pre-captured PNG, so it wins to avoid re-running the offscreen capture host (which has a known transparent-snapshot race gated by `fallbackHostLaidOut`).
2. **`goal.design`** — persisted source; survives cold start, syncs across devices via Evolu CRDT.
3. **`createDefaultBadgeDesign(...)`** — true last resort (rendered via existing offscreen capture host).

## Decisions

| ID  | Decision                                                                                    | Alternatives Considered                                                                               | Rationale                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Add `design: nullOr(NonEmptyString)` to `goal` table                                        | (a) Placeholder badge row at designer save time; (b) AsyncStorage persistence of `pendingDesignStore` | (a) breaks the `badge ⇒ goal completed` invariant and forces `badge.credential` nullable. (b) is device-local — doesn't sync across devices. (D1) is the smallest change AND gets Evolu sync for free.                                   |
| D2  | Write `goal.design` on every designer save (Use This Design AND Skip — Use Default)         | Only write when user explicitly picks a non-default                                                   | "I want the default" is a real choice — it should also survive cold start. Always-write means `goal.design` is the unambiguous source of truth pre-bake.                                                                                 |
| D3  | Keep `pendingDesignStore` as warm-session tier 1                                            | Remove it; rely on `goal.design` only                                                                 | The store also carries a pre-captured PNG — removing it would force the offscreen capture host (with known transparent-snapshot race) to run for every bake, including the warm path. Belt-and-suspenders preserves the fast path.       |
| D4  | Use `NonEmptyString` (not `NonEmptyString1000`)                                             | `NonEmptyString1000`                                                                                  | Design JSON can exceed 1000 chars (frame params, banner text, etc.). Mirrors the existing `badge.design` column (schema.ts:145).                                                                                                         |
| D5  | Validate via `NonEmptyString.orNull` in `updateGoal`, mirroring `updateBadge` design branch | Custom JSON validation                                                                                | The bake/preview reads use `parseBadgeDesign` which already sanitizes shape and `frameParams`. Adding a parser step in the writer would duplicate logic and reject in-progress edits. Keep the writer permissive, the reader sanitizing. |
| D6  | Atomic commit per concern (5 commits)                                                       | Single squash commit                                                                                  | A bug that's been silently shipping benefits from bisectability. Each commit independently passes type-check + tests.                                                                                                                    |

## Affected Areas

### Schema

- `apps/native-rd/src/db/schema.ts` — add `design` column to `goal` table.

### Database queries

- `apps/native-rd/src/db/queries.ts` — extend `updateGoal` to accept `design`.
- `apps/native-rd/src/db/__tests__/queries.goal.test.ts` — extend `test.each` table.

### Designer screen

- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` —
  - Write site: `saveAndNavigate` calls `updateGoal(goalId, { design })`.
  - Read site: `initialDesign` in new-goal content falls through `pendingDesignStore` → `goal.design` → default.
- `apps/native-rd/src/screens/BadgeDesignerScreen/__tests__/BadgeDesignerScreen.test.tsx` — add 4 tests (write × 2 + cold-start read + precedence).

### Completion flow

- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` —
  - Bake read site: `fallbackDesign` hydrates from `goal.design` before falling through to synthesized default.
  - Preview read site: `previewDesign` inserts `goal.design` tier between `pendingDesignJson` and `badgeDesignJson`.
- `apps/native-rd/src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.test.tsx` — add 2 tests (cold-start regression + precedence).

## Atomic Commits

Five commits for bisectability. Each compiles and passes type-check on its own.

1. **schema + queries** — add `goal.design` column; extend `updateGoal` signature with validation; extend `queries.goal.test.ts` `test.each`.
2. **designer write site** — `BadgeDesignerScreen.tsx` `saveAndNavigate` writes `goal.design`. Tests: new-goal save calls `updateGoal` with serialized design; skip-default writes default as `goal.design`.
3. **designer read site** — `BadgeDesignerScreen.tsx` `initialDesign` hydrates from `goal.design`. Tests: cold-start re-entry with empty `pendingDesignStore` and `goal.design` set shows configured design; `pendingDesignStore` wins when both exist.
4. **completion bake read site** — `CompletionFlowScreen.tsx` `fallbackDesign` hydrates from `goal.design`. **Headline regression test for issue #60.** Precedence test.
5. **completion preview tier** — `CompletionFlowScreen.tsx` `previewDesign` adds `goal.design` between pending and badge tiers.

Commits 2+3 share a file (`BadgeDesignerScreen.tsx`); commits 4+5 share `CompletionFlowScreen.tsx`. They're kept separate for bisectability since the write and read sides answer different questions ("does it persist?" vs "does it hydrate?").

## Verified Before Implementation

Both unknowns from initial review are closed against the codebase — neither blocks implementation.

1. **Evolu auto-migrates additive nullable columns.** Direct precedent: commit `057360d` (PR #1015) added `focusTimelineHidden` to `userSettings` with zero migration code. The commit message calls out the pattern as a convention (mirroring `hasSeenWelcome`). Evolu @ `^7.4.1` / `^14.3.0` handles schema reconciliation on next open. No manual step needed for `goal.design`.
2. **`parseBadgeDesign` round-trips `JSON.stringify(BadgeDesign)`.** Source at `badges/types.ts:210-241` is `JSON.parse` + sanitization. Already consumes `badge.design` produced by `JSON.stringify(currentDesign)` at `BadgeDesignerScreen.tsx:495`. Same call shape on the write side = safe round-trip.

## Reused Utilities

| Need                                          | Existing utility                                        | Location                           |
| --------------------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| Update goal row                               | `updateGoal(id, fields)`                                | `db/queries.ts:115`                |
| Parse design JSON safely                      | `parseBadgeDesign(json)`                                | `badges/types.ts:210`              |
| Synthesize default                            | `createDefaultBadgeDesign(title, color)`                | `badges/types.ts`                  |
| Render arbitrary design to PNG                | offscreen capture host (`fallbackRef` + `captureBadge`) | `CompletionFlowScreen.tsx:149-178` |
| Validation pattern for nullable design string | `updateBadge` design branch                             | `db/queries.ts:1010-1025`          |

No new utilities. No new abstractions.

## Verification

### Unit tests

```
npx jest --no-coverage --testPathPatterns "BadgeDesignerScreen|CompletionFlowScreen|queries.goal"
```

Expected: 119 tests pass (was 113; +4 designer, +2 completion).

### Static checks

```
bun run type-check
bun run lint
```

Both must be clean.

### Manual repro (the user's bug — Maestro flow can follow)

1. `npx expo run:ios` (dev client; this is not Expo Go per `apps/native-rd/CLAUDE.md`).
2. Create a goal, configure a non-default badge in the designer, tap **Use This Design**.
3. Force-quit the app from the iOS app switcher.
4. Reopen, complete the goal, add evidence, tap **Bake It**.
5. **Expected:** baked badge matches the configuration from step 2.
6. **Expected (designer re-entry):** repeat steps 1-3, then tap **Redesign First** before baking — designer opens pre-loaded with the configured design.

### Negative path

**Skip — Use Default** still produces a default-baked badge after cold start.

### Sync sanity (optional)

If a second device is available, confirm the configured design syncs via Evolu and bake on the second device produces the same image.

## Follow-ups

- The re-stash logic at `CompletionFlowScreen.tsx:316-321` ("Redesign First → new-goal" re-stashes into `pendingDesignStore`) becomes a small redundancy after this fix — `goal.design` is now the persisted source of truth so the re-stash is belt-and-suspenders for warm-session UX. Leave it for now; clean up in a future pass only if it interferes with something.

## Emulator Verification — Findings (2026-05-16)

**Status: addressed by capture-mechanism swap (commits 6–7 on this branch).**
The findings below describe the regression that triggered the appended
capture-fix; they are preserved as the audit trail.

End-to-end test on iPhone 17 Pro simulator (iOS 26.1), bundle id `dev.rollercoaster.app`:

1. Created goal, configured a non-default badge in the designer, tapped Use This Design.
2. Cold-restarted the app (full kill, not Metro reload).
3. Completed the goal, added text evidence, tapped Bake It.
4. **BadgeEarnedModal opened with no badge image.** The "First one. (noted.)" celebration appeared with an empty space where the badge should be.

### Disk inspection

The baked PNG was located at:

```
~/Library/Developer/CoreSimulator/Devices/<UDID>/data/Containers/Data/Application/<APP_UUID>/Documents/badges/<timestamp>-<rand>.png
```

It exists (85KB, 1536×1536, RGBA) but is **fully transparent / blank pixels**. The credential was correctly signed (logs show `[useCreateBadge] Badge credential created`), `saveBadgePNG` succeeded with no errors, but the captured PNG had no rendered content embedded.

### Root cause: transparent-snapshot race in offscreen capture host

The race is a pre-existing known issue, referenced in code comments at `CompletionFlowScreen.tsx:141-142` and `useCreateBadge.ts:213-214`. Sequence:

1. `<View ref={fallbackRef} style={{ opacity: 0 }}>` with `<BadgeRenderer />` inside mounts offscreen.
2. `onLayout` fires the moment the View has dimensions — **before** `react-native-svg` has painted the SVG content inside.
3. `captureBadge → captureRef` snapshots immediately → laid-out-but-unpainted view → transparent PNG.
4. `bakePNG` embeds the credential into a blank canvas; `saveBadgePNG` writes the (effectively blank) PNG to disk; `BadgeEarnedModal` renders it; user sees nothing.

### Why this is a regression caused by this PR

Before this PR, the offscreen capture path's `fallbackDesign` was always the synthesized default (`createDefaultBadgeDesign` — rounded rectangle + monogram letter). That SVG is **simple enough to paint within one frame**, so the layout-vs-paint race didn't trigger in practice.

This PR routes the _user's configured design_ (frame, banner, path text, icons, complex `frameParams`) through the same offscreen host. Configured designs take **multiple frames to paint** — long enough that `onLayout → captureBadge` consistently fires before the SVG renders. The bug was latent; this PR surfaces it for 100% of cold-start bakes with a non-trivial configured design.

The pre-bake preview at `CompletionFlowScreen.tsx:505-518` is unaffected because that `BadgeRenderer` is **visible** — React Native paints visible views before snapshotting laid-out-only ones. The user reported "the correct designed badge was shown for baking" because the live preview rendered correctly. Only the offscreen-host-captured PNG was blank.

### Unit tests do not catch this

The `captureBadge` mock in `CompletionFlowScreen.test.tsx` returns a fixed `Buffer.from([137, 80, 78, 71, …])` regardless of what design was rendered. Tests verify that `capturedPng` is _provided_ to `useCreateBadge`, not that the buffer's pixels reflect the design. The unit-test-green / device-broken split is a known testing-gap that this PR's verification surfaced — the tests should be extended (or replaced with a visual / golden-PNG test) before the offscreen-capture path is trusted for non-trivial designs.

### What needs to happen before this PR can ship

1. Fix the offscreen capture race. The standard pattern for "view-shot after react-native-svg has painted" is two `requestAnimationFrame` calls between `onLayout` and `captureBadge` (one rAF buys layout commit, two buys a full paint cycle). Wrap the capture in `CompletionFlowScreen.tsx:154-178` accordingly.
2. Add a real verification test that goes beyond the mocked buffer — either a golden-PNG snapshot test against a known-good rendered badge, or at minimum a non-mocked `captureBadge` integration test that asserts the captured buffer contains non-transparent pixels.
3. Re-run the cold-start emulator repro and confirm the on-disk PNG (`Documents/badges/*.png` in the app sandbox) renders the configured design.
4. Only then merge.

### Files left in worktree

All five planned commits are present in the working tree as uncommitted changes:

- `apps/native-rd/src/db/schema.ts` — `design` column added to `goal`.
- `apps/native-rd/src/db/queries.ts` — `updateGoal` accepts `design`.
- `apps/native-rd/src/db/__tests__/queries.goal.test.ts` — 4 new test rows.
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — write site + cold-start read site.
- `apps/native-rd/src/screens/BadgeDesignerScreen/__tests__/BadgeDesignerScreen.test.tsx` — 4 new tests.
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` — `fallbackDesign` and `previewDesign` hydration.
- `apps/native-rd/src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.test.tsx` — 2 new tests.
- `apps/native-rd/docs/plans/dev-plans/issue-60.md` — this plan.

The data-model and persistence layer of the fix (schema, queries, designer writes, designer reads) are correct in isolation. The completion-flow read sites are also correct _in terms of which design is selected_ — the regression is purely in the downstream rasterization. The schema and designer commits could ship independently of the completion-flow changes if needed.

---

## Capture-Mechanism Fix (appended 2026-05-16)

The five data-model commits are already on this branch. They will not be split into a separate PR. The capture-mechanism fix is added on top so the PR ships end-to-end correct.

### Decision: replace `react-native-view-shot` with `react-native-svg`'s `Svg.toDataURL`

The emulator findings prescribed "two `requestAnimationFrame` calls between `onLayout` and `captureBadge`" as the fix. That is community folklore — it works on most devices for simple SVGs and fails on slower devices, Release builds, and configured designs with multi-frame paint (PathText, FrameOverlay filters). The root cause is that `react-native-view-shot`'s `captureRef` snapshots the **native view buffer**, which is bounded by the platform's draw pass — a timing-dependent contract.

`react-native-svg` ships a `toDataURL(callback, options?)` method on the `<Svg>` class that serializes from the **SVG model on the native side**, not from the view buffer. There is no layout-vs-paint race because there is no view-buffer dependency. The only precondition is that the SVG is mounted.

Verified against this repo:

- `apps/native-rd/package.json` pins `react-native-svg: 15.15.3` (exact).
- Type declaration at `node_modules/react-native-svg/lib/typescript/elements/Svg.d.ts:27`:
  ```
  toDataURL: (callback: (base64: string) => void, options?: object) => void;
  ```
- `BadgeRenderer` already roots a single `<Svg>` with deterministic, vector-only children. No raster `<Image>` siblings inside the SVG that would force a buffer dependency.

### Why this is preferred over rAF workarounds

| Concern                                         | rAF workaround                                        | `Svg.toDataURL`                                                                            |
| ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Reliability across devices                      | Timing-dependent; can break on slow devices / Release | No timing dependency                                                                       |
| Reliability across renderers (Paper/Fabric)     | rAF semantics differ; not guaranteed                  | Implementation-internal, stable                                                            |
| Sensitivity to ancestor `removeClippedSubviews` | Still affected — view buffer can be culled            | Not affected — no view buffer in loop                                                      |
| Sensitivity to `opacity: 0` culling             | Some Android Skia builds null out the buffer          | Not affected                                                                               |
| Code surface removed                            | None (workaround adds code)                           | Removes `fallbackHostLaidOut`, the `onLayout` guard, the wrapper-as-capture-source pattern |
| Lines changed                                   | +~10 in `CompletionFlowScreen.tsx`                    | ~-20 across screens + small `BadgeRenderer` ref additions                                  |

### Decisions (capture-fix only)

| ID  | Decision                                                                       | Alternatives                                     | Rationale                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D7  | Swap `captureRef` for `Svg.toDataURL` via imperative handle on `BadgeRenderer` | Two-rAF wait; `onLoad`+rAF wait                  | Eliminates the entire race class; no timing dependency; smaller code surface (see table above).                                                                   |
| D8  | Expose capture via `forwardRef` + `useImperativeHandle` on `BadgeRenderer`     | Re-export the inner `Svg` ref directly           | Hides callback→Promise translation and avoids leaking `react-native-svg` types to consumers.                                                                      |
| D9  | Keep the offscreen `<View>` wrapper in `CompletionFlowScreen`                  | Inline the `BadgeRenderer` into the visible tree | Avoids visible flicker during cold-start completion. The wrapper is no longer load-bearing for timing.                                                            |
| D10 | Add a pixel-diversity regression test that does **not** mock `captureBadge`    | Golden-PNG snapshot                              | Golden PNGs drift across font hinting and path tessellation. Pixel diversity (mean alpha + RGB variance) is the minimum assertion that would have caught the bug. |

### Affected Areas (capture-fix)

- `apps/native-rd/src/badges/BadgeRenderer.tsx` — convert to `forwardRef`, add `BadgeRendererHandle` interface, add `useImperativeHandle({ captureAsPng })`, attach internal ref to the root `<Svg>`.
- `apps/native-rd/src/badges/captureBadge.ts` — change signature from `RefObject<unknown>` to `RefObject<BadgeRendererHandle | null>`; replace `captureRef` import + call with `node.captureAsPng({ width, height })`. Keep `isPNG` guard.
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` — drop `fallbackHostLaidOut` state and the `onLayout` handler; change `fallbackRef` type to `BadgeRendererHandle`; move the ref from the wrapper `<View>` to the `<BadgeRenderer ref={…} />`.
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — change `previewRef` type from `View` to `BadgeRendererHandle`; move ref from wrapper `<View>` to `<BadgeRenderer ref={…} />` at both render sites (preview card + badge-edit modal).
- `apps/native-rd/src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.bake-pixels.test.tsx` — **new file**. Non-mocked capture path. Stub `Svg.toDataURL` on the `react-native-svg` mock to return a deterministic small RGBA PNG; assert mean alpha > 0.5 and RGB variance > 0.
- `apps/native-rd/src/badges/__tests__/captureBadge.test.ts` — update existing tests for the new ref type and stubbed `captureAsPng`.

### Atomic Commits (added on top of existing 1–5)

6. **`BadgeRenderer` exposes `captureAsPng` via `forwardRef`** — pure additive change. All existing callers (which use it without a ref) continue to compile.
7. **`captureBadge` swaps to the imperative handle** — `captureBadge.ts` only. Drops the `react-native-view-shot` import. Type-check passes if no caller is changed yet because the ref param's type widened compatibly… actually no — caller refs are still `View` refs, so this commit also has to update both screens' ref types. Combine into one commit:

   **6. capture-mechanism swap (BadgeRenderer + captureBadge + screens)** — atomic because the ref-type change cuts across all three files. Type-check stays green.

8. **Pixel-diversity regression test for completion bake** — adds `CompletionFlowScreen.bake-pixels.test.tsx`. **Headline regression test for the transparent-PNG bug.** Asserts the captured buffer has alpha > 0 and color variance > 0.

   (Renumber: commit 7 in the new sequence.)

So the appended sequence is two commits:

6. **capture-mechanism swap** — `BadgeRenderer.tsx`, `captureBadge.ts`, `CompletionFlowScreen.tsx`, `BadgeDesignerScreen.tsx`. Drops `react-native-view-shot` from the bake path (designer save sites swap too for consistency; the package itself may still be a dep if other code uses it — grep first, remove from `package.json` only if no other consumer).
7. **pixel-diversity regression test** — non-mocked capture assertion that would have caught the issue.

### Verification (updated)

#### Unit tests

```
npx jest --no-coverage --testPathPatterns "BadgeDesignerScreen|CompletionFlowScreen|captureBadge|queries.goal"
```

Expected delta: the existing `captureBadge.test.ts` cases update for the new mock shape; the new `CompletionFlowScreen.bake-pixels.test.tsx` adds 1–2 assertions on real captured bytes.

#### Static checks

```
bun run type-check
bun run lint
```

Both must be clean. `bun run lint` will flag the dropped `react-native-view-shot` import if any stale reference is left behind.

#### Device repro — the bug we must close

The same cold-start sequence from the original Manual Repro section, on iPhone 17 Pro simulator (iOS 26.1):

1. `npx expo run:ios`.
2. Create a goal, configure a non-default badge, tap **Use This Design**.
3. **Force-quit** from the app switcher (not Metro reload).
4. Reopen, complete the goal, add evidence, tap **Bake It**.
5. **Expected:** BadgeEarnedModal shows the configured badge (frame, banner, path text, monogram/icon all visible).
6. **Disk check:** `~/Library/Developer/CoreSimulator/Devices/<UDID>/data/Containers/Data/Application/<APP_UUID>/Documents/badges/<timestamp>-<rand>.png` is a valid PNG with non-transparent pixels matching the configured design.

#### Risk to monitor

`Svg.toDataURL` runs synchronously on the native side after the next commit. If `BadgeRenderer` is mounted but the SVG hasn't been committed yet (first frame after `setState({ fallbackDesign })`), the callback may return an empty PNG. The capture effect already keys off `fallbackDesign && fallbackRef.current`; on iOS this is sufficient because `useEffect` runs after commit. If we see flake on Android, add a single `requestAnimationFrame` between ref-presence and `captureAsPng` — but only as a defensive measure if it surfaces, not preemptively.

### Follow-ups (capture-fix)

- If no other code uses `react-native-view-shot`, remove it from `package.json` and iOS Podfile in a follow-up cleanup commit. Grep first: `grep -r "react-native-view-shot" apps/native-rd/src`.
- The `fallbackHostLaidOut` removal leaves the `<View>` wrapper purely as an offscreen positioning host. Consider renaming `styles.fallbackCaptureHost` → `styles.fallbackOffscreenHost` in a future docs/clarity pass — not in this PR.
