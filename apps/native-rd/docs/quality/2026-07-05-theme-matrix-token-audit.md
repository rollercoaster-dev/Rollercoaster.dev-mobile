# Theme-matrix vs. non-themeable-token audit — epic #384

**Date:** 2026-07-05
**Scope:** the 13 epic #384 components/screens that ship an `AllThemesMatrix` (or equivalent "all 7 themes") Storybook story.
**Method:** read each component's `.tsx` + `.styles.ts` (+ helpers) and its `.stories.tsx`; classified the matrix idiom; grepped the real source (not stories) for non-themeable colors; verified the highest-severity findings first-hand and against the design-tokens build output.

---

## Post-implementation update — 2026-07-05

The recommendations below were implemented and **browser-verified** (all 7 themes, Storybook-web :6006). This section supersedes the pre-rewrite classifications in the findings/appendix that follow — those are kept as the analysis trail.

**Matrix conversions (rec. #2).** The idiom-B reconstructions (TimelineStep, TimelineBreakdownBar, TimelineNode) and the HIGH-2 "null matrix" (SettingsDensityRows) were converted to real per-cell `<ScopedTheme>` renders; EvidenceTypePicker / FocusCurrentTaskCard gained per-theme stories for their previously-uncovered modes/states; BadgeWallCell and the Focus family were already honest (prop-driven `<ScopedTheme>`) and are unchanged. So HIGH-2 (SettingsDensityRows "null matrix") is **resolved**, not a live issue anymore. Caveat: a `<ScopedTheme>` matrix is honest only for a component that never re-renders after mount — **TimelineStep re-renders once its expand/collapse chevron is tapped**, so its matrix is trustworthy only at rest (initial paint verified correct per theme); tapping to expand reverts that cell to the active theme.

**EditGoalView (MEDIUM-1) — root cause was misdiagnosed.** It is _not_ a "null matrix" and _not_ the `useUnistyles` styling trap — EditGoalView is styled with `StyleSheet.create` like the working TimelineStep. The real cause: **EditGoalView re-renders after mount** (`useAnimationPref` + its AccessibilityInfo screen-reader/reduce-motion probes resolve async and `setState`). On web, `<ScopedTheme>` applies the scope **only during the initial render pass**; any later re-render recomputes `StyleSheet.create` styles against the _active_ global theme, so all 7 cells silently revert. This is an inherent web limitation of `<ScopedTheme>` for re-rendering components — a matrix is honest only for a component that is pure prop-driven and never re-renders after mount (TimelineNode, the Focus family, BadgeWallCell, and the converted reconstructions viewed at rest).

**Resolution:** EditGoalView **and BadgesWall** render a single instance + a note directing reviewers to the **theme toolbar** (which sets the global theme — the component honours it correctly, verified in dark-default). BadgesWall re-renders post-mount too — it measures its width via `onLayout` (`setSurfaceWidth`) and calls `useAnimationPref` — so a per-cell matrix reverted its per-theme `accentPurpleFg` fallback ink; that ink is now verified honestly in BadgeWallCell's (prop-driven) `AllThemesMatrix` instead, with BadgesWall's own fallback tiles left as a single-state `NullDesign` story for toolbar review. A live per-cell 7-up is not achievable for these on web without an iframe-per-theme approach (deferred; not built).

**Latent risk this exposes:** the inline-`ScopedTheme` matrix pattern is silently fragile — BadgesWall (post-mount `onLayout` + `useAnimationPref`) and TimelineStep (expand/collapse) already re-render, which is why both use the toolbar treatment rather than a live per-cell matrix. Any currently-honest matrix that later gains a post-mount re-render (e.g. wiring real data/subscriptions at [Integrate]) will revert to the active theme the same way, with no error. A future robustness pass could move matrices to iframe-per-theme; not scoped here.

**Token fixes (rec. #1, #4, #5) — shipped and gate-clean.** `palette.white` → `theme.colors.accentPurpleFg` (HIGH-1) in BadgeCard, BadgeWallCell, BadgesWall; `palette.yellow300` → `theme.colors.accentYellow` (+ `accentYellowFg` ink for the goal node) across 7 sites (the 6 goal-accent styles enumerated in the LOW finding plus `CompletionFlowScreen.styles.ts`, which was migrated too); BadgesWall's intentional fixed-dark colors hoisted behind one documented `eslint-disable` block; `no-raw-colors` hardened to cover screens + `palette.*` member expressions. `type-check` clean, `eslint` on all `*.styles.ts` = 0 errors, rule test 10/10 (4 valid + 6 invalid `RuleTester` cases).

---

## TL;DR

The premise is real, but it splits into **two separate problems that happen to co-occur**, and the "theme matrix only covers one part" problem is the widespread one:

1. **Partial / fake theme matrices** — several `AllThemesMatrix` stories only exercise _part_ of the component, or don't actually re-theme the component at all, while their doc-comments claim "verifiable across all 7 themes." This is the "matrix on only one part" pattern, and it's in ~7 of the 13.
2. **Non-themeable tokens in the component itself** — narrower than it looks. Only **one** is a live bug: `palette.white` painted on a per-theme `accentPurple` background (a WCAG-AA contrast failure in 4 of 7 themes). The other non-themeable usage is either a documented intentional pin (`palette.yellow300` goal accent — latent, currently harmless) or the intentional fixed-dark BadgesWall surface.

There are **four** matrix idioms in play; only two are correct:

| Idiom                                     | What it does                                                                                                                   | Correct?                         | Where                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------- |
| **D — prop-driven preview**               | component takes `themeId`, renders that theme's tokens                                                                         | ✅ reference impl                | ThemeSampleCard                                                      |
| **A — `ScopedTheme` real render ×7**      | wraps the real reactive component in `<ScopedTheme name={id}>` per cell                                                        | ✅ correct                       | Focus family, BadgeWallCell, BadgesWall, EvidenceTypePicker(partial) |
| **B — static reconstruction of a slice**  | hand-paints look-alike cells from `themes[name]`; covers one visual element                                                    | ⚠️ partial (faithful but narrow) | Timeline family                                                      |
| **C — framed-but-unthemed "null matrix"** | outer cell tinted per theme, but the real reactive component inside renders the _active_ theme only → identical in all 7 cells | ❌ misleading                    | SettingsDensityRows, EditGoalView, SettingsThemeSection (chrome)     |

Root cause of how it shipped: the `no-raw-colors` lint rule can't see `palette.*` (it only checks string literals) and doesn't run on screens or `.tsx` files; and the matrix idiom was copy-pasted by comment ("Mirrors ThemeSampleCard's matrix") from a component where it works to components where it doesn't.

---

## Findings, ranked by severity

### 🔴 HIGH-1 — `palette.white` on a per-theme `accentPurple` tile: WCAG-AA contrast failure (real bug)

The "undesigned badge" placeholder renders a lavender/purple tile (`backgroundColor: theme.colors.accentPurple`) with a white initial/letter (`color: palette.white`). `accentPurple` varies per theme, and the **designed ink token `accentPurpleFg` already exists** — it is dark (`#0a0a0a`) in `light-default`, `dark-default`, `dyslexia`, and `autismFriendly`, and white only in `highContrast`/`lowVision`/`lowInfo`. Hardcoding white means the text fails contrast in **4 of the 7 themes**.

Computed white-on-`accentPurple` (from `packages/design-tokens/build/unistyles`):

- `light-default` `#a78bfa` → **≈2.72:1** (fails AA 4.5:1 and AA-large 3:1)
- `dark-default` `#c4b5fd` → **≈1.85:1** (fails)
- fix (`accentPurpleFg` `#0a0a0a`) → ≈6.8:1 / ≈10:1

Copy-paste family (all three the same bug):

- `src/components/BadgeWallCell/BadgeWallCell.styles.ts:30` — `fallbackText` (rendered in the matrix, second cell per column — the matrix _shows_ it but nobody flagged it)
- `src/screens/BadgesScreen/BadgesWall.styles.ts:135` — `spotlightArtFallbackText` (null-design spotlight branch — **never rendered in any story**, so totally unverified)
- `src/components/BadgeCard/BadgeCard.styles.ts:44` — `initialsText` (the ancestor this was copied from; not an epic-#384 file but the same defect)

**Fix:** `color: palette.white` → `color: theme.colors.accentPurpleFg` in all three. This is the clearest instance of the user's exact complaint: a non-themeable token used for the component's own text where the theme provides the correct token, and a matrix that renders it without catching it. Given the app targets WCAG 2.1 AA for ND users, treat this as ship-blocking.

### 🔴 HIGH-2 — `SettingsDensityRows` `AllThemesMatrix` is a "null matrix"

`src/components/SettingsDensityRows/SettingsDensityRows.stories.tsx:36-63`. The story maps over the 7 themes, tints each outer `<View>` with `themes[id].colors.backgroundSecondary`, labels it with the theme id — and renders `<SettingsDensityRows />` inside. But `SettingsDensityRows` has **no `themeId` prop and no per-theme mechanism** (its `.styles.ts` is an empty `StyleSheet.create({})`; it composes `SettingsSection`/`SettingsRow`, both reactive). So the component renders **byte-identical in all 7 cells** — only the decorative frame differs. The doc-comment claims "section chrome, row borders, and ✓ marker are verifiable across all 7 themes," which is materially false, and unlike the sibling components there is **no caveat**. This is the purest "matrix on only one part (the frame)" case.

**Fix:** wrap the real component per cell in `<ScopedTheme name={id}>` (the proven pattern — see BadgesWall / Focus family), or drop the story's coverage claim.

### 🟠 MEDIUM-1 — `EditGoalView` `AllThemesMatrix`: framed-but-unthemed + narrow

`src/components/EditGoalView/EditGoalView.stories.tsx:288-315`. Same idiom as HIGH-2 (frame tinted per theme, real `EditGoalStepRow` inside renders the active theme only → identical across cells) — but it is **self-disclosed** ("Switch the Storybook theme toolbar to re-render the rows"), which lowers the false-green risk. It also only shows the **step-row anatomy**; the goal-title card, description, add-step row, dates banner, footer/Done, overflow menu, and the sub-step mint rail are never in any per-theme matrix. Source is token-clean (the flagged `#d4f4e7` mint comment resolves to `theme.colors.accentMint`).

**Fix:** `ScopedTheme` per cell + widen the fixture, or split into per-section matrices.

### 🟠 MEDIUM-2 — `BadgesWall` matrix skips the branches that carry the bugs

`src/screens/BadgesScreen/BadgesWall.stories.tsx:129-153` correctly uses `ScopedTheme` to render the real wall ×7. But it hardcodes `count={6}` + a designed spotlight + `MATRIX_GALLERY = GALLERY.slice(0,5)` (all designed), so it **never renders**: the empty state (`count===0`: ghost badge, CTA — `palette.gray*`/`palette.black`), the null-design spotlight fallback (which contains HIGH-1's `spotlightArtFallbackText`), or the gallery's undesigned fallback tile. Also worth knowing: because the surface is intentionally fixed-dark, only the `celebrationBg`-driven accents actually differ across columns, and those are pixel-identical in 4 of 7 themes — so the matrix visually "proves" less than it appears to.

**Fix:** add empty-state and null-design columns (or separate stories) so every branch is theme-checked.

### 🟠 MEDIUM-3 — `TimelineStep` matrix reconstructs only the header pill

`src/components/TimelineStep/TimelineStep.stories.tsx:323-359` (idiom B). Faithfully paints the state-word pill from `stepStateNodeBg/Fg`, but omits the title, chevron, C·B metadata band, evidence section, content-card chrome, the whole child sub-spine, and the nested `<TimelineNode>` — behind a comment that reads as "all 4 states × 7 product themes." Source is token-clean, so there is no live bug today; the risk is a large untested surface behind an overbroad coverage claim.

**Fix:** replace the reconstruction with a `ScopedTheme`-wrapped real `<TimelineStep>` ×7.

### 🟡 LOW — the rest

- **`EvidenceTypePicker`** (`stories.tsx:131-159`) — `ScopedTheme` around the real `CaptureSheetBody`, but only the **capture** mode; the default **authoring / chip-grid** mode never appears in the matrix. Source token-clean. Coverage claim overbroad; low real risk.
- **`SettingsThemeSection`** — mixed: the nested `ThemeSampleCard` adapts correctly (idiom D), but the `SettingsSection` chrome is stuck on the active theme. The limitation is documented in the component source (not in the story text). Token-clean.
- **`TimelineNode`** (`stories.tsx:213-254`) & **`TimelineBreakdownBar`** (`stories.tsx:137-166`) — idiom B, faithful reconstructions of the node circle / bar track; omit the goal node, state badge, legend, and card chrome. Notable: TimelineBreakdownBar (#451) is _newer_ than the `ScopedTheme` adoption (#408) yet still hand-reconstructs — the anti-pattern persisted after the correct tool existed.
- **`palette.yellow300`** goal/finish accent — hardcoded in `TimelineNode.styles.ts:29`, `FinishLine.styles.ts:21,42`, `EvidenceDrawer.styles.ts:33,61`, `EvidenceItem.styles.ts:20`, `GoalEvidenceCard.styles.ts:11`, `ViewerStripThumb.styles.ts:36`. A themeable `theme.colors.accentYellow` (+ `accentYellowFg` ink) exists, but it currently resolves to the **same `#ffe50c`** in all 7 themes, so this is **latent, not a live bug**. Documented as an intentional pin (dev-plan #406, readiness review), tracked by #420. Migrating to the token would remove the latent risk and wire the contrast-tested ink pairing.
- **`BadgesWall` fixed-dark surface** (`#161616` at `BadgesWall.styles.ts:36`, plus `palette.gray*`) — **intentional and documented** (#404 D5/D13). Not a defect.

### ✅ Clean

- **`ThemeSampleCard`** — the reference done-right (prop-driven, `themeId` threaded through `previewStyles`). Every cell honestly renders that theme.
- **`FocusCurrentTaskCard` / `FocusParkedState` / `FocusProgressStrip`** — all use `ScopedTheme` real-render; source fully token-routed. (One minor coverage note: FocusCurrentTaskCard's matrix only exercises `in-progress`, so the metadata-band glyph hues and paused/completed pill colors aren't demonstrated — a coverage nit, not a bug.)

---

## Root cause

1. **The `no-raw-colors` lint rule has two blind spots** (`src/eslint-rules/no-raw-colors.js`):
   - It only inspects string **literals** and template literals → `palette.yellow300`, `palette.white`, `palette.gray800` (member expressions) are **invisible** to it. Every `palette.*` non-themeable usage passes lint clean.
   - It only runs on files matching `*.styles.ts` **under `/components/`** (rule body lines 26-33) → **screens are entirely exempt** (that's why `BadgesWall`'s `#161616` literal needs no disable comment) and `.tsx` files (e.g. `BadgesWall.tsx:78 fill={palette.gray500}`) are unchecked.
2. **Idiom copied by reference, not by mechanism.** "Mirrors ThemeSampleCard's matrix" was copied from a _prop-driven_ component (where per-theme rendering works) onto _reactive_ components (where it can't without `ScopedTheme`), producing the null matrices.
3. **The static-reconstruction pattern outlived its need.** `ScopedTheme` (proven from #408 onward) renders the real component per theme; the Timeline family still hand-reconstructs, including a component (#451) authored after `ScopedTheme` was standard.

---

## Recommendations (in priority order)

1. **Fix HIGH-1 now** — `palette.white` → `theme.colors.accentPurpleFg` in `BadgeWallCell.styles.ts:30`, `BadgesWall.styles.ts:135`, `BadgeCard.styles.ts:44`. ~3-line change; resolves a real AA failure in 4 themes.
2. **Convert the null/partial matrices to `ScopedTheme` real-render** — SettingsDensityRows (HIGH-2), EditGoalView, SettingsThemeSection chrome, and the Timeline family. One idiom, proven, kills both the coverage gap and any reconstruction-drift risk.
3. **Add missing render-path columns** — BadgesWall empty + null-design; EvidenceTypePicker authoring mode; FocusCurrentTaskCard paused/completed/metadata.
4. **Migrate `palette.yellow300` → `theme.colors.accentYellow`** (+ `accentYellowFg`) across the 6 goal-accent sites to remove the latent risk (or close #420 with an explicit "stays pinned" decision).
5. **Harden `no-raw-colors`** — flag `palette.*` member expressions, and extend the rule scope to `.tsx` and `/screens/` (with justified `eslint-disable` for the intentional BadgesWall dark surface). Without this, the next hardcode lands the same way.

---

## Appendix — full classification

| Component (issue)           | Matrix idiom             | Coverage                             | Non-themeable token                                              | Severity                            |
| --------------------------- | ------------------------ | ------------------------------------ | ---------------------------------------------------------------- | ----------------------------------- |
| BadgeWallCell (#403)        | A ScopedTheme ×7         | both branches                        | `palette.white` on accentPurple `:30`                            | 🔴 HIGH                             |
| BadgesWall (#404)           | A ScopedTheme ×7         | populated only; skips empty/fallback | `palette.white` on accentPurple `:135`; intentional dark surface | 🔴 HIGH (token) / 🟠 MED (coverage) |
| SettingsDensityRows (#415)  | C null matrix            | nothing varies per theme             | none                                                             | 🔴 HIGH                             |
| EditGoalView (#445)         | C null (self-disclosed)  | row anatomy only                     | none                                                             | 🟠 MED                              |
| TimelineStep (#407)         | B reconstruction         | header pill only                     | none                                                             | 🟠 MED                              |
| EvidenceTypePicker (#409)   | A ScopedTheme (sub-part) | capture mode only                    | none                                                             | 🟡 LOW                              |
| SettingsThemeSection (#415) | D + C mixed              | card yes, chrome no                  | none                                                             | 🟡 LOW                              |
| TimelineNode (#406)         | B reconstruction         | 4 node states                        | `palette.yellow300` goal (latent)                                | 🟡 LOW                              |
| TimelineBreakdownBar (#451) | B reconstruction         | bar track only                       | none                                                             | 🟡 LOW                              |
| FocusCurrentTaskCard (#408) | A ScopedTheme ×7         | in-progress only                     | none                                                             | 🟡 LOW (coverage nit)               |
| FocusParkedState (#450)     | A ScopedTheme ×7         | complete                             | none                                                             | ✅                                  |
| FocusProgressStrip (#450)   | A ScopedTheme ×7         | complete                             | none                                                             | ✅                                  |
| ThemeSampleCard (#413)      | D prop-driven            | complete                             | none                                                             | ✅ reference                        |
