# Development Plan: Issue #472

## Issue Summary

**Title**: [Storybook] Finishing flow 3/3 — interactive flow story + AllThemesMatrix
**Type**: feature (Storybook-only)
**Complexity**: MEDIUM
**Estimated Lines**: ~350–450 lines, essentially one new file (matches the issue's own ~350–500 LOC estimate and `size:m` label)

## Intent Verification

- [ ] A single interactive Storybook story renders the full sequence — celebrate → design → baking → reveal — driven entirely by story-local state (no app navigation, no `useCreateBadge`): pressing "Design your badge →" on `FinishCelebrateStage` swaps to `FinishDesignStage`; pressing the back chevron returns to celebrate; pressing "✓ Bake my badge" swaps to `FinishBakingStage`; the story auto-advances baking → `FinishRevealStage` after a fixed delay (no tap required), matching the canonical prototype's own `bake()` handler (`setTimeout(..., 1100)`).
- [ ] The badge design edited on the design stage (shape/color/center/bottom-label) is the same design rendered (dimmed) on the baking stage and (large, popped-in) on the reveal stage — one `design` state value threads through all three stages with no reset in between.
- [ ] The goal title/summary text typed or seeded on the celebrate stage is reflected consistently in the design stage's header subtitle and the reveal stage's goal-title heading (same string, not independently hardcoded per stage).
- [ ] A `LongContent` flow story seeds a long goal title + long closing note + a near-max-length bottom label once at the top of the flow, and every stage the flow passes through renders it without clipping (celebrate summary, design header subtitle + bottom-label input + live preview, reveal goal-title heading).
- [ ] A `ReducedMotion` flow story passes `animationPref="none"` into the reveal stage and the badge appears at resting scale with no pop-in, matching `FinishRevealStage`'s existing `ReducedMotion` story behavior.
- [ ] An `AllThemesMatrix` story shows `FinishDesignStage` (the `screenHeaderBg`/`Fg`/`Border` chrome) and `FinishRevealStage` (the `celebrationBg`/`Fg` chrome, #419's tokens) side by side across all 7 product themes via `ScopedTheme`, and neither stage's header/celebration text disappears into its own background in any theme (worst case checked visually: Still Water/autismFriendly's muted palette, Clean Signal/lowInfo's near-white).
- [ ] `grep -rn "useCreateBadge\|bakePNG\|updateBadge\|updateGoal\|useNavigation" apps/native-rd/src/stories/finish` returns no matches — the flow harness stays presentational/local-state only.
- [ ] `grep -n "#[0-9a-fA-F]\{3,6\}" apps/native-rd/src/stories/finish/*.tsx` returns no matches outside comments (goal-color fixture excluded per existing precedent in `FinishDesignStage.stories.tsx`/`FinishLine.stories.tsx`, which use an intentionally off-palette fixture hex the same way).

## Dependencies

| Issue | Title                                                                        | Status                                   | Type                                                 |
| ----- | ---------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| #470  | [Storybook] Finishing flow 1/3 — celebrate + baking + reveal stages          | 🟢 Closed — merged (PR #481, `a2d6ec12`) | Blocker (per issue body) — **met**                   |
| #471  | [Storybook] Finishing flow 2/3 — badge designer accordion + live preview     | 🟢 Closed — merged (PR #485, `22477399`) | Blocker (per issue body) — **met**                   |
| #448  | [Storybook] Finishing flow — celebrate → design → baking → reveal (umbrella) | 🟢 Open (umbrella, not a blocker)        | Parent umbrella                                      |
| #384  | Epic: Full Ride redesign                                                     | 🟢 Open (epic, not a blocker)            | Parent epic                                          |
| #449  | [Integrate] Finishing flow — retire the old completion path                  | 🟢 Open, blocked by this issue           | Downstream consumer, not a dependency of this issue  |
| #447  | Design: Finishing flow — resolve the five "Calls to make"                    | 🟢 Closed — decisions recorded           | Upstream design-decision gate for the whole umbrella |

**Status**: ✅ All dependencies met.

The `dep:blocked` label on the live issue is stale: both named blockers (slices 1/3 and 2/3) closed and merged before this research ran — `gh issue view 470/471 --json state` → both `CLOSED`; `gh pr view 481/485 --json state,mergedAt` → both `MERGED` (2026-07-06 and 2026-07-07 respectively). `FinishCelebrateStage`, `FinishBakingStage`, `FinishRevealStage`, and `FinishDesignStage` all exist on `main` today with stable prop contracts (read directly from source, not from tracker claims).

**has_blockers**: false

## Objective

Add the one piece of Storybook coverage the umbrella is still missing: an **interactive flow story** that chains the four already-shipped `Finish*Stage` components (celebrate → design → baking → reveal) through story-local state — proving the stages compose end-to-end with a single threaded `design`/`goalTitle` — plus an **`AllThemesMatrix`** exercising the two stages that carry theme-varying chrome tokens (`screenHeaderBg/Fg/Border` on design, `celebrationBg/Fg` on reveal) across all 7 product themes. No new production component, no app navigation, no real bake wiring — purely a Storybook harness. Component + screen integration remains #449's job.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                              | Alternatives Considered                                                                                                                                                                                      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Flow story + matrix live in a **new stand-alone file** `src/stories/finish/FinishFlow.stories.tsx` — not a new `src/components/FinishFlow/` orchestrator, and not appended into one of the four existing per-stage `.stories.tsx` files.                                                              | (a) Build a real `FinishFlow` component in `src/components/` composing the four stages; (b) add the flow story into `FinishRevealStage.stories.tsx` (the "last" stage) since it has no single natural owner. | The issue explicitly scopes state wiring to "the pure view/story harness (not app integration)" — a real `src/components/` orchestrator would be a de facto integration surface, which is #449's call to make with its own (likely React Navigation + Evolu) state shape, not this issue's local `useState` shape. `src/stories/badges/` already establishes the precedent of stand-alone, no-backing-component story files for cross-component Storybook-only coverage. A new `src/components/FinishFlow/` dir would also trip `component-structure.test.ts` (mandates `index.ts`/styles/`__tests__` for every dir under `src/components/`), forcing test/barrel scaffolding around code that has no reason to exist outside Storybook.                                                                                                                                                                                                                                                                                                                                                        |
| D2  | Baking → reveal auto-advances via a story-local `setTimeout(..., 1100)` — no tap/affordance needed, mirroring the canonical prototype's own `bake()` handler (`Finishing Flow A Prototype.dc.html:336-339`: `setState({screen:"baking"}); setTimeout(() => setState({screen:"reveal"}), 1100);`).     | Add a manual "skip/advance" affordance since `FinishBakingStage` exposes no `onComplete` callback.                                                                                                           | Code-answerable from the design source — the prototype is explicit about both the mechanism (timer) and the exact duration (1100ms). No product ambiguity; `FinishBakingStage`'s prop contract is untouched (the timer lives in the story wrapper's `useEffect`, keyed off entering the "baking" stage).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D3  | `AllThemesMatrix` renders **`FinishDesignStage`** and **`FinishRevealStage`** only (not all four stages) as two horizontally-scrollable rows of 7 `ScopedTheme`-wrapped, phone-viewport-height (`height: 640`, matching each stage's own existing per-component stories) columns — one row per stage. | (a) All four stages per theme (14 columns × height, unwieldy and low-signal); (b) toolbar-switcher-only note (the `NewGoalWizard`/`EditGoalView` pattern), no live per-cell matrix.                          | `FinishCelebrateStage` and `FinishBakingStage` both style their root off plain `theme.colors.background` — no theme-varying chrome token to prove out, so they add no matrix signal. `FinishDesignStage` (`theme.chrome.screenHeaderBg/Fg/Border`) and `FinishRevealStage` (`theme.chrome.celebrationBg/Fg`, the #419 tokens) are the two stages whose look genuinely shifts per theme. The toolbar-switcher fallback exists only because `NewGoalWizard`/`EditGoalView` compose a component with an internal async-resolving hook (`EvidenceTypePicker`'s animation-pref probe) that `setState`s after mount and defeats `ScopedTheme` on web. None of the four `Finish*Stage` components have that shape — verified by reading all four sources: every one is `useState`-only/prop-driven, and `FinishRevealStage` receives `animationPref` as a fully controlled prop rather than calling `useAnimationPref()` itself. The live per-cell `ScopedTheme` matrix (the `BadgeWallCell`/`TimelineNode`/`FinishLine` pattern) is therefore safe here, and is more informative than a toolbar note. |
| D4  | No new Jest test file for this issue.                                                                                                                                                                                                                                                                 | Add a smoke test asserting the flow story's stage-transition logic.                                                                                                                                          | Mirrors the existing precedent: none of the stand-alone files under `src/stories/badges/` carry Jest coverage, and `component-structure.test.ts` doesn't apply (no new `src/components/` dir is created, per D1). Verification is manual/visual in Storybook, consistent with how #470/#471 already deferred "the interactive multi-stage flow story or 7-theme AllThemesMatrix" as untested-by-design until this issue.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Affected Areas

- `src/stories/finish/FinishFlow.stories.tsx` — **new**. Interactive flow harness (`useState` for `stage`/`design`/`goalTitle`/`closingNote`) wiring `FinishCelebrateStage` → `FinishDesignStage` → `FinishBakingStage` → `FinishRevealStage`; `Default`, `ReducedMotion`, `LongContent` flow stories; `AllThemesMatrix` story.
- `src/components/FinishRevealStage/FinishRevealStage.styles.ts`, `FinishCelebrateStage/FinishCelebrateStage.styles.ts`, `FinishDesignStage/FinishDesignStage.styles.ts` — **conditional, spacing-only**. Existing footer padding is already near-consistent (`paddingHorizontal: space[5]`, `paddingTop: space[2]` on all four; `paddingBottom` is `space[5]` on celebrate/design and `space[6]` on reveal). Touch only if the flow story's visual pass shows a real seam — see Step 3 and Open Questions.

No `src/screens/` or navigation files are touched (screen wiring is #449's).

## Implementation Plan

### Step 1: Interactive flow story (celebrate → design → baking → reveal)

**Files**: `src/stories/finish/FinishFlow.stories.tsx`
**Commit**: `test(finish-flow): interactive flow story — celebrate → design → baking → reveal`
**Changes**:

- [x] `FlowStage = "celebrate" | "design" | "baking" | "reveal"` local type.
- [x] `InteractiveFinishFlow` wrapper component owning: `stage`, `goalTitle` (seeded `"Rewire the workshop"`), `closingNote`, `design: BadgeDesign` (seeded via `createDefaultBadgeDesign(goalTitle, GOAL_COLOR)`, same fixture-hex convention as `FinishDesignStage.stories.tsx`). _(goalTitle threaded as a prop, not state — it never mutates during a flow; summary is built from it via `makeSummary()` so the same string surfaces on celebrate/design/reveal.)_
- [x] Stage transitions: `onDesignBadge` (celebrate) → `"design"`; `onBack` (design) → `"celebrate"`; `onBake` (design) → `"baking"`; a `useEffect` keyed on `stage === "baking"` that calls `setTimeout(() => setStage("reveal"), 1100)` (D2), cleaned up on unmount/stage change; `onViewBadge`/`onBackToGoals` (reveal) stay no-ops (flow ends, matching "no app navigation").
- [x] Render: a conditional on `stage` mounting exactly one of the four stages at a time, wrapped once in the `height: 640` phone-stage `View` convention used by the individual per-component stories.
- [x] `Default: Story = { render: () => <InteractiveFinishFlow /> }`.
- [x] `ReducedMotion: Story` — same harness with a `animationPref="none"` prop threaded to the reveal stage only (`InteractiveFinishFlow` `animationPref` prop, default `"full"`).
- [x] `LongContent: Story` — long `goalTitle` (mirrors `FinishDesignStage.stories.tsx`'s `LongLabels`), long `initialClosingNote` + `initialNoteOpen`, near-max 24-char `bottomLabel` override.
- [x] Storybook grouping: `title: "Iteration B/Finish/Flow"`.

**Committed**: `2c85ee04` — `test(finish-flow): interactive flow story — celebrate → design → baking → reveal`. Type-check + lint (file-scoped `eslint` exit 0) green.

### Step 2: AllThemesMatrix (Design + Reveal chrome, 7 product themes)

**Files**: `src/stories/finish/FinishFlow.stories.tsx` (same file, appended)
**Commit**: `test(finish-flow): AllThemesMatrix for FinishDesignStage + FinishRevealStage chrome tokens`
**Changes**:

- [ ] Import `themeNames`, `themes`/`ScopedTheme` per the `BadgeWallCell.stories.tsx`/`TimelineNode.stories.tsx` precedent.
- [ ] `AllThemesMatrix: Story` — horizontal `ScrollView`, one column per theme name (`MOOD_NAMES` label mapping mirrored from `FinishLine.stories.tsx`), each column stacking two `ScopedTheme`-wrapped, `height: 640` cells: a static (non-interactive, props-only) `FinishDesignStage` instance and a static `FinishRevealStage` instance, using the same fixture `design`/`goalTitle`/`earnedDateLabel` as the flow story.
- [ ] Column/cell styling via `StyleSheet.create` at the bottom of the file, matching `FinishLine.stories.tsx`'s `matrixContainer`/`matrixRow`/`matrixCell` naming convention.
- [ ] Short doc comment above the story explaining why a live per-cell matrix is safe here (unlike `NewGoalWizard`/`EditGoalView`) — same rationale as D3, condensed.

### Step 3: Visual polish pass (conditional)

**Files**: TBD — only the specific `Finish*Stage.styles.ts` file(s) where a real seam is found, if any.
**Commit**: `fix(finish-flow): visual polish at stage seams` (only created if Step 1/2's manual click-through surfaces an actual issue)
**Changes**:

- [ ] Click through `Default` and `LongContent` flow stories end-to-end; check spacing/footer-CTA-size/motion at each transition against `App Shell.dc.html`'s `finish` route.
- [ ] The one concrete numeric discrepancy already known from source: `FinishRevealStage`'s footer `paddingBottom` is `theme.space[6]`, vs. `theme.space[5]` on `FinishCelebrateStage`/`FinishDesignStage` — confirm in the flow story whether this reads as an intentional celebration-band safe-area allowance or an unintended seam before touching it (see Open Questions).
- [ ] If nothing looks broken, this step is a no-op and Step 1/2's two commits are the whole PR.

## Testing Strategy

- [ ] No new Jest test file (D4) — this is Storybook-only glue code with no new `src/components/` surface.
- [ ] Manual/visual: open Storybook under `Iteration B/Finish/Flow`; click through `Default` end-to-end (celebrate → design → baking → reveal, confirming the 1100ms auto-advance and the threaded `design`/`goalTitle`); check `ReducedMotion` (no pop-in on reveal) and `LongContent` (no clipping at any stage) against `App Shell.dc.html`'s `finish` route and `Finishing Flow A Prototype.dc.html`.
- [ ] Manual/visual: `AllThemesMatrix` — confirm `screenHeaderFg`-on-`screenHeaderBg` (design) and `celebrationFg`-on-`celebrationBg` (reveal) both stay legible across all 7 themes, especially Still Water (autismFriendly, muted) and Clean Signal (lowInfo, near-white).
- [ ] What this issue's coverage will **not** show: real navigation into/out of the flow from Focus Mode or Timeline, real `useCreateBadge`/signing/persistence on bake, and any interaction with the real closing-note/evidence data model — those stay #449's job by design.

## Not in Scope

| Item                                                                                                  | Reason                                                                                                                                                                                       | Follow-up                                                                  |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| App navigation into/out of the finish flow, `useCreateBadge`/bake persistence, real closing-note save | Issue's own "must not do" — integration is a separate concern                                                                                                                                | #449                                                                       |
| A reusable `src/components/FinishFlow/` orchestrator component                                        | D1 — would become a de facto integration surface pre-empting #449's own state-shape decisions                                                                                                | none — #449 decides if/how the four stages get a real production container |
| A manual "restart flow" affordance (the prototype's "↺ restart prototype" link)                       | Storybook's own remount/reload already resets story-local state each time the story is revisited; `NewGoalWizard`'s own `InteractiveFlow` story (closest precedent) has no reset link either | none                                                                       |
| Matrix coverage of `FinishCelebrateStage`/`FinishBakingStage`                                         | Both style off plain `theme.colors.background`, not a theme-varying chrome token pair — no matrix signal (D3)                                                                                | none                                                                       |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-07-07] File placement: the plan/greps assumed `src/stories/finish/` but no such dir existed — the four per-stage stories are co-located in `src/components/<Stage>/`. Created `src/stories/finish/` as a new stand-alone dir per D1 (matching the `src/stories/badges/` precedent). No deviation from D1's intent; the new dir is the intended home.
- [2026-07-07] Confirmed D3's ScopedTheme-safety by reading all four stage sources: every stage is `useState`-only/prop-driven. `FinishRevealStage`'s pop-in uses a reanimated shared value (`scale.value = withSpring(...)`), NOT React `setState`, so it triggers no post-mount React re-render — the per-cell `ScopedTheme` matrix (Step 2) is safe here, unlike the `NewGoalWizard`/`EditGoalView` async-hook case in memory.
- [2026-07-07] `FinishLine.stories.tsx`'s `AllThemesMatrix` paints colors statically inline (re-implements `goalNodeBg/Fg`) rather than using `ScopedTheme` — not a usable pattern for full stage components. Step 2 follows `BadgeWallCell.stories.tsx`'s live per-cell `ScopedTheme` matrix instead.

## Open Questions

Everything else in this plan resolves from the codebase and the canonical prototype (auto-advance mechanism/timing — the prototype's own `setTimeout(1100)`; which two stages carry theme-varying chrome tokens; why a live `ScopedTheme` matrix is safe here vs. `NewGoalWizard`/`EditGoalView`; file placement per `component-structure.test.ts`'s scan boundary). One genuine judgment call remains:

1. **`FinishRevealStage`'s footer `paddingBottom: theme.space[6]` vs. `space[5]` on the other three stages** — is this intentional (extra breathing room under the full-bleed celebration band / above a device home-indicator) or drift that should be normalized to `space[5]` as part of this issue's "final visual polish" ask? Recommend leaving it untouched unless the flow story's click-through makes it visually read as a seam — flagged rather than silently changed either way.
