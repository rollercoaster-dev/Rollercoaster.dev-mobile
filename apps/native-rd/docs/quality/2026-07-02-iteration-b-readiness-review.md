# Iteration B readiness review — epic #384 Storybook components vs prototypes

**Date:** 2026-07-02
**Scope:** All closed `[Storybook]` sub-issues of epic #384 (#403, #404, #406–#413, #415, #417) plus #379 (Bottom Nav) and #381 (Goals Cockpit), reviewed against the canonical prototype `prototypes/screen-redesign/App Shell.dc.html` and the per-screen prototypes. Question answered: **are we ready to start the `[Integrate]` issues?**
**Method:** four parallel read-only review agents (Focus Mode + Timeline · Badge Detail + Badges + Goals · Theme/Settings + Bottom Nav · end-to-end App Shell coverage sweep). Only defects verifiable in the current tree are reported.
**Known/accepted up front:** the new Settings designs intentionally do NOT match the prototype and won't be implemented until something uses them (product-owner call). Settings deltas below are documented as accepted, not as gaps.

---

## Verdict

**The Storybook layer is in genuinely good shape — high fidelity, token-clean, 7-theme matrices everywhere.** Integration can start, but not uniformly:

| Issue                       | Readiness                                   | Why                                                                                                             |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| #414 Welcome re-skin        | ✅ **Ready — wiring only**                  | Rail + sample card storied, all i18n keys exist, theme wiring exists                                            |
| #405 BadgesScreen container | ✅ **Ready — wiring only**                  | Cleanest of all; one doc ambiguity to settle (gallery membership, below)                                        |
| #416 Settings re-skin       | 🟡 **Ready with small non-UI invention**    | "Replay welcome" needs i18n keys + a `hasSeenWelcome` reset mutation; no UI to invent                           |
| #380 Badge Detail assembly  | 🟡 **Ready, but not "wiring only"**         | 3 un-storied pieces to build + 2 decisions (chip degrade, proof-card tap target)                                |
| #377 Focus Mode rebuild     | 🔴 **Blocked on decisions + un-storied UI** | Progress strip + parked state have no component; nav "+" contradiction in its own scope text; missing nav param |
| #378 Timeline assembly      | 🔴 **Blocked on missing pieces**            | Honest-breakdown bar has no component; FinishLine still old-design; C·B band has no schema fields to query      |
| #396 Pin goal to cockpit    | 🔴 **Blocked on design**                    | Pin affordance undecided; leading candidate (long-press) now collides with shipped long-press-delete            |

**And the end-to-end ride has three unowned screens** (§ Holes): the New Goal wizard, the Edit Goal view, and the Finishing flow all appear in the canonical App Shell with **no component and no issue** — the redesigned flow currently dead-ends into old-design screens at exactly the moments the epic calls its payoff.

---

## Storybook reorg (done in this pass)

16 story files retitled under `Iteration B/`, grouped by screen. No other code changes. Type-check and lint pass; no code/test/snapshot/storySort references depended on the old titles. Historical dev plans may still mention the previous Storybook titles.

```
Iteration B/
├─ Focus Mode/        FocusCurrentTaskCard · EvidenceTypePicker
├─ Timeline/          TimelineNode · TimelineStep
├─ Badge Detail/      CelebrationHeroHeader · ProofSpine · BadgeShareSheet · BadgeOverflowMenu
├─ Badges Wall/       BadgeWallCell · BadgesWall
├─ Goals/             GoalsCockpit
├─ Theme & Settings/  ThemeSwatchRail · ThemeSampleCard · SettingsThemeSection · SettingsDensityRows
└─ Navigation/        FocusPillTabBar
```

---

## ❌ Holes — in the canonical prototype, no component AND no issue

1. **New Goal wizard (4 screens).** App Shell route `newgoal`: segmented progress bar, "What do you want to work toward?" (+ "Quick add — skip to the list ›"), "What's the first step?" with per-step evidence type at creation, build list, "You're set." → "Start Working". `NewGoalModal.tsx` is still the title-only modal. **Impact:** the shipped cockpit's "+ New goal" (`GoalsScreen.tsx:175`) drops users from a redesigned screen into the old modal, and the redesign's "evidence on each step from birth" contract is never authored.
2. **Edit Goal view.** App Shell route `edit`: "Edit goal" header with `⋯` menu (owns Delete goal), drag-`≡` step rows with evidence chip + date/dep chips, inline title, "Done". `EditModeScreen` is old-design. **Impact:** Focus's `✎` and Timeline's "Edit ›" — which **#378 explicitly wires** — land on the old screen mid-flow.
3. **Finishing flow (celebrate → design → bake → reveal).** App Shell route `finish` (4 sub-stages: "You did it." / "Make your badge" 4-section accordion + live preview / "Baking your badge…" / "Earned" reveal); Finishing Flow A adds an optional closing note. Existing `CompletionFlowScreen` / `BadgeDesignerScreen` / `BadgeEarnedModal` are the old flow that `Finishing Flow Map.dc.html` itself flags with 8 friction cards. **Impact:** #377's all-done state ends at "Design your badge →" with no redesigned destination. **Prerequisite:** the Flow Map's five "Calls to make" (one-screen-or-two, keep the earned modal?, auto-bake?, where the redesign lives, single exit CTA) were never decided or filed.
4. **Nav "+" add-evidence entry point.** `Add Evidence Nav.dc.html` puts a "+" FAB on the slide (Goals-only, pre-targets the active step). Shipped `FocusPillTabBar` has no "+", no issue covers one — yet **open #377's scope text depends on it** ("capture via the nav '+' … `Add Evidence Nav.dc.html`") while also demanding "no un-storied UI". Either the "+" was dropped when App Shell's clean 3-slot slide became canonical (then #377's text needs editing), or it needs a Storybook issue. Decision required before #377 starts.
5. _(minor)_ **Badges-wall sort control.** App Shell wall header `☰` ("Sort · newest first" toast). Absent from `BadgesWall.tsx`; #405 hardcodes `createdAt DESC`. Stub-grade in the prototype — probably fine to drop, but nothing records the drop.

**Deliberately NOT holes:** capture screens + evidence viewer (App Shell labels both literally "STUB" — undesigned on purpose, but note the redesigned flow will route into old-design capture/viewer screens; that seam is undocumented); Set B/C authoring (out-of-scope epic); unused `settings.motion`/`reminder` state in the prototype (settings deferral); prototype dev toggles ("view empty state ›" etc.).

---

## Decisions needed before/at integration (cheapest to settle now)

1. **Verified-chip degrade: hidden vs honest grey.** #410 State 3 specified an "honest grey 'not independently verifiable'" chip; shipped `CelebrationHeroHeader.tsx:200-205` hides the chip entirely (formalized in the #410 dev plan). #380's acceptance still says "degrades to honest grey (#410)". Reconcile: accept hide, or extend the storied component first.
2. **Timeline state vocabulary.** Prototypes say "Done / Set aside / Working / Up next (To do)"; shipped `TimelineStep` pill reuses StepCard's "Completed / Paused / In Progress / Pending" (`common.json stepCard.status`). Both #377 and #378 surfaces share these words — pick once, now.
3. **E·C·B band dialect.** `FocusCurrentTaskCard` renders glyph-led, hued truth-lines (per prototype); `TimelineStep` renders plain `textSecondary` text and collapses waiting/after to one line (`TimelineStep.tsx:268-274`) where the prototype (and the Focus card) show all facts independently. Same step shows different facts on the two screens.
4. **Timeline evidence presentation.** Prototype: always-visible mint chips in-cell. Shipped: collapsed expandable `TimelineEvidenceCard` rows behind a chevron — plus a **"No evidence yet" / "No goal evidence yet" empty label** (`TimelineStep.tsx:123-127`, `FinishLine.tsx:38-42`, pre-existing #293 copy) that violates the show-what's-present rule. The label should not survive integration regardless of the chips decision.
5. **ProofSpine tap destination.** `onCardPress` is required, but #380 never says where it goes. App Shell routes to the Evidence Viewer; ProofSpine ids come from the **baked credential's** evidence array (survives goal deletion), so credential-id → live-row mapping and the deleted-goal degrade are undefined.
6. **Step-target navigation param.** `FocusMode: { goalId }` has no step param, but timeline node-tap → "Focus on that step" and resume-from-parked both need one (`TimelineJourneyScreen.tsx:164-166` currently discards the tapped step). Needed by both #377 and #378.
7. **C·B data source.** Step schema has **no dependency or due-date fields** (`db/schema.ts:112-124`); `afterStep`/`waitingOn`/`dueDate` are story-only props. #378 declares itself "wiring + queries only" — there is nothing to query. Either the band ships dormant (document that) or a schema issue is missing.
8. **Wall gallery membership.** `BadgesWall.tsx:53` doc says the gallery gets _every_ badge; #405 prescribes `gallery = rows.slice(1)` (spotlight excluded). One-line fix, but the integrator currently gets contradictory instructions.

---

## ⚠️ Fidelity gaps in shipped components (by screen)

### Focus Mode (#408, #409 — high fidelity overall)

- "Add {type}" secondary CTA persists after evidence exists; prototypes show only "✓ Mark complete" once ready. Documented in-code as a deliberate synthesis (`FocusCurrentTaskCard.styles.ts:260-262`) — flag, don't fix, but it deviates from all three prototypes.
- Helper line weakened: "add evidence to complete" vs the prototype's "only evidence unlocks complete — nothing here blocks you". The shipped phrasing is the closest thing to "needed" framing in the set; the reassurance clause is lost.
- The change-planned-type flow reuses the capture sheet whose header always claims "Add evidence / Saving to your active step" (`EvidenceTypePicker.tsx:206,221`); App Shell's change picker reads "Evidence type / What will you show for this step? Note is the easy default." Copy asserts a capture that isn't happening.
- Completed pill lacks the ✓ glyph; selected picker cell is a loud solid fill vs the prototype's quiet tint. Minor.
- Correction for the record: **StepCard did not get `paused`** — #417 shipped the DB status + `pauseStep`/`resumeStep` only; `StepCard.shared.ts:3` still types three statuses. Irrelevant to #377 (card is replaced) but issue-tracker language implies otherwise.

### Timeline (#406, #407)

- No inter-step spine connector is rendered by anything (prototype runs a 3px state-colored segment under every node).
- No current-step cell accent (`#fffbe0` in prototype) and no muted-paused ink; cells are uniformly `backgroundSecondary`.
- Goal/finish star is unconditionally yellow (`TimelineNode.styles.ts:25-31`, raw `palette.yellow300` — the one non-journey-tokened state color); prototype keeps it white until all steps are done.
- Child rows keep an evidence drawer the prototype's E-only child lacks — acknowledged in-code as #378-owned follow-up (`TimelineStep.tsx:171-173`).
- Open #435 already tracks band/chip fidelity reconvergence; #420 (goal-node color) and #429 (shadow tokens) are adjacent.

### Badge Detail (#410, #411, #412 — structurally 1:1 in most places)

- "THE PROOF" header lost its split-weight treatment: prototype has Anybody-900 15px left + muted mono right; shipped renders one combined muted-mono string (`ProofSpine.styles.ts:7-13`). The section title reads as a micro-label.
- ProofCard: everything inside one tinted card vs the prototype's bordered thumbnail tile + unboxed caption below; 1px border vs the prototype's 3px neo-brutalist tile. Has #411 issue support, but visibly lighter than the prototype rhythm.
- Hero band bottom border 2px vs 3px. Minor.
- Delete-confirm copy: live keys say "permanently remove… cannot be undone" vs the prototype's reassuring "Your goal and its evidence stay in the timeline — only the credential artifact is deleted" (+ "Keep it"). The prototype framing is the one aligned with the product ethos; i18n-only fix in #380.

### Badges Wall (#403, #404 — cleanest area)

- The one hardcoded hex in the reviewed set: `#161616` wall surface (`BadgesWall.styles.ts:36`) — issue-sanctioned (D4) with the prescribed TOKEN-RISK comment; #383's hex audit is the tracked resolution. Note the newer token-backed shell prototype renders the wall theme-adaptively — the two prototype generations disagree; shipped follows the issue-locked canonical.
- Divider + count use `celebrationBg` (yellow) instead of prototype blue — documented contrast decision (D5). Spotlight always shows `rows[0]` vs prototype's post-bake-only — decided (D7). Sort button + "+9 MORE" chip deliberately omitted per #404.

### Goals Cockpit (#381)

- Ring 124px vs prototype 104; keep-warm grid wraps beyond one row (covered by story). Minor.
- **Long-press-to-delete on every cockpit card (D14) pre-claims the gesture #396 lists as its leading pin candidate** — see Decisions/#396.
- Verified: no resume affordance exists anywhere outside the cockpit hero (product rule holds).

### Theme picker / Settings / Bottom Nav (#413, #415, #379)

- Swatch fill pattern (vertical stripes, shared with ThemeChipGrid) vs prototype's horizontal bands — decided (D5 anti-drift). Per-swatch mini name labels omitted — **not** covered by a recorded decision. Selection ✓-overlay vs prototype's halo-no-glyph.
- ThemeSampleCard inherits ThemeSwitcher typography: 5 of 7 variants have no `fontFamily` override, so title isn't Anybody and meta isn't mono as the prototype card specifies; card surface = page bg (token vocabulary has no `surface`). Pre-existing pattern, honest token rendering.
- Hardcoded English a11y label "Theme selection" (`ThemeSwatchRail.tsx:38`, same pattern in ThemeChipGrid) — not `t()`.
- FocusPillTabBar vs canonical App Shell slide: equal-width knob (shell actives are ~1.8× wider) and body-font label (shell uses Anybody) are the two deltas **not** covered by the locked #379 plan; lift, brand band, and per-destination hues are all decided/measured supersessions. Stale story labels still say "FAB visible/FAB hidden" (`FocusPillTabBar.stories.tsx:79-86,108-111`).
- **Settings (known/accepted):** rail-not-chips picker (codified in #416 itself), no theme name in header, density description swaps to ✓ when active. Not blockers.
- #416's one real hole: **"Replay welcome"** has no i18n keys, and only a mark-seen mutation exists (`queries.ts:1558`) — needs a reset mutation; note Welcome mounts above `NavigationContainer` (no route — replay = reset the flag).

---

## Product-rule compliance (verified)

| Rule                                    | Status                                                                                                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No "missing/needed" framing             | ✅ in all new components (ProofSpine/Walls/Cockpit empties are forward-framed) — ❌ pre-existing "No evidence yet" labels in TimelineStep/FinishLine must die at integration (Decision 4); Focus helper-line phrasing borderline (Gap above) |
| Every step requires evidence            | ✅ Mark-complete revealed only by captured evidence; no evidence-optional path exists                                                                                                                                                        |
| journey-\* tokens own step-state colors | ✅ `stepStateColorMap` single source; owed `journey-step-paused-*` token recorded in-file; goal-star yellow is the one raw-palette exception (#420 adjacent)                                                                                 |
| No hardcoded hex                        | ✅ except issue-sanctioned `#161616` wall surface (tracked by #383)                                                                                                                                                                          |
| No global resume in nav                 | ✅ verified absent; cockpit hero owns resume                                                                                                                                                                                                 |
| Single-language narrative               | ✅ nothing touches `criteria.narrative`                                                                                                                                                                                                      |

---

## Suggested next moves (not started — for discussion)

1. File the three missing-screen issues (New Goal wizard, Edit Goal view, Finishing flow) using the established pattern: `[Storybook]` part issues gated before an `[Integrate]` issue. The Finishing flow one needs the Flow Map's five "Calls to make" answered first.
2. Settle Decisions 1–8 (a single grooming pass over #377/#378/#380 bodies would cover most).
3. Start integration from the ready end: #414 → #405 → #416 while the #377/#378 decisions land.
4. Trivia sweep candidates (could ride any nearby PR): stale FAB story labels, `gallery` doc line, delete-confirm copy keys, "Theme selection" a11y literal.
