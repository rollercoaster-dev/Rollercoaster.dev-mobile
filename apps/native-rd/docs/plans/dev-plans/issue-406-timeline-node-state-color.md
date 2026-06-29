# Development Plan: Issue #406

## Issue Summary

**Title**: `[Storybook]` TimelineNode — one state-color language (owns the state-color map)
**Type**: enhancement (re-skin + shared state-color map, F0 folded in)
**Complexity**: MEDIUM
**Estimated Lines**: ~370–430 lines

---

## Complexity Note — Why MEDIUM, not SMALL

The issue was labeled `size:s` and estimated ~200 LOC. That estimate assumed a
simple re-skin drawing on existing `theme.colors.*` keys. The actual picture is
different: `theme.journey.*` does not exist on `ComposedTheme` today. Before
the state-color map can be built on canonical journey tokens, the journey group
must be wired into the theme. That wiring is the canonical prerequisite and it
follows an established pattern (PR #376, chrome/action/surfaceBorder), but it
is real work.

The breakdown:

| Part                                                                | LOC                                                                    |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Journey-wiring (adapter + compose + variants + tokens.ts re-export) | ~60                                                                    |
| contrastPairs additions (3 journey pairs)                           | ~30                                                                    |
| compose.test.ts journey assertions                                  | ~20                                                                    |
| stepStateColorMap.ts (new file)                                     | ~40                                                                    |
| TimelineNode.styles.ts (refactor)                                   | ~30                                                                    |
| TimelineNode.tsx (paused state + badge)                             | ~35                                                                    |
| TimelineNode.stories.tsx (AllThemesMatrix)                          | ~50                                                                    |
| TimelineNode.test.tsx (new cases)                                   | ~40                                                                    |
| i18n additions (en + de + pseudo, paused key)                       | ~15                                                                    |
| **Total**                                                           | **~320–370 LOC** (+ generated locale files not counted against budget) |

Upper bound with commentary, test docstrings, and the `paused` package token path
(if chosen) pushes to ~430. Comfortably under the 500 LOC PR cap as a single issue.

---

## Resolved Decisions (2026-06-29, confirmed by Joe)

The three Open Questions at the bottom of this plan are **settled** — do not
re-litigate them in `/implement`:

- **OQ-2 (scope split) → Option A: fold journey-wiring into #406.** This PR wires
  the `journey-*` group through `adapter.ts` + `compose.ts` + `variants.ts` itself
  (Step 1). #406 is therefore **MEDIUM**, not `size:s` — relabel accordingly. No
  separate prerequisite issue is filed; B2/C1 are unblocked when #406 merges.
- **OQ-1 (paused color) → Option (a): `theme.colors.accentPurpleLight` now + a
  design-tokens follow-up.** Map `paused → accentPurpleLight` (light `#ede9fe`,
  dark `#352760`) with a TODO comment in `stepStateColorMap.ts`. A follow-up
  design-tokens issue to add first-class `journey-step-paused-bg/fg` is **owed**
  (see Not in Scope) — it is NOT filed yet; file it during `/implement` or
  `/finalize`, not here.
- **OQ-3 (story pattern) → static `AllThemesMatrix`.** One column per theme,
  reading the composed `themes[name]` object directly à la
  `ContrastAudit.stories.tsx` (acceptance permits "toolbar **or** matrix"). No
  toolbar-driven single-theme switch.

**Heads-up (not a task for #406):** the map is _journey-canonical_. The current
StepCard pill (`accentYellow`/`accentSecondary`) is the _old_ state-color
language; B2/C1 will migrate the pill onto this same map, at which point the pill
recolors (yellow→blue for active, mint→green for completed) and "node == pill"
becomes literal.

**Correction (2026-06-29, discovered in `/implement`):** an earlier draft of this
plan claimed `TimelineNode` ships "un-integrated" so its changes are invisible.
**That is wrong.** `TimelineNode` is already rendered in two live screens —
`TimelineJourneyScreen` and `FocusModeScreen` — via `TimelineStep` / `ChildRow` /
`FinishLine`. Two consequences:

1. The state-color re-skin (completed blue→green, in-progress white-bg→solid-blue,
   pending→`#f0f0f0`) **is** visible in those screens. This is the intended
   journey-canonical fix and ships as-is.
2. The state-word badge must **not** be always-on: each node already sits beside a
   `StatusBadge` showing the same status word, so an always-on badge would
   duplicate status and shift layout in two shipped screens. The badge is gated
   behind a default-off `showStateBadge` prop — see D7.

---

## Intent Verification

Observable criteria derived from the issue. These describe what success looks
like from a user/system perspective.

- [ ] When `TimelineNode` receives `status="pending"`, the node background is
      `theme.journey.journeyStepBg` (#f0f0f0 in Full Ride), matching the design
      language from the App Shell prototype.
- [ ] When `TimelineNode` receives `status="in-progress"`, the node background
      is `theme.journey.journeyStepActiveBg` (blue in Full Ride, teal in Night Ride),
      text is `theme.journey.journeyStepActiveFg`. Zero references to
      `palette.blue600` remain in `TimelineNode.styles.ts`.
- [ ] When `TimelineNode` receives `status="paused"` (with `showStateBadge`), the
      node uses the resolved paused color (`accentPurpleLight`); the state-word badge
      reads the i18n key `common:stepCard.status.paused` (added in this PR).
- [ ] When `TimelineNode` receives `status="completed"`, the node background is
      `theme.journey.journeyStepCompleteBg` (green in Full Ride), text is
      `theme.journey.journeyStepCompleteFg`.
- [x] `theme.journey.*` is readable off every composed `ComposedTheme` — i.e.
      `themes["light-highContrast"].journey.journeyStepActiveBg` resolves and is
      `#000000` (the highContrast override). _(Step 1 — wired; CI assertion lands
      in Step 2.)_
- [ ] The step-state map (`stepStateColorMap`) is exported from its own module;
      `TimelineNode.styles.ts` consumes it as the single source of truth; no
      state color is hardwired.
- [ ] The updated `TimelineNode.stories.tsx` has an `AllThemesMatrix` export
      that renders all four states across all 7 product themes.
- [x] Three journey contrast pairs (`journeyStepActive`, `journeyStepComplete`,
      `journeyGoal`) are added to `contrastPairs.ts` and pass the CI contrast
      gate (`src/themes/__tests__/contrast.test.ts`). Any sub-AA pairs are entered
      into `KNOWN_FAILURES` with a TODO comment (see contrast finding below).
- [x] `compose.test.ts` asserts `theme.journey` is defined for every product
      theme and that the highContrast override resolves correctly.
- [ ] No screen file imports the `stepStateColorMap` directly, and this PR adds
      no NEW screen wiring of `TimelineNode`. (Note: `TimelineNode` is **already**
      rendered in `TimelineJourneyScreen` / `FocusModeScreen` via `TimelineStep`; the
      re-skin reaches those screens, the opt-in badge does not — see D7.)
- [ ] State-word badge text is driven by `t()` from the `common` namespace,
      not hardcoded strings.

---

## Dependencies

| Issue | Title                 | Status | Type |
| ----- | --------------------- | ------ | ---- |
| #375  | Design-tokens cleanup | Closed | Soft |
| #376  | Extend token contract | Closed | Soft |

**Status**: All dependencies met — start now.

---

## Objective

Wire the `journey-*` semantic token group into native-rd's theme (the missing
prerequisite). Build the step-state → token map on `theme.journey.*` keys. Re-skin
`TimelineNode` to consume the map (drop `palette.blue600`), add a state-word badge
backed by i18n, and update the story to an AllThemesMatrix covering all 4 states ×
7 themes. Update `contrastPairs.ts` and the CI contrast gate.

---

## Decisions

| ID  | Decision                                                                                                                                                                                 | Alternatives Considered                                                                                                  | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Wire `journey-*` inside this issue (#406), not a separate prerequisite                                                                                                                   | Split into a separate issue (F-token–class prerequisite like #375/#376)                                                  | See Open Question OQ-2 below. The journey group already exists in the package with full per-variant overrides. Wiring it is ~60 LOC and follows the exact #376 pattern — no new JSON tokens needed (unlike #376 which required new `chrome.json` keys). A separate prerequisite issue is defensible but adds a block for B2 and C1 with no meaningful risk reduction. Recommendation is to fold it into #406.                                                                                                                                                               |
| D2  | Map file lives at `src/components/TimelineNode/stepStateColorMap.ts`                                                                                                                     | `src/utils/`, `src/constants/`                                                                                           | Collocated with its first consumer; B2/C1 import by path. Promote to `src/utils/` only when a third unrelated consumer appears.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D3  | `paused` maps to `theme.colors.accentPurpleLight` (light: `#ede9fe`, dark: `#352760`) + `theme.colors.text` for the foreground — derived from an existing token, not a new package token | (a) Add `journey-step-paused-bg/fg` to `journey.json` + 7 theme files (package-level, bigger), (b) defer paused entirely | The App Shell prototype uses `#ede9fe` for paused nodes — exactly `accentPurpleLight` in light mode, and `#352760` maps to `accentPurpleLight` in dark mode. Contrast passes (12.75:1 and 12.49:1 respectively). This is not a journey token but it is a live, themed, token-sourced color. The alternative of adding a package token is correct long-term but that is #375/#376 class work and is not required by the issue acceptance. Flag as technical debt. See Open Question OQ-1.                                                                                    |
| D4  | State-word badge uses `t("common:stepCard.status.<state>")` after adding the `paused` key to the `common` namespace                                                                      | Inline hardcoded strings                                                                                                 | Every other state label already lives at `common:stepCard.status.*`. Adding `paused` is the natural fit; keeps all status display strings in one i18n location.                                                                                                                                                                                                                                                                                                                                                                                                             |
| D5  | `StepCard.shared.ts` is NOT touched in this issue                                                                                                                                        | Update `statusToVariant` to align with the journey map                                                                   | `statusToVariant` routes to `StatusBadge` variants, which are settable independently. The journey-token map is a parallel, lower-level contract. Structural convergence happens in B2/C1. Touching `StepCard` here expands the blast radius without meeting any acceptance criterion.                                                                                                                                                                                                                                                                                       |
| D6  | The paused glyph in the node is `"⏸"` (pause symbol), matching the App Shell prototype's double-black-square `"❚❚"` intent                                                               | Use a text label or no glyph                                                                                             | The prototype uses `"❚❚"` (casual); `"⏸"` (U+23F8) is the semantic pause symbol, more accessible and universally supported.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D7  | State-word badge is opt-in via a new `showStateBadge?: boolean` prop (default `false`); only the Storybook stories enable it                                                             | (a) always-on under every non-goal node (literal Step 5), (b) drop the badge entirely                                    | `TimelineNode` is live in `TimelineJourneyScreen` + `FocusModeScreen` via `TimelineStep`, where each node already sits beside a `StatusBadge` rendering the same status word. An always-on badge duplicates status text and shifts layout in two shipped screens. A default-off prop keeps live screens byte-identical while the `AllThemesMatrix` / `Paused` stories demonstrate the badge — satisfying the acceptance (badge exists, i18n-backed, covers `paused`) without expanding blast radius. node==pill convergence (dropping the parallel `StatusBadge`) is B2/C1. |

---

## The Verified State → Token Mapping

From `packages/design-tokens/build/unistyles/semanticColors.ts` (lines 407–425):

| State         | Node bg token                                  | Node fg token           | Prototype hex (light)       | WCAG ratio (light) |
| ------------- | ---------------------------------------------- | ----------------------- | --------------------------- | ------------------ |
| `pending`     | `journeyStepBg`                                | `journeyStepFg`         | `#f0f0f0` bg / `#262626` fg | 13.28:1 PASS       |
| `in-progress` | `journeyStepActiveBg`                          | `journeyStepActiveFg`   | `#2563eb` bg / `#fafafa` fg | 4.95:1 PASS        |
| `completed`   | `journeyStepCompleteBg`                        | `journeyStepCompleteFg` | `#047857` bg / `#fafafa` fg | 5.25:1 PASS        |
| `paused`      | `theme.colors.accentPurpleLight` (not journey) | `theme.colors.text`     | `#ede9fe` bg / `#262626` fg | 12.75:1 PASS       |
| goal node     | `journeyGoalBg`                                | `journeyGoalFg`         | `#d97706` bg / `#0a0a0a` fg | 6.21:1 PASS        |

Per-variant overrides already in the package (confirmed in semanticColors.ts lines 469–512):

| Variant          | journeyStepActiveBg      | journeyStepCompleteBg |
| ---------------- | ------------------------ | --------------------- |
| highContrast     | `#000000`                | `#008866`             |
| dyslexiaFriendly | `#4e7d9e`                | `#4a8a62`             |
| autismFriendly   | `#4d6d7d`                | `#5a8a6a`             |
| lowVision        | `#003d99`                | `#006400`             |
| lowInfo          | `#222222` (fg `#ffffff`) | inherits light        |

---

## Contrast Findings

Computed against all variants (using the `fg/bg` pairs as resolved for each theme):

**Light-mode base:** all four state pairs pass WCAG AA (see table above).

**Variant findings:**

| Theme                | Pair                | Ratio  | Verdict        |
| -------------------- | ------------------- | ------ | -------------- |
| light-dyslexia       | journeyStepActive   | 4.23:1 | sub-AA (amber) |
| light-dyslexia       | journeyStepComplete | 3.94:1 | sub-AA (amber) |
| light-autismFriendly | journeyStepComplete | 3.81:1 | sub-AA (amber) |
| light-highContrast   | journeyStepComplete | 4.46:1 | sub-AA (amber) |

None of these hit the hard `< 3:1` failure threshold. They are the same class as
the existing failures documented in `Theme Refactor Prep Spec.md` §1 (the
`success`/`warning`/`info` sub-AA cells). The correct fix is upstream token
adjustments in `packages/design-tokens/src/themes/*.json` — that is #375/#376
class work, not #406 scope.

**Plan:** Enter these four cells into `KNOWN_FAILURES` in `contrast.test.ts` with a
`TODO(#406-follow-up)` comment referencing the token source. The contrast gate
still runs (it enforces that these cells do NOT suddenly pass — that would require
a `KNOWN_FAILURES` cleanup). This does not block #406.

---

## Affected Areas

- `apps/native-rd/src/themes/adapter.ts` — add `lightJourneyColors`, `darkJourneyColors`,
  `journeyVariants`, `JourneyColors`, `JourneyOverride` exports (the #376 pattern)
- `apps/native-rd/src/themes/compose.ts` — add `Journey` import; add `journey: Journey` to
  `ComposedTheme` interface; compose journey colors + variant overlay in `composeTheme()`
- `apps/native-rd/src/themes/variants.ts` — add `journey?: JourneyOverride` to `VariantOverride`;
  add `journey: journeyVariants.<variant>` to each non-default variant entry
- `apps/native-rd/src/themes/contrastPairs.ts` — add three journey pairs
  (`journeyStepActive`, `journeyStepComplete`, `journeyGoal`)
- `apps/native-rd/src/themes/__tests__/contrast.test.ts` — add 4 `KNOWN_FAILURES` entries
- `apps/native-rd/src/themes/__tests__/compose.test.ts` — add journey assertions
- `apps/native-rd/src/components/TimelineNode/stepStateColorMap.ts` — **new file**:
  `StepStateMapKey`, `StepStateEntry`, `stepStateColorMap`
- `apps/native-rd/src/components/TimelineNode/TimelineNode.styles.ts` — remove
  `palette` import; derive all state styles from `theme.journey.*` and
  `theme.colors.accentPurpleLight` (paused only)
- `apps/native-rd/src/components/TimelineNode/TimelineNode.tsx` — add `paused` to
  prop type union; render state-word badge; update content/style arrays
- `apps/native-rd/src/components/TimelineNode/TimelineNode.stories.tsx` — add
  `AllThemesMatrix` export; add `Paused` story
- `apps/native-rd/src/components/TimelineNode/__tests__/TimelineNode.test.tsx` — add
  paused glyph test, state-word badge label tests
- `apps/native-rd/src/i18n/resources/en/common.json` — add `stepCard.status.paused`
- `apps/native-rd/src/i18n/resources/de/common.json` — add translation (or `"paused"` placeholder)
- `apps/native-rd/src/i18n/resources/pseudo/common.json` — add pseudo entry if exists

---

## Implementation Plan

### Step 1: Wire `journey-*` into native-rd's theme

**Files**: `src/themes/adapter.ts`, `src/themes/compose.ts`, `src/themes/variants.ts`
**Commit**: `feat(native-rd): wire journey-* token group into ComposedTheme (#406)`
**Changes**:

- [x] In `adapter.ts`: add imports of `lightJourneyColors`, `darkJourneyColors`,
      `journeyVariants`, `JourneyColors as PkgJourneyColors`, `JourneyOverride as PkgJourneyOverride`
      from `@rollercoaster-dev/design-tokens/unistyles`. Re-export them exactly as
      the chrome/action/surfaceBorder entries above them do.
- [x] In `compose.ts`: import `lightJourneyColors`, `darkJourneyColors`, `Journey`,
      `JourneyOverride` from `./adapter`. Add `journey: Journey` to `ComposedTheme`
      interface. Inside `composeTheme()` add the journey composition block:
  ```ts
  const baseJourney =
    colorMode === "light" ? lightJourneyColors : darkJourneyColors;
  let journey: Journey = { ...baseJourney };
  if (variantDef.journey) {
    journey = { ...journey, ...variantDef.journey };
  }
  ```
  Add `journey` to the returned object.
- [x] In `variants.ts`: import `journeyVariants`, `JourneyOverride` from `./adapter`.
      Add `journey?: JourneyOverride` to `VariantOverride` interface. Wire each
      non-default variant: `highContrast.journey = journeyVariants.highContrast`,
      `dyslexia.journey = journeyVariants.dyslexiaFriendly`,
      `autismFriendly.journey = journeyVariants.autismFriendly`,
      `lowVision.journey = journeyVariants.lowVision`,
      `lowInfo.journey = journeyVariants.lowInfo`.

### Step 2: Add journey contrast pairs + CI gate entries

**Files**: `src/themes/contrastPairs.ts`, `src/themes/__tests__/contrast.test.ts`,
`src/themes/__tests__/compose.test.ts`
**Commit**: `test(native-rd): add journey contrast pairs + compose assertions (#406)`
**Changes**:

- [x] In `contrastPairs.ts`: add three pairs using `(t) => ({ fg: t.journey.journeyStepActiveFg, bg: t.journey.journeyStepActiveBg })` etc. Keys: `journeyStepActive`, `journeyStepComplete`, `journeyGoal`. Remove the NOTE comment that called out journey as absent (it is now wired).
- [x] In `contrast.test.ts`: add four `KNOWN_FAILURES` entries (with
      `TODO(#406-follow-up): upstream token fix needed in packages/design-tokens`):
  - `light-dyslexia:journeyStepActive` _(4.23:1 — verified)_
  - `light-dyslexia:journeyStepComplete` _(3.94:1 — verified)_
  - `light-autismFriendly:journeyStepComplete` _(3.81:1 — verified)_
  - `light-highContrast:journeyStepComplete` _(4.46:1 — verified)_
- [x] In `compose.test.ts`: add a `"exposes journey tokens for every product theme"` test
      in the `"theme registry"` describe block. Assert `theme.journey.journeyStepActiveBg`
      is truthy for every theme, and assert the highContrast override resolves:
      `themes["light-highContrast"].journey.journeyStepActiveBg === "#000000"`.
- [x] Run `bun run test --testPathPatterns themes/__tests__` to confirm gate passes. _(168 passed)_

### Step 3: Build `stepStateColorMap.ts`

**Files**: `src/components/TimelineNode/stepStateColorMap.ts` (new)
**Commit**: `feat(TimelineNode): add step-state → journey-token map (F0, #406)`
**Changes**:

- [x] Define `StepStateMapKey = "pending" | "in-progress" | "paused" | "completed"`.
- [x] Define `StepStateEntry`:
  ```ts
  export interface StepStateEntry {
    /** theme.journey key for node background */
    nodeBgKey: keyof JourneyColors | null;
    /** theme.journey key for node foreground text */
    nodeFgKey: keyof JourneyColors | null;
    /** When nodeBgKey is null, fall back to this theme.colors key */
    nodeBgColorsFallback: string | null;
    nodeFgColorsFallback: string | null;
    /** i18n key for the state-word badge label */
    badgeI18nKey: string;
    /** Unicode glyph for node interior (overrides step number) */
    nodeGlyph?: string;
  }
  ```
- [x] Export `stepStateColorMap: Record<StepStateMapKey, StepStateEntry>`:
  - `pending`: `nodeBgKey: "journeyStepBg"`, `nodeFgKey: "journeyStepFg"`,
    `badgeI18nKey: "common:stepCard.status.pending"`
  - `in-progress`: `nodeBgKey: "journeyStepActiveBg"`, `nodeFgKey: "journeyStepActiveFg"`,
    `badgeI18nKey: "common:stepCard.status.in-progress"`
  - `completed`: `nodeBgKey: "journeyStepCompleteBg"`, `nodeFgKey: "journeyStepCompleteFg"`,
    `badgeI18nKey: "common:stepCard.status.completed"`, `nodeGlyph: "✓"`
  - `paused`: `nodeBgKey: null`, `nodeBgColorsFallback: "accentPurpleLight"`,
    `nodeFgKey: null`, `nodeFgColorsFallback: "text"`,
    `badgeI18nKey: "common:stepCard.status.paused"`, `nodeGlyph: "⏸"`

### Step 4: Update `TimelineNode.styles.ts`

**Files**: `src/components/TimelineNode/TimelineNode.styles.ts`
**Commit**: `refactor(TimelineNode): drop palette.blue600, derive colors from journey tokens (#406)`
**Changes**:

- [ ] Keep `import { palette } from "../../themes/adapter"` (still needed by
      `goalNode`, below) but remove every `palette.blue600` reference. The acceptance
      criterion is "zero `palette.blue600`", not "zero palette" — `palette.yellow300`
      on the goal node stays. (Plan-internal contradiction resolved 2026-06-29.)
- [ ] Replace `completedNode` and `inProgressNode` with journey-token-driven styles:
  - `pendingNode`: `backgroundColor: theme.journey.journeyStepBg, borderColor: theme.journey.journeyStepFg`
    (or `theme.colors.border` — check prototype; `border` is a safe default)
  - `inProgressNode`: `backgroundColor: theme.journey.journeyStepActiveBg, borderColor: theme.journey.journeyStepActiveBg, borderWidth: theme.borderWidth.medium`
  - `completedNode`: `backgroundColor: theme.journey.journeyStepCompleteBg, borderColor: theme.journey.journeyStepCompleteBg`
  - `pausedNode`: `backgroundColor: theme.colors.accentPurpleLight, borderColor: theme.colors.border`
- [ ] Update text-color rules:
  - `pendingText`: `color: theme.journey.journeyStepFg`
  - `inProgressText`: `color: theme.journey.journeyStepActiveFg`
  - `completedText`: `color: theme.journey.journeyStepCompleteFg`
  - `pausedText`: `color: theme.colors.text`
- [ ] Keep `goalNode` using `palette.yellow300` — this is a deliberate palette pin
      (`journeyGoalBg` = amber warning, but the goal star uses `accentYellow` by
      prototype design decision; leave that reconciliation to the goal-node track).
- [ ] Add state-word badge container styles (see Step 5).

### Step 5: Update `TimelineNode.tsx` + i18n

**Files**: `src/components/TimelineNode/TimelineNode.tsx`,
`src/i18n/resources/en/common.json`, `src/i18n/resources/de/common.json`
**Commit**: `feat(TimelineNode): add paused state and state-word badge (#406)`
**Changes**:

- [ ] In `common.json` (en): add `"paused": "Paused"` under `stepCard.status`.
- [ ] In `common.json` (de): add `"paused": "Pausiert"` (or placeholder if uncertain).
- [ ] Widen the `TimelineNode` prop type: `type NodeStatus = StepStatus | "paused"`.
      Add a comment: `// TODO: collapse into StepStatus once the data layer supports paused`.
- [ ] Add `paused` branches to `nodeStyle` and `textStyle` arrays (parallel to
      the existing `completed` and `in-progress` branches).
- [ ] Update `content` logic: before the step-number fallthrough, add
      `status === "paused" ? stepStateColorMap["paused"].nodeGlyph : ...`.
- [ ] Add a `showStateBadge?: boolean` prop (default `false`) — see **D7**.
      Compute the circle element (the existing `View` / `Pressable`) exactly as today.
      When `showStateBadge && !isGoalNode`, wrap `[circle, <badge/>]` in a column
      `View style={styles.badgeWrapper}`; **otherwise return the circle element
      unchanged** so live consumers (`TimelineStep`, `FinishLine` — which never pass
      the prop) keep byte-identical layout. The badge is an inline `View`+`Text` from
      `styles.stateBadge` / `styles.stateBadgeText`, label from
      `t(stepStateColorMap[status].badgeI18nKey)`. Add `useTranslation(["common"])`.
      Accessibility: `accessibilityRole="text"` on the badge View.
- [ ] Do NOT add the badge to the hitSlop/press area — it is a label, not a target.

### Step 6: Update story + tests

**Files**: `src/components/TimelineNode/TimelineNode.stories.tsx`,
`src/components/TimelineNode/__tests__/TimelineNode.test.tsx`
**Commit**: `test(TimelineNode): AllThemesMatrix story + paused and badge unit tests (#406)`
**Changes**:

**Story:**

- [ ] Add `import { themes, themeNames } from "../../themes/compose"`.
- [ ] Add `AllThemesMatrix` export: a `ScrollView` with one labeled `ThemeRow` per
      `themeNames` entry; each row shows all four states. **Feasibility-confirmed
      mechanism (2026-06-29):** Unistyles v3 theme is a global runtime singleton, so
      rendering the reactive `<TimelineNode>` 7× would just show the active theme 7×.
      `AllThemesMatrix` therefore follows the exact `ContrastAudit.stories.tsx`
      pattern: read `themes[name]` statically and paint **node-shaped cells inline**,
      resolving each state's bg/fg from `stepStateColorMap[state]` against
      `themes[name].journey` (and `themes[name].colors` for `paused`). This is the
      canonical static all-7-themes matrix Joe resolved in OQ-3 — and it directly
      validates the map resolves correctly in every theme. The live `<TimelineNode>`
      component is exercised by the individual stories below (toolbar-themed).
- [ ] Add a `Paused` story (live component, default theme, `showStateBadge`).
- [ ] Keep existing `Pending`, `InProgress`, `Completed`, `GoalNode`, `PressableVsStatic`
      (live component, toolbar-themed). Add `showStateBadge` to one of them to exercise
      the badge on the real component.

**Tests:**

- [ ] Extend the `it.each` glyph table to include `{ status: "paused" as const, expected: "⏸" }`.
- [ ] Add `test.each` for state-word badge labels: for each of `pending`,
      `in-progress`, `paused`, `completed`, render with `showStateBadge` and non-goal
      props and assert the translated badge text appears (`"Pending"`, `"In Progress"`,
      `"Paused"`, `"Completed"` — the real `t()` values, since tests use live i18n).
- [ ] Add a test asserting the badge is **not** rendered by default (prop omitted)
      — the no-regression contract for live consumers.
- [ ] Add a test asserting the badge is not rendered on a goal node even when
      `showStateBadge` is set.
- [ ] Run `bun run test --testPathPatterns TimelineNode`.

---

## Testing Strategy

- [ ] Unit tests: Jest 30, `@testing-library/react-native` v13
- [ ] Test file mirrors `src/` at `src/__tests__/` — already exists at
      `src/components/TimelineNode/__tests__/TimelineNode.test.tsx`
- [ ] Use `test.each` for the glyph and badge-label tests (4 states each)
- [ ] `compose.test.ts` and `contrast.test.ts` gate: run `bun run test --testPathPatterns themes/__tests__`
- [ ] Manual Storybook check: open `TimelineNode / AllThemesMatrix`, verify all 4
      states × 7 themes render without hardcoded hex. Pay special attention to
      `light-highContrast` (active node should be black, not blue) and `dark-default`
      (active node should be teal `#5eead4`, not blue).

---

## Not in Scope

| Item                                                                  | Reason                                                                                                                                                                                                   | Follow-up                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Widening `StepStatus` in `src/types/steps.ts` to include `"paused"`   | `paused` is not stored by any DB query today; widening the canonical UI-layer type before the data layer supports it adds a dead branch                                                                  | Track B2/C1 or a dedicated step-state vocabulary issue                                 |
| Fixing the sub-AA journey variant contrast failures                   | Upstream token fix in `packages/design-tokens/src/themes/*.json` (dyslexia, autismFriendly, highContrast `journeyStepComplete`); same class as #375/#376 work                                            | `TODO(#406-follow-up)` in KNOWN_FAILURES; file a separate token issue after #406 lands |
| Wiring `stepStateColorMap` into `StepCard.shared.ts` or `StatusBadge` | `statusToVariant` routes to StatusBadge variants — a parallel, separate contract. Convergence belongs in B2/C1.                                                                                          | Track B2 / C1                                                                          |
| Aligning the goal-node color (`palette.yellow300`) to `journeyGoalBg` | The prototype uses the goal star as a brand-accent surface (yellow); `journeyGoalBg` is amber/warning. They coincide in Full Ride but differ in other themes. Resolution requires a design decision.     | Track goal-node design review                                                          |
| Wiring `TimelineNode` into `TimelineJourneyScreen`                    | Storybook gate enforced by the issue; screen wiring is #378                                                                                                                                              | #378                                                                                   |
| Adding `journey-step-paused-bg/fg` as new package tokens              | Valid long-term direction but requires modifying `journey.json` + 7 theme files + `build-unistyles.js`, which is #376-class scope. The `accentPurpleLight` derivation resolves the prototype intent now. | Token issue post-#406                                                                  |

---

## Open Questions — ALL RESOLVED 2026-06-29

> See **Resolved Decisions** near the top of this plan for the confirmed choices.
> The detail below is retained as the rationale trail; the recommendations were
> the options selected.

### OQ-1 (PAUSED) → RESOLVED: option (a), accentPurpleLight + follow-up token issue.

**The gap**: `journey.json` and all 7 theme overrides have no `journey-step-paused-*` token. Three options:

**(a) Use `theme.colors.accentPurpleLight` now, file a token issue later** (recommended for this PR):

- The App Shell prototype uses `#ede9fe` for paused node bg — this is exactly
  `accentPurpleLight` in light mode (`#ede9fe`) and maps sensibly to `#352760`
  in dark. Contrast passes in both modes (12.75:1 and 12.49:1). It is not a
  journey token but it is a themed, per-variant color already in the contract.
- Downside: paused diverges from the journey token family; future implementers
  must know the exception. Comment in `stepStateColorMap.ts`.

**(b) Add `journey-step-paused-bg/fg` to the package before implementing**:

- Cleanest long-term architecture. Requires modifying `journey.json`, all 7
  `src/themes/*.json`, `build-unistyles.js`, rebuilding the package. Adds a
  package PR dependency. Changes the size label from `size:s` to `size:m` and
  creates a package-level blocker for B2 and C1.
- Recommended only if you want zero non-journey colors in the map.

**(c) Defer paused entirely — use only 3 states**:

- The issue acceptance explicitly names 4 states including paused. Deferring
  fails the acceptance criterion.

**Recommendation**: option (a) for #406, file a design-tokens follow-up issue for
option (b).

### OQ-2 (SCOPE SPLIT — decision needed before implementation starts): Should journey wiring be its own issue?

**Option A: fold journey wiring into #406** (recommended):

- ~60 LOC diff (adapter + compose + variants). Established pattern from #376.
  No new package JSON files needed. Total PR stays ~370–430 LOC, under 500 cap.
  B2 and C1 are immediately unblocked when #406 merges.
- Risk: if the wiring has unexpected interactions, the whole PR rolls back.

**Option B: split journey wiring into a new prerequisite issue**:

- Issue would be `feat(native-rd): wire journey-* token group into ComposedTheme`
  (~80 LOC including tests). #406 becomes `blocked-by` it. B2 and C1 become
  `blocked-by` that prerequisite too.
- Cleanest separation of concerns, mirrors the #375/#376 layering.
- Cost: extra issue, extra PR, extra board coordination.

**Recommendation**: Option A. The wiring is small (< 80 LOC), proven pattern,
no new package tokens required, and the whole point of #406 is to establish
`theme.journey.*` as the state-color source of truth.

### OQ-3 (MINOR — verify before Step 6): AllThemesMatrix pattern in stories

The `ContrastAudit.stories.tsx` reads `themes[name]` statically. `TimelineNode`
styles are driven by Unistyles' reactive `StyleSheet.create((theme) => ...)` — not
direct `themes[name]` reads. Confirm the Storybook theme-toolbar mechanism for
this repo (is there a `UnistylesProvider` wrapper available in stories, or do we
need to render each theme variant as a static screenshot-style column?). If the
toolbar drives `setTheme()` and the matrix needs all 7 simultaneously, use the
static column approach (render 7 side-by-side `View` blocks with swapped
`StyleSheet` context, similar to how ContrastAudit renders per-theme). This is
implementation detail, not a blocker — but confirm before writing Step 6.

---

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-29 15:46] **Plan assumption corrected — `TimelineNode` is NOT un-integrated.**
  It is rendered live in `TimelineJourneyScreen` + `FocusModeScreen` via
  `TimelineStep` / `ChildRow` / `FinishLine`. The re-skin reaches those screens
  (intended fix). Added **D7**: state-word badge is opt-in via `showStateBadge`
  (default `false`) so live screens — which already render a `StatusBadge` next to
  each node — are byte-identical and don't get duplicate status text.
- [2026-06-29 15:46] **Step 4 contradiction resolved.** Plan said "remove the
  `palette` import" AND "keep `goalNode` using `palette.yellow300`". Kept the
  import; removed only `palette.blue600` (which is all the acceptance requires).
- [2026-06-29 15:46] **Verified `theme.colors.accentPurpleLight`** exists in both
  modes (`#ede9fe` light / `#352760` dark) — D3 paused mapping holds.
- [2026-06-29 15:46] **Test infra:** the unistyles jest mock uses the real
  `composeTheme("light","default")`, so wiring `journey` into compose (Step 1)
  automatically gives `mockTheme.journey` — no mock edits needed.
- [2026-06-29 15:46] **OQ-3 mechanism confirmed feasible.** Unistyles v3 theme is
  a global singleton; a reactive component can't render 7 themes at once.
  `AllThemesMatrix` uses the `ContrastAudit` static-swatch pattern (read
  `themes[name]`, paint node cells inline via `stepStateColorMap`) — which is what
  Joe's OQ-3 resolution specified and directly validates the map per-theme.
- [2026-06-29 15:50] **Step 1 done & committed** (`e539b63d`). `journey` wired
  through `adapter.ts` + `compose.ts` + `variants.ts`; type-check clean, lint 0
  errors, all 146 themes/**tests** green. Paused at user request before Step 2.
- [2026-06-29] **Step 2 done & committed** (`5a7cfd3b`). Three journey pairs
  added to `contrastPairs.ts`; `compose.test.ts` journey assertion added; ran the
  gate with empty `KNOWN_FAILURES` first to verify the sub-AA cells empirically —
  all four match the plan's predicted ratios exactly (4.23 / 3.94 / 3.81 / 4.46),
  now in `KNOWN_FAILURES` with a `TODO(#406-follow-up)`. 168 themes tests green.
- [2026-06-29] **Step 3 done.** `stepStateColorMap.ts` created. **Two refinements
  over the plan's spec, both stricter/cleaner, not scope changes:**
  1. `nodeBgColorsFallback` / `nodeFgColorsFallback` are typed `keyof Colors | null`
     (plan said `string | null`) — type-safe indexing of `theme.colors`.
  2. Added `stepStateNodeBg(theme, state)` / `stepStateNodeFg(theme, state)`
     resolver helpers in the same module. These let `TimelineNode.styles.ts`
     (Step 4) AND `AllThemesMatrix` (Step 6) resolve colors _through the map_
     rather than re-reading raw tokens — which is exactly what the acceptance
     criterion "styles.ts consumes the map as the single source of truth" needs.
     Safe inside `StyleSheet.create((theme) => ...)`: mirrors the existing
     `shadowStyle(theme, key)` call already in `TimelineNode.styles.ts`.
