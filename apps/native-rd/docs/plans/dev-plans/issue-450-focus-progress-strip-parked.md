# Development Plan: Issue #450

## Issue Summary

**Title**: [Storybook] Focus Mode chrome — progress strip + parked "Nothing in progress" state
**Type**: feature (Storybook-only, presentational)
**Complexity**: MEDIUM
**Estimated Lines**: ~480 lines (2 new components × 5 files each + i18n keys; issue's own "~250-350 LOC" estimate looks optimistic against actual sibling `FocusCurrentTaskCard` file sizes — see Discovery Log note under Testing Strategy)

## Intent Verification

- [x] Storybook's `Iteration B/Focus Mode/FocusProgressStrip` shows "{done} / {total} done" for a 0-done, a partial, and an all-done fraction, with the bar fill width matching each fraction. _(stories `ZeroDone`/`PartialProgress`/`AllDone`; test asserts label + `accessibilityValue.now` = 0/40/100 and clamps 0-total.)_
- [x] Tapping the progress strip fires an injectable `onPress` prop (real nav to Timeline is #377's job, not this issue's). _(whole strip is one `Pressable`; test fires `onPress` exactly once.)_
- [x] Storybook's `Iteration B/Focus Mode/FocusParkedState` shows "Nothing in progress." with 1 paused row and again with N paused rows, and the body copy reads exactly "{N} set aside — all still here, none hidden, nothing counted. Pick one back up when you're ready." (verbatim prototype copy, no "missing"/"needed" framing). _(stories `OneRow`/`ManyRows`; test asserts the verbatim body for 1 + 4 rows.)_
- [x] Each paused row shows a state pill in the same color+label language as `TimelineNode`/`FocusCurrentTaskCard` for `"paused"` (#406) — Title-Case "Paused" from `common:stepCard.status.paused`, consistent with the rest of the app — plus a "resume ›" affordance that fires _that row's own_ `onResume` — not another row's. _(pill bg/fg via `stepStateNodeBg/Fg("paused")`; test asserts pill reads "Paused" and per-row resume scoping over a 4-row fixture.)_
- [ ] Both components render without clipped text or wrong-token colors across all 7 `AllThemesMatrix` themes (`light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`, `light-autismFriendly`, `light-lowVision`, `light-lowInfo`). _(NOT yet visually verified — `AllThemesMatrix` stories built for all 7; token→prototype-hex mappings (D1/D4/D5) verified numerically, but the "no clipped text" pass under ND font scaling needs eyes on Storybook. Owned by the review/visual gate.)_
- [x] Grepping the two new component directories for a raw hex literal (`#[0-9a-fA-F]{3,6}`) outside comments returns nothing — every color is a theme token. _(only matches are `#377`/`#406` issue refs in comments.)_

## Dependencies

| Issue | Title                                                | Status                | Type                                                       |
| ----- | ---------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| #406  | TimelineNode — state-color map (`stepStateColorMap`) | ✅ Met (CLOSED)       | Blocker (this issue's colors route through it)             |
| #408  | Focus Mode — Current Task Card view                  | ✅ Met (CLOSED)       | Soft (source of the "screen-level, not this card" scoping) |
| #377  | Integrate Focus Mode rebuild                         | Downstream, not a dep | N/A — #450 unblocks #377, #377 does not block #450         |
| #384  | Epic: Full Ride redesign                             | OPEN (expected)       | Parent epic, tracked separately                            |

**Status**: ✅ All dependencies met. #450's own body has no "Blocked by" marker and is labeled `dep:independent`; #406 and #408 (the two issues it structurally depends on) are both closed. #378 (Timeline assembly) is still open but is a blocker of #377, not of this issue.

## Objective

Ship two prop-driven, Storybook-only pieces of Focus Mode chrome that #377 currently has no storied UI for: a tappable progress strip ("{done}/{total} done · See all steps ›" + thin bar) and the parked/all-paused screen state ("Nothing in progress." + N paused rows). No screen wiring, no navigation, no real data — pure presentational components with stories and tests, matching the `Focus Mode A Prototype.dc.html` / canonical `App Shell.dc.html` markup exactly.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                        | Alternatives Considered                                                                                                                                                                  | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Progress bar **fill** = `theme.journey.journeyProgressFill`; **track** = `theme.colors.background` + `theme.colors.border` border (NOT `theme.journey.journeyProgressTrack`)                                                                                                                                                                                                                                                                    | Use `journeyProgressTrack` for the track too                                                                                                                                             | Both prototype sources (`Focus Mode A` and the canonical `App Shell.dc.html`) draw the track as `background:#fff; border:2px solid #0a0a0a` — a bordered neutral surface, not a filled gray box. `journey-progress-track` resolves to `{color.gray.100}` with no border, which is visually wrong here. `journey-progress-fill` (`{primary}`) is the one genuine "progress" semantic and is otherwise unused in the codebase today — this issue is its first consumer.                                                                                  |
| D2  | Build a bespoke thin bar inside `FocusProgressStrip.styles.ts` rather than reusing `src/components/ProgressBar`                                                                                                                                                                                                                                                                                                                                 | Reuse the shared `ProgressBar` component                                                                                                                                                 | `ProgressBar` is pill-radius (`theme.radius.pill`), uses `backgroundTertiary`/`accentPrimary`, and is already live in `GoalCard`, `GoalsCockpit`, `TimelineJourneyScreen`. The prototype's strip bar is a flat 9px rectangle with a 2px border and a white track — visually different. Modifying the shared component to match would touch 3 unrelated screens outside this issue's Storybook-chrome scope.                                                                                                                                            |
| D3  | Ship the parked/all-paused state as a **sibling component** (`FocusParkedState`), not a new `FocusCardStatus` member on `FocusCurrentTaskCard`                                                                                                                                                                                                                                                                                                  | Add `"all-paused"` to `FocusCardStatus` and a matching view inside `FocusCurrentTaskCard`                                                                                                | #408's own plan already logged this as a screen-level concern ("not this card"). The parked state needs an **array** of N paused rows; `FocusCurrentTaskCard`'s contract is built around a single `title: string` — stapling a list-shaped concern onto a single-task card would break its prop-grouping-by-view-state design.                                                                                                                                                                                                                         |
| D4  | Parked row's state pill is a **small local pill** in `FocusParkedState`, built from `stepStateColorMap` / `stepStateNodeBg` / `stepStateNodeFg` directly, styled to match `FocusCurrentTaskCard`'s `StateWordPill`. **Label text is the shared i18n key `common:stepCard.status.paused` → "Paused"** (Title-Case), consistent with `TimelineNode`/`FocusCurrentTaskCard` and the rest of the app — NOT the mockup's literal lowercase "paused". | (a) Import `StateWordPill` from `FocusCurrentTaskCard.parts.tsx` directly; (b) extract a new shared `Pill` component; (c) fork a lowercase "paused" string to match the mockup literally | **User decision (start-issue, 2026-07-02): keep Title-Case "Paused" — the state word is Title-Case everywhere else in the app, so the shared #406 label wins over the mockup's one-off lowercase.** Color and label both travel through the #406 map by design. (a)/(b) break the established repo pattern where each component (`TimelineNode`, `FocusCurrentTaskCard`) draws its own pill markup from the shared _color-resolution_ functions rather than sharing one pill component — `.parts.tsx` is not exported as a public cross-component API. |
| D5  | "Nothing in progress." heading uses `theme.size["2xl"]` (24px), not `size["3xl"]` (32px, used for `FocusCurrentTaskCard`'s 29px title / 34px all-complete heading)                                                                                                                                                                                                                                                                              | `size["3xl"]`, matching the sibling card's headings                                                                                                                                      | The mockup's heading is 27px. Nearest-token distance is 3px to `2xl` (24) vs 5px to `3xl` (32) — the opposite of the 29px/34px cases already resolved to `3xl` in `FocusCurrentTaskCard.styles.ts`. Same "(R#) nearest token" fidelity method, different nearest answer.                                                                                                                                                                                                                                                                               |
| D6  | `FocusParkedState` derives its displayed count from `rows.length`; there is no separate `pausedCount` prop                                                                                                                                                                                                                                                                                                                                      | Accept `pausedCount` as its own prop, decoupled from `rows` (mirrors the prototype's separate `pausedCount`/`pausedList` bindings)                                                       | A derived count can't drift from what's actually rendered. If a future screen needs a paginated/truncated row list with an independent total, the prop can be added later without breaking existing callers. **User decision (start-issue, 2026-07-02): derive from `rows.length`.**                                                                                                                                                                                                                                                                   |

## Resolved Questions (start-issue, 2026-07-02)

The four decisions the researcher surfaced were put to the user and resolved:

1. **Progress-bar track** → prototype look: `background` fill + 2px `border` (D1 as written), _not_ `journeyProgressTrack`.
2. **Paused pill casing** → Title-Case **"Paused"** via `common:stepCard.status.paused` — the state word is Title-Case everywhere else, so app consistency wins over the mockup's one-off lowercase (see D4, Step 1, Step 5, Step 7).
3. **"N set aside" count** → derived from `rows.length` (D6); no separate `pausedCount` prop.
4. **Component names** → `FocusProgressStrip` + `FocusParkedState`, Storybook under `Iteration B/Focus Mode/…`.

Not asked (resolved by the researcher / verification): commit granularity kept at 7 commits; token readiness confirmed — `journey-progress-fill` / `journey-progress-track` exist per-theme in `packages/design-tokens/src/tokens/journey.json` with per-theme overrides.

## Affected Areas

- `apps/native-rd/src/components/FocusProgressStrip/` (new): tappable "{done}/{total} done · See all steps ›" header + thin progress bar.
- `apps/native-rd/src/components/FocusParkedState/` (new): "Nothing in progress." heading + body + N paused-row list.
- `apps/native-rd/src/i18n/resources/en/focusMode.json`: new `progressStrip` and `parked` key groups (English only — `de/` and `pseudo/` are bot-generated by `.github/workflows/i18n-sync.yml` after this lands; do not hand-translate them).

## Implementation Plan

### Step 1: i18n keys for both new pieces

**Files**: `apps/native-rd/src/i18n/resources/en/focusMode.json`
**Commit**: `i18n(focusMode): add progress-strip + parked-state copy keys`
**Changes**:

- [x] Add `progressStrip.doneCount` ("{{done}} / {{total}} done"), `progressStrip.seeAllSteps` ("See all steps ›"), `progressStrip.a11yLabel` ("{{done}} of {{total}} steps done. See all steps.")
- [x] Add `parked.heading` ("Nothing in progress."), `parked.body` ("{{count}} set aside — all still here, none hidden, nothing counted. Pick one back up when you're ready." — verbatim prototype copy, count interpolated), `parked.resumeCta` ("resume ›"), `parked.rowA11y` ("{{title}}, paused. Resume.")
- [x] Pill label reuses the existing `common:stepCard.status.paused` ("Paused") — no new pill string (D4).
- [x] Do **not** touch `de/focusMode.json` or `pseudo/focusMode.json` — the i18n-sync bot regenerates both from `en/` + the existing `_register/focusMode.yml` register after merge.

### Step 2: `FocusProgressStrip` component + styles

**Files**: `apps/native-rd/src/components/FocusProgressStrip/FocusProgressStrip.tsx`, `FocusProgressStrip.styles.ts`, `index.ts`
**Commit**: `feat(focusProgressStrip): tappable done/total strip with progress bar`
**Changes**:

- [x] `FocusProgressStrip.tsx`: `Pressable` wrapping the whole strip (whole block is the "See all steps" tap target, matching the prototype's `onClick` on the outer container), props `{ doneCount: number; totalCount: number; onPress?: () => void }`. Clamp `totalCount > 0 ? doneCount / totalCount : 0` for the fill fraction.
- [x] Top row: mono "{{done}} / {{total}} done" label (`theme.colors.textSecondary`, `theme.size.xs`) + "See all steps ›" (`theme.colors.accentPrimary`, bold, `theme.size.xs`).
- [x] Bar: `View` with `accessibilityRole="progressbar"` + `accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}`, height 9, `borderWidth: theme.borderWidth.medium`, `borderColor: theme.colors.border`, `backgroundColor: theme.colors.background` (track, D1); inner fill `View` width `${pct * 100}%`, `backgroundColor: theme.journey.journeyProgressFill` (D1).
- [x] Outer `Pressable`: `accessibilityRole="button"`, `accessibilityLabel: t("focusMode:progressStrip.a11yLabel", { done, total })`.
- [x] `index.ts` re-exports `FocusProgressStrip` and its prop type.
- [x] No hardcoded hex anywhere in `.styles.ts`.

### Step 3: `FocusProgressStrip` stories

**Files**: `apps/native-rd/src/components/FocusProgressStrip/FocusProgressStrip.stories.tsx`
**Commit**: `storybook(focusProgressStrip): fraction stories + AllThemesMatrix`
**Changes**:

- [x] `ZeroDone` (doneCount=0), `PartialProgress` (e.g. 2/5), `AllDone` (doneCount === totalCount) — each wrapped in the same 344px `PhoneWidth` frame convention `FocusCurrentTaskCard.stories.tsx` established (R8).
- [x] `AllThemesMatrix`: iterate `themeNames` from `../../themes/compose` (the 7 runtime product themes) inside `ScopedTheme`, same scaffolding as `FocusCurrentTaskCard.stories.tsx`'s `AllThemesMatrix` (duplicate the `MOOD_NAMES` map locally — no shared matrix helper exists in this repo yet; introducing one is out of scope here).
- [x] Story title: `"Iteration B/Focus Mode/FocusProgressStrip"`.

### Step 4: `FocusProgressStrip` unit tests

**Files**: `apps/native-rd/src/components/FocusProgressStrip/__tests__/FocusProgressStrip.test.tsx`
**Commit**: `test(focusProgressStrip): fraction rendering, tap target, a11y contract`
**Changes**:

- [x] `test.each` over `[0,5]`, `[2,5]`, `[5,5]` asserting the rendered "{{done}} / {{total}} done" text and the progress bar's `accessibilityValue.now`.
- [x] `totalCount = 0` does not throw and renders `now: 0`.
- [x] Tapping the strip fires `onPress` exactly once.
- [x] Strip exposes `accessibilityRole="button"` with a non-empty `accessibilityLabel`; bar exposes `accessibilityRole="progressbar"`.

### Step 5: `FocusParkedState` component + styles

**Files**: `apps/native-rd/src/components/FocusParkedState/FocusParkedState.tsx`, `FocusParkedState.styles.ts`, `index.ts`
**Commit**: `feat(focusParkedState): all-paused screen state with resumable row list`
**Changes**:

- [x] Props: `{ rows: readonly { id: string; title: string; onResume: () => void }[] }` (D6 — count is `rows.length`, not a separate prop).
- [x] Heading "Nothing in progress." (`accessibilityRole="header"`, `theme.size["2xl"]`, D5), body via `t("focusMode:parked.body", { count: rows.length })`.
- [x] Row: bordered `Pressable` (border `thick`, radius `lg`, shadow `cardElevationSmall` — mirrors the prototype's 3px border / 6px corner / 2×2 shadow combination), containing: local "Paused" state pill (D4 — label `t("common:stepCard.status.paused")` = "Paused"; pill bg/fg color from `stepStateNodeBg`/`stepStateNodeFg` for the `"paused"` state), row title (bold), "resume ›" (`theme.colors.accentPrimary`, bold). Whole row is one `accessible` `Pressable` with a combined `accessibilityLabel` (`t("focusMode:parked.rowA11y", { title })`), matching the `accessible`-collapses-children pattern already used in `FocusCurrentTaskCard.parts.tsx`'s `plannedBox`.
- [x] Each row calls its own `onResume` — no shared/ambient handler.
- [x] `index.ts` re-exports `FocusParkedState` and its prop/row types.
- [x] No hardcoded hex.

### Step 6: `FocusParkedState` stories

**Files**: `apps/native-rd/src/components/FocusParkedState/FocusParkedState.stories.tsx`
**Commit**: `storybook(focusParkedState): one-row + many-row stories + AllThemesMatrix`
**Changes**:

- [x] `OneRow` (single paused step), `ManyRows` (e.g. 4 paused steps), each in the 344px `PhoneWidth` frame.
- [x] `AllThemesMatrix` over `themeNames` (7 themes), same scaffolding as Step 3.
- [x] Story title: `"Iteration B/Focus Mode/FocusParkedState"`.

### Step 7: `FocusParkedState` unit tests

**Files**: `apps/native-rd/src/components/FocusParkedState/__tests__/FocusParkedState.test.tsx`
**Commit**: `test(focusParkedState): row rendering, per-row resume scoping, copy fidelity`
**Changes**:

- [x] Asserts the exact verbatim body copy for 1 row and N rows (`test.each`), including the "all still here, none hidden, nothing counted" phrase — regression guard against future "missing"/"needed" drift.
- [x] Renders one pill + title + "resume ›" per row.
- [x] Tapping row _N_'s resume fires only that row's `onResume` (not another row's) — `test.each` over a multi-row fixture.
- [x] Pill text reads "Paused" (the shared `common:stepCard.status.paused` label), consistent with the rest of the app.
- [x] Each row exposes `accessibilityRole="button"` with a title-including label.

## Testing Strategy

- [x] Unit tests for both components (Jest 30, `@testing-library/react-native` v13), run via `bun run test --testPathPatterns FocusProgressStrip|FocusParkedState` — never `bun test` or plain `npx jest`. _(6 + 9 tests, all green; full suite 197/197 suites, 9590 tests.)_
- [x] Test files live at `src/components/<Name>/__tests__/<Name>.test.tsx`, matching the `FocusCurrentTaskCard` precedent (co-located, not under a separate mirrored tree for components).
- [x] `test.each` for the fraction/row-count variants instead of duplicating near-identical test bodies.
- [ ] Manual testing: open both stories in web Storybook, cycle the theme toolbar and the `AllThemesMatrix` story for all 7 themes, confirm no clipped text and correct token colors (especially the progress-bar fill/track pairing from D1 and the paused-pill color from D4). _(NOT run — owned by the review/visual gate; see Intent Verification criterion 5.)_

_Discovery note (from research, not yet an implementation finding): the issue's own "~250-350 LOC incl. stories" estimate is optimistic by this repo's own recent precedent — #408 (`FocusCurrentTaskCard`, also originally estimated ~300 LOC) landed at ~1,400 lines across its 7 files including tests. This plan's ~480-line estimate already assumes these two components are individually much simpler (2-3 UI states each vs. #408's 4 rich states), so if implementation tracks closer to #408's overrun, flag it in the Discovery Log rather than silently padding scope._

## Not in Scope

| Item                                                                                                                            | Reason                                                                                                                                                            | Follow-up                                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Wiring "See all steps" to real Timeline navigation, or real done/total/paused-row data                                          | Explicitly #377's job (the issue says "nav is #377's wiring")                                                                                                     | #377                                                                 |
| Migrating `ProgressBar` (`GoalCard`, `GoalsCockpit`, `TimelineJourneyScreen`) onto `journeyProgressFill`/`journeyProgressTrack` | Those 3 screens aren't storied/tested by this issue; changing their shared component is a separate token-hygiene pass                                             | none filed yet — worth a follow-up issue if raised                   |
| Adding a first-class `journey-step-paused-bg/fg` token (replacing the `accentPurpleLight` fallback in `stepStateColorMap`)      | Pre-existing TODO on the #406 map, unrelated to this issue's scope                                                                                                | already tracked as a TODO in `stepStateColorMap.ts` (#406-follow-up) |
| Pagination/truncation of the paused-row list                                                                                    | Not referenced anywhere in the issue or prototype; D6 (user-confirmed) derives count from an unbounded `rows` array                                               | revisit if #377 needs an independent total                           |
| Extracting a shared `PhoneWidth`/`AllThemesMatrix` story helper                                                                 | No shared helper exists yet anywhere in the repo (8+ stories files each duplicate this scaffolding) — introducing one is a cross-cutting change, not this issue's | none — matches existing repo-wide convention                         |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-07-02 14:59] Progress-bar a11y: the whole strip is one `accessible`
  Pressable (button) per the prototype's outer-container tap target. RN collapses
  an `accessible` element's children in the accessibility tree, so the inner
  `accessibilityRole="progressbar"` View is not a separate a11y node —
  `getByRole("progressbar")` cannot find it (even with `includeHiddenElements`),
  unlike `AudioPlayer` whose bar sets `accessible` on itself with no accessible
  ancestor. This is the correct real-world outcome: the button's
  `accessibilityLabel` ("{done} of {total} steps done. See all steps.") carries
  the fraction; the progressbar role/value is decorative visual/semantic
  metadata. Added `testID="focus-progress-strip-bar"` to the bar so the test can
  assert its role + `accessibilityValue.now` directly (committed with Step 4's
  test commit, not Step 2, since it's a testability affordance).
- [2026-07-02 14:59] Ops note (not a plan change): `bun run test --testPathPatterns`
  must be run from `apps/native-rd/` — at the workspace root it routes through
  turbo, which rejects the passthrough flag. Matches the app-scoped command in
  `apps/native-rd/CLAUDE.md`.
- [2026-07-02 15:10] Deviation from Step 1's "do NOT touch pseudo/": the plan
  (and project memory) conflated `pseudo/` with `de/`. Only `de/` is the LLM
  i18n-sync bot's post-merge job. `pseudo/` is generated by a LOCAL, mechanical
  script (`bun run gen:pseudo`) and the `locale-parity.test.ts` gates on en↔pseudo
  parity at test time — so adding en keys without regenerating pseudo turns the
  suite red. Regenerated pseudo and committed only `pseudo/focusMode.json` (the
  new progressStrip + parked keys), reverting incidental padding churn the
  generator produced in `changeEvidenceTypeA11y` and 4 unrelated namespaces (their
  keys were already in parity — pre-existing value drift, out of scope). `de/`
  left untouched for the bot. Full suite green after: 197 suites / 9590 tests.
