# Development Plan: Issue #381

## Issue Summary

**Title**: Goals + Badges: cockpit + wall-of-proof
**Type**: enhancement
**Complexity**: MEDIUM–LARGE — story-driven / presentational-first; **likely splits into 2 PRs** (PR A Goals, PR B Badges) under epic #384
**Estimated Lines**: ~450–550 incl. Storybook stories (+ ~50 conditional if the badge-wall token is added)
**Commits**: ~6 (3 per PR) + 1 conditional token commit

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] When a user opens the Goals tab with active goals, they see one prominent hero card: a large progress ring (percent + step count), the next-step title labelled "DO THIS NEXT · <goal title>", and a single Start/Resume button that navigates to FocusMode.
- [ ] Secondary goals ("KEEP WARM") render as compact cards below the hero; tapping any of them navigates to FocusMode for that goal.
- [ ] When a user opens the Goals tab with no goals, the existing empty-state copy renders correctly (no regression); the CTA navigates to NewGoal.
- [ ] When a user opens the Badges tab with earned badges, the screen shows: a count header ("N badges"), a "JUST EARNED" spotlight card for the most recent badge (taps through to BadgeDetail), and a dense circular gallery of the remaining badges.
- [ ] When a user opens the Badges tab with no badges, the empty-state renders correctly with a "See my goals" CTA that navigates to the Goals tab.
- [ ] The Goals screen does NOT contain a loud "resume" button or FAB outside of the hero cockpit card — no second resume control lives in the nav or elsewhere on this screen (S3 coherence).
- [ ] The badge-wall background renders correctly across all 7 themes (Full Ride, Night Ride, Bold Ink, Warm Studio, Loud & Clear, Clean Signal, Still Water) — no unreadable color combinations; if full-black (`#000` / `#161616`) does not adapt cleanly in any theme, a per-theme `badgeWall` surface token is added to the chrome contract and all 7 theme files; otherwise no new token is introduced.
- [ ] Zero hardcoded hex values in the redesigned components after the redesign.

## Dependencies

| Issue | Title                                                                                     | Status          | Type    |
| ----- | ----------------------------------------------------------------------------------------- | --------------- | ------- |
| #375  | Tokens: fix theme contrast failures (Prep Spec §1)                                        | ✅ Met (CLOSED) | Blocker |
| #376  | Tokens: extend contract for redesign — screen-header, brand-accent, per-theme hard shadow | ✅ Met (CLOSED) | Blocker |

**Status**: ✅ All dependencies met — F1 (#375) and F2 (#376) are both closed. Implementation can proceed.

**Note**: S3 (#379, Bottom Nav) is still open. This issue intentionally owns the single resume affordance; S3 must not duplicate it when it lands. The resume affordance lives in `GoalsCockpit` (Step 2) — S3 implementers should read it before working on the nav.

## Objective

Redesign the Goals and Badges screens to match the "Goals + Badges C Prototype": Goals becomes a momentum cockpit (dominant next-action ring + single Start/Resume + secondary "keep warm" cards), Badges becomes a dark wall-of-proof (count header + spotlight latest + dense gallery). Both gain redesigned empty states.

**Approach — story-driven, presentational-first.** The redesign's visual surface is built as pure, prop-driven components — `ProgressRing`, `BadgeCircleCell`, `GoalsCockpit`, `BadgesWall` — each with a Storybook story. `GoalsScreen`/`BadgesScreen` then become **thin containers** that run the Evolu `useQuery` + navigation and pass data down as props. The badge-wall 7-theme token-risk check runs on the `BadgesWall` **web Storybook** story (published to GitHub Pages, Evolu mocked), not the simulator.

**Why the split is required, not just nice:** the web Storybook's Evolu mock returns `[]` (`.storybook-web/mocks/evolu-react.ts`), so a story of either screen _as written_ would only ever render the empty state. Extracting the populated UI into prop-driven components is what makes the cockpit and wall storyable across themes at all — and it yields a testable presentational layer reviewable on Pages.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                   | Alternatives Considered                                            | Rationale                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Build `ProgressRing` as a new primitive component using `react-native-svg` (already a dep via badge renderer)                                                                                                                                                                                                                              | Reuse ProgressBar horizontally; use a third-party ring library     | SVG is already in the dep tree; a dedicated ring keeps the cockpit styles clean; the ring is layout-coupled to the hero card anyway                                                                                                                                                              |
| D2  | **Hero goal = most-recently-worked active goal** (ranked by latest step activity), with "keep warm" = the rest. Note: `activeGoalsQuery` currently orders `createdAt DESC` (newest-_created_), so this requires a query change to rank by latest step activity, not a free row-0 pick.                                                     | first-created (current query order); highest-progress; user-pinned | Issue says Goals owns "resume my current goal" — newest-_created_ ≠ the goal you're resuming. **User-pinned override is split to #396** to keep this PR a visual + query change, not a schema change.                                                                                            |
| D3  | Badge spotlight ("JUST EARNED") = `rows[0]` from `badgesWithGoalsQuery` (already `ORDER BY badge.createdAt DESC`)                                                                                                                                                                                                                          | Separate `latestBadgeQuery`; pass explicit `spotlightId` prop      | The existing query already delivers newest-first; no new query needed                                                                                                                                                                                                                            |
| D4  | Defer the badge-wall token decision to implementation — render all 7 themes first (on the `BadgesWall` web Storybook story), only add `badgeWall` if black doesn't adapt                                                                                                                                                                   | Pre-author the token now                                           | Explicit instruction from issue body: "don't pre-author the token"                                                                                                                                                                                                                               |
| D5  | Keep `FlatList` for the badge gallery (wrap + gap via `numColumns` or manual row layout)                                                                                                                                                                                                                                                   | `ScrollView` with `flexWrap`; Masonry                              | FlatList handles virtualization for large collections; `numColumns` gives the dense circular grid                                                                                                                                                                                                |
| D6  | **Start/Resume label** from completion count: `stepsCompleted === 0` → "Start", `stepsCompleted > 0` → "Resume"; a goal with no steps → "Start"                                                                                                                                                                                            | gate on an `in_progress` step status                               | `StepStatus` has only `pending`/`completed` (schema.ts:43) — there is no `in_progress` state, so a completion-count heuristic is the only viable one. The screen already computes completed steps.                                                                                               |
| D7  | **Leave the central `+` FAB in the nav as-is** (it's a _new-goal_ control, not a resume control)                                                                                                                                                                                                                                           | demote/remove it in this PR                                        | It doesn't violate the "single resume affordance" criterion. Bottom-nav changes are owned by #379, not this PR.                                                                                                                                                                                  |
| D8  | **New `BadgeCircleCell` component** for the dense gallery (60×60 circular)                                                                                                                                                                                                                                                                 | add a `compact` prop to the rectangular `BadgeCard`                | A boolean that radically reshapes a component is the prop-proliferation smell; a dedicated cell is cleaner and keeps `BadgeCard` intact for its list use.                                                                                                                                        |
| D9  | **Gallery shows all earned badges** (minus the spotlight) in the scrollable dense grid — no cap, no "+N MORE"                                                                                                                                                                                                                              | cap at N with a "+N MORE" tap-through                              | "Wall of proof" = density is the point; `FlatList` virtualizes so the full set is cheap. The prototype's "+9 MORE" was a mockup space-saver. **Drops the planned `wall.moreCount` key.**                                                                                                         |
| D10 | **Spotlight glow follows the app's animation preference** — gated on `animationPref === 'full'`; where the pref means no/reduced motion, no glow                                                                                                                                                                                           | run a lower-intensity glow in `reduced` mode                       | Decorative looping motion; in an ND-first app `reduced`/`none` means no decorative motion. Respect the existing `useAnimationPref` contract — no bespoke intensity tier.                                                                                                                         |
| D11 | **Author English (`en/`) keys + `_register/*.yml` only.** `de/` is auto-generated by the `i18n-sync` CI workflow (`bun run i18n:sync`, LLM) and auto-committed to the PR branch; `pseudo/` is generated by `bun run gen:pseudo` from `en/`                                                                                                 | hand-write `de/` and `pseudo/` values                              | Hand-written translations collide with / are overwritten by the generators. See `.github/workflows/i18n-sync.yml` and `scripts/generate-pseudo-locale.ts`.                                                                                                                                       |
| D12 | **Story-driven, presentational-first architecture.** Each screen splits into a pure prop-driven presentational component (`GoalsCockpit`, `BadgesWall`) + a thin `*Screen` container (`useQuery` + navigation → props). Primitives `ProgressRing` and `BadgeCircleCell` are standalone. Every presentational piece gets a Storybook story. | Build monolithic screens; verify only in-simulator                 | The web Storybook's Evolu mock returns `[]` (`.storybook-web/mocks/`), so a story of the screen-as-written only renders the empty state. The split makes the populated UI storyable, isolates the 7-theme check, and yields a testable presentational layer reviewable on GitHub Pages.          |
| D13 | **7-theme badge-wall check runs on the `BadgesWall` web-Storybook story** — theme toolbar, or an `AllThemesMatrix` story rendering the surface ×7                                                                                                                                                                                          | simulator / on-device walkthrough                                  | Web Storybook is published to Pages, fast (~13s build), browser-inspectable; its theme toolbar (`.storybook-web/preview.tsx`) drives all 7 product themes (`light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`, `light-autismFriendly`, `light-lowVision`, `light-lowInfo`). |

## Affected Areas

**PR A — Goals cockpit**

- `apps/native-rd/src/components/ProgressRing/` — `ProgressRing.tsx`, `.styles.ts`, `.stories.tsx`, `index.ts`, `__tests__/ProgressRing.test.tsx` (new primitive)
- `apps/native-rd/src/screens/GoalsScreen/GoalsCockpit.tsx` — new pure, prop-driven presentational view (hero ring card + keep-warm + empty state)
- `apps/native-rd/src/screens/GoalsScreen/GoalsCockpit.styles.ts`, `GoalsCockpit.stories.tsx`, `__tests__/GoalsCockpit.test.tsx` (new)
- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx` — slimmed to a thin container (`useQuery` reordered by latest step activity → `GoalsCockpit` props + navigation)
- `apps/native-rd/src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx` — container mapping/nav tests
- `apps/native-rd/src/i18n/resources/en/goals.json` (authored keys), `_register/goals.yml` (register)

**PR B — Badges wall**

- `apps/native-rd/src/components/BadgeCircleCell/` — `BadgeCircleCell.tsx`, `.styles.ts`, `.stories.tsx`, `index.ts`, `__tests__/BadgeCircleCell.test.tsx` (new primitive)
- `apps/native-rd/src/screens/BadgesScreen/BadgesWall.tsx` — new pure, prop-driven presentational view (count header + spotlight + dense gallery + empty state)
- `apps/native-rd/src/screens/BadgesScreen/BadgesWall.styles.ts`, `BadgesWall.stories.tsx` (incl. `AllThemesMatrix`), `__tests__/BadgesWall.test.tsx` (new)
- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx` — slimmed to a thin container (`useQuery` → `BadgesWall` props + navigation)
- `apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesScreen.test.tsx` — container mapping/nav tests
- `apps/native-rd/src/i18n/resources/en/badges.json` (authored keys), `_register/badges.yml` (register)

**Generated, NOT hand-edited** (D11): `de/goals.json`, `de/badges.json` (auto-synced & committed by the `i18n-sync` CI workflow on PR), `pseudo/goals.json`, `pseudo/badges.json` (run `bun run gen:pseudo`).

**Conditional** (only if the 7-theme check fails — D4): `packages/design-tokens/src/tokens/chrome.json`, `packages/design-tokens/src/themes/*.json` (the variants that need a non-default value), `packages/design-tokens/build-unistyles.js`.

## Implementation Plan

Steps 1–3 are **PR A (Goals)**; Steps 4–7 are **PR B (Badges)**. They're independent (different components, screens, namespaces) and can ship as two PRs under epic #384 — recommended if the combined diff exceeds the ~500-LOC PR cap. PR B's conditional Step 7 only runs if the 7-theme check in Step 5 fails.

### Step 1: ProgressRing primitive + story (PR A)

**Files**: `src/components/ProgressRing/{ProgressRing.tsx, ProgressRing.styles.ts, ProgressRing.stories.tsx, index.ts, __tests__/ProgressRing.test.tsx}` (all new)

**Commit**: `feat(native-rd): add ProgressRing primitive + story`

**Changes**:

- [x] `ProgressRing.tsx`: SVG circle pair (track + fill), `stroke-dasharray`/`stroke-dashoffset` from `progress` (0–1) via `react-native-svg` (`Svg`, `Circle`). Props: `size`, `strokeWidth`, `progress`, `centerLabel` (percent), `centerSublabel` (steps). `accessibilityRole="progressbar"` + `accessibilityValue`.
- [x] Colors from theme tokens only: track = `theme.colors.backgroundSecondary`, fill = `theme.action.actionPrimaryBg`, center text via `theme.colors.text` / `theme.colors.textMuted` (deviated from `screenHeaderFg` — see Discovery Log). No hardcoded hex.
- [x] `ProgressRing.styles.ts`: wrapper `position: relative`; overlay text centered via `StyleSheet.absoluteFillObject`.
- [x] `ProgressRing.stories.tsx` (CSF3): `args`-driven `Interactive` story with `progress`/`size`/`strokeWidth` controls + an `AllStates` story (0 / 50 / 100%). Relies on the global `ThemeDecorator` → viewable across all 7 themes.
- [x] `index.ts`: `export { ProgressRing } from './ProgressRing'`.
- [x] Tests: 0/50/100% via `test.each`; clamping; a11y role + value; center labels rendered (7 tests pass).

### Step 2: GoalsCockpit presentational view + story (PR A)

**Files**: `src/screens/GoalsScreen/{GoalsCockpit.tsx, GoalsCockpit.styles.ts, GoalsCockpit.stories.tsx, __tests__/GoalsCockpit.test.tsx}` (new); `src/i18n/resources/en/goals.json`, `_register/goals.yml`

**Commit**: `feat(native-rd): build GoalsCockpit presentational view + story`

**Changes**:

- [ ] `GoalsCockpit.tsx` — pure component, **no `useQuery`/`useNavigation`**. Props: `hero` (title, nextStepTitle, progress 0–1, stepsCompleted, stepsTotal), `keepWarm[]` (title, nextStep, progress), `onStartResume(goalId)`, `onOpenGoal(goalId)`, `onNewGoal()`.
- [ ] Hero card: `ProgressRing` centered; "DO THIS NEXT · <title>" overline (DM Mono caps); next-step headline; single Start/Resume `Pressable`. **Label: `stepsCompleted === 0` → "Start" (incl. no-steps), else "Resume"** (D6). Card bg `theme.surfaceBorder.surfaceCardBg`; shadow `shadowStyle(theme, 'hardLg')` (valid keys `hardSm`/`hardMd`/`hardLg` — **no `cardElevation`**).
- [ ] Hero is the ONLY start/resume affordance — no FAB, no header button (S3 coherence; inline comment `// S3 coherence: single resume affordance — see #381`).
- [ ] "KEEP WARM" section: compact cards for `keepWarm[]` (title + next-step snippet + mini `ProgressBar`); tap → `onOpenGoal`. "+ New goal" ghost button → `onNewGoal`.
- [ ] Empty state (no hero): reuse `EmptyState` with existing `goals:emptyState.*` keys.
- [ ] i18n: add `cockpit.doThisNext`/`start`/`resume`/`keepWarm` to **`en/goals.json` only**; register in `_register/goals.yml`. `de/` + `pseudo/` are generated (D11).
- [ ] `GoalsCockpit.stories.tsx` (CSF3, mock props): `Populated` (hero + 2 keep-warm), `HeroOnly`, `ResumeState` (stepsCompleted>0), `Empty`. Viewable across all 7 themes.
- [ ] Tests: Start vs Resume by `stepsCompleted`; keep-warm renders N−1; callbacks fire; empty state. All colors from theme tokens.

### Step 3: GoalsScreen thin container (PR A)

**Files**: `src/screens/GoalsScreen/GoalsScreen.tsx`, `__tests__/GoalsScreen.test.tsx`

**Commit**: `feat(native-rd): wire GoalsScreen container to cockpit`

**Changes**:

- [ ] Slim `GoalsScreen.tsx` to a container: `useQuery(activeGoalsQuery)` **reordered to rank by latest step activity** (D2 — not `createdAt`); hero = rank 0, `keepWarm` = the rest. Compute `progress`/`stepsCompleted`/`nextStepTitle` per goal (reuse existing step logic). Map to `GoalsCockpit` props; wire `onStartResume`/`onOpenGoal` → `FocusMode`, `onNewGoal` → `NewGoal`.
- [ ] Remove the old `GoalList` FlatList layout + styles (presentational bits now live in `GoalsCockpit`).
- [ ] Update `GoalsScreen.test.tsx`: query rows → cockpit props mapping; hero = most-recently-worked; navigation wiring; existing sub-step/delete tests still pass. (Heavy visual assertions now live in `GoalsCockpit.test.tsx`.)

### Step 4: BadgeCircleCell primitive + story (PR B)

**Files**: `src/components/BadgeCircleCell/{BadgeCircleCell.tsx, BadgeCircleCell.styles.ts, BadgeCircleCell.stories.tsx, index.ts, __tests__/BadgeCircleCell.test.tsx}` (all new)

**Commit**: `feat(native-rd): add BadgeCircleCell primitive + story`

**Changes**:

- [ ] `BadgeCircleCell.tsx` (D8): 60×60 circular cell rendering badge image/design (via `BadgeRenderer`) or initial. Props `badge`, `onPress`. `accessibilityRole="button"` + label; 44×44pt min touch target; colors from theme tokens.
- [ ] `BadgeCircleCell.stories.tsx` (CSF3): single cell + a row of cells; viewable across all 7 themes.
- [ ] Tests: renders badge content; `onPress` fires; a11y label present.

### Step 5: BadgesWall presentational view + story + 7-theme check (PR B)

**Files**: `src/screens/BadgesScreen/{BadgesWall.tsx, BadgesWall.styles.ts, BadgesWall.stories.tsx, __tests__/BadgesWall.test.tsx}` (new); `src/i18n/resources/en/badges.json`, `_register/badges.yml`

**Commit**: `feat(native-rd): build BadgesWall presentational view + story`

**Changes**:

- [ ] `BadgesWall.tsx` — pure component, **no `useQuery`/`useNavigation`**. Props: `count`, `spotlight` (badge + goal title + earnedAt), `gallery[]` (rows[1..]), `onOpenBadge(id)`.
- [ ] Layout: header (count + "A WALL OF PROOF · ALL VERIFIABLE" overline); spotlight card; dense gallery (`FlatList` `numColumns`, `BadgeCircleCell`, **all badges, no cap / "+N MORE"** — D9).
- [ ] Wall bg: `theme.chrome.badgeWallBg ?? '#161616'` with `// TOKEN-RISK: verify 7-theme render — if black doesn't adapt, add theme.chrome.badgeWallBg`.
- [ ] Spotlight glow: `Animated.loop` **only when `animationPref === 'full'`** (D10); no glow in reduced/none.
- [ ] Empty state: `EmptyState` with `badges:empty.*` keys; CTA → Goals tab.
- [ ] i18n: `wall.count`/`wall.allVerifiable`/`wall.justEarned` to **`en/badges.json` only** (no `wall.moreCount` — D9); register. `de/` + `pseudo/` generated (D11).
- [ ] `BadgesWall.stories.tsx` (CSF3): `Populated` (spotlight + ~15 gallery), `SingleBadge`, `Empty`, and an **`AllThemesMatrix`** story rendering the wall surface ×7 labelled by theme (precedent: `src/stories/design-system/Colors.stories.tsx`).
- [ ] **7-theme token check (D4/D13)**: run `bun run storybook:web`, open the `BadgesWall` story, flip the theme toolbar through all 7 (or use `AllThemesMatrix`). Verify near-black bg + count text + badge content readable in each. **Record findings in the Discovery Log.**
  - Adapts cleanly in all 7 → keep `#161616`, drop the `??` accessor, no token.
  - Fails any theme → do Step 7 (token) before merging PR B.
- [ ] Tests: count header; spotlight = `spotlight` prop; gallery renders all; empty state.

### Step 6: BadgesScreen thin container (PR B)

**Files**: `src/screens/BadgesScreen/BadgesScreen.tsx`, `__tests__/BadgesScreen.test.tsx`

**Commit**: `feat(native-rd): wire BadgesScreen container to wall`

**Changes**:

- [ ] Slim `BadgesScreen.tsx` to a container: `useQuery(badgesWithGoalsQuery)` (already `createdAt DESC`); `spotlight = rows[0]`, `gallery = rows[1..]`, `count = rows.length`. Map to `BadgesWall` props; wire `onOpenBadge` → `BadgeDetail`.
- [ ] Remove old `BadgeList` FlatList layout.
- [ ] Update `BadgesScreen.test.tsx`: query rows → wall props mapping; navigation wiring; empty state. (Visual assertions live in `BadgesWall.test.tsx`.)

### Step 7 (conditional): Add badge-wall surface token if the 7-theme check fails (PR B)

**Files** (only if Step 5's 7-theme check shows a problem): `packages/design-tokens/src/tokens/chrome.json`; the `packages/design-tokens/src/themes/*.json` variants needing a non-default value; `packages/design-tokens/build-unistyles.js`; `apps/native-rd/src/themes/adapter.ts` (if a new export type is needed).

**Commit**: `feat(design-tokens): add badge-wall surface token for 7-theme safety`

**Changes**:

- [ ] Add `badge-wall-bg` to `src/tokens/chrome.json` with default `#161616` and a `$description`.
- [ ] Author per-theme overrides only where needed. The light default needs none; already-dark variants may need a slight lighten; dyslexia cream / autismFriendly muted may need a dark-but-not-full-black value.
- [ ] Register `badge-wall-bg` in the Chrome category in `build-unistyles.js` (mirror `screen-header-bg` from F2).
- [ ] `bun run build` in `packages/design-tokens` to regenerate `build/unistyles/`.
- [ ] Update `BadgesWall.styles.ts` to use `theme.chrome.badgeWallBg` directly (remove the `#161616` fallback / `??` accessor from Step 5).
- [ ] Follows the F2 (#376) pattern exactly — see `apps/native-rd/docs/plans/dev-plans/issue-376-tokens-redesign-contract.md`.

## Testing Strategy

- [ ] `ProgressRing`: 0/50/100% via `test.each`; a11y role + value; center labels (Jest 30, `@testing-library/react-native` v13).
- [ ] `BadgeCircleCell`: renders content; `onPress`; a11y label.
- [ ] `GoalsCockpit` (presentational): Start vs Resume by `stepsCompleted`; keep-warm count; callbacks; empty state.
- [ ] `BadgesWall` (presentational): count; spotlight; gallery renders all; empty state.
- [ ] `GoalsScreen` / `BadgesScreen` (containers): query rows → props mapping; hero = most-recently-worked; navigation wiring; existing tests still pass.
- [ ] Test files mirror `src/` under `__tests__/`.
- [ ] **7-theme check** on the `BadgesWall` **web Storybook** story (`bun run storybook:web`) via the theme toolbar / `AllThemesMatrix`; record in Discovery Log before deciding on the token.
- [ ] Stories build clean: `bun run storybook:web:build`.

## Not in Scope

| Item                                                                  | Reason                                                                                                       | Follow-up          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------ |
| Bottom Nav redesign (S3)                                              | Separate issue #379; this issue owns the resume affordance contract, S3 implements the nav                   | #379               |
| Sort/filter controls on badge gallery                                 | Not in prototype spec for this screen                                                                        | None filed         |
| Animated glow pulse on spotlight card in all animation modes          | Glow is `full` mode only; `reduced`/`none` skip animation per existing `useAnimationPref` pattern            | None filed         |
| Redesigned FocusPillTabBar                                            | S3's responsibility                                                                                          | #379               |
| Token addition for `badge-wall-bg` pre-authored                       | Explicit instruction: discover during implementation                                                         | Conditional Step 7 |
| Per-story Evolu mock-data decorator (storying full screens with data) | Not needed — presentational components carry the storyable UI; containers verified in-simulator              | None filed         |
| "Set BC" (dependency/date scheduling)                                 | ADR-0010/0012 net-new feature epic                                                                           | Separate epic      |
| Pin a goal to override the cockpit hero                               | Net-new feature (schema column + mutation + affordance); this PR ships the most-recently-worked default only | #396               |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-28] **Step 1 — ProgressRing center-text token deviation.** Plan specified `theme.chrome.screenHeaderFg` for the ring's center text. Used `theme.colors.text` (label) / `theme.colors.textMuted` (sublabel) instead. Rationale: `ProgressRing` is a generic `src/components/` primitive and must not couple to a chrome/header-specific token; it renders inside the hero _card_ (surface `surfaceCardBg`), where `colors.text` is the intended, contrast-guaranteed foreground pairing across all 7 themes. Still zero hardcoded hex.
