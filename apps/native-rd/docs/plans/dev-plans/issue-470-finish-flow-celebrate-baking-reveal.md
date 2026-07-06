# Development Plan: Issue #470

## Issue Summary

**Title**: [Storybook] Finishing flow 1/3 — celebrate + baking + reveal stages
**Type**: feature
**Complexity**: MEDIUM
**Estimated Lines**: ~470–520 lines across 9 new files (3 stage components + 3 styles + 1 stories file + tests), zero existing files touched.

## Intent Verification

- [x] A `FinishCelebrateStage` story renders "Goal complete" (mono uppercase eyebrow) + "You did it." (display headline) + a summary sentence naming the goal and evidence count + the closed "Add a closing note · optional" dashed prompt + a primary "Design your badge →" CTA with its "the keepsake for this win" subcopy — matching `App Shell.dc.html`'s `finish.isCelebrate` block and `Finishing Flow A Prototype.dc.html` lines 36–60 top-to-bottom, with **no** badge preview (neither prototype shows one before a design exists).
- [x] A second `FinishCelebrateStage` story (or an interaction demo) shows tapping the closing-note prompt swaps it for an open `TextInput`/textarea seeded from `Finishing Flow A Prototype.dc.html`'s `noteOpen`/`noteText` state, and typing updates local story state — demonstrating the callback contract `onClosingNoteChange(text)`, not wired to any persistence.
- [x] A `FinishBakingStage` story renders the badge preview at reduced opacity, a spinner, and "Baking your badge…" (mono) — matching `finish.isBaking` (`App Shell.dc.html:493-499`) — using RN's native `ActivityIndicator` rather than a custom JS spin loop (no OS-level "disable custom animation" concern).
- [x] A `FinishRevealStage` story renders "Earned" (mono uppercase eyebrow), the badge at its large preview size with a pop-in reveal animation, the goal title, an earned-date label, a primary "View badge" CTA, and a quiet underlined "Back to goals" text link — matching `finish.isReveal` (`App Shell.dc.html:501-514`).
- [x] A `ReducedMotion` (or equivalently named) story variant on `FinishRevealStage` passes `animationPref="none"` and shows the badge appearing instantly (`getSpringConfig`/`getTimingConfig("none")` → 0-duration), confirming the reveal pop respects the existing animation-preference contract (`useAnimationPref`/`utils/animation.ts`) rather than a hardcoded animation.
- [x] All three stage views compose the existing `BadgeRenderer` (`src/badges/BadgeRenderer`) for every badge preview — `grep -rn "Svg\|react-native-svg" src/components/Finish*Stage` returns no direct SVG usage outside what `BadgeRenderer` itself already encapsulates.
- [x] `grep -n "#[0-9a-fA-F]\{3,6\}" src/components/Finish*Stage/*.ts*` returns no matches outside comments — every color resolves through `theme.*` tokens (in particular `theme.chrome.celebrationBg`/`celebrationFg` for the reveal band, matching the existing Badge Detail hero header, #419).
- [x] `grep -rn "FinishCelebrateStage\|FinishBakingStage\|FinishRevealStage" src/screens` returns no matches — this issue ships components + stories only; `CompletionFlowScreen.tsx` is untouched (title says `[Storybook]`; wiring is a future `[Integrate]` issue per #447 decision 4).
- [x] No story or component in this issue renders a flow-level orchestrator or an `AllThemesMatrix` — both explicitly belong to slice 3/3 (#472).

## Dependencies

| Issue | Title                                                             | Status                            | Type                                                               |
| ----- | ----------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| #447  | Design: Finishing flow — resolve the five "Calls to make"         | 🟢 Closed — decisions recorded    | Design-decision gate (was blocking #448)                           |
| #448  | [Storybook] Finishing flow — celebrate → design → baking → reveal | 🟢 Open (umbrella, not a blocker) | Parent umbrella; splits into #470/#471/#472                        |
| #384  | Epic: Full Ride redesign — screens on a real-token foundation     | 🟢 Open (epic, not a blocker)     | Parent epic                                                        |
| #471  | [Storybook] Finishing flow 2/3 — badge-designer accordion         | 🟢 Open                           | Sibling slice, not a dependency of this one                        |
| #472  | [Storybook] Finishing flow 3/3 — flow story + AllThemesMatrix     | 🟢 Open                           | Sibling slice, owns the flow story/matrix explicitly excluded here |
| #449  | [Integrate] Finish flow wiring                                    | 🟢 Open, blocked by #472          | Downstream consumer, not a dependency of this issue                |

**Status**: ✅ All dependencies met. #447 (the design-decision gate #448's body says blocks the whole umbrella) is closed with all five calls + the closing-note delta resolved in its final comment (2026-07-02). Verified no native blockers via `gh api repos/rollercoaster-dev/Rollercoaster.dev-mobile/issues/470/dependencies/blocked_by` → `[]` and GraphQL `trackedInIssues`/`trackedIssues` → both empty (issue #470 isn't natively linked to #448 as a sub-issue — the "slice 1/3 of #448" relationship is body-text only, not a blocking edge). Labeled `dep:independent`.

**has_blockers**: false

## Objective

Ship three pure, prop-driven stage-view components implementing the non-designer parts of the App Shell `finish` route: `FinishCelebrateStage` ("Goal complete / You did it." + optional closing note + "Design your badge →"), `FinishBakingStage` (explicit "Baking your badge…" interstitial), and `FinishRevealStage` (earned-badge moment + "View badge" primary exit + "Back to goals" link). Each composes the existing `BadgeRenderer` for any badge preview; none build new rendering, wire navigation, or touch `CompletionFlowScreen.tsx`. Components + Storybook only — screen integration is the future `[Integrate]` issue (#449), and the badge-designer accordion (#471) / flow story + `AllThemesMatrix` (#472) are explicitly out of this slice.

## Decisions

| ID  | Decision                                                                                                                                                                                                     | Alternatives Considered                                                                                                      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Three separate top-level component folders — `src/components/FinishCelebrateStage/`, `FinishBakingStage/`, `FinishRevealStage/` — rather than one `FinishFlow/` folder housing all three                     | Single `FinishFlow/` folder with `CelebrateStage.tsx`/`BakingStage.tsx`/`RevealStage.tsx` inside, one `FinishFlow.styles.ts` | `src/__tests__/structure/component-structure.test.ts` scans only top-level `src/components/<Name>` dirs and requires `<Name>.styles.ts` + `index.ts` + `__tests__/<Name>.test.tsx` matching the **folder name**. Since this issue explicitly ships no flow-level orchestrator component (that's #472's job), there is no natural "FinishFlow" component to name the folder after — three independent folders map 1:1 onto three independently-storyable, independently-testable views and satisfy the structural test cleanly, mirroring how `CelebrationHeroHeader` and `EditGoalView` each got their own top-level folder rather than being nested under a nonexistent shared parent.          |
| D2  | All three components are **i18n-free** — copy passed as props with English defaults, no internal `useTranslation` call                                                                                       | Call `useTranslation(["completion"])` internally, matching `CompletionFlowScreen`/`FinishLine` today                         | Matches the established pattern for #410/#412/#445's presentational Track-B/D components (`CelebrationHeroHeader`, `EditGoalView`, `BadgeOverflowMenu`) — keeps each component Storybook-renderable with zero i18n provider setup. The future `[Integrate]` issue threads real `t()` output through props, same as #380 does for `CelebrationHeroHeader`. No new i18n keys are added by this issue (existing `en/completion.json` keys like `celebration.title`("You did it!") stay available for the integration to reuse if it chooses; this issue's stories use their own English literal defaults matching the prototype's exact copy, e.g. "You did it." with a period, not "You did it!"). |
| D3  | Badge previews in `FinishBakingStage` and `FinishRevealStage` compose `BadgeRenderer` with a `design: BadgeDesign` prop (SVG-based, live re-render), not an `<Image>` of the baked PNG (`badgeRow.imageUri`) | Render the baked PNG via `<Image>`, matching `BadgeEarnedModal`'s existing approach                                          | Both prototypes' `badgePreviewMd`/`badgePreviewLg` are the same live `badgeSvg()` function reused across design/baking/reveal — there is no PNG-vs-SVG distinction in the design source, and `BadgeRenderer` is the app's canonical existing renderer (issue's own "no new renderer" constraint). `FinishCelebrateStage` needs no badge preview at all — neither prototype shows one before a design exists.                                                                                                                                                                                                                                                                                     |
| D4  | No full-screen `Confetti` burst on `FinishCelebrateStage` or `FinishRevealStage` — only the reveal stage's badge "pop" animation                                                                             | Reuse the existing `<Confetti>` component (already fired by `CompletionFlowScreen` on entering its celebration phase today)  | Both design sources' embedded `<style>` blocks define only `@keyframes {as-}spin` and `@keyframes {as-}pop` for the `finish` route — no confetti/particle keyframes anywhere in either prototype (verified via grep across both files). The redesign's celebratory chrome is the badge pop-in, not a particle burst; dropping today's full-screen Confetti is a design change the prototypes make deliberately, not an omission from a static-markup limitation.                                                                                                                                                                                                                                 |
| D5  | Reveal's purple full-bleed background band uses `theme.chrome.celebrationBg`/`celebrationFg` (existing #419 tokens), not a new token                                                                         | Add a new `finish-reveal` chrome token; reuse `theme.chrome.screenHeaderBg` (purple header token)                            | `theme.chrome.celebrationBg`/`celebrationFg` already exist and already back exactly this kind of full-surface celebratory band (`CelebrationHeroHeader` on Badge Detail, #410/#419) — themed correctly across all 7 product themes (yellow in light/dark/lowVision per `contrastPairs.ts:89`, neutralised elsewhere). `screenHeaderBg` is the "Make your badge" header purple, a **different** semantic slot (#471's scope, not this issue's).                                                                                                                                                                                                                                                   |
| D6  | Animation preference is a **prop** (`animationPref: AnimationPref`), not read internally via `useAnimationPref()`                                                                                            | Call `useAnimationPref()` (Evolu query + `AccessibilityInfo`) inside each stage component                                    | Matches `EditGoalStepRow`'s established pattern (`animationPref: AnimationPref` prop, `getTimingConfig`/`getSpringConfig` from `utils/animation.ts`) for pure, prop-driven, Storybook-renderable components with no DB/OS dependency. The future `[Integrate]` issue wires the real hook's output into the prop, same as it will for i18n.                                                                                                                                                                                                                                                                                                                                                       |
| D7  | "Back to goals" renders as a new, small `Pressable` + `Text` (`textDecorationLine: "underline"`, `hitSlop` to reach the 44×44pt minimum, `accessibilityRole="button"`) rather than a `Button` variant        | Use `Button variant="ghost"`                                                                                                 | No existing `Button` variant renders a bare underlined text link (variants are `primary`/`secondary`/`ghost`/`destructive`, all bordered/boxed per the neo-brutalist system) and no other component in the codebase currently ships this treatment (`grep -rn "textDecorationLine"` across `src/components`/`src/screens` returns only `Checkbox.styles.ts`, unrelated). The prototype's literal treatment (`text-decoration:underline`, no border/background) is a deliberate "quiet secondary exit," matching #447 decision 5 ("`Back to goals`... a quiet underlined text link, not a second button") — reusing a boxed `Button` variant would contradict that decision.                      |
| D8  | Closing note's open/closed toggle is **internal** component state; only the note text (`onClosingNoteChange`) and an explicit save trigger (`onSaveClosingNote`) are outward callback props                  | Lift open/closed to a controlled prop, mirroring `EditGoalView`'s fully-controlled title                                     | Mirrors `EditGoalView`'s D8 pattern (evidence-picker open/closed is internal; only the resulting data callback is outward) — the toggle is pure UI state with no persistence implication, so there's nothing for a caller to control. Keeps the prop surface minimal.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D9  | `FinishBakingStage`'s spinner uses RN's native `ActivityIndicator`, not a custom reanimated rotate loop                                                                                                      | Build a custom `withRepeat(withTiming(rotate...))` spinner matching the prototype's literal CSS `@keyframes spin`            | `ActivityIndicator` is a native platform spinner (no JS animation driver to gate on `animationPref`), avoiding a bespoke indeterminate-loop animation that reduced-motion guidance treats as a special case anyway (indeterminate progress indicators are conventionally exempt from "reduce motion" — unlike the reveal's one-shot pop, which _is_ gated per D6). Matches `CompletionFlowScreen`'s own existing `<ActivityIndicator size="small" />` usage for in-flight badge status.                                                                                                                                                                                                          |

## Affected Areas

- `src/components/FinishCelebrateStage/FinishCelebrateStage.tsx` — new; eyebrow ("Goal complete"), display headline ("You did it."), summary text prop, closing-note affordance (closed dashed prompt ↔ open textarea, D8), primary CTA ("Design your badge →") + subcopy
- `src/components/FinishCelebrateStage/FinishCelebrateStage.styles.ts` — new
- `src/components/FinishCelebrateStage/index.ts` — new barrel
- `src/components/FinishCelebrateStage/__tests__/FinishCelebrateStage.test.tsx` — new
- `src/components/FinishBakingStage/FinishBakingStage.tsx` — new; dimmed badge preview (composes `BadgeRenderer`), `ActivityIndicator`, "Baking your badge…" label
- `src/components/FinishBakingStage/FinishBakingStage.styles.ts` — new
- `src/components/FinishBakingStage/index.ts` — new barrel
- `src/components/FinishBakingStage/__tests__/FinishBakingStage.test.tsx` — new
- `src/components/FinishRevealStage/FinishRevealStage.tsx` — new; celebration band (D5 tokens), "Earned" eyebrow, large `BadgeRenderer` preview with pop-in reveal (gated by `animationPref`, D6), goal title, earned-date label, "View badge" primary CTA, "Back to goals" underlined link (D7)
- `src/components/FinishRevealStage/FinishRevealStage.styles.ts` — new
- `src/components/FinishRevealStage/index.ts` — new barrel
- `src/components/FinishRevealStage/__tests__/FinishRevealStage.test.tsx` — new
- `src/components/FinishCelebrateStage/FinishCelebrateStage.stories.tsx` — new (or a shared `stories/` convention if precedent differs per-folder — see Step 4)
- `src/components/FinishBakingStage/FinishBakingStage.stories.tsx` — new
- `src/components/FinishRevealStage/FinishRevealStage.stories.tsx` — new

No existing files are modified by this issue.

## Implementation Plan

### Step 1: `FinishCelebrateStage`

**Files**: `src/components/FinishCelebrateStage/FinishCelebrateStage.tsx`, `FinishCelebrateStage.styles.ts`, `index.ts`
**Commit**: `feat(finish-flow): FinishCelebrateStage — goal-complete headline + closing note`
**Changes**:

- [x] Define `FinishCelebrateStageProps`: `eyebrow`, `headline`, `summary` (all string, English defaults per D2), closing-note props (`closingNoteValue: string`, `onClosingNoteChange: (text: string) => void`, `closingNotePromptLabel`/`closingNotePlaceholder` copy props), `onDesignBadge: () => void`, `ctaLabel`/`ctaSubcopy` copy props
- [x] Layout: centered column (eyebrow `variant="mono"` uppercase, headline `variant="display"`, summary `variant="body"`), closing-note block below (closed: dashed-border `Pressable` row toggling internal `noteOpen` state, D8; open: `TextInput multiline`), footer CTA (`Button variant="primary"`, full-width) + subcopy line
- [x] Zero badge preview — matches both prototypes' celebrate stage (D3 note)
- [x] `accessibilityRole="header"` on the headline; note textarea gets `accessibilityLabel`/`accessibilityHint` props with English defaults
- [x] `index.ts` barrel

### Step 2: `FinishBakingStage`

**Files**: `src/components/FinishBakingStage/FinishBakingStage.tsx`, `FinishBakingStage.styles.ts`, `index.ts`
**Commit**: `feat(finish-flow): FinishBakingStage — baking interstitial`
**Changes**:

- [x] Define `FinishBakingStageProps`: `badgeDesign: BadgeDesign`, `label` copy prop (default "Baking your badge…")
- [x] Centered column: `BadgeRenderer` at medium preview size wrapped in a dimmed `View` (`opacity` token/style, matching prototype's `opacity:0.5`), `ActivityIndicator` (D9), mono label text below
- [x] `accessibilityRole="none"` + `accessibilityLiveRegion="polite"` wrapper (mirrors `CompletionFlowScreen`'s existing in-flight badge-status announcement pattern) so screen readers announce the baking state once
- [x] `index.ts` barrel

### Step 3: `FinishRevealStage`

**Files**: `src/components/FinishRevealStage/FinishRevealStage.tsx`, `FinishRevealStage.styles.ts`, `index.ts`
**Commit**: `feat(finish-flow): FinishRevealStage — earned-badge moment + exit CTAs`
**Changes**:

- [x] Define `FinishRevealStageProps`: `badgeDesign: BadgeDesign`, `goalTitle: string`, `earnedDateLabel: string` (pre-formatted, caller-owned per `CelebrationHeroHeader`'s `credentialLabel` precedent), `eyebrow` copy prop (default "Earned"), `onViewBadge: () => void`, `onBackToGoals: () => void`, `viewBadgeLabel`/`backToGoalsLabel` copy props, `animationPref: AnimationPref` (D6)
- [x] Full-bleed celebration band (`theme.chrome.celebrationBg`/`celebrationFg`, D5) filling the stage
- [x] Pop-in reveal: `useSharedValue` + `useAnimatedStyle` scale transform driven by `getSpringConfig(animationPref)` (mirrors `BadgeEarnedModal`'s existing scale-in pattern) wrapping a large `BadgeRenderer`
- [x] Goal title (`variant="title"`), earned-date label (`variant="mono"`) below the badge
- [x] Footer: `Button variant="primary"` ("View badge") + underlined text link (D7) ("Back to goals")
- [x] `index.ts` barrel

### Step 4: Stories — per-stage, including reduced-motion variant

**Files**: `src/components/FinishCelebrateStage/FinishCelebrateStage.stories.tsx`, `src/components/FinishBakingStage/FinishBakingStage.stories.tsx`, `src/components/FinishRevealStage/FinishRevealStage.stories.tsx`
**Commit**: `test(finish-flow): stories for celebrate, baking, reveal stages`
**Changes**:

- [x] `FinishCelebrateStage.stories.tsx`: `Default` (closing note closed), `ClosingNoteOpen` (local `useState`, note field open with sample text, demonstrating `onClosingNoteChange`) — grouped under `Iteration B/Finish/FinishCelebrateStage` (matching `EditGoalView`'s `Iteration B/Goals/EditGoalView` grouping convention)
- [x] `FinishBakingStage.stories.tsx`: `Default` (sample `BadgeDesign` fixture) — grouped under `Iteration B/Finish/FinishBakingStage`
- [x] `FinishRevealStage.stories.tsx`: `Default` (`animationPref="full"`), `ReducedMotion` (`animationPref="none"`, badge appears without the pop transition) — grouped under `Iteration B/Finish/FinishRevealStage`
- [x] No flow-level story composing all three stages together, and no `AllThemesMatrix` in any of the three files (both explicitly deferred to #472)

### Step 5: Tests

**Files**: `src/components/FinishCelebrateStage/__tests__/FinishCelebrateStage.test.tsx`, `src/components/FinishBakingStage/__tests__/FinishBakingStage.test.tsx`, `src/components/FinishRevealStage/__tests__/FinishRevealStage.test.tsx`
**Commit**: `test(finish-flow): unit tests for celebrate, baking, reveal stages`
**Changes**:

- [x] `FinishCelebrateStage`: renders eyebrow/headline/summary/CTA; closed note shows the dashed prompt and no textarea; tapping the prompt reveals the textarea (internal state, D8); `onClosingNoteChange` fires on text input; `onDesignBadge` fires on CTA press; headline has `accessibilityRole="header"`
- [x] `FinishBakingStage`: renders dimmed `BadgeRenderer` + `ActivityIndicator` + label; live-region a11y props present
- [x] `FinishRevealStage`: renders badge/title/date/eyebrow; `onViewBadge` fires on primary CTA press; `onBackToGoals` fires on the underlined link press; link exposes `accessibilityRole="button"`; with `animationPref="none"` the shared scale value initializes to its resting value (no transient 0/undersized frame) — mirrors how `BadgeEarnedModal`'s existing test suite asserts the `shouldAnimate` branch
- [x] Zero-hex regression: none of the three components import any raw hex literal (spot-checked in the plan's own Intent Verification grep, not necessarily a dedicated test)
- [x] Regression check: `grep -rn "FinishCelebrateStage\|FinishBakingStage\|FinishRevealStage" src/screens` stays empty

## Testing Strategy

- [x] Unit tests for all three components (Jest 30, `@testing-library/react-native` v13), colocated at `src/components/<Name>/__tests__/<Name>.test.tsx` per the structural-test convention
- [x] Run via `bun run test --testPathPatterns "Finish(Celebrate|Baking|Reveal)Stage"` — never `bun test` or plain `npx jest`
- [x] Manual/visual: open Storybook, confirm `Default`/`ClosingNoteOpen`/`ReducedMotion` stories all render correctly against the two named prototypes side-by-side; confirm zero hardcoded hex via `grep -n "#[0-9a-fA-F]\{3,6\}" src/components/Finish*Stage/*.ts*` (expect no matches outside comments)
- [x] What this issue's tests will **not** show: no test or story exercises the badge-designer accordion (#471, not built yet), the interactive multi-stage flow transition or 7-theme render correctness (#472's `AllThemesMatrix`), or any real navigation/`useCreateBadge` wiring (#449) — those remain red/absent until their respective follow-up issues land, by design.

## Not in Scope

| Item                                                                                                                                                                 | Reason                                                                                 | Follow-up                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| Badge-designer accordion (Shape/Color/Center/Bottom-label sections)                                                                                                  | Explicitly slice 2/3 per the issue's "Must not do"                                     | #471                                          |
| Interactive flow story (celebrate → baking → reveal transitions) + `AllThemesMatrix`                                                                                 | Explicitly slice 3/3 per the issue's "Must not do"                                     | #472                                          |
| Wiring these three stages into `CompletionFlowScreen.tsx` (removing `BadgeEarnedModal`, generalizing the phase machine per #447 decision 4)                          | `[Storybook]` issue — component + stories only                                         | #449 (blocked by #472)                        |
| Real navigation to Badge Detail on "View badge" / to Goals on "Back to goals"                                                                                        | Bare callback props; navigation is a screen/container concern                          | #449                                          |
| Real `useCreateBadge` bake-status wiring (building/signing/storing/baking sub-statuses) into `FinishBakingStage`'s label                                             | Component takes a static `label` prop; sub-status text mapping is the container's job  | #449                                          |
| First-badge vs. subsequent-badge congratulatory microcopy (present in today's `BadgeEarnedModal`, which this reveal stage functionally replaces per #447 decision 2) | Neither canonical prototype distinguishes first/subsequent badges in the reveal moment | none — can be added as a prop later if wanted |
| Full-screen `Confetti` burst on celebrate/reveal                                                                                                                     | Dropped per D4 — absent from both prototypes' animation keyframes                      | none                                          |

## Discovery Log

- [2026-07-06] **`FinishCelebrateStage.initialNoteOpen` prop added** (not in original plan). D8 keeps the note's open/closed toggle internal, but the `ClosingNoteOpen` story and a "renders open" test need to render the field open without a tap. Added an uncontrolled-default seam `initialNoteOpen?: boolean` (default `false`) that only seeds the internal state — the toggle stays internal, so D8 holds (this is the `defaultValue`/`defaultOpen` React idiom, not a controlled prop). Committed separately as a `feat` before the stories commit.
- [2026-07-06] **`onSaveClosingNote` wired to the note field's `onBlur`** rather than a dedicated save button. D8 names `onSaveClosingNote` as an outward callback but neither prototype shows an explicit save control in the celebrate stage. Blur ("done editing the note") is the natural, minimal save trigger; the prop is optional, so callers that only need live text can ignore it. No dead UI added.
- [2026-07-06] **Badge preview sizes chosen:** `FinishBakingStage` defaults to 146 (matching `CelebrationHeroHeader`'s `BADGE_SIZE`, the prototype's `badgePreviewMd`); `FinishRevealStage` defaults to 200 (larger `badgePreviewLg`). Both are overridable via a `badgeSize` prop.
- [2026-07-06] **Reveal band token = `theme.chrome.celebrationBg` (yellow in light/dark), per D5** — deliberately not the prototype's literal `#a78bfa` purple. The reveal reuses the existing #419 celebration band that already backs Badge Detail's hero; matching that token over the prototype's raw hex is the point of D5.
- [2026-07-06] **Baking test asserts the spinner via `screen.UNSAFE_getByType(ActivityIndicator)`** (`toBeTruthy`, since the query throws when absent) — `ActivityIndicator` is a composite, not a host element, so `toBeOnTheScreen()` rejects it. All other assertions use `getByTestId`/`getByText`.
- [2026-07-06] **All steps complete.** 6 commits (3 components + `initialNoteOpen` seam + stories + tests). Validation: type-check ✓, lint ✓ (only a pre-existing 905-line-file warning, unrelated), full test suite ✓ (204 suites / 9743 tests), build ✓ (no-op). Intent-verification greps: zero-hex ✓ (matches are `#4xx`/`#419`/`#470` issue refs in comments only), no direct SVG ✓, no `src/screens` references ✓, no `AllThemesMatrix`/flow orchestrator ✓.
