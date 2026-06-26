# Full Ride redesign — bring the prototypes into the app

**Date:** 2026-06-26 · **Milestone:** `native-rd: Iteration B` (#4) · **Status:** plan, issues not yet filed

A batch of finished design-exploration prototypes ("Simplify screen layout") has been saved to
`apps/native-rd/prototypes/screen-redesign/`. This doc records what they are, how they map to the
real code, and the milestone/issue plan to implement them. It is written so a fresh agent can pick
up and file the issues without re-deriving the analysis.

---

## 1. What was saved

`apps/native-rd/prototypes/screen-redesign/` (72 files, ~3.1 MB) — the as-received bundle, structure
preserved so each `.dc.html` keeps its relative `support.js` / `tokens/` references and opens in a
browser. It continues the same exploration as the earlier rounds already in
`apps/native-rd/prototypes/` (`welcome-a/b/c`, `C-dependencies`, `E-step-states`, `full-lifecycle`,
`approach-a/b/c`, `badge-designer-a-accordion`).

Two intertwined tracks live in the bundle:

- **Per-screen redesigns** — finished prototypes + their `* Directions.dc.html` audit boards + flow
  maps: `Goals + Badges C`, `Edit Goal C`, `Set BC B`, `Focus Mode A`, `Timeline A`,
  `Finishing Flow A`, `Badge Detail C`, all stitched into `App Shell.dc.html`.
- **Theme/token foundation** — `design_handoff_theme_adaptation/` + `Theme Eval.dc.html`,
  `TokenScreen.dc.html`, `App Shell (token-backed).dc.html`, and `Theme Refactor Prep Spec.md`.
  This is the work to make the redesign run on the real `--ob-*` tokens across all 7 themes.

The `* - Handoff Prompt.md` files are the per-screen design briefs (decisions, locked constraints).
`uploads/` holds the source snapshots that were attached as context (incl. a stale
`FocusModeScreen.tsx` — reference only, not current code).

**These `.dc.html` files are design references, not production code.** "Bring in" = translate the
design intent + token findings into real RN / design-tokens work.

---

## 2. Current code reality (verified 2026-06-26)

The prototypes run ahead of the code in some places and behind it in others:

- **The app is already token-driven.** No hardcoded hex in `FocusModeScreen` / `TimelineJourneyScreen`
  styles — they read from Unistyles / `--ob-*`. The README's "rip out literal hex" step is largely
  already true in the app; the prototypes hardcode, the app doesn't.
- **`packages/design-tokens` already has** `journey.json`, `badge-reward.json`, `chrome.json`, a
  `space` scale, and density is partly wired (`utils/density.ts`, `useDensity.ts`). Density "does
  nothing" was true of the _prototype_, not the app.
- **Focus Mode redesign is NOT built.** `FocusModeScreen.tsx` (793 lines) still stacks
  `MiniTimeline` + `ProgressDots` + `CardCarousel` + `EvidenceDrawer` — exactly the three-navigator
  clutter the redesign strips to one task. Recent PRs (#360, #355) refined that old structure, they
  didn't replace it. **This is the single biggest unbuilt design move.**
- **Token gap confirmed:** there is **no `screen-header` token** anywhere in design-tokens. The purple
  header band is unmodeled.
- **Contrast failures are real and computed** (`Theme Refactor Prep Spec.md` §1): 3 failing (<3:1) +
  14 sub-AA (3–4.5:1) fg/bg cells across 7 themes. The Night Ride App-Shell screenshot
  (`uploads/Screenshot 2026-06-26 at 11.05.58.png`) shows the consequence: dark-on-dark step title
  and metadata band, unreadable.
- **`TimelineNode` color split is real:** the node is hardwired to `palette.blue600`, a different
  language than the StepCard state pill — they disagree even on "completed" (per the Timeline handoff).

---

## 3. On "testing the prototypes with real tokens"

This was the open worry. It splits into two tests with opposite economics:

1. **Contract test — "does a token exist for every visual role the design uses?"** Cheaper before
   coding (the failure mode is hardcoding a missing token mid-screen). **Already substantially done:**
   its output is the Prep Spec contrast list + the gap findings (no `screen-header`, brand-accent on
   neutral gray, hard-shadow not per-theme). You inherit a finding list, not an unknown. This is why
   the token-foundation issues go **first**.
2. **Render-correctness test — "does it actually look right across 7 themes?"** Can only be done
   honestly in React Native (the browser `.dc.html` reading a copied `tokens.css` is a proxy). So it
   **must** happen during/after implementation regardless. The rig already exists:
   `.storybook/preview.tsx`, the `ThemeSwitcher` component, theme persistence, `themes/__tests__/compose.test.ts`.

**Conclusion: fold it into implementation.** Make "renders across the 7 themes, zero hardcoded hex"
an acceptance criterion on every screen issue, and add one close-out verification issue.

---

## 4. The plan — issues under `native-rd: Iteration B`

Mirrors the milestone's existing phase-b convention: an epic + a `dep:foundation, order:1` set that
unblocks a `dep:blocked` set, closed out by a verification issue. Labels drawn from the live taxonomy
(`app:native-rd`, `enhancement`, `type:epic`, `type:tech-debt`, `accessibility`, `testing`,
`needs:design`, `dep:foundation`/`dep:blocked`, `order:N`, `size:s|m|l`, `priority:*`, `hitl`).

### Epic

**`Epic: Full Ride redesign — screens on a real-token foundation`** — labels: `type:epic`,
`app:native-rd`, `enhancement`. Body: links the bundle + this doc; lists the children below.

### Foundation — `packages/design-tokens` (do first)

| #   | Title                                                                                             | Labels                                                                              | Scope / acceptance                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Tokens: fix theme contrast failures (Prep Spec §1)**                                            | `app:native-rd` `accessibility` `dep:foundation` `order:1` `size:m` `priority:high` | Edit `src/themes/*.json` for the 3 failing + 14 sub-AA pairs (primary, destructive, success, warning, info, highlight, tab). Rebuild Style Dictionary. **AC:** every fg/bg pair ≥ 4.5:1 (3:1 if text ≥24px/bold); re-run `Theme Eval.dc.html` shows §1 green.                                                                                                                                                         |
| F2  | **Tokens: extend contract for the redesign — screen-header, brand-accent, per-theme hard shadow** | `app:native-rd` `enhancement` `dep:foundation` `order:1` `size:m` `priority:high`   | Add a `screen-header` semantic token (band bg/fg/border), authored per theme. Repoint brand-accent off neutral `--ob-accent`. Author the hard-offset shadow per theme (`shadow-hard` exists in `:root`, unused per-theme); honor shadow-off themes (Bold Ink / Still Water / Loud & Clear) and dark's `lg`. **AC:** header band + card elevation render correctly in all 7 themes incl. Night Ride (no dark-on-dark). |

### Screens — `apps/native-rd` (blocked by F1+F2)

| #   | Title                                                                          | Labels                                                                                            | Scope / acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Focus Mode: strip to one task + See-all-steps + evidence picker**            | `app:native-rd` `enhancement` `dep:blocked` `order:2` `size:l` `priority:high`                    | Replace `MiniTimeline`+`ProgressDots`+`CardCarousel`+`EvidenceDrawer` with one task on screen, a "See all steps" link → Timeline, and the per-step evidence-type picker sheet. Auto-advance stays the happy path; evidence stays required. **>500 LOC → split** into (a) one-task card + remove dots/mini-timeline, (b) evidence-type picker sheet, (c) See-all-steps ↔ Timeline handoff. Ref `Focus Mode A Prototype.dc.html`. **AC:** one task visible; old navigators gone; renders across 7 themes; no hardcoded hex. |
| S2  | **Timeline: reconcile node to one state-color language + inline C/B metadata** | `app:native-rd` `enhancement` `type:tech-debt` `dep:blocked` `order:2` `size:m` `priority:medium` | Drop `TimelineNode`→`blue600`; use the one state-color language (pending/in-progress/paused/completed) matching the StepCard pill. Render C deps inline ("after…" / "waiting on … expected ⟨date⟩"), B dates factually ("due …"), substeps one level. Ref `Timeline A Prototype.dc.html`. **AC:** node color == pill state; matches Focus's band.                                                                                                                                                                         |
| S3  | **Bottom Nav: resume-current-goal primary, demote + new goal**                 | `app:native-rd` `enhancement` `dep:blocked` `order:3` `size:m` `priority:medium` `needs:design`   | Make the prime affordance "jump back into current focus"; demote "+ new goal"; ≤3 destinations. Honor `PILL_LIFT` / `useTabScreenContentInset` coupling (`EvidenceDrawer` reads it). Ref `Bottom Nav Cool Directions.dc.html`. **AC:** resume is the loud control; inset/lift not broken.                                                                                                                                                                                                                                 |
| S4  | **Badge Detail: badge-as-hero + evidence spine + single Share**                | `app:native-rd` `enhancement` `dep:blocked` `order:3` `size:m` `priority:medium`                  | Badge as celebrated hero; "how it was earned" / evidence as the page spine; collapse 3 exports → 1 confident Share (others overflow); demote Delete; keep View timeline; handle degraded states (undesigned/initial fallback, no narrative, soft-deleted goal). Ref `Badge Detail C Prototype.dc.html`.                                                                                                                                                                                                                   |
| S5  | **Goals + Badges: cockpit + wall-of-proof**                                    | `app:native-rd` `enhancement` `dep:blocked` `order:3` `size:m` `priority:low`                     | Goals = momentum cockpit (progress ring + one Start); Badges = dark wall-of-proof (count + latest + gallery); both empty states. Ref `Goals + Badges C Prototype.dc.html`.                                                                                                                                                                                                                                                                                                                                                |
| S6  | **Welcome + Settings: swatch-rail / chip-grid re-skin**                        | `app:native-rd` `enhancement` `dep:blocked` `order:3` `size:s` `priority:low`                     | Welcome = swatch rail + live preview; Settings theme picker = chip grid. **Note the deliberate divergence** from shipped UI (app ships chips on Welcome, rows in Settings). App already has live theme switching, so this is mostly form-factor. Ref `Welcome + Settings Directions.dc.html`.                                                                                                                                                                                                                             |

### Close-out

| #   | Title                                                               | Labels                                                                            | Scope / acceptance                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | **Redesign-verify: 7-theme walkthrough + zero-hardcoded-hex audit** | `app:native-rd` `testing` `accessibility` `dep:blocked` `order:4` `size:s` `hitl` | Walk every redesigned screen through all 7 themes (min Full Ride + Night Ride + one shadow-off, e.g. Bold Ink/Warm Studio) in-app/Storybook. Confirm no literal hex remains in redesigned screen styles. This is the "test against real tokens" close-out. |

### Dependencies (blocked-by, set in one pass)

- S1–S6 **blocked-by** F1 **and** F2.
- V1 **blocked-by** S1–S6.
- S2's node-color fix is the cheapest correctness win and can be picked up first among the screens.

### Explicitly OUT of scope for this milestone

- **Set B & C authoring** (dependency + planning-date input) — `Set BC B Prototype.dc.html` is a
  _net-new feature_ bound by ADR-0010 / ADR-0012, not a visual port. File as its own feature epic when
  ready; the prototype + `Set B & C - Handoff Prompt.md` are the brief.
- **App Shell / Theme Eval / TokenScreen / token-backed shell** — diagnostic/demo artifacts. Keep as
  reference (their value, the findings, is already captured in the Prep Spec + this doc). Do not port.

---

## 5. Filing the issues (execution)

Recommended: the `/to-issues` skill (tracer-bullet slices) or, manually, mirror the existing tree —
create epic + children, attach **native sub-issues** (`POST /repos/:owner/:repo/issues/<epic>/sub_issues
-F sub_issue_id=<child>`), set blocked-by deps, and assign all to milestone #4 in one pass. Use the
label set above. Per house rule, branch names get set at issue-setup time (`feat/issue-N-<desc>`),
before the first commit.
