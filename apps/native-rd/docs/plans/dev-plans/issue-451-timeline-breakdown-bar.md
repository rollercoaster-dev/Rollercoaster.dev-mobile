# Development Plan: Issue #451

## Issue Summary

**Title**: `[Storybook]` Timeline honest-breakdown bar + counts legend
**Type**: feature (new Storybook-gated presentational component)
**Complexity**: SMALL
**Estimated Lines**: ~230–290 lines (incl. stories + tests; no new design tokens required)

---

## Intent Verification

- [x] `TimelineBreakdownBar` renders a 4-segment horizontal bar whose segment
      widths are proportional to `counts.completed` / `counts["in-progress"]` /
      `counts.pending` / `counts.paused`, in that left-to-right order (done →
      in motion → to come → set aside), matching `tl-mid.png`. — `SEGMENT_ORDER` + `flex: counts[state]` per segment.
- [x] Every segment's fill color resolves through `stepStateNodeBg(theme, state)`
      from `stepStateColorMap.ts` (#406) — zero hardcoded hex anywhere in
      `TimelineBreakdownBar.styles.ts`. — fills set inline via `stepStateNodeBg`;
      `styles.ts` uses only `theme.*` tokens, no hex.
- [x] The counts legend renders `"{{count}} <label>"` chips — "done" / "in
      motion" / "to come" / "set aside" — sourced from new i18n keys, not
      inline strings. — `t(legendI18nKey(state), { count })`.
- [x] A state with `count === 0` produces **no legend chip** for that state
      (verified by a test: e.g. an all-done breakdown shows only a "done"
      chip, not "0 in motion / 0 to come / 0 set aside"). — `SEGMENT_ORDER.filter(
    (s) => counts[s] > 0)` + drop-out unit test.
- [x] `ProgressBar.tsx` (`src/components/ProgressBar/`) is untouched — its
      `progress: number` single-fill contract and its 3 live callers
      (`GoalsCockpit`, `TimelineJourneyScreen`, `GoalCard`) are unmodified.
      — not in the branch diff.
- [x] An `AllThemesMatrix` story renders all 7 product themes' segment colors
      side by side (mirroring `TimelineNode.stories.tsx`), demonstrating the
      map resolves in every theme, including the `paused` →
      `accentPurpleLight` fallback. — static `themes[name]` read, one bar/row.
- [x] `bun run test --testPathPatterns i18n` (locale-parity + pseudo-locale
      tests) passes — the new `en/common.json` keys have matching `pseudo/`
      entries in the same PR. — 373/373 green.

---

## Dependencies

| Issue | Title                                   | Status                                             | Type                         |
| ----- | --------------------------------------- | -------------------------------------------------- | ---------------------------- |
| #406  | TimelineNode — one state-color language | ✅ Merged (owns the map)                           | Hard (satisfied)             |
| #384  | Epic — Full Ride redesign               | Open (tracking epic)                               | Parent, not a blocker        |
| #378  | `[Integrate]` Timeline screen wiring    | Open — **this issue unblocks it**, not the reverse | Downstream, not a dependency |

**Status**: ✅ All dependencies met — `dep:independent` label confirmed, no
`Blocked by` / `Depends on` / `After` marker in the issue body, and #406 (the
only real prerequisite — it owns `stepStateColorMap`) is closed, merged via
PR #421 (`feat(native-rd): unify TimelineNode state colors (#406)`,
2026-06-29) — `stepStateColorMap.ts` exists on disk today. Start immediately.

Note for later: #378's body already blocks on #406/#407/#417 but does **not**
yet list #451 as a blocker, even though its own acceptance text says "Keep the
`ProgressBar` (mint done / yellow in-motion segments)" — which is actually
describing this new component, not the real `ProgressBar.tsx`. Wiring #451
into #378's `blocked-by` list is a housekeeping step outside this plan's scope
(flagged, not actioned here — this plan only builds the Storybook component).

---

## Objective

Build `TimelineBreakdownBar` — a presentational, Storybook-only component
pairing a 4-segment progress bar with a counts legend ("N done · N in motion ·
N to come · N set aside") — using the existing `stepStateColorMap` /
`stepStateNodeBg` journey-token resolvers from #406 so it speaks the exact
same one-color language as `TimelineNode`. No data fetching, no screen
wiring (that's #378), no new design tokens (the `paused` → `accentPurpleLight`
fallback already exists and is reused as-is).

---

## Decisions

| ID  | Decision                                                                                                                                                                                                 | Alternatives Considered                                                                                                                                                | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Props are `counts: Record<StepStateMapKey, number>` (keyed by the canonical `"pending" \| "in-progress" \| "paused" \| "completed"` vocabulary from `stepStateColorMap.ts`)                              | (a) four discrete number props named `done`/`inMotion`/`toCome`/`setAside`; (b) a `steps: { status: StepStatus }[]` array, letting the component tally                 | (a) would introduce a second, parallel vocabulary for the same four states that #406 already canonicalized — drift risk. (b) pushes step-traversal semantics (parents+children counting, single-accent in-progress capping) into a presentational component; `TimelineJourneyScreen` already computes these differently per its own domain rules (`TimelineJourneyScreen.tsx:122-127`) and per-screen counting logic shouldn't be duplicated/forked here. Explicit pre-tallied counts keep the component pure, trivial to test, and directly satisfy the issue's 4 required story states.            |
| D2  | Segment/legend order is a **local** `SEGMENT_ORDER: StepStateMapKey[] = ["completed", "in-progress", "pending", "paused"]` constant in the new component's own file, not added to `stepStateColorMap.ts` | Add an `order` field to `StepStateEntry` in the shared map                                                                                                             | `stepStateColorMap.ts` is the shared color/glyph/badge-i18n source consumed by `TimelineNode`, `TimelineStep`, and `FocusCurrentTaskCard` today. This bar's visual order (done→inMotion→toCome→setAside) is specific to this one widget — `TimelineNode`'s own `AllThemesMatrix` already orders states differently (`pending, in-progress, paused, completed` — `TimelineNode.stories.tsx:162-167`). Keeping the order local avoids growing a shared file for a single consumer, matching #406 D2's own collocation precedent ("promote only when a third unrelated consumer appears").              |
| D3  | Legend i18n keys live at a **new** `common:timelineBreakdown.legend.<state>` path (own top-level section in `en/common.json`), not reusing `stepCard.status.*`                                           | Reuse the existing `common:stepCard.status.*` badge strings ("Completed"/"In Progress"/"Pending"/"Paused")                                                             | The legend needs different wording than the badge: "done"/"in motion"/"to come"/"set aside" (issue-specified, and independently confirmed live in the prototype's `renderVals()` `counts` array — `Timeline A Prototype.dc.html:428-431` — and in the shipped Focus Mode paused copy, `FocusCurrentTaskCard` en resources: `"Set aside — still here, nothing lost..."`). Reusing `stepCard.status.*` would silently change that copy's meaning (badge word ≠ legend word) for every existing consumer. A parallel, purpose-named key path keeps both vocabularies independently editable.            |
| D4  | Legend text has **no i18next plural suffix** (`_one`/`_other`) — a single template per state, e.g. `"{{count}} done"`                                                                                    | Add `_one`/`_other` variants per state (8 keys instead of 4)                                                                                                           | None of "done"/"in motion"/"to come"/"set aside" are grammatically number-sensitive nouns in English (unlike the existing `evidence.step_one`/`step_other` pattern at `common.json:130-131`, which pluralizes "item"). Matches the simpler existing precedent `badges.json:4` (`"count": "{{count}} badges"`), a static template with no plural branching. If German pluralizes differently, that's the sync bot's problem to solve per-locale, not en's.                                                                                                                                            |
| D5  | Bar segments use `flex: counts[state]` (a numeric flex proportion per segment) instead of manually computed percentage widths                                                                            | Compute `pct = count / total * 100 + "%"` per segment (the prototype's own approach, `Timeline A Prototype.dc.html:369`)                                               | `flex` proportions let React Native's layout engine do the division, which sidesteps a `total === 0` divide-by-zero/NaN-width edge case for free (all segments render `flex: 0`, i.e., an empty bordered track — no crash, no NaN). Simpler and more robust than porting the prototype's manual `pct()` helper.                                                                                                                                                                                                                                                                                      |
| D6  | Bar segments carry **no accessibility role** (plain, non-accessible `View`s); the legend `Text` chips are the sole accessible surface, one `Text` per visible state                                      | (a) Wrap the bar in `accessibilityRole="progressbar"` with a synthesized aggregate label; (b) `accessibilityRole="summary"` wrapper joining all counts into one string | React Native does not announce plain `View`s with no `accessible`/text content by default, so the color bar is silently skipped by VoiceOver/TalkBack with zero extra code — and correctly so, since it's redundant with the legend. Synthesizing an aggregate spoken sentence (a) or (b) would duplicate the same four numbers the legend `Text` nodes already announce individually; no existing Iteration B component (`ProofSpine`, `ThemeSwatchRail`, `BadgeWallCell`) aggregates multi-chip stats into one spoken string, so per-chip `Text` announcement is the established, simpler pattern. |
| D7  | Container card uses `theme.borderWidth.medium` + `theme.radius.lg` + `shadowStyle(theme, "cardElevation")` + `theme.colors.background`/`theme.colors.border`                                             | Guess a bespoke shadow/radius combo                                                                                                                                    | Cross-checked against **two** independent sources that agree: (1) the _rendered_ mockup at `Timeline Directions.dc.html:281` (`border:2px`, `border-radius:6px`, `box-shadow:3px 3px 0`) and (2) `FocusCurrentTaskCard.styles.ts:130` which documents the exact same prototype triplet as "3×3 shadow (`cardElevation`) + 6px corner (`radius.lg`, nearest)" — `theme.radius.lg` = 8px is the token system's nearest bucket to a 6px design intent, `cardElevation` = `hardMd` = offset (3,3). `borderWidth.medium` = 2px matches the mockup's `border:2px` exactly.                                 |

---

## Research Findings (code-answered, not left open)

**`stepStateColorMap` — exact export + consumption (#406).**
`src/components/TimelineNode/stepStateColorMap.ts:58` exports
`stepStateColorMap: Record<StepStateMapKey, StepStateEntry>` with
`StepStateMapKey = "pending" | "in-progress" | "paused" | "completed"`
(`stepStateColorMap.ts:20-24`, identical to `StepStatus` in
`src/types/steps.ts:8`). Two resolver helpers are already exported for exactly
this "safe inside `StyleSheet.create` or a static `themes[name]` read" use
case: `stepStateNodeBg(theme, state)` and `stepStateNodeFg(theme, state)`
(`stepStateColorMap.ts:99-118`). `TimelineNode.styles.ts:41-54` and
`TimelineNode.stories.tsx:195-196` (the `AllThemesMatrix`) both consume the
map through these two helpers — this plan does the same, with **zero new
resolver code needed**.

**`paused` → `accentPurpleLight` fallback — confirmed exactly as the issue
claims.** `stepStateColorMap.ts:78-90`: `paused` is `source: "colors"`,
`nodeBgColorsFallback: "accentPurpleLight"`, with a `TODO(#406-follow-up)`
comment noting the owed `journey-step-paused-bg/fg` package token. Confirmed
in `src/themes/colorModes.ts:28` (`accentPurpleLight: string` exists on
`Colors`) and in `packages/design-tokens/src/tokens/journey.json` (no
`journey-step-paused-*` key exists among the 3 real journey-step tokens:
`journey-step-bg/fg`, `journey-step-active-bg/fg`,
`journey-step-complete-bg/fg`). **No token work is required for this issue** —
the fallback this issue is instructed to use already exists and is already
exercised by `TimelineNode`.

**`ProgressBar` — confirmed single-fill, confirmed live callers (don't
retrofit).** `src/components/ProgressBar/ProgressBar.tsx:13-15`:
`ProgressBarProps = { progress: number }`, one `Animated.View` fill
(`ProgressBar.tsx:48`) driven by a single `useSharedValue`. Its styles
(`ProgressBar.styles.ts`) use `theme.colors.backgroundTertiary` (track) /
`theme.colors.accentPrimary` (fill) — plain `theme.colors`, not
`stepStateColorMap`. Three live, non-Storybook callers found via grep:
`src/screens/GoalsScreen/GoalsCockpit.tsx`,
`src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx:10,204`, and
`src/components/GoalCard/GoalCard.tsx` (plus an accessibility contract test).
Widening `progress: number` into a 4-segment contract would break all three
call sites' prop shape — confirms the issue's "don't retrofit" instruction is
structurally correct, not just a style preference.

**Storybook conventions — confirmed via 15+ existing Iteration B story
files.** CSF is `@storybook/react` `Meta`/`StoryObj` (`import type { Meta,
StoryObj } from "@storybook/react"`, e.g. `TimelineNode.stories.tsx:1`).
Title convention: `"Iteration B/<Area>/<ComponentName>"` — confirmed exact
sibling precedent `"Iteration B/Timeline/TimelineNode"` and
`"Iteration B/Timeline/TimelineStep"` (`TimelineNode.stories.tsx:22`,
`TimelineStep.stories.tsx:22`), so this component's title is
**`"Iteration B/Timeline/TimelineBreakdownBar"`**. The `AllThemesMatrix`
pattern (no separate helper/decorator import — it's hand-rolled per file) is
fully specified at `TimelineNode.stories.tsx:162-254`: read `themes[name]` /
`themeNames` from `src/themes/compose.ts` statically (Unistyles v3's theme is
a global runtime singleton, so a reactive live component can't render 7
themes at once — same constraint applies here), paint cells inline via the
`stepStateNodeBg/Fg` resolvers, and label rows with the `MOOD_NAMES: Record<ThemeName, string>` map (`TimelineNode.stories.tsx:176-184`) — this plan
reuses that exact `MOOD_NAMES` table (copy, not import — it's currently
file-local in each story, matching the collocation pattern).

**Component location + naming + test conventions — confirmed via
`TimelineNode`/`TimelineStep`/`ProgressBar` directories.** Pattern:
`src/components/<ComponentName>/` containing `<ComponentName>.tsx`,
`<ComponentName>.styles.ts`, `<ComponentName>.stories.tsx`,
`__tests__/<ComponentName>.test.tsx`, and a barrel `index.ts` re-exporting
`{ ComponentName, type ComponentNameProps }` (`TimelineNode/index.ts:1`).
Tests use `renderWithProviders`/`screen` from
`../../../__tests__/test-utils` (`TimelineNode.test.tsx:1-7`) and
`test.each` for repetitive per-state cases (`TimelineNode.test.tsx:16-24`,
`86-99`) — this plan follows both exactly.

**Props shape — resolved, see D1.**

**i18n approach — resolved, see D3/D4.** Confirmed via
`src/i18n/i18next.d.ts:3,28`: typed `t()` keys are derived directly from
`typeof` the real `en/*.json` files (no manual `.d.ts` edits needed when
adding a key — TypeScript picks up new `en/common.json` keys automatically).
Confirmed the **current** de/ sync path is bot-driven, not hand-translated:
`.github/workflows/i18n-sync.yml:1-9,23-30` triggers `bun run i18n:sync` on
any PR touching `apps/native-rd/src/i18n/resources/en/**` and auto-commits
`de/` back to the PR branch — **do not hand-edit `de/common.json`**.
Confirmed **pseudo is NOT bot-synced** and **is** enforced by a local/CI test:
`src/i18n/__tests__/locale-parity.test.ts` asserts en and pseudo have
identical flattened key sets for every namespace, so `bun run gen:pseudo`
must be run locally and the resulting `pseudo/common.json` diff for the new
keys committed in the same PR (matching #406's Discovery Log finding that a
full `gen:pseudo` run can surface unrelated pre-existing drift — stage only
the new `timelineBreakdown.legend.*` lines, revert any unrelated diff noise
`gen:pseudo` produces elsewhere in `pseudo/`).

**Cross-component design-source check (App Shell + Timeline Directions).**
`App Shell.dc.html` has no breakdown-bar markup at all (grepped for
`barSegs`/`counts`/`breakdown` — no hits); the honest-breakdown widget is
Timeline-screen-specific, not part of the shared app shell chrome. More
importantly: **`Timeline A Prototype.dc.html` itself never wires `barSegs`/
`counts` into its rendered markup** — its "TIMELINE" screen template
(`Timeline A Prototype.dc.html:44`) still renders the plain single-fill bar
(`{{ progressPct }}`, `{{ doneCount }} / {{ totalCount }}`) that
`renderVals()` also computes; the segmented `barSegs`/`counts` view-model
(`Timeline A Prototype.dc.html:424-431`) is dead data in that file today —
which is exactly the "zero component support" gap #451 exists to close. The
actual rendered reference for the segmented-bar-plus-legend visual is
**`Timeline Directions.dc.html:281-288`** ("Direction C · Honest header"): a
bordered/shadowed card containing (1) a `height:12px` flex row of colored
`<div>` segments with explicit percentage widths in done/inMotion/toCome/
setAside order and (2) a `flex-wrap` row of legend chips, each a small
colored square swatch + `"{{c.n}} {{c.label}}"` in DM Mono 11px muted gray.
The issue's own `tl-mid.png` screenshot (labeled "Direction A · interactive",
`prototypes/screen-redesign/screenshots/tl-mid.png`) visually confirms this
exact swatch-chip layout (3 chips wrap to a row, "1 set aside" wraps alone)
rendered inside the Direction A device frame — i.e., Direction C's design was
the one actually screenshotted into the "A" flow, even though the checked-in
Direction A HTML file's markup was never updated to match. This plan builds
to the Direction C markup + `tl-mid.png` screenshot, not the un-wired
Direction A markup.

---

## Affected Areas

- `apps/native-rd/src/components/TimelineBreakdownBar/TimelineBreakdownBar.tsx` — **new**
- `apps/native-rd/src/components/TimelineBreakdownBar/TimelineBreakdownBar.styles.ts` — **new**
- `apps/native-rd/src/components/TimelineBreakdownBar/TimelineBreakdownBar.stories.tsx` — **new**
- `apps/native-rd/src/components/TimelineBreakdownBar/__tests__/TimelineBreakdownBar.test.tsx` — **new**
- `apps/native-rd/src/components/TimelineBreakdownBar/index.ts` — **new**
- `apps/native-rd/src/i18n/resources/en/common.json` — add `timelineBreakdown.legend.*` (4 keys)
- `apps/native-rd/src/i18n/resources/pseudo/common.json` — regenerated (new keys only, via `bun run gen:pseudo`)

Explicitly **not** touched: `ProgressBar.*`, `stepStateColorMap.ts`,
`TimelineJourneyScreen.tsx`, any `de/` locale file, any
`packages/design-tokens` file.

---

## Implementation Plan

### Step 1: Component + styles + i18n legend keys

**Files**: `TimelineBreakdownBar.tsx`, `TimelineBreakdownBar.styles.ts`,
`index.ts`, `src/i18n/resources/en/common.json`, `src/i18n/resources/pseudo/common.json`
**Commit**: `feat(TimelineBreakdownBar): add segmented bar + counts legend component (#451)`
**Changes**:

- [x] Add `"timelineBreakdown": { "legend": { "completed": "{{count}} done", "in-progress": "{{count}} in motion", "pending": "{{count}} to come", "paused": "{{count}} set aside" } }` as a new top-level section in `en/common.json` (see D3/D4).
- [x] Run `bun run gen:pseudo`; stage only the resulting `timelineBreakdown.legend.*` additions in `pseudo/common.json` — revert any unrelated pre-existing drift the regeneration surfaces elsewhere in that file (per #406's Discovery Log precedent).
- [x] `TimelineBreakdownBar.tsx`: define
  ```ts
  export interface TimelineBreakdownBarProps {
    counts: Record<StepStateMapKey, number>;
  }
  ```
  a local `SEGMENT_ORDER: StepStateMapKey[] = ["completed", "in-progress", "pending", "paused"]`, and a typed `legendI18nKey(state): \`common:timelineBreakdown.legend.${StepStateMapKey}\``helper (mirrors`StepStateBadgeKey`in`stepStateColorMap.ts:31`). Render the bar row (one `View`per`SEGMENT_ORDER`entry,`flex: counts[state]`, `backgroundColor: stepStateNodeBg(theme, state)` via a Unistyles-driven style — see D5) and the legend row (`SEGMENT_ORDER.filter((s) => counts[s] > 0)`, each a swatch `View`+`Text`reading`t(legendI18nKey(state), { count: counts[state] })`).
- [x] `TimelineBreakdownBar.styles.ts`: container card (`theme.borderWidth.medium`, `theme.radius.lg`, `shadowStyle(theme, "cardElevation")`, `theme.colors.background` bg, `theme.colors.border` border — see D7); `track` row (`flexDirection: "row"`, fixed height ~12, `borderWidth: theme.borderWidth.medium`, `borderColor: theme.colors.border`, `overflow: "hidden"`); `legendRow` (`flexDirection: "row"`, `flexWrap: "wrap"`, `gap`); `chip`/`swatch`/`chipText` (swatch: small square, `borderRadius: theme.radius.sm`, `borderColor: theme.colors.border`; chipText: `fontFamily: theme.fontFamily.mono`, `fontSize: theme.size.xs`, `color: theme.colors.textMuted` — matches the `matrixThemeKey` convention in `TimelineNode.stories.tsx:296-299`).
- [x] `index.ts`: `export { TimelineBreakdownBar, type TimelineBreakdownBarProps } from "./TimelineBreakdownBar";`
- [x] Run `bun run type-check` and `bun run lint` — must be clean (typed i18n keys require the `en/common.json` addition to land in this same commit, or `t(legendI18nKey(...))` fails to type-check — see the #406 precedent for why component + i18n key land together, not in "component, then i18n" order).

### Step 2: Storybook stories

**Files**: `TimelineBreakdownBar.stories.tsx`
**Commit**: `test(TimelineBreakdownBar): add Storybook stories incl. AllThemesMatrix (#451)`
**Changes**:

- [x] `title: "Iteration B/Timeline/TimelineBreakdownBar"`.
- [x] `Mixed` story: a representative counts mix (e.g. `{ completed: 3, "in-progress": 1, pending: 3, paused: 1 }`, matching `tl-mid.png`).
- [x] `AllDone` story: `{ completed: N, "in-progress": 0, pending: 0, paused: 0 }` — verifies the legend shows only "N done" (no zero-count chips).
- [x] `AllToCome` story: `{ completed: 0, "in-progress": 0, pending: N, paused: 0 }`.
- [x] `WithSetAside` / `WithoutSetAside` stories: same base mix with `paused` non-zero vs. zero, to visually contrast the "set aside" chip's presence/absence.
- [x] `AllThemesMatrix` story: reuse the `MOOD_NAMES: Record<ThemeName, string>` table and static `themes[name]` read pattern from `TimelineNode.stories.tsx:162-254`; one row per theme, painting the 4-segment bar (not individual nodes) via `stepStateNodeBg(themes[name], state)` for a fixed representative counts mix, so all 7 themes' segment colors are visible side by side without relying on the Storybook theme toolbar.

### Step 3: Unit tests

**Files**: `__tests__/TimelineBreakdownBar.test.tsx`
**Commit**: `test(TimelineBreakdownBar): add unit tests (#451)`
**Changes**:

- [x] `test.each` over the 4 states asserting each renders its live `t()` legend text (e.g. `"3 done"`, `"1 in motion"`) when `count > 0`.
- [x] A test asserting a `count === 0` state produces **no** matching text node (the "drop out" contract — e.g. render with `paused: 0` and assert `screen.queryByText(/set aside/)` is null).
- [x] A test asserting all 4 states render together for a mixed-counts case.
- [x] Run `bun run test --testPathPatterns TimelineBreakdownBar` and `bun run test --testPathPatterns i18n` (locale-parity + pseudo-locale gates) — both green.

---

## Testing Strategy

- [ ] Unit tests for `TimelineBreakdownBar` (Jest 30, `@testing-library/react-native` v13), file at `src/components/TimelineBreakdownBar/__tests__/TimelineBreakdownBar.test.tsx`
- [ ] Use `test.each` for the 4-state legend-text cases
- [ ] `bun run test --testPathPatterns i18n` must stay green after the `en/common.json` + `pseudo/common.json` edits (locale-parity gate)
- [ ] Manual: open `Iteration B/Timeline/TimelineBreakdownBar` in Storybook, visually diff `Mixed` against `tl-mid.png`, and check `AllThemesMatrix` for any segment that still reads as unstyled/hardcoded across the 7 themes (esp. `light-highContrast` and `dark-default`, the two themes #406 flagged as visually distinct from Full Ride)

---

## Not in Scope

| Item                                                          | Reason                                                                                                                                             | Follow-up                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Wiring `TimelineBreakdownBar` into `TimelineJourneyScreen`    | That's #378's explicit job ("Storybook gate" — presentational parts ship and verify here first, screen wiring happens there)                       | #378                                                   |
| Adding `#451` to `#378`'s `blocked-by` list                   | Board/issue-graph housekeeping, not a code change                                                                                                  | Do during `/finalize` or manually after this PR merges |
| Adding a first-class `journey-step-paused-bg/fg` design token | Already an owed follow-up tracked in #406's plan (`Not in Scope` there); this issue reuses the existing `accentPurpleLight` fallback as instructed | Tracked from #406, not re-filed here                   |
| Modifying `ProgressBar.tsx` in any way                        | Explicit "must not do" in the issue; its 3 live callers and single-fill contract are unrelated to this widget                                      | none                                                   |
| Hand-editing `de/common.json`                                 | `.github/workflows/i18n-sync.yml` auto-syncs `de/` from `en/` on PR open/update                                                                    | Bot handles it post-push                               |

---

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-07-02] Step 1: segment + legend-swatch fill colors are resolved
  **inline** via `const { theme } = useUnistyles()` +
  `stepStateNodeBg(theme, state)`, not via four named stylesheet entries as the
  Step 1 checklist loosely implied. Rationale: the component maps over
  `SEGMENT_ORDER`, so a `.map()` with an inline `backgroundColor` is cleaner
  than a `Record<StepStateMapKey, style>` lookup table, and `useUnistyles()` is
  an established reactive-theme pattern (46 call sites). Still fully
  Unistyles-driven, still reacts to `setTheme()`, still zero hardcoded hex — the
  D5/intent contract ("every fill resolves through `stepStateNodeBg`") holds.
- [2026-07-02] Step 1: `bun run gen:pseudo` regenerated all pseudo files and
  surfaced pre-existing padding-dot drift in `badgeDetail`/`completion`/
  `editGoal`/`focusMode`/`settings` pseudo files (exactly the #406 precedent
  warned about). Reverted those 5; kept only the new
  `timelineBreakdown.legend.*` keys in `pseudo/common.json`.
- [2026-07-02] Step 2: exported `SEGMENT_ORDER` from `TimelineBreakdownBar.tsx`
  so the `AllThemesMatrix` story reuses the widget's single ordering constant
  rather than re-declaring it (avoids D2 drift). Mirrors how
  `TimelineNode.stories` imports `NODE_SIZE` from its styles. Matrix laid out as
  a vertical stack of one full-width bar per theme (a bar is wide, unlike
  TimelineNode's node-cell grid) — same static `themes[name]` read pattern.
