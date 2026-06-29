# Full Ride redesign — re-scope into shippable, Storybook-gated issues

**Date:** 2026-06-29
**Epic:** [#384 — Full Ride redesign](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/384)
**Supersedes the scope of:** #377, #378, #380, #382 (repurposed below)
**Source design:** `apps/native-rd/prototypes/screen-redesign/` + [`2026-06-26-full-ride-redesign-handoff.md`](./2026-06-26-full-ride-redesign-handoff.md)
**Status:** DRAFT — awaiting Joe's sign-off before issue creation.

---

## Why re-scope

The original epic sized work as one issue per screen. Two problems showed up shipping the first screens:

1. **One issue can span two screens.** #381 was titled _"Goals + Badges: cockpit + wall-of-proof."_ It split into PR A (Goals) and PR B (Badges). PR A merged (#398) and **#381 was closed as COMPLETED — PR B was never built, and no open issue tracks the Badges wall-of-proof.** Bundling two screens didn't just make a big PR; closing the bundled issue **orphaned half the work.** Recovering that lost Badges work is Track A below.

2. **The Storybook-first habit isn't enforced.** #398 _did_ build `ProgressRing` + `GoalsCockpit` story-first before wiring `GoalsScreen` (it's decision **D12/D13** in the #381 dev plan). But nothing in the issue structure _requires_ it. This re-scope makes the gate a literal dependency edge.

Neither problem is a discipline failure — both are scoping failures. The fix is smaller issues with the verification gate encoded in the dependency graph.

## Rules this plan enforces

- **One issue = one shippable change.** No issue spans two screens.
- **Every PR ≤ ~500 LOC** (incl. stories + tests; i18n keys and generated `de/`/`pseudo/` locale files don't count against the budget — see #381 dev-plan D11).
- **Storybook-verify before app integration.** Every net-new or re-skinned presentational component ships + verifies in **web Storybook across all 7 themes** in its own issue. The screen container that imports it is a _separate_ issue, `blocked-by` the component issues. A screen cannot be "built into the app" until its parts are green in Storybook.

## The two issue types

Every screen redesign decomposes into these. The architecture is the one already established in #381 (D12): a **pure, prop-driven presentational view** + a **thin container** (`useQuery` + navigation → props).

### `[Storybook]` component issue

- **Contains:** one presentational component — `<Name>.tsx` + `.styles.ts` + `.stories.tsx` + `__tests__/<Name>.test.tsx`. Re-skins update an existing component + its story; net-new ones add the dir.
- **No app wiring.** The component is not imported by any screen yet.
- **Acceptance:**
  - [ ] Renders correctly across all 7 product themes in **web Storybook** (theme toolbar or an `AllThemesMatrix` story). The 7 product themes map to the toolbar entries `light-default` (Full Ride), `dark-default` (Night Ride), `light-highContrast` (Bold Ink), `light-dyslexia` (Warm Studio), `light-autismFriendly` (Still Water), `light-lowVision` (Loud & Clear), `light-lowInfo` (Clean Signal).
  - [ ] Zero hardcoded hex — colors/spacing/shadow from `theme.*` tokens only.
  - [ ] ND/a11y norms: 44pt min touch targets, accessibility labels/roles.
  - [ ] Unit tests pass; **not yet imported by any screen.**
- **Typical size:** 150–300 LOC.

### `[Integrate]` issue

- **Contains:** slim the screen to a thin container — `useQuery` + navigation, pass props to the verified view. Update container tests.
- **`blocked-by` every component issue in its track.** This is the gate.
- **Acceptance:**
  - [ ] All presentational parts were verified in Storybook first (their issues are closed).
  - [ ] PR is wiring + queries + nav only — no un-storied UI introduced.
  - [ ] In-app spot check across Full Ride + Night Ride + one shadow-off theme.
- **Typical size:** 250–500 LOC.

---

## Issue set

`N/R` = **N**ew component dir vs **R**e-skin of an existing (most re-skin targets already have stories — noted). LOC is an estimate incl. story + tests. F-tokens (#375/#376) are closed, so screen work is unblocked except where a row names a blocker.

### Track A — Recover the orphaned Badges wall (was #381 PR B; currently untracked)

> **Highest priority** — this work is designed, planned (#381 dev-plan Steps 4–7), and lost from the board. File fresh under #384.

| Key | Type          | Title                             | Scope                                                                                                                                                                                                  | N/R | ~LOC | Blocked by |
| --- | ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ---- | ---------- |
| A1  | `[Storybook]` | `BadgeWallCell` primitive + story | 60px gallery cell: renders each badge in its OWN shape (circle/shield/star/hexagon) via `BadgeRenderer` — no circular clip; rounded-square initial fallback; `accessibilityRole="button"`, 44pt target | NEW | 200  | —          |
| A2  | `[Storybook]` | `BadgesWall` view + story         | Count header + "Just earned" spotlight + dense `FlatList` gallery (`numColumns`) + empty state. `AllThemesMatrix` story resolves the dark-wall token risk (D4)                                         | NEW | 300  | A1         |
| A3  | `[Integrate]` | `BadgesScreen` thin container     | `useQuery` → `BadgesWall` props + nav to `BadgeDetail`; container tests                                                                                                                                | —   | 150  | A2         |

**Conditional (do not pre-file):** if A2's matrix shows full-black (`#000`/`#161616`) doesn't adapt in some theme, file a `badgeWall` per-theme surface token issue _then_ (epic: "don't pre-author the token"). Drop the prototype's `wall.moreCount` / "+N MORE" (D9 — wall = density, no cap).

### Track B — Timeline (repurposes #378 → its `[Integrate]` issue)

| Key      | Type          | Title                                     | Scope                                                                                                                                                                                                                                    | N/R | ~LOC | Blocked by |
| -------- | ------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ---------- |
| B1       | `[Storybook]` | `TimelineNode` — one state-color language | Drop hardwired `palette.blue600`; node bg/border/text from the F0 state map (pending/in-progress/paused/completed) matching StepCard pill; add state-word badge. _Has a story already — update it._                                      | R   | 150  | F0 †       |
| B2       | `[Storybook]` | Timeline metadata band + substeps         | Inline E·C·B (state glyph · "after…" / "due…" facts) + evidence chips + one level of substeps. Touches `TimelineStep` (has story) / `TimelineEvidenceCard` (no story — add one). No "blocked by" language; dates factual, no red/overdue | R   | 250  | F0 †       |
| **#378** | `[Integrate]` | Timeline assembly (repurposed)            | Assemble reconciled nodes + metadata + `FinishLine` into `TimelineJourneyScreen`; node-tap → Focus nav. Retitle/rescope #378 body to this                                                                                                | —   | 300  | B1, B2     |

### Track C — Focus Mode (repurposes #377; its documented a/b/c become real issues)

> The single biggest move: `FocusModeScreen.tsx` is **793 lines** stacking `MiniTimeline` + `ProgressDots` + `CardCarousel` + `EvidenceDrawer`.

| Key      | Type          | Title                           | Scope                                                                                                                                                                                                                                            | N/R | ~LOC | Blocked by       |
| -------- | ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ---- | ---------------- |
| C1       | `[Storybook]` | Current Task Card view          | One-task hero: title + state pill + inline E·C·B band + evidence-required label; variants for paused and all-steps-complete                                                                                                                      | NEW | 300  | F0 †             |
| C2       | `[Storybook]` | Evidence-type picker sheet      | 6-type picker button + modal sheet; "change" affordance                                                                                                                                                                                          | NEW | 250  | —                |
| **#377** | `[Integrate]` | Focus Mode rebuild (repurposed) | Mount C1 + C2 + progress chip; **delete** `MiniTimeline`/`ProgressDots`/`CardCarousel`/`EvidenceDrawer` usage; auto-advance stays happy path; "See all steps" → Timeline. Retitle/rescope #377 to this; drop the a/b/c PR note (now real issues) | —   | 450  | C1, C2, **#378** |

_Folded #377c (See-all-steps ↔ Timeline handoff) into the integration issue — it's pure navigation, and the Timeline target (#378) is now an explicit blocker so the handoff lands against a finished screen._

### Track D — Badge Detail (repurposes #380 → its `[Integrate]` issue)

| Key      | Type          | Title                              | Scope                                                                                                                               | N/R | ~LOC | Blocked by |
| -------- | ------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ---------- |
| D1       | `[Storybook]` | Celebration hero header            | Purple band, badge-as-hero (`BadgeRenderer`), verified-credential chip, confetti, ⋯ overflow; undesigned-badge fallback variant     | NEW | 300  | —          |
| D2       | `[Storybook]` | Evidence "proof spine"             | "The proof" section + evidence rows; no-narrative / degraded variants. Show what's present — **never "missing" framing**            | NEW | 200  | —          |
| D3       | `[Storybook]` | Single Share + export sheet        | One primary Share CTA; other exports + demoted Delete in a sheet/overflow                                                           | NEW | 200  | —          |
| **#380** | `[Integrate]` | Badge Detail assembly (repurposed) | Hero + spine + slim About/Details card + share sheet; degraded states (soft-deleted goal hides View timeline). Retitle/rescope #380 | —   | 400  | D1, D2, D3 |

⚠️ **Coordination risk:** `BadgeDetailScreen` has open refactor issues against it — **#342** (extract OB3 parsers + `EvidenceList`), #50, #49, #43, #42. Decide before D4 whether #342's extraction lands first to avoid a merge collision. Not folded into this epic; flagged for sequencing.

### Track E — Welcome (split out of #382)

| Key | Type          | Title                                 | Scope                                                                                                         | N/R | ~LOC | Blocked by |
| --- | ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --- | ---- | ---------- |
| E1  | `[Storybook]` | `ThemeSwatchRail` + `ThemeSampleCard` | Horizontal circular swatches (3-stripe per theme + label) and a live-preview sample card that re-skins on tap | NEW | 250  | —          |
| E2  | `[Integrate]` | `WelcomeScreen` re-skin               | Swatch rail + live preview + hero/copy/CTA; theme switch wiring (already works end-to-end)                    | —   | 250  | E1         |

### Track F — Settings (split out of #382)

| Key | Type          | Title                                        | Scope                                                                                                                                                                                                                                 | N/R | ~LOC | Blocked by |
| --- | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ---------- |
| F1  | `[Storybook]` | Settings theme-picker + density rows re-skin | Reconcile the Settings picker with Welcome; density as three rows (Compact/Default/Comfortable), not a slider. `ThemeSwitcher`/`ThemeChipGrid` exist + have stories → mostly re-skin. Verify across all 7 themes in **web Storybook** | R   | 150  | E1         |
| F2  | `[Integrate]` | `SettingsScreen` re-skin                     | Slim `SettingsScreen` to a thin container mounting the verified picker + density rows; update container tests. No un-storied UI introduced                                                                                            | —   | 150  | F1         |

🎨 **Open design question** (`needs:design`): Settings theme picker = rows or chip grid? Resolve inside **F1** (the `[Storybook]` issue), not now.

> #382 ("Welcome + Settings") is **closed as superseded** by Tracks E + F (it bundled two screens — the same anti-pattern as #381).

### Track F0 — shared foundation (recommended)

| Key | Type          | Title                        | Scope                                                                                                                                                                                                     | ~LOC | Blocks     |
| --- | ------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------- |
| F0  | `[Storybook]` | Step-state → color/label map | One source of truth for the state-color language consumed by StepCard pill, `TimelineNode`, and Focus card, so #378/#377 acceptance ("node == pill == band") is structural. **If trivial, fold into B1.** | 100  | B1, B2, C1 |

> **† Conditional on Open question #1.** F0 is a recommended-but-optional foundation. If it ships as its own issue, B1/B2/C1 are `blocked-by` F0. If it's folded into B1, **B1 builds the state-color map** and B2/C1 are `blocked-by` B1 instead.

### Keep as-is

- **#383** — Redesign-verify. **Re-scope** to the _integrated, in-app_ 7-theme walkthrough + zero-hardcoded-hex grep audit + HITL sign-off. (Per-component theme checks now happen upstream in each `[Storybook]` issue, so this is the end-to-end pass, not the first look.) `blocked-by` all `[Integrate]` issues.
- **#396** — Goals: pin a goal to the cockpit. Unchanged follow-on; `blocked-by` #381 (met).

---

## Totals & shape

- **~17 new issues** replacing 4 oversized ones; **#377/#378/#380** repurposed as their track's integration issue, **#382** closed/superseded, **#383** re-scoped, **#396** unchanged.
- Every PR ≤ ~500 LOC. No issue spans two screens. The Storybook gate is the `blocked-by` edge from each `[Integrate]` issue to its `[Storybook]` issues.
- Orphaned Badges wall-of-proof is back on the board (Track A).

## Suggested ordering

```
wave 0 (optional foundation):  F0 (state-color map)
wave 1 (components, parallel):  A1→A2, B1, B2, C1, C2, D1, D2, D3, E1, F1
wave 2 (recover + cheap wins):  A3 (Badges integrate), #378 (Timeline integrate)
wave 3 (integration):           #377 (Focus, needs #378), #380 (Badge Detail), E2, F2
wave 4 (close-out):             #383 (in-app 7-theme walkthrough + HITL)
follow-on:                      #396 (pin a goal)
```

## Labels (suggested, per repo convention)

- `[Storybook]` issues: `enhancement`, `app:native-rd`, `dep:independent` (or `dep:blocked` if it names a blocker), `size:s`/`size:m`, `order:1`.
- `[Integrate]` issues: `enhancement`, `app:native-rd`, `dep:blocked`, `size:m`, `order:2`/`3`.
- A11y/verify (#383): `accessibility`, `testing`, `hitl`.
- Carry `needs:design` on F1; `type:tech-debt` stays on the Timeline integration (#378).

## Open questions for Joe

1. **F0** — build the shared state-color map as its own tiny issue, or fold into B1 (first consumer)?
2. **#342 sequencing** — land the `BadgeDetailScreen` parser/`EvidenceList` extraction before D4, or after?
3. **Settings form-factor** (rows vs chip grid) — resolve now, or leave `needs:design` on F1?
