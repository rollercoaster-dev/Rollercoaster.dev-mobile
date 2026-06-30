# Development Plan: Issue #407

## Issue Summary

**Title**: [Storybook] Timeline metadata band + substeps
**Type**: enhancement (re-skin + story additions)
**Complexity**: MEDIUM
**Estimated Lines**: ~260 lines

Part of Epic #384 — Full Ride redesign, Track B2. Re-skins `TimelineStep` with an
inline E·C·B metadata band and evidence chips; adds the missing `TimelineEvidenceCard`
story. Not yet imported by any screen.

## Intent Verification

Observable criteria a reviewer can verify by running Storybook and the test suite:

- [x] When a `TimelineStep` story renders, the state **word** appears in the step-card
      header (replacing the old `StatusBadge`), sourcing its text from
      `t(stepStateColorMap[status].badgeI18nKey)` (`common:stepCard.status.*`) and its color
      from `stepStateNodeFg`/`stepStateNodeBg(theme, status)` — the same token the node uses.
      No `StatusBadge` and no second color language remain on the card.
- [x] When a step carries a C dependency prop, a quiet "after [step title]" **or**
      "waiting on [who] · expected [date]" line renders in the band beneath the title. No
      "blocked by" wording appears anywhere; no red, no badge count, no visual penalty.
- [x] When a step carries a B date prop (`dueDate?: string`), a factual "due [date]" line
      renders in the band. No red color, no "overdue" text, no urgency framing regardless of
      whether the date is past.
- [x] Substep (child) rows render the state **word** (E) only — no C/B band, no evidence row.
- [x] `TimelineEvidenceCard` gains a Storybook story covering 0, 1, and 3 chips; each
      chip renders its `EVIDENCE_TYPE_ICONS` emoji and label; the `isGoal` variant renders
      correctly.
- [x] `TimelineStep` stories render correctly in web Storybook across all 7 product themes
      via an `AllThemesMatrix` story (pattern mirrors `TimelineNode.stories.tsx`
      `AllThemesMatrix` export, reading `themes[name]` statically).
- [x] Zero hardcoded hex values in new or modified style files. All colors resolve
      through `theme.*` tokens via `StyleSheet.create((theme) => ...)`.
- [x] All interactive elements have `accessibilityRole`, `accessibilityLabel`, and
      44pt minimum touch targets.
- [x] Unit tests pass for new band props and `TimelineEvidenceCard` story-only variants;
      existing tests remain green.
- [✗] ~~The component is not imported by any screen after this PR.~~ **FALSE — see
  Discovery Log.** `TimelineJourneyScreen` (live, in `GoalsStack`) renders
  `TimelineStep`, so the E-word re-skin ships on that screen. The C·B **band**
  remains unwired by any screen (no `afterStep`/`dueDate` passed), so the band
  stays story-only as intended; #378 owns band wiring.

## Dependencies

| Issue | Title                                      | Status       | Type            |
| ----- | ------------------------------------------ | ------------ | --------------- |
| #406  | TimelineNode — one state-color language    | Met (merged) | Blocker         |
| #293  | Timeline substructure rendering (substeps) | Met (merged) | Hard dependency |

**Status**: All dependencies met. `stepStateColorMap`, `stepStateNodeBg`, `stepStateNodeFg`,
`StepStateMapKey`, `themes`, `themeNames` are all live in the codebase. Substep rendering
(`subSteps` prop, `ChildRow`, `childSpine` styles) is already implemented in `TimelineStep`.

## Objective

Re-skin `TimelineStep` to the finalized **Timeline A / Direction A** prototype
(`prototypes/screen-redesign/Timeline A Prototype.dc.html`) and add the missing
`TimelineEvidenceCard` story. The state-color language has exactly one source: the
`stepStateColorMap` (from #406). C (dependency) and B (date) are accepted as optional props —
they have no corresponding DB fields today, so these are story-only/display props that the
future `[Integrate]` issue (#378) will wire to real data. The component stays un-imported
by any screen.

### How the prototype actually lays out a step (authoritative — read before implementing)

From `Timeline A Prototype.dc.html` (the picked Direction A) and the
`Timeline Journey - Handoff Prompt.md`:

- **E (state)** is **NOT a band line.** It rides in two places, both off the one #406 map:
  (a) the **node** color (already done in #406 via `TimelineNode`), and (b) a **state word**
  in the step-card **header** (top-right, e.g. "Done" / "Working" / "Set aside" / "To do" —
  the prototype's `word(status)`). This **replaces** the current `StatusBadge`. The handoff
  doc (line 21) names the existing `TimelineNode`-blue vs `StatusBadge`-variant split "**an
  accident to fix, not a decision to keep**." → resolves OQ-1.
- **The metadata band carries C and B only** — the prototype's `metaOf(step)` lines:
  - **C**: `after <step>` (internal dep) **or** `waiting on <who> · expected <date>`
    (external wait). Never "blocked by".
  - **B**: `due <date>`. No red, no "overdue".
- **Substep (child) rows show E only** — node + title + state word. No band, no evidence row.
  (Prototype child row, lines 76–79 / `kids` mapping; `TimelineStepChild` carries no
  `afterStep`/`dueDate`.) → resolves OQ-2.

### Decisions resolved from the prototype (formerly the two open questions)

| Q                                                    | Resolution                                                                                                                                                                                                                                                                                                                                                                  | Source in prototype                                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **OQ-1 — replace or keep the header `StatusBadge`?** | **Replace.** The card header shows the state **word** from `stepStateColorMap[status].badgeI18nKey` (`common:stepCard.status.*`, all 4 states incl. `paused`), colored off the map. The `StatusBadge` (active/completed/locked vocabulary, `timelineJourney:step.status.*` — only 3 states, no `paused`) is the documented "accident to fix" and is removed from this card. | Handoff line 21; `Timeline A Prototype` header `{{ s.word }}` / `wordColor(status)`.  |
| **OQ-2 — full E·C·B or E-only on children?**         | **E-only.** Child rows render the node + title + state word; no C/B band, no evidence chips. `TimelineStepChild` is unchanged.                                                                                                                                                                                                                                              | `Timeline A Prototype` child row (lines 76–79) + `kids` mapping (no `meta`, no `ev`). |

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Alternatives Considered                                                                                                                                                                                                                                                                                                                                                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **E is the header state word, not a band line.** The step-card header renders the state word from `t(stepStateColorMap[status].badgeI18nKey)`, colored via `stepStateNodeFg(theme, status)` / `stepStateNodeBg(...)` — the same functions the node calls. This **replaces** the `StatusBadge` in the header (and in `ChildRow`). The band beneath the title carries **C and B only**.                                                                                                                                                                                                                      | (a) E as a pill row inside the band — rejected: the prototype puts E in the header beside the title, and a band pill would double the state display already carried by the node + header word. (b) Keep `StatusBadge` — rejected: its `active/completed/locked` vocabulary (`timelineJourney:step.status.*`, 3 states, no `paused`) is the documented "accident to fix" and is a second color language. | Matches `Timeline A Prototype` exactly; single #406 source; gains `paused` support for free via the map's `common:stepCard.status.*` key.                                                                                                                                                                                                                                                                                                                                                                                                              |
| D2  | `afterStep?: string` and `dueDate?: string` added to `TimelineStepData` as optional string props (story-only; no DB field yet). The band renders them as plain `Text` lines with `theme.colors.textSecondary` — no dedicated sub-type needed.                                                                                                                                                                                                                                                                                                                                                              | Add to `TimelineStepProps` directly without modifying `TimelineStepData`.                                                                                                                                                                                                                                                                                                                               | `TimelineStepData` is the canonical data shape for the step card. Adding optional props there keeps the band data co-located with `status` and `title`; the screen container mapping in the future `[Integrate]` issue has one place to add the new fields.                                                                                                                                                                                                                                                                                            |
| D3  | `AllThemesMatrix` story for `TimelineStep` reads `themes[name]` statically (same pattern as `TimelineNode.stories.tsx`) — not a Unistyles-reactive approach.                                                                                                                                                                                                                                                                                                                                                                                                                                               | Storybook toolbar / `setTheme()` per story.                                                                                                                                                                                                                                                                                                                                                             | Unistyles' theme is a runtime singleton; static matrix reads are the established pattern in this codebase for cross-theme verification.                                                                                                                                                                                                                                                                                                                                                                                                                |
| D4  | `TimelineEvidenceCard.styles.ts`: the `isGoal` `borderLeftColor` currently uses `palette.yellow300` (a hardcoded palette alias). This is pre-existing — the issue acceptance requires zero hardcoded hex in new/modified code. Since this file is being modified to add story coverage, evaluate whether to migrate this one line to `theme.colors.accentYellow`. The same token is used by `StatusBadge.styles.ts` (`accentYellow`) and `palette.yellow300 = pkgPalette.accentYellow` in `adapter.ts` — they resolve identically. Migrate the line to `theme.colors.accentYellow` when touching the file. | Leave the existing `palette.yellow300` in place.                                                                                                                                                                                                                                                                                                                                                        | The acceptance criteria requires zero hardcoded hex in modified files; `palette.yellow300` is a palette alias rather than a theme-token path. Migrating closes the gap without semantic change.                                                                                                                                                                                                                                                                                                                                                        |
| D5  | The band renders below the header `Pressable` (inside `contentCard`), not inside it. The E/C/B lines are informational text, not interactive — so they sit outside the expand toggle.                                                                                                                                                                                                                                                                                                                                                                                                                      | Render band inside the Pressable.                                                                                                                                                                                                                                                                                                                                                                       | Placing non-interactive text inside a Pressable conflates the tap target with read-only information. The issue specifies "quiet, informative-only truth-lines".                                                                                                                                                                                                                                                                                                                                                                                        |
| D6  | `paused` is in `StepStateMapKey` but not in `StepStatus` (`StepStatus = "completed"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | "in-progress"                                                                                                                                                                                                                                                                                                                                                                                           | "pending"`). The header word in real stories reads `step.status`(the 3`StepStatus`values). The`AllThemesMatrix`story renders state-word cells **inline** keyed off`StepStateMapKey`(all 4, incl.`paused`) — it does not go through `TimelineStepData`. `TimelineStepData.status`stays typed as`StepStatus`.                                                                                                                                                                                                                                            | Widen `TimelineStepData.status` to include `paused`. | The schema has no `paused` DB value yet; widening the data type would misrepresent what the DB returns. The matrix demonstrates `paused` without it leaking into the component's data contract. |
| D7  | **Evidence stays as the existing `TimelineEvidenceCard` (full-width card in the collapsible drawer); this issue only adds its story.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Restyle `TimelineEvidenceCard` into the prototype's always-visible pill-chip row and drop the card's collapse.                                                                                                                                                                                                                                                                                          | The issue's build list says "the captured-evidence row **via `TimelineEvidenceCard`**" and scopes ~250 LOC; `TimelineEvidenceCard` is also consumed by `FinishLine`, so a pill restyle has app-wide blast radius. The pill-chip presentation + removing the step-card chevron/collapse are genuine prototype divergences but sit **outside** this issue's three explicit build items — captured in Not-in-Scope as a fidelity follow-up. See **Fidelity note** below.                                                                                  |
| D8  | **The E header word is a compact filled pill (`bg = stepStateNodeBg`, ink = `stepStateNodeFg`, node's solid-vs-neutral border), not fg-only coloured text.**                                                                                                                                                                                                                                                                                                                                                                                                                                               | (a) Plain word coloured via `stepStateNodeFg` only — D1's stated primary. (b) Plain word coloured via `stepStateNodeBg`.                                                                                                                                                                                                                                                                                | The journey _fg_ tokens all resolve to dark ink, so fg-only text collapses every state to the same colour in light themes (fails "word colour matches node colour"); `stepStateNodeBg` as _text_ colour is illegible for pending (light fill). Only the pill — node bg + node fg together — satisfies the intent in all 7 themes and guarantees legibility. D1 explicitly permitted this ("a filled pill background … if matching the node fill reads better"). Visual gate confirms the pill is quiet (xs, tight padding), not a revived StatusBadge. |

## Affected Areas

- `apps/native-rd/src/components/TimelineStep/TimelineStep.tsx`: replace `StatusBadge` with the #406 state word (E) in both the parent header and `ChildRow`; delete the `statusToVariant`/`statusToLabelKey` maps and the `StatusBadge` import; add `afterStep?`/`waitingOn?`/`dueDate?` to `TimelineStepData`; add `MetadataBand` (C/B only) rendered below the parent header. `TimelineStepChild` unchanged.
- `apps/native-rd/src/components/TimelineStep/TimelineStep.styles.ts`: add `metadataBand`, `metadataRow`, `metadataIcon`, `metadataText` styles.
- `apps/native-rd/src/components/TimelineStep/TimelineStep.stories.tsx`: replace current stories with a richer set covering the band (each E state, with/without C, with/without B, 0/1/many evidence chips, parent+substeps); add `AllThemesMatrix` story.
- `apps/native-rd/src/components/TimelineStep/__tests__/TimelineStep.test.tsx`: add band rendering tests (E state display, C line, B line, absence cases).
- `apps/native-rd/src/components/TimelineEvidenceCard/TimelineEvidenceCard.tsx`: no logic change; only touched if `isGoal` style migration (D4) proceeds.
- `apps/native-rd/src/components/TimelineEvidenceCard/TimelineEvidenceCard.styles.ts`: migrate `palette.yellow300` → `theme.colors.accentYellow` (D4).
- `apps/native-rd/src/components/TimelineEvidenceCard/TimelineEvidenceCard.stories.tsx`: new file — add story covering 0, 1, many chips + `isGoal` variant.

## Implementation Plan

### Step 1: Add E·C·B band to `TimelineStep`

**Files**:

- `apps/native-rd/src/components/TimelineStep/TimelineStep.tsx`
- `apps/native-rd/src/components/TimelineStep/TimelineStep.styles.ts`

**Commit**: `feat(timeline-step): inline E·C·B metadata band (#407)`

**Changes**:

This step does **three** things: (1) replace the header `StatusBadge` with the state word
(E) from the #406 map, on both the parent header and `ChildRow`; (2) add the C/B band below
the parent title; (3) leave child rows at E-only.

- [x] **E — header state word (replaces `StatusBadge`).** In both the parent header and
      `ChildRow`, remove `<StatusBadge .../>` and render a state word instead:
  - text: `t(stepStateColorMap[step.status].badgeI18nKey)` (the `common` namespace — covers
    all 4 states incl. `paused`; the existing `statusToVariant`/`statusToLabelKey` maps and
    the `timelineJourney:step.status.*` lookup are deleted).
  - color: `stepStateNodeFg(theme, step.status)` resolved inline (the node-matching token).
    Optionally a filled pill background via `stepStateNodeBg(...)` if matching the node fill
    reads better — confirm against the prototype's header word in the visual gate.
  - keep the existing `accessibilityLabel={`${title}, ${statusLabel}`}` wired to the same
    resolved word so the a11y name stays meaningful.
- [x] Extend `TimelineStepData` with optional C/B props (story-only; no DB field yet). Model
      C as the two prototype shapes:
  ```ts
  afterStep?: string;                         // C: "after [title]" (internal dependency)
  waitingOn?: { who: string; expected?: string }; // C: "waiting on [who] · expected [date]"
  dueDate?: string;                           // B: "due [date]" — factual, no urgency
  ```
  `TimelineStepChild` is **NOT** extended — children stay E-only (OQ-2).
- [x] Add a `MetadataBand` sub-component (local to `TimelineStep.tsx`). Props:
      `{ afterStep?: string; waitingOn?: {...}; dueDate?: string }` (no `status` — E is the
      header word, not a band line). Renders up to two rows in `theme.colors.textSecondary`:
  - **C row**: `waitingOn` → "waiting on [who]" + optional "· expected [expected]";
    else `afterStep` → "after [afterStep]". Never "blocked by". Omitted when both absent.
  - **B row**: `dueDate` → "due [dueDate]". No red, no "overdue". Omitted when absent.
  - Renders nothing (returns `null`) when there are no C/B lines.
- [x] Render `<MetadataBand>` inside the **parent** `contentCard` BELOW the `Pressable`
      header, always visible (not inside the collapsible evidence section) — the band
      informs, it does not gate. **Not** rendered on `ChildRow`.
- [x] Import `stepStateColorMap`, `stepStateNodeBg`, `stepStateNodeFg` from
      `../TimelineNode/stepStateColorMap`. `useTranslation` is already present.
- [x] Add to `TimelineStep.styles.ts`:
  ```ts
  metadataBand: {
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[3],
    gap: theme.space[1],
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
  },
  metadataText: {
    fontSize: theme.size.xs,
    color: theme.colors.textSecondary,
  },
  ```
  The header word color is resolved inline via `stepStateNodeFg`/`stepStateNodeBg` (same
  helper pattern as `TimelineNode.styles.ts`) — they return a resolved color string, not a
  style record, so use an inline `style` prop. **No hardcoded amber/green/red** for the C/B
  lines — they use `theme.colors.textSecondary`; do not reproduce the prototype's literal
  `#d97706`/`#5a8a6a` hexes.

### Step 2: Update `TimelineStep` stories with band + `AllThemesMatrix`

**Files**:

- `apps/native-rd/src/components/TimelineStep/TimelineStep.stories.tsx`

**Commit**: `story(timeline-step): band states, matrix, evidence chips (#407)`

**Changes**:

- [x] Import `stepStateColorMap`, `stepStateNodeBg`, `stepStateNodeFg`, `StepStateMapKey`
      from `../TimelineNode/stepStateColorMap`; import `themes`, `themeNames`, `ThemeName`,
      `ComposedTheme` from `../../themes/compose`.
- [x] Replace the existing stories with equivalents that exercise the header word + band.
- [x] Add `BandFull` story: a step with `waitingOn={{ who: "city inspector", expected: "Jun 24" }}`
      and `dueDate="Thu · Jun 26"` so both C and B band lines are visible under the header word.
- [x] Add `BandAfter` story: a step with `afterStep="Inspection & labels"` + `dueDate` (the
      internal-dependency C shape).
- [x] Add `BandMinimal` story: a step with no C/B props — only the header state word, no band.
- [x] Add `EvidenceChips` story: a step expanded (`defaultExpanded`) with 0, 1, and 3
      evidence items to confirm `TimelineEvidenceCard` renders 0/1/many.
- [x] Add `WithSubsteps` story: a parent (with a C/B band) plus three `TimelineStepChild`
      substeps each at a different status — confirming children show the state **word only**,
      no band, no evidence row.
- [x] Add `AllThemesMatrix` story export: mirrors the pattern in `TimelineNode.stories.tsx`.
      Seven rows (one per `ThemeName`), four columns (one per state: pending / in-progress /
      paused / completed). Each cell renders the state **word** inline colored via
      `stepStateNodeFg(themes[name], state)` (and `stepStateNodeBg(...)` if filled) so the
      reviewer can confirm the word's color matches the `TimelineNode/AllThemesMatrix` node
      color for the same state in every theme, without the Unistyles runtime.
- [x] `MOOD_NAMES` map copied from `TimelineNode.stories.tsx` (same 7 entries).

### Step 3: Add `TimelineEvidenceCard` story

**Files**:

- `apps/native-rd/src/components/TimelineEvidenceCard/TimelineEvidenceCard.stories.tsx` (new)
- `apps/native-rd/src/components/TimelineEvidenceCard/TimelineEvidenceCard.styles.ts` (palette migration D4)

**Commit**: `story(timeline-evidence-card): add missing story; migrate palette ref (#407)`

**Changes**:

- [x] In `TimelineEvidenceCard.styles.ts`, replace `palette.yellow300` with
      `theme.colors.accentYellow` (D4). The import of `palette` can be removed once no
      longer used.
- [x] Create `TimelineEvidenceCard.stories.tsx`:
  ```ts
  meta: { title: "TimelineEvidenceCard", component: TimelineEvidenceCard }
  ```
  Stories to add:
  - `SinglePhoto` — one photo chip, `isGoal: false`.
  - `SingleLink` — one link chip.
  - `GoalEvidence` — `isGoal: true` to verify the yellow left-border accent renders.
  - `ManyChips` — renders three chips in a `View` (`photo`, `text`, `link`) to show the
    multi-chip layout (three separate `<TimelineEvidenceCard>` instances since the
    component renders one chip).
  - `ZeroChips` — a containing `View` with no cards rendered, showing the empty state
    (`Text` reading "No evidence yet") to document the zero-chip case even though it lives
    in `TimelineStep`, not `TimelineEvidenceCard`.

### Step 4: Unit tests for the band

**Files**:

- `apps/native-rd/src/components/TimelineStep/__tests__/TimelineStep.test.tsx`

**Commit**: `test(timeline-step): E·C·B band rendering (#407)`

**Changes**:

- [x] Add a `describe("metadata band + state word")` block to the existing test file.
- [x] `it("renders the E state word from the stepStateColorMap i18n key", ...)` — render with
      `status: "completed"` and assert `"Completed"` appears (from
      `common:stepCard.status.completed`), and that the old `StatusBadge` label
      (`timelineJourney:step.status.*`) is gone. Use `test.each` across the `StepStatus`
      values for the header word.
- [x] `it("renders C 'after' line when afterStep is provided")` — pass
      `afterStep: "Gather materials"`, assert `"after Gather materials"` renders; assert the
      output does NOT contain "blocked by".
- [x] `it("renders C 'waiting on' line when waitingOn is provided")` — pass
      `waitingOn: { who: "city inspector", expected: "Jun 24" }`, assert "waiting on city
      inspector" + "expected Jun 24" render; no "blocked by".
- [x] `it("omits the C line when no dependency prop is set")`.
- [x] `it("renders B 'due' line when dueDate is provided")` — pass `dueDate: "2026-07-15"`,
      assert the date renders; assert no "overdue" text.
- [x] `it("omits the B line when dueDate is absent")`.
- [x] `it("renders the band always-visible, outside the collapsible evidence section")` —
      assert the C/B lines render WITHOUT expanding the step.
- [x] `it("renders child rows E-only — no band, no evidence row")` — render with `subSteps`
      and assert no C/B text appears on the child rows.

## Testing Strategy

- [x] Unit tests: Jest 30 + `@testing-library/react-native` v13; run with
      `bun run test --testPathPatterns "TimelineStep|TimelineEvidenceCard"`.
- [x] Use `test.each` for the E-state label matrix.
- [x] Test files live in `src/__tests__/` — `TimelineStep` tests are already at
      `src/components/TimelineStep/__tests__/TimelineStep.test.tsx` (existing location,
      not `src/__tests__/`). Follow that convention.
- [x] `bun run type-check` and `bun run lint` must pass clean.
- [ ] Visual gate (PENDING — see report): open web Storybook, load
      `TimelineStep/AllThemesMatrix` and confirm the E pill color matches the
      `TimelineNode/AllThemesMatrix` node color for the same state in each theme row.
      Colours match by construction (both call `stepStateNodeBg/Fg` with identical
      solid-border logic); the gate also confirms the pill reads quiet on the now-live
      `TimelineJourneyScreen`, not as a revived StatusBadge.

## Not in Scope

| Item                                                        | Reason                                                      | Follow-up                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Wiring `afterStep`/`dueDate` from real DB or screen queries | No DB fields; `[Integrate]` issue (#378) owns screen wiring | #378                                               |
| Screen-level import of `TimelineStep` with the band         | Track B integration issue (#378)                            | #378                                               |
| Tap handler on C or B lines                                 | ADR-0010: C informs, never blocks; no interaction needed    | none                                               |
| `paused` in `TimelineStepData.status`                       | No DB `paused` value yet; demonstrated in matrix only       | follow-up design-tokens issue (noted in #406 plan) |
| Collapse / threshold for crowded substeps                   | Not in the approved layout (from #293 Not-in-Scope)         | post-ship eval                                     |
| Full a11y audit of substep touch targets                    | Already out-of-scope per #293; #294 owns it                 | #294                                               |
| Rich "invite" parent affordance                             | Post-Stage-6 per #293                                       | post-Stage-6                                       |

| Prototype's always-visible pill-chip evidence row (border-radius full, mint fill, hard shadow) | The issue reuses `TimelineEvidenceCard` as-is (D7); pill restyle hits `FinishLine` too | #378 / fidelity follow-up |
| Removing the step-card chevron / collapse (prototype cards are always-open) | Behavioral change beyond the band + chips + substeps build items | #378 / fidelity follow-up |

### Fidelity note (read before the visual gate)

The finalized `Timeline A Prototype.dc.html` step card is **always-open** (no chevron) with
an **always-visible horizontal pill-chip** evidence row. The current `TimelineStep` is
**collapsible** with a drawer of **full-width** `TimelineEvidenceCard`s. This issue's three
build items — (1) the E·C·B language [E header word + C/B band], (2) evidence chips **via
`TimelineEvidenceCard`** + its story, (3) one level of substeps — do **not** include
converting the evidence drawer to the pill row or removing the collapse. Those two
divergences are deliberately left to the `[Integrate]` issue (#378) so this PR stays a
~250 LOC component re-skin with no `FinishLine` blast radius. If the reviewer wants full
prototype fidelity in this PR instead, that is a scope expansion to flag **before** /implement.

No items from the ADR-0012 Must-Not-Do list are introduced: no "blocked by" language,
no red/overdue dates, no absence scoring, no badge counts on dates, no auto-judgment.

## Discovery Log

- [2026-06-30] **D1 refined → filled pill, not fg-only text.** The journey _fg_
  tokens all resolve to dark ink (`journey-step-fg` = `{foreground}`,
  `-active-fg` = `{primary-foreground}`, `-complete-fg` = `{success-foreground}`,
  paused = `colors.text`). Colouring the header word with `stepStateNodeFg` alone
  would render all four states as near-identical dark text in light themes — no
  state hue, failing the intent criterion "word colour matches the node colour per
  state per theme" (the node's perceived colour is its **bg**). So the word is a
  compact pill mirroring the node exactly: `bg = stepStateNodeBg`, ink =
  `stepStateNodeFg`, with the node's solid-vs-neutral border logic. This is the
  optional path D1 explicitly sanctioned ("a filled pill background … if matching
  the node fill reads better"). Recorded as **D8** below.
- [2026-06-30] **Colour helpers live in `TimelineStep.styles.ts`, not the
  component.** D1's import list put `stepStateNodeBg/Fg` in the `.tsx`; instead the
  word colours resolve through two dynamic style functions
  (`stateWordPill(status)` / `stateWordText(status)`), mirroring the existing
  `TimelineEvidenceCard.styles.ts` `card(isGoal)` precedent. The `.tsx` only imports
  `stepStateColorMap` for the i18n key.
- [2026-06-30] **Band is text-only (no glyphs); dropped `metadataRow`/`metadataIcon`
  styles.** The prototype's row glyphs (↩/⏳/▦) are emoji that won't take
  `textSecondary`, and ADR-0012 forbids the prototype's amber/green glyph hues. The
  truth-lines read fine as plain `textSecondary` `Text`, so `metadataBand` +
  `metadataText` are the only band styles. Band copy is literal English ("after …",
  "waiting on … · expected …", "due …") since these are story-only props with no
  i18n keys yet — #378 owns real data + i18n.
- [2026-06-30] **Existing tests updated in Step 1 to stay green.** The
  StatusBadge→state-word swap changed the rendered words, so the existing
  `TimelineStep.test.tsx` label/a11y assertions were updated within the Step 1
  commit (Done→Completed, Active→In Progress) rather than left red until the test
  step. New band coverage landed in Step 4.
- [2026-06-30] **DEVIATION — `TimelineStep` IS imported by a live screen.** The
  plan's "not imported by any screen" criterion is **false**: `TimelineJourneyScreen`
  (`src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx:218`) renders
  `TimelineStep`, and that screen is registered in `GoalsStack` and navigated to from
  Focus / Completion / BadgeDetail. So the E-word re-skin is **live on a navigable
  screen** — it changes that screen's state words (Active→In Progress, Done→Completed)
  and moves the indicator from a left StatusBadge to a right state-word pill. This is
  the direction the epic intends (handoff line 21: the StatusBadge split is "an
  accident to fix"), but it is **not** the story-only change the plan described. A 5th
  commit updates `TimelineJourneyScreen.test.tsx`'s state-word assertions. The C·B
  **band** is still unwired by the screen (it passes no `afterStep`/`dueDate`), so the
  band itself remains story-only as planned (#378 owns screen wiring). **Flagged for
  the user before PR.**

---

## Research Notes (consumed from code, not open questions)

**Q1 — #406 state-color map.** Located at
`src/components/TimelineNode/stepStateColorMap.ts`. Exports:

- `StepStateMapKey = "pending" | "in-progress" | "paused" | "completed"`
- `StepStateEntry` (discriminated union on `source: "journey" | "colors"`)
- `stepStateColorMap: Record<StepStateMapKey, StepStateEntry>`
  - `pending`: journey tokens `journeyStepBg` / `journeyStepFg`; badge key `common:stepCard.status.pending`
  - `in-progress`: journey tokens `journeyStepActiveBg` / `journeyStepActiveFg`; badge key `common:stepCard.status.in-progress`
  - `completed`: journey tokens `journeyStepCompleteBg` / `journeyStepCompleteFg`; glyph `"✓"`; badge key `common:stepCard.status.completed`
  - `paused`: colors fallback `accentPurpleLight` / `text`; glyph `"⏸"`; badge key `common:stepCard.status.paused`
- `stepStateNodeBg(theme, state): string` — resolves bg color
- `stepStateNodeFg(theme, state): string` — resolves fg color

**Q2 — `TimelineStep` props.** `TimelineStepProps` has `step: TimelineStepData`, `stepIndex`, `evidence: EvidenceItemData[]`, `onNodePress`, `onEvidencePress`, `defaultExpanded?`, `subSteps?: TimelineStepChild[]`. `TimelineStepData = { id, title, status: StepStatus, evidenceCount }`. This plan adds `afterStep?`, `waitingOn?`, `dueDate?` to `TimelineStepData` (not to `TimelineStepChild`). The header currently renders `<StatusBadge variant={statusToVariant[status]} label={t("timelineJourney:step.status.*")} />` (and `ChildRow` does the same) — both are **replaced** by the #406 state word (E in the header), per the prototype (OQ-1). The C/B band is a separate element below the title.

**Q3 — `TimelineEvidenceCard`.** Props: `{ evidence: EvidenceItemData; isGoal?: boolean; onPress: (id: string) => void }`. Confirmed: no `.stories.tsx` file exists. The `isGoal` left-border currently uses `palette.yellow300`; migrating to `theme.colors.accentYellow` is a no-op value-wise (same resolved hex) but removes the palette alias.

**Q4 — `groupStepsByParent`.** Signature: `groupStepsByParent(rows: readonly StepRowLike[]): GroupedStep[]`. `GroupedStep = { id, goalId, parentStepId, title, ordinal, status, completedAt, plannedEvidenceTypes, children: GroupedStep[] }`. Already consumed by `TimelineStep` via the `subSteps` prop — this issue does not change that wiring.

**Q5 — 7 themes + `AllThemesMatrix` pattern.** `themeNames: ThemeName[]` from `compose.ts` = `["light-default", "dark-default", "light-highContrast", "light-dyslexia", "light-autismFriendly", "light-lowVision", "light-lowInfo"]`. Mood names map: Full Ride / Night Ride / Bold Ink / Warm Studio / Still Water / Loud & Clear / Clean Signal. The `AllThemesMatrix` story in `TimelineNode.stories.tsx` is the canonical reference — import `themes`, `themeNames`, `ComposedTheme`, `ThemeName` from `../../themes/compose` and read `themes[name]` statically.

**Q6 — Test runner.** `bun run test` only (via `scripts/jest-node.sh`). Never `bun test` or `npx jest` directly.

**Q7 — C and B data shape.** The step DB schema (`schema.ts`) has no `afterStep`/`dueDate` fields. `step` has `id, goalId, parentStepId, title, ordinal, status, completedAt, plannedEvidenceTypes`. `afterStep` and `dueDate` are story-only props added to `TimelineStepData`. The `[Integrate]` issue (#378) is responsible for deciding how to source these from real data (possibly a new schema column, possibly a separate constraint table). This plan does not propose a schema change.
