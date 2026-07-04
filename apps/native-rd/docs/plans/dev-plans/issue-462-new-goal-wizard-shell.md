# Development Plan: Issue #462

## Issue Summary

**Title**: [Storybook] New Goal wizard 1/3 — shell + steps 1 & 4 (name, ready)
**Type**: feature
**Complexity**: MEDIUM
**Estimated Lines**: ~450–550 lines (5 new files, zero existing files touched)

## Intent Verification

- [ ] A `NameStep` story renders the wizard header (no visible back arrow — the first step has nowhere to go back to — "New goal" label, `×` close), a 4-segment progress bar with segment 1 filled (`accentYellow`) and segments 2–4 unfilled, "Step 1 of 4" eyebrow, "What do you want to work toward?" title, a bordered goal-title input, the "Something you'll show progress on." hint, a primary "Next →" CTA, and the quiet "or Quick add — skip to the list ›" fast path below it — matching `App Shell.dc.html`'s `newgoal` / `ng.isName` state top-to-bottom.
- [ ] A `ReadyStep` story renders the header with a visible back arrow (any step other than `name`), a progress bar with all 4 segments filled, "You're set." headline, a summary card showing the goal title and "N steps · evidence on each", the purple badge-note banner ("You'll design your badge when you finish."), and a primary "Start Working" CTA — matching `ng.isReady`.
- [ ] Tapping "Next →" on the name step calls `onNext`; tapping the quiet fast-path link calls `onQuickAdd` — two distinct callbacks, never conflated. "Next →" is disabled when the title is empty or whitespace-only.
- [ ] Tapping `×` calls `onClose` from any step. The back arrow is not rendered at all (not just disabled) when `currentStep === "name"`; it renders and calls `onBack` for every other step value.
- [ ] Tapping "Start Working" on the ready step calls `onStartWorking`.
- [ ] `grep -n "#[0-9a-fA-F]\{3,6\}" src/components/NewGoalWizard/*.ts*` returns no matches outside comments — every color resolves through `theme.colors.*`.

## Dependencies

| Issue | Title                                                           | Status                                      | Type                                            |
| ----- | --------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| #384  | Epic: Full Ride redesign — screens on a real-token foundation   | 🟢 Open (epic, not a blocker)               | Parent epic                                     |
| #443  | [Storybook] New Goal wizard — name → first step → build → ready | 🟢 Open (umbrella, not a blocker)           | Parent umbrella                                 |
| #444  | [Integrate] New Goal — replace title-only NewGoalModal          | 🟢 Open                                     | Downstream consumer, blocked BY this slice      |
| #445  | [Storybook] Edit Goal — redesigned step editor                  | ✅ Closed — merged via PR #461 (2026-07-02) | Closest analog (component shape, not a blocker) |

**Status**: ✅ All dependencies met. Issue body contains no "Blocked by " / "Depends on " / "After #" marker, is labeled `dep:independent`, and `gh api repos/rollercoaster-dev/Rollercoaster.dev-mobile/issues/462/dependencies/blocked_by` returns `[]` (no native blocked-by edges); GraphQL `trackedInIssues`/`trackedIssues` are also both empty (no native sub-issue links). #443 is the parent umbrella (closes only when #462/#463/#464 all close) and #444 is a _downstream_ consumer explicitly stated to be blocked by slice 3/3 (#464), not by this issue — #462 can and should ship first, standing alone.

**has_blockers**: false

## Objective

Ship a pure, prop-driven `NewGoalWizard` component implementing the App Shell prototype's `newgoal` route frame — header (conditional back · "New goal" · close), 4-segment progress bar, and footer CTA slot — plus its two bookend steps: **Step 1 · name** (title input + quiet "Quick add" fast path) and **Step 4 · ready** (summary card + badge note + "Start Working"). Steps 2 and 3 render as an inert placeholder body until slices 2/3 (#463) and 3/3 (#464) fill them in. Component + two Storybook stories only — no navigation, no persistence, no evidence picker (that's #463/#444).

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                           | Alternatives Considered                                                                           | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | New component lives at `src/components/NewGoalWizard/` (top-level, single component folder), matching `EditGoalView`'s precedent from #445                                                                                                                         | Nest under a screen folder                                                                        | No existing screen file to nest under yet (component isn't wired anywhere); `src/components/` is where every standalone Track B presentational component already lives; keeps `component-structure.test.ts` / `naming-conventions.test.ts` trivially satisfied (folder name === component name, sibling `.styles.ts` + `__tests__/<Name>.test.tsx` + `index.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D2  | `currentStep` is typed as the full 4-value union `"name" \| "step" \| "build" \| "ready"` now, not a 2-value union scoped to this slice. Steps `"step"`/`"build"` render a minimal empty placeholder body (no copy, no "coming soon" text) inside the same switch. | Type `currentStep` as `"name" \| "ready"` only for this slice; widen the union in #463            | The progress bar and header are shared infrastructure for all 4 steps (issue explicitly calls out "Steps 2/3 are placeholder slots until slices 2/3 and 3/3 land" as in-scope framing, not a future concern) — the frame needs to already accept and render (harmlessly) every step value it will ever receive. #463/#464 will edit this same file to replace the two placeholder branches with real step content, exactly how `EditGoalView.tsx` itself was edited mid-flight to add `EditGoalSubStepRow` (D12, #445) — an established incremental-extension pattern in this codebase, just spread across issues instead of commits. Not "missing"/"needed" framing risk: the placeholder is unreached by any story or real navigation in this PR, so no user-facing absence copy exists to violate the ND rule. |
| D3  | Header is a **bespoke** composition using the existing `HeaderBand` layout wrapper (`src/components/ScreenHeader/HeaderBand.tsx`) — not `ScreenSubHeader`                                                                                                          | Reuse `ScreenSubHeader` (`right` slot for close)                                                  | `ScreenSubHeader` unconditionally renders a visible `ArrowLeft` on the left and only exposes one _right_ slot. The prototype needs a **conditionally hidden** back arrow (empty glyph on `isName`, i.e. no back target from the first step) **and** an always-visible `×` close simultaneously — a shape `ScreenSubHeader` doesn't support. `HeaderBand` already carries the exact chrome styling (`theme.chrome.screenHeaderBg/Border/Fg`) `ScreenSubHeader` itself is built on, so reusing it directly (mirrors `CelebrationHeroHeader`'s precedent of composing a bespoke nav row from primitives, #410) gets the right purple band with zero duplicated color logic.                                                                                                                                          |
| D4  | Progress-bar segments use `theme.colors.accentYellow` (filled) / `theme.colors.background` (unfilled), both bordered with `theme.colors.border` at `borderWidth.medium`                                                                                            | Use `journey-*` step-state tokens                                                                 | The prototype's literal segment fill is `#ffe50c` — an **exact match** to `theme.colors.accentYellow` (confirmed in `themes/adapter.ts:77` / `colorModes.ts`), already used elsewhere for yellow chrome (`StepCard`, `StatusBadge`). `journey-*` tokens back **step/goal completion state** coloring (pending/in-progress/paused/completed) per the #406 timeline work — this progress bar tracks _wizard position_, a different concept with its own already-correct token, not step state. Border uses `borderWidth.medium` (2px) matching the prototype's literal `border:2px solid`, distinct from the thicker 3px cards elsewhere in the screen.                                                                                                                                                             |
| D5  | `NewGoalWizard` is **i18n-free** (no internal `useTranslation` call) — all copy arrives as props with English defaults transcribed from the canonical prototype, following D9's precedent from #445/EditGoalView                                                   | Call `useTranslation(["newGoal"])` internally, matching today's `NewGoalModal.tsx`                | Matches the established i18n-free pattern for every Storybook-first presentational component shipped under #384 (EditGoalView, CelebrationHeroHeader, BadgeOverflowMenu, FocusProgressStrip, …) — keeps the component Storybook-renderable with zero i18n provider setup. `en/newGoal.json` / `_register/newGoal.yml` already exist for the **current** `NewGoalModal.tsx`; the future `[Integrate]` issue (#444) is responsible for deciding whether to extend that namespace or add new keys and threading real `t()` output through these props (mirrors how #380 threads real copy through `CelebrationHeroHeader`). **No new i18n keys are added by this issue.**                                                                                                                                            |
| D6  | "Next →" is disabled (`Button disabled={!goalTitle.trim()}`) when the title is empty/whitespace-only                                                                                                                                                               | Leave it always enabled, matching the static prototype's literal always-blue button               | The prototype is a static mock with no empty-title state depicted; the app's own existing `NewGoalModal.tsx` already guards identically (`disabled={!title.trim()}`) for the same "name a goal" step. Disabling on empty input is the established app convention for this exact interaction, not a deviation, and prevents advancing the wizard with a nameless goal.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D7  | The `×` close button reuses `IconButton` with `tone="chrome"` and phosphor's `X` glyph (mirrors `EditGoalView`'s `⋯` trigger styling, swapped icon); the back button reuses `IconButton` `tone="chrome"` + phosphor `ArrowLeft` (same icon `ScreenSubHeader` uses) | Bespoke raw `Pressable` + text glyph, matching today's `NewGoalModal.tsx`'s raw `"X"` text button | `IconButton` already resolves the correct on-chrome icon color per theme (incl. high-contrast/dyslexia/etc. variants) via `resolveIconColor` — reusing it is strictly less code and more accessible (44×44 minimum target, built-in `accessibilityRole="button"`) than a new raw glyph button, and stays consistent with every other Track B header actually shipped (`CelebrationHeroHeader`, `EditGoalView`).                                                                                                                                                                                                                                                                                                                                                                                                   |

## Affected Areas

- `src/components/NewGoalWizard/NewGoalWizard.tsx`: new — header (conditional back · "New goal" · close, D3/D7), 4-segment progress bar (D4), step switch over `currentStep` rendering the name-step body+footer, the ready-step body+footer, or an empty placeholder body for `"step"`/`"build"` (D2)
- `src/components/NewGoalWizard/NewGoalWizard.styles.ts`: new — band/progress/name-step/ready-step/footer styles, all through `theme.*` tokens + `shadowStyle(theme, ...)`, zero hardcoded hex
- `src/components/NewGoalWizard/NewGoalWizard.stories.tsx`: new — exactly two stories, `NameStep` and `ReadyStep` (issue's own "Must not do": the flow story + `AllThemesMatrix` belong to slice 3/3, #464)
- `src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx`: new — renders per step, back-visibility gate, all callbacks fire, Next-disabled-when-empty, placeholder renders without crashing for `"step"`/`"build"`, a11y roles/labels
- `src/components/NewGoalWizard/index.ts`: new barrel (`NewGoalWizard`, `NewGoalWizardProps`, `NewGoalWizardStep`)

No existing files are modified by this issue.

## Implementation Plan

### Step 1: Scaffold `NewGoalWizard` shell — header, progress bar, step switch

**Files**: `src/components/NewGoalWizard/NewGoalWizard.tsx`, `NewGoalWizard.styles.ts`, `index.ts`
**Commit**: `feat(new-goal-wizard): scaffold NewGoalWizard shell — header + progress bar`
**Changes**:

- [x] Define `NewGoalWizardStep = "name" | "step" | "build" | "ready"` and `NewGoalWizardProps` (D2): `currentStep`, `onBack`, `onClose`, plus per-step props (see Steps 2–3) and copy-string props with English defaults (D5)
- [x] Header via `HeaderBand` (D3): left slot renders an `IconButton` (`ArrowLeft`, `tone="chrome"`) calling `onBack` only when `currentStep !== "name"`, otherwise a spacer `View` of the same width (mirrors `ScreenHeader.styles.ts`'s `SPACER_WIDTH` constant so the centered label doesn't jump); centered "New goal" label; right slot always an `IconButton` (`X`, `tone="chrome"`) calling `onClose` (D7)
- [x] 4-segment progress bar: `Array.from({length: 4})` mapped to a bordered segment, filled (`accentYellow`) when its index `<= currentStepIndex` else unfilled (`background`) (D4) — `currentStepIndex` derived locally from `currentStep` via a small ordered lookup (`["name","step","build","ready"]`)
- [x] Step switch: `currentStep === "name"` → name-step body+footer (Step 2); `"ready"` → ready-step body+footer (Step 3); `"step"` / `"build"` → an empty flexed placeholder `View` (D2), no visible copy
- [x] `index.ts` barrel

### Step 2: Step 1 · name — title input + quick-add fast path

**Files**: `src/components/NewGoalWizard/NewGoalWizard.tsx` (wire in), `NewGoalWizard.styles.ts`
**Commit**: `feat(new-goal-wizard): step 1 name — title input + quick-add fast path`
**Changes**:

- [x] Body: "Step 1 of 4" mono eyebrow, "What do you want to work toward?" headline, bordered `TextInput` (`goalTitle` / `onGoalTitleChange`, placeholder "Name your goal", `accessibilityLabel`), "Something you'll show progress on." hint text
- [x] Footer: primary `Button` "Next →" calling `onNext`, `disabled={!goalTitle.trim()}` (D6); below it a single `Pressable` (role `button`, one combined a11y label e.g. "Quick add, skip to the list") rendering "or " (plain) + "Quick add — skip to the list ›" (`accentPrimary`, bold) calling `onQuickAdd`

### Step 3: Step 4 · ready — summary card + Start Working CTA

**Files**: `src/components/NewGoalWizard/NewGoalWizard.tsx` (wire in), `NewGoalWizard.styles.ts`
**Commit**: `feat(new-goal-wizard): step 4 ready — summary card + Start Working CTA`
**Changes**:

- [x] Body: "You're set." display headline; bordered summary card showing `goalTitle` (bold) and a step-count line built from a `stepCountSummary(count)` copy prop, default `` `${count} step${count === 1 ? "" : "s"} · evidence on each` `` (mirrors `defaultStepCountLabel`'s pluralization pattern from `EditGoalView`); `accentPurpleLight` badge-note banner (🏆 + "You'll design your badge when you finish.")
- [x] Footer: primary `Button` "Start Working" calling `onStartWorking` (always enabled — the ready step is only reachable once a title + at least one step exist upstream, per the umbrella's wizard flow; this slice doesn't own that gate)

### Step 4: Stories — NameStep, ReadyStep

**Files**: `src/components/NewGoalWizard/NewGoalWizard.stories.tsx`
**Commit**: `test(new-goal-wizard): stories for name step and ready step`
**Changes**:

- [x] `NameStep`: stateful wrapper (local `useState` for `goalTitle`, seeded empty so the disabled-Next state is visible by default) rendering `NewGoalWizard` with `currentStep="name"`; annotate that Next enables once text is typed
- [x] `ReadyStep`: `NewGoalWizard` with `currentStep="ready"`, a fixed sample `goalTitle` ("Build a birdhouse", matching the prototype's own seed data) and `stepCount` (e.g. `2`)
- [x] Story title: `"Iteration B/Goals/NewGoalWizard"` (matches `EditGoalView`'s `"Iteration B/Goals/EditGoalView"` grouping)

### Step 5: Tests

**Files**: `src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx`
**Commit**: `test(new-goal-wizard): component coverage`
**Changes**:

- [x] Name step: renders eyebrow/title/input/hint/Next/quick-add; back arrow is **absent** (not just hidden — no matching element) when `currentStep="name"`; `onGoalTitleChange` fires on input; `onNext` fires on Next tap; Next is disabled when `goalTitle` is empty/whitespace and enabled otherwise (`test.each` over a couple of whitespace-only inputs); `onQuickAdd` fires on the fast-path tap
- [x] Ready step: renders headline/summary card (title + pluralized step count via `test.each` for count `1` vs `2+`)/badge banner/Start Working; back arrow **is present** and calls `onBack`
- [x] `onClose` fires from both steps
- [x] Placeholder: `currentStep="step"` and `currentStep="build"` both render without throwing and without any header/back regression (`test.each`)
- [x] Progress bar: correct count of filled vs. unfilled segments per `currentStep` (`test.each` over the 4 values)
- [x] a11y: back/close buttons expose `accessibilityRole="button"` + labels; input has an `accessibilityLabel`

## Testing Strategy

- [x] Unit tests for `NewGoalWizard` (Jest 30, `@testing-library/react-native` v13) at `src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx`
- [x] Use `test.each` for the disabled/enabled Next cases, the pluralized step-count cases, and the 4-value `currentStep` progress-bar/placeholder cases
- [x] Run via app-local Jest wrapper (`cd apps/native-rd && bun run test -- --testPathPatterns NewGoalWizard`) — never `bun test` or plain `npx jest`
- [ ] Manual/visual: open Storybook, confirm `NameStep` (no back arrow, disabled→enabled Next, quick-add link) and `ReadyStep` (back arrow present, summary card, badge banner) both match `App Shell.dc.html`'s `newgoal` route pixel-for-pixel in `light-default`; confirm zero hardcoded hex via `grep -n "#[0-9a-fA-F]\{3,6\}" src/components/NewGoalWizard/*.ts*` (expect no matches outside comments)
- [x] Regression check: `grep -rn "NewGoalWizard" src/screens` stays empty (confirms no accidental screen wiring slipped in — this is a `[Storybook]` issue)

## Not in Scope

| Item                                                                                                                                           | Reason                                                                                    | Follow-up                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------- |
| Step 2 · first step (title + evidence chip, `EvidenceTypePicker` reuse)                                                                        | Slice 2/3                                                                                 | #463                       |
| Step 3 · build (steps list, add-step input)                                                                                                    | Slice 3/3                                                                                 | #464                       |
| Interactive flow story (stepping through all 4 states in one story) and `AllThemesMatrix`                                                      | Issue's explicit "Must not do" — reserved for slice 3/3                                   | #464                       |
| Navigation wiring (replacing `NewGoalModal.tsx`, routing `onNext`/`onQuickAdd`/`onStartWorking`/`onClose`/`onBack` to real screen transitions) | `[Storybook]` issue — component + stories only                                            | #444 `[Integrate]`         |
| Persistence (`createGoal`, saving the title/steps to Evolu)                                                                                    | Screen/data concern, not this component's job                                             | #444 `[Integrate]`         |
| i18n keys / real `t()` wiring                                                                                                                  | D5 — component ships i18n-free with English default props                                 | #444 `[Integrate]`         |
| Validating "at least one step exists" before reaching the ready screen                                                                         | That gate lives in the wizard's step-2/3 flow logic, not this slice's two bookend screens | #463/#464, ultimately #444 |

## Discovery Log

<!-- Entries added by implement skill: -->

- [2026-07-04 13:19] Root `bun run test --testPathPatterns NewGoalWizard` is intercepted by Turbo; targeted Jest validation was run from `apps/native-rd` with `bun run test -- --testPathPatterns NewGoalWizard`, which forwards correctly through `scripts/jest-node.sh`.
