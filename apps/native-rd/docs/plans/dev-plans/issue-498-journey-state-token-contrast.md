# Development Plan: Issue #498

## Issue Summary

- **Title**: `[Foundation] Fix journey state-token WCAG AA failures in ND themes`
- **Type**: accessibility bug / design-token foundation
- **Complexity**: SMALL
- **Estimated implementation**: ~40–70 changed LOC across 5 source/test files

## Intent Verification

- [x] Every `journeyStepActive` and `journeyStepComplete` foreground/background
      pair is at least 4.5:1 across all 7 product themes.
- [x] Warm Studio's active and complete state pairs use darker colors already
      present in its own palette; Still Water and Bold Ink do the same for the
      complete state.
- [x] `KNOWN_FAILURES` is empty after deleting the four journey entries; no
      replacement allowlist entries are added.
- [x] `TimelineNode`, `TimelineStep`, and `FocusCurrentTaskCard` continue to
      resolve state colors through `stepStateColorMap`, so node, state word, and
      Focus pill remain one semantic foreground/background pair.
- [x] The Contrast Audit reports no amber/failing journey cells, and visual
      inspection covers Warm Studio, Still Water, and Bold Ink in the existing
      component theme matrices.
- [x] Theme contrast, compose, TimelineNode, TimelineStep, and
      FocusCurrentTaskCard tests pass after rebuilding design-token output.

## Dependencies

| Issue          | Relationship                                                                                             | Status                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| #384           | Parent Full Ride redesign epic                                                                           | Open; context only                                     |
| #406 / PR #421 | Introduced `theme.journey`, `stepStateColorMap`, the three consumers, and the four-item contrast ratchet | Merged; prerequisite satisfied                         |
| #378           | Timeline integration                                                                                     | Open; #498 is a review prerequisite, not blocked by it |
| #466 / #467    | Focus integration slices                                                                                 | Open; downstream of the shared state-color foundation  |

**Status**: no implementation blocker. Issue #498 is labeled `order:1` and
`dep:foundation`; all code it changes or validates is already present on the
branch.

## Objective

Fix the four known normal-text WCAG AA failures at the design-token source by
darkening only the affected journey state backgrounds. Reuse colors already
defined by each theme rather than inventing new hues or flipping foregrounds.
Keep the shared state resolver and every component consumer unchanged, rebuild
the ignored Unistyles output, remove the now-stale ratchet entries, and verify
the resulting colors numerically and visually.

## Research Findings

### Current source and composition path

1. The authored values live in:
   - `packages/design-tokens/src/themes/dyslexia-friendly.json`
   - `packages/design-tokens/src/themes/autism-friendly.json`
   - `packages/design-tokens/src/themes/high-contrast.json`
2. `packages/design-tokens/build-unistyles.js` emits the `JourneyColors` base
   and per-variant overrides into ignored
   `packages/design-tokens/build/unistyles/semanticColors.ts`.
3. `apps/native-rd/src/themes/adapter.ts`, `variants.ts`, and `compose.ts`
   expose those values as `theme.journey.*` for the 7 product themes.
4. `apps/native-rd/src/components/TimelineNode/stepStateColorMap.ts` maps:
   - `in-progress` -> `journeyStepActiveBg` / `journeyStepActiveFg`
   - `completed` -> `journeyStepCompleteBg` / `journeyStepCompleteFg`
5. `TimelineNode.styles.ts`, `TimelineStep.styles.ts`, and
   `FocusCurrentTaskCard.styles.ts` all call the same `stepStateNodeBg/Fg`
   resolvers. There is no component-local color recipe to change.

### Verified token recipes

Ratios below use the same WCAG luminance calculation as
`src/utils/accessibility.ts` and the actual composed foregrounds (`#fafafa` for
Warm Studio/Still Water, `#ffffff` for Bold Ink).

| Theme / pair         | Current background | Proposed background | Existing palette role reused                        | Current | Proposed |
| -------------------- | ------------------ | ------------------- | --------------------------------------------------- | ------- | -------- |
| Warm Studio active   | `#4e7d9e`          | `#3a6280`           | `primary-dark`; already used by `action-primary-bg` | 4.235:1 | 6.212:1  |
| Warm Studio complete | `#4a8a62`          | `#3a7050`           | theme `color.success` / feedback success            | 3.943:1 | 5.568:1  |
| Still Water complete | `#5a8a6a`          | `#446858`           | theme `color.success`                               | 3.812:1 | 5.976:1  |
| Bold Ink complete    | `#008866`          | `#007755`           | theme `color.success`                               | 4.455:1 | 5.570:1  |

All four candidates clear 4.5:1 with useful margin and preserve the themes'
existing blue/green state language. The other journey state pairs already pass
and should not change.

A direct audit through `stepStateNodeBg/Fg` also covered all 28 combinations of
4 rendered step states x 7 product themes. It confirmed the four issue-listed
cells are the only failures: pending bottoms out at 13.280:1 and paused at
10.642:1. The existing active/complete contrast pairs therefore cover every
state-token defect in scope; adding a duplicate paused recipe to
`contrastPairs.ts` would risk drifting from `stepStateColorMap` and is not
needed for this fix.

### Baseline validation

On 2026-07-10, before source edits:

- `packages/design-tokens`: `bun run build` completed successfully.
- Targeted Jest run for `contrast|compose|TimelineNode|TimelineStep|FocusCurrentTaskCard`:
  **5 suites, 314 tests passed**. The contrast suite is green only because the
  four cells are currently ratcheted in `KNOWN_FAILURES`.
- The worktree remained clean because `packages/design-tokens/build/` is
  generated and gitignored.

## Decisions

| ID  | Decision                                                                                                                                   | Alternatives considered                                                                                          | Rationale                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Change only the four journey background overrides listed above. Keep their existing foregrounds.                                           | Flip to a dark foreground; invent near-identical darker hex values; change broad `primary`/`success` primitives. | Existing darker theme colors already pass with margin, preserve hue identity, and limit the blast radius to journey states. Broad primitive edits would recolor unrelated controls and feedback surfaces.                                                                                   |
| D2  | Keep `stepStateColorMap` and all three component implementations unchanged.                                                                | Patch colors in TimelineNode, TimelineStep, or FocusCurrentTaskCard separately.                                  | The map is already the single semantic source. Component-specific fixes would break the issue's node == state word == Focus pill contract.                                                                                                                                                  |
| D3  | Add exact recipe assertions to `compose.test.ts` for the four resolved backgrounds, while the contrast matrix remains the threshold test.  | Rely only on the 4.5:1 contrast gate.                                                                            | The contrast test proves accessibility; exact composition assertions also prove the intended per-theme recipes reached the app and prevent silent substitution with an unrelated passing color.                                                                                             |
| D4  | Delete the entire journey TODO/comment block and leave `KNOWN_FAILURES` as an empty set in the same atomic code commit as the token fixes. | Retain entries for documentation or replace them with new allowlist cells.                                       | The ratchet deliberately fails when a listed value begins passing. Keeping stale entries would make the fixed build red; replacement entries violate acceptance. Git history and this plan retain the rationale.                                                                            |
| D5  | Do not edit `ContrastAudit.stories.tsx` pre-emptively. Use its existing data-driven `contrastPairs` matrix for the visual gate.            | Hardcode new ratios/swatches or add issue-specific rows.                                                         | The story reads the same composed themes and `contrastPairs` as the Jest gate. Rebuilding token output automatically changes the four swatches, ratios, verdicts, and summary. A source edit would duplicate data. If visual QA reveals a rendering defect, update the story in scope then. |
| D6  | Regenerate Unistyles locally before tests, but do not stage generated `build/` files.                                                      | Hand-edit generated TypeScript or commit it.                                                                     | Package instructions mark `build/unistyles` generated and gitignored. Source JSON is the canonical artifact.                                                                                                                                                                                |

## Affected Areas

- `packages/design-tokens/src/themes/dyslexia-friendly.json`
  - `journey-step-active-bg`: `#4e7d9e` -> `#3a6280`
  - `journey-step-complete-bg`: `#4a8a62` -> `#3a7050`
- `packages/design-tokens/src/themes/autism-friendly.json`
  - `journey-step-complete-bg`: `#5a8a6a` -> `#446858`
- `packages/design-tokens/src/themes/high-contrast.json`
  - `journey-step-complete-bg`: `#008866` -> `#007755`
- `apps/native-rd/src/themes/__tests__/contrast.test.ts`
  - remove the four entries and their obsolete `TODO(#406-follow-up)` block;
    leave `KNOWN_FAILURES` empty
- `apps/native-rd/src/themes/__tests__/compose.test.ts`
  - pin the four intended resolved journey background recipes

Explicitly unchanged unless visual QA finds a real defect:

- `apps/native-rd/src/stories/design-system/ContrastAudit.stories.tsx`
- `apps/native-rd/src/themes/contrastPairs.ts`
- `apps/native-rd/src/components/TimelineNode/stepStateColorMap.ts`
- TimelineNode, TimelineStep, and FocusCurrentTaskCard source/tests/stories
- generated `packages/design-tokens/build/unistyles/*`

## Implementation Plan

### Step 1: Apply and lock the accessible journey recipes

- **Files**: the three theme JSON files, `contrast.test.ts`, `compose.test.ts`
- **Commit**: `fix(design-tokens): clear journey state contrast failures`

- [x] Apply the four background substitutions from the verified recipe table.
- [x] In the existing journey compose coverage, add exact assertions for:
  - Warm Studio active `#3a6280`
  - Warm Studio complete `#3a7050`
  - Still Water complete `#446858`
  - Bold Ink complete `#007755`
- [x] Remove the four journey keys and obsolete TODO explanation from
      `KNOWN_FAILURES`; keep the empty-set ratchet infrastructure intact.
- [x] Run the design-token build so the workspace package exposes the new
      values to app tests.
- [x] Keep all five source/test changes in one atomic commit so the ratchet is
      never committed in a stale state.

### Step 2: Validate numeric, consumer, and visual behavior

- [x] Run the targeted theme and consumer suites (Testing Strategy below).
- [x] Run root type-check and lint.
- [x] Open `Design System/Contrast Audit / Matrix`; confirm the four named
      cells are AA and the audit has no amber/failing cells.
- [x] Inspect the existing all-theme state surfaces for Warm Studio, Still
      Water, and Bold Ink:
  - `Iteration B/Timeline/TimelineNode / AllThemesMatrix`
  - `Iteration B/Timeline/TimelineStep / AllThemesMatrix`
  - `Iteration B/Focus Mode/FocusCurrentTaskCard / StatesAllThemes`
- [x] Confirm active remains blue, complete remains green, foreground text and
      glyphs remain legible, and the node/state-word/Focus-pill pairs match.
- [x] If the data-driven Contrast Audit renders correctly, leave its source
      unchanged and record the visual result in this plan's Discovery Log.

## Testing Strategy

From the repository root:

```bash
cd packages/design-tokens && bun run build
cd ../../apps/native-rd && bun run test --testPathPatterns contrast compose TimelineNode TimelineStep FocusCurrentTaskCard
cd ../.. && bun run type-check
bun run lint
```

Expected targeted coverage:

- `contrast.test.ts`: all product themes x canonical pairs are >=4.5:1 and the
  empty allowlist has no stale keys.
- `compose.test.ts`: generated variant output resolves to the four exact
  recipes, while every product theme still exposes journey tokens.
- `TimelineNode.test.tsx`: all states and optional state words still render.
- `TimelineStep.test.tsx`: state words and node composition remain intact.
- `FocusCurrentTaskCard.test.tsx`: paused/completed pill behavior and all card
  states remain intact.

## Implementation Result

- Code commit: `d4566335 fix(design-tokens): clear journey state contrast failures`
  (DCO trailer present).
- Generated theme ratios: Warm Studio active 6.212:1, Warm Studio complete
  5.568:1, Still Water complete 5.976:1, Bold Ink complete 5.570:1.
- Targeted validation: 5 suites, 315 tests passed.
- Full validation: type-check passed; lint passed with the repository's existing
  warning backlog; 9,840 native-rd tests and 143 openbadges-core tests passed;
  workspace build passed (native-rd build remains the documented no-op).
- Storybook: Contrast Matrix reported `196 cells · 0 fail · 0 amber · 196 AA`.
  TimelineNode `AllThemesMatrix`, TimelineStep `AllThemesMatrix`, and
  FocusCurrentTaskCard `StatesAllThemes` were inspected for Bold Ink, Warm
  Studio, and Still Water. Active stayed blue, complete stayed green, and the
  shared foreground/background pairs remained legible. No story source change
  was needed.

## Not in Scope

| Item                                                                                  | Reason                                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding new journey tokens or a first-class paused pair                                | #498 is limited to the four active/complete failures; paused already has separate tracked debt.                                                                                    |
| Recoloring `journey-progress-fill` or `journey-completion-bg` to match the new values | These are different semantic surfaces and are not part of the failing text pair or the shared state map. Changing them would widen visual scope without an acceptance requirement. |
| Refactoring `stepStateColorMap` or component styles                                   | The sharing contract is already correct and is the mechanism this fix must preserve.                                                                                               |
| Timeline/Focus screen integration work                                                | Owned by downstream #378, #466, and #467.                                                                                                                                          |
| Committing generated Unistyles output                                                 | It is ignored build output; the authored JSON is the source of truth.                                                                                                              |

## Discovery Log

<!-- Entries added during implementation:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-07-10 14:47] Implementation matched the plan with no code-scope
  deviation. The four generated ratios resolve to 6.212, 5.568, 5.976, and
  5.570; the empty `KNOWN_FAILURES` gate and all consumer tests pass.
- [2026-07-10 14:47] Web Storybook emitted pre-existing Vite tsconfig-path
  parse warnings for packages under `.bun-cache`, but the server became ready
  and all required stories rendered successfully. The data-driven Contrast
  Audit updated automatically, so `ContrastAudit.stories.tsx` stayed unchanged.
