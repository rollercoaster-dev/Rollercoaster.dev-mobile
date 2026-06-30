# Development Plan: Issue #408

## Issue Summary

**Title**: [Storybook] Focus Mode — Current Task Card view
**Type**: feature (new component)
**Complexity**: MEDIUM
**Estimated Lines**: ~320 lines

Pure presentational, prop-driven hero card that replaces `StepCard`-inside-a-`CardCarousel`
in Focus Mode. Four states (in-progress, paused, completed, all-steps-complete), the E·C·B
metadata band, and an AllThemesMatrix story across all 7 product themes. Not imported by any
screen — Storybook only (#377 owns app wiring).

## ⚠️ Prototype Fidelity Corrections (2026-06-30) — AUTHORITATIVE

The first implementation passed all gates (type-check / lint / tests green) but **does
not match the prototype**. Joe pulled up `prototypes/screen-redesign/Focus Mode A
Prototype.dc.html` (the in-progress/active state) against the built card and the gap is
large. This section supersedes the Decisions, Implementation Plan, and Discovery Log
below wherever they conflict (ADR-style supersession, per project convention).

**Root cause.** The build was not careless — it deliberately mirrored the _shipped_
`TimelineStep` / `StepCard` vocabulary per the original D4/D5 ("so the three surfaces read
as one vocabulary"). But those shipped components **themselves diverge from this
prototype**: `TimelineStep.MetadataBand` explicitly drops the prototype's glyphs and makes
the dependency line mutually exclusive (`TimelineStep.tsx:256, 268–274`); `StepCard` uses
`accentPurpleLight` (purple) for evidence chips where the prototype uses green; ADR-0012
mandates a mono date line where the prototype renders it as plain text. So the real
decision is a **direction call**: when the prototype and the shipped system disagree,
which wins?

**Scope confirmed with Joe:** _card internals only_. The top progress bar + "See all
steps", the screen-pinned bottom CTA layout, and the nav pill stay with #377. Everything
below is inside the card's own responsibility. **(Re-confirmed 2026-06-30, round 3.)**

### Round 3 (2026-06-30) — flatten the frame + proportion pass — AUTHORITATIVE

Rounds 1–2 (sections A / B / Resolved below) fixed the card's **contents** — they
remain valid and shipped (commit `d77b86a2`). They did **not** fix the card's
**container or proportions**, which is why Joe's verdict stayed "better but still doesn't
match." This round closes that gap. Grounded in a line-by-line source diff of the
prototype (`prototypes/screen-redesign/Focus Mode A Prototype.dc.html`) against the
current styles — not a screenshot read.

**Root cause (Joe's words: "dropshadows where none exist in the prototype").**
`FocusCurrentTaskCard.styles.ts:32-40` — `card` wraps the whole component in a frame:
`backgroundSecondary` fill + `borderWidth.medium` + `cardElevation` (hard 3×3) shadow +
`radius.md` + padding. **The prototype has no such frame.** The active-step content
(`…dc.html:45-85`) sits flat directly on the `#fafafa` screen. Only three elements carry
border + shadow, and all three stay: the planned box (3px border, **3×3** shadow,
`:59`), the captured chips (2px, **2×2**, `:66`), and the CTA button (3px, **4×4**,
`:77`). So this is **not** "remove all shadows" — the neo-brutalist hard shadows on
box/chips/button are correct and kept; only the invented outer-card frame is removed.

**Confirmed proportion/typography gaps** (token math: 1rem = 16px; size `xl`=20,
`2xl`=24, `3xl`=32, `lg`=18, `sm`=14, `xs`=12; shadow `cardElevationSmall`=hardSm(2×2),
`cardElevation`=hardMd(3×3), `modalElevation`=hardLg(4×4)):

| #   | Element                      | Prototype                     | Current (`.styles.ts`)                                | Fix                                                                         |
| --- | ---------------------------- | ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| R1  | **Outer frame**              | none — flat on screen bg      | `card` border + `cardElevation` + 2ndary bg           | **Remove** border/shadow/bg/radius/padding; flat container                  |
| R2  | **Title**                    | 29px Anybody-900              | `size.xl` (**20px**), `:42`                           | `size["3xl"]` (32px) + lineHeight ×1.05                                     |
| R3  | **All-complete h.**          | 34px                          | `size["2xl"]` (**24px**), `:49`                       | `size["3xl"]` (32px) + lineHeight ×1.02                                     |
| R4  | **CTA button**               | 54px tall · 17px · 4×4 shadow | `minHeight:44` · `size.md` · 2×2, `:17-29`            | `minHeight:54`, text `size.lg`, shadow `modalElevation`, radius `radius.md` |
| R5  | **Planned box**              | 3×3 shadow · 6px radius       | `cardElevationSmall` (2×2) · `radius.sm`, `:120`      | shadow `cardElevation`; radius `radius.lg` (8, nearest)                     |
| R6  | **All-complete callout**     | 3×3 shadow                    | `cardElevationSmall` (2×2), `:210`                    | shadow `cardElevation`                                                      |
| R7  | **Planned label / "change"** | 14px / 12px                   | `size.md` (16) / `size.sm` (14), `:138,:143`          | `size.sm` / `size.xs` (minor)                                               |
| R8  | **Story canvas**             | 344px phone                   | desktop full-width (no width cap, `.stories.tsx:224`) | constrain to ~344–360px + inert phone chrome (below)                        |

**Already correct — do not touch:** metadata sizes (`sm`/`sm`/`xs` ≈ proto 13.5/13/12),
glyph hues (`warning`/`success`/`textSecondary`), captured-chip styling (2px + 2×2),
the `❙❙` set-aside glyph (in the `pauseCta` i18n string), and all copy.

**`R8` — the honest side-by-side (the actual loop-breaker).** The story renders at the
full Storybook canvas (~1083px), which alone stretches the box/button into long bars and
stops the title wrapping — so even a correct card reads "spread out." Required: constrain
`storyStyles.container` to phone width (`width: 344`, `alignSelf:"center"`). Recommended:
add a story-only `PhoneFrame` decorator (344px, `border: 3px`, `radius: 40`, `background`)
wrapping the card with **inert** chrome — a purple (`accentPurple`) header bar, the
"2 / 5 done · See all steps ›" + progress row, and the nav pill — each labelled "story
chrome; real versions ship in #377." This is decoration in the story file only; it adds
no shipped surface to #408, and makes the visual gate apples-to-apples against the
screenshot.

**ADR-0012 correction.** Sections B/Resolved/Step-2 below claim the plain "due …" line is
an exception to ADR-0012 needing an ADR note. **This is a mis-citation.** ADR-0012 is
_no-auto-judgment_ (never read an absence as failure); it governs no typography. No ADR
mandates a mono date line — the mono-on-meta / plain-on-date split is pure prototype
fidelity with no conflict. **No ADR note is needed; F3's "needs an ADR note" is void.**

**Revised commits (round 3):**

1. `fix(focusCurrentTaskCard): flatten outer card to match prototype (R1)` — remove
   `card` frame; replace uniform gap with prototype per-element spacing (tune in the
   phone-frame story).
2. `fix(focusCurrentTaskCard): prototype typography + CTA/box/callout shadows (R2–R7)`
3. `test(focusCurrentTaskCard): phone-frame story + inert chrome for fidelity review (R8)`
4. `docs(plan): void the ADR-0012 mis-citation; record round-3 fidelity fix`

**Tests.** R1–R7 are style-only (no prop/structure change), so the 35 existing tests
stand. Per Joe's standing rule "the visual gate IS the design check," do **not** add
brittle pixel/fontSize assertions for the proportion fixes — verify them by rendering the
phone-frame story against the prototype. Keep all a11y/contract tests.

### A. Unambiguous misses — LOCKED (no system conflict; the build just got these wrong)

| #   | Element                         | Prototype                                                                                                                                            | Built (wrong)                                                                          | Correct token(s)                                                                                                                                                                 |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Planned-evidence affordance** | White **bordered box**, hard shadow, leading **type icon** (📷/📝) + bold label + blue "change"; the whole box is the tap target → opens type picker | Bare inline text + a "change" link; no box, no icon, no shadow; only "change" tappable | bg `background`, border `border`+`borderWidth.thick`, `shadowStyle(theme,"cardElevationSmall")`, radius `radius.sm`; icon from `EVIDENCE_OPTIONS`; "change" text `accentPrimary` |
| L2  | **Primary CTA color**           | Solid **blue** `#2563eb`, white ink                                                                                                                  | **Mint** (`accentMint`) — a previous-run invention logged in the Discovery Log         | bg `accentPrimary` (==`#2563eb`); fg = white via the contrast-validated `#2563eb` pair (`infoForeground`; verify in `contrastPairs.ts`)                                          |
| L3  | **"Set this step aside"**       | Quiet **inline gray text** (❚❚ glyph) in the body                                                                                                    | Full **outline button** in the CTA stack — badly over-emphasized                       | `Pressable` styled as text: `textSecondary`, `fontWeight.semibold`, leading ❚❚; keep `minHeight:44` hit area, no border/bg/shadow                                                |
| L4  | **State pill placement**        | **Above** the title, left-aligned, **DM Mono + UPPERCASE**                                                                                           | To the **right** of the title (space-between), not mono/uppercase                      | Move pill above the title; `fontFamily.mono`, `textTransform:"uppercase"`. Color still from `stepStateColorMap` (keeps the #406 one-color-language contract)                     |
| L5  | **"EVIDENCE · REQUIRED"**       | DM Mono, uppercase, letter-spaced, muted                                                                                                             | Plain body text, sentence-case                                                         | `fontFamily.mono`, `textTransform:"uppercase"`, `letterSpacing.wide`, `textMuted`, `size.xs`                                                                                     |
| L6  | **Helper line**                 | **Below** the button, centered, **blocked-state only**                                                                                               | **Above** the buttons, left-aligned, **always** shown                                  | Render under the Add button, `textAlign:"center"`, only when `captured.length === 0`                                                                                             |
| L7  | **All-complete body**           | Trophy 🏆 in a **bordered purple callout box**                                                                                                       | Plain text                                                                             | wrap in box: bg `accentPurpleLight`, border, `shadowStyle(...,"cardElevationSmall")`                                                                                             |

### B. Prototype-vs-system forks — PENDING Joe's direction call

These all turn on one question (prototype fidelity vs consistency with the shipped
Timeline/StepCard that ships beside this card). Recommendation per row; final call is Joe's.

| #   | Fork                        | Prototype                                                                                                                  | Shipped system                                | Recommendation                                                                                                                                                                                                  |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Metadata glyphs**         | Amber ⏳ / green ↩ / gray ▦ leading each line                                                                              | `TimelineStep` dropped all glyphs             | **Match prototype** (add glyphs) + file follow-up to bring `TimelineStep` band up to the same fidelity so they reconverge. `warning` (==`#d97706`) is the exact amber; ↩ uses `success`; ▦ uses `textSecondary` |
| F2  | **Dependency lines**        | Shows **both** "waiting on…" **and** "after…" as separate lines                                                            | `TimelineStep` shows one (mutually exclusive) | **Match prototype** — render every present line independently                                                                                                                                                   |
| F3  | **Meta suffix + date font** | Trailing meta ("· expected Jun 24", "✓ done") in **mono**; the "due …" line itself in **plain** text                       | ADR-0012: whole date line in mono             | **Match prototype** (mono only on the trailing meta), but this contradicts ADR-0012 — needs an ADR note if chosen                                                                                               |
| F4  | **Captured chip color**     | Green `#d4f4e7` (`accentMint`)                                                                                             | `StepCard` uses `accentPurpleLight` (purple)  | **Match prototype** (`accentMint`/`accentMintFg`); minor, easy                                                                                                                                                  |
| F5  | **Add ↔ Mark-complete**     | **Swap**: Add (no evidence) XOR ✓ Mark complete (evidence present) — never both; you cannot add a 2nd piece from this card | n/a (original plan AC said _both_ present)    | **Match prototype** (swap). Note: removes "add another piece" from the hero card. Mark-complete is still evidence-gated, so the "every step requires evidence" invariant holds                                  |

### Resolved (Joe, 2026-06-30)

- **F1–F4 → prototype wins.** Add glyphs (⏳ `warning` / ↩ `success` / ▦ `textSecondary`),
  render every present dependency line, mono only on the trailing meta suffix (plain "due …"
  text), green `accentMint`/`accentMintFg` chips. Follow-ups to file: (1) bring
  `TimelineStep` band + `StepCard` chips to the same fidelity so the surfaces reconverge;
  (2) ADR note recording this card's date-font exception to ADR-0012.
- **F5 → keep both.** `Add {type}` is always present; `✓ Mark complete` is revealed once
  evidence exists (presence logic unchanged from the build — so the related tests stand).
  The prototype gives no precedent for showing both, so for CTA _color_ keep one filled-blue
  primary at a time: no evidence → Add is filled blue (`accentPrimary`) + helper line below;
  evidence present → Mark complete is filled blue and Add drops to the outline/secondary
  treatment so a second piece can still be added. Set-aside is quiet inline text regardless (L3).
- **Token refinement (impl).** CTAs use the contrast-validated `theme.action.actionPrimary*`
  / `actionSecondary*` group rather than raw `accentPrimary`+`textInverse` (L2) — it carries
  the prototype blue (#2563eb) in light, flips to teal/dark correctly, and is already gated
  for all 7 ND variants. Captured chips use `accentMint`/`accentMintFg`. A
  `FocusCurrentTaskCard.types.ts` was split out so the main view file stays under the
  300-line limit (same D7 rationale as `.parts.tsx`).

### C. Prop-contract refinement

`plannedEvidenceType` currently carries a **label** string (`"Photo"`), which can't yield an
icon. Change it to carry the evidence **type key** (`"photo"` / `"text"` / …) so the box
derives both icon (`EVIDENCE_OPTIONS`) and label (`evidenceShortLabel`), mirroring the
captured rail. Update the four stories accordingly. (Display-only; #377 owns real wiring.)

### D. i18n copy fixes

- `helperLine`: drop the capital — prototype is lowercase "only evidence unlocks complete — nothing here blocks you."
- Completed-state rail label reads **"Evidence"** in the prototype, not "Captured" — parametrize the rail label by state.

### Revised commits for the fix

1. `fix(focusCurrentTaskCard): planned-evidence box + blue CTA + inline set-aside (L1–L3,L6)`
2. `fix(focusCurrentTaskCard): pill above title, mono labels, all-complete callout (L4,L5,L7)`
3. `fix(focusCurrentTaskCard): prototype metadata glyphs + both dep lines + green chips (F1–F4)`
4. `refactor(focusCurrentTaskCard): plannedEvidenceType → type key; story + test updates (C,D)`
5. `test(focusCurrentTaskCard): cover prototype-faithful CTA styling + metadata band`

Tests to revisit: the metadata-band assertion that assumed a single dependency line (now
both render), and the date-line `fontFamily.mono` assertion (mono now only on the trailing
meta suffix, not the "due …" text). The "both Add and Mark-complete present when evidence"
and "Add present without evidence" assertions STAND (F5 = keep both). The
set-aside-is-a-button expectation is gone — it is now inline text with a 44pt hit area.

## Intent Verification

Observable criteria a reviewer can verify by running Storybook and the test suite:

- [x] When `FocusCurrentTaskCard` renders with `status="in-progress"`, the state pill is silent
      (no pill rendered — "in-progress" position says it all per design brief), the title appears,
      the E·C·B band shows 0–3 truth-lines, the "Evidence · required" attribute is always
      present (every step requires evidence — full stop), planned evidence type + "change" affordance appear, captured
      evidence chips render in a rail, the pause CTA ("❙❙ Set this step aside") and the add-type
      CTA ("Add {type}") are both present, and the "✓ Mark complete" CTA appears only when
      captured evidence is present (never when the rail is empty).
- [x] When `status="paused"`, the state pill (color + word from `stepStateColorMap`) renders
      beside the title, the "Set aside" body copy appears, and the "► Pick this back up"
      CTA is the sole action.
- [x] When `status="completed"`, the state pill renders, the title appears, the captured
      evidence rail is present, and "Reopen this step" is the sole CTA.
- [x] When `status="all-complete"`, no pill, the "Every step done." + trophy copy appears, and
      "Design your badge" CTA is present.
- [x] The state pill color AND label both come from `stepStateColorMap` (same source as
      `TimelineNode` and `TimelineStep`); color is never the sole signal.
- [x] The E·C·B metadata band renders 0–3 lines: dependency line uses "waiting on…" or
      "after …" (never "blocked by"); date line uses `theme.fontFamily.mono` with no red
      or overdue framing.
- [x] No "missing", "needed", or "blocked" framing anywhere; "✓ Mark complete" is revealed
      by present evidence — not shown as disabled before evidence lands.
- [x] Zero hardcoded hex values; all colors resolve through `theme.*` tokens via
      `StyleSheet.create((theme) => ...)`.
- [x] All interactive elements have `accessibilityRole`, `accessibilityLabel`, and
      44pt minimum touch targets (`minHeight: 44`).
- [x] Unit tests pass; component is not imported by any screen after this PR.

## Dependencies

| Issue | Title                                               | Status       | Type    |
| ----- | --------------------------------------------------- | ------------ | ------- |
| #406  | TimelineNode — one state-color language             | Met (CLOSED) | Blocker |
| #417  | Add `paused` step status + Set aside / Pick back up | Unmet (OPEN) | Soft    |

**Status**: The hard blocker (#406) is merged. `stepStateColorMap`, `stepStateNodeBg`,
`stepStateNodeFg`, `StepStateMapKey`, `themes`, `themeNames` are all live in the codebase at
`src/components/TimelineNode/stepStateColorMap.ts`.

#417 (paused DB status) is still open. The card's `paused` state is story-displayable now via
a prop — no DB wire needed for this deliverable. The implementation uses `StepStateMapKey`
which already includes `"paused"` (added in the #406 PR). The soft dependency is not a blocker.

## Objective

Build `src/components/FocusCurrentTaskCard/` — a standalone, prop-driven hero card for the
Focus Mode screen. Four states (in-progress, paused, completed, all-steps-complete), each with
a Storybook story and unit tests. The component consumes `stepStateColorMap` so its pill token
is structurally identical to the `TimelineNode` and `TimelineStep` pill — one color language,
enforced by shared code.

## Decisions

| ID  | Decision                                                                                                                          | Alternatives Considered                                         | Rationale                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | New `src/components/FocusCurrentTaskCard/` directory (not co-located with StepCard)                                               | Co-locate under `StepCard/` as a variant; co-locate with screen | `StepOverviewCard` lives inside `StepCard/` because it IS a StepCard variant (same dispatcher). `FocusCurrentTaskCard` is a different abstraction (hero view, not carousel card). A peer-level component dir is the correct scope.                                                                                         |
| D2  | `status` prop covers `"in-progress" \| "paused" \| "completed" \| "all-complete"` as a local union (not reusing `StepCardStatus`) | Extend `StepCardStatus`; extend `StepStateMapKey`               | `all-complete` is a card-level view state (all steps done), not a per-step DB status. Adding it to either existing type would pollute upstream consumers. Local `FocusCardStatus` type is cleanest.                                                                                                                        |
| D3  | In-progress state: no state pill rendered                                                                                         | Render pill with special "silent" styling                       | Design brief: "Pill stays silent for in-progress — position says it." The pill is omitted for this state only; present evidence still reveals "✓ Mark complete" via conditional rendering (not a disabled element).                                                                                                        |
| D4  | E·C·B band re-uses the `MetadataBand` internal pattern from `TimelineStep.tsx` — extracted into props, not component import       | Import `MetadataBand` from `TimelineStep`                       | `MetadataBand` is an unexported internal function in `TimelineStep.tsx`. Extracting it to a shared file would be correct long-term but is out of scope for this deliverable. The card owns its own inline band implementation, mirroring the same pattern. A follow-up to extract it is `FocusMetadataBand` scope, not C1. |
| D5  | `stateWordPill` styling mirrored from `TimelineStep.styles.ts`                                                                    | Share via a shared styles file                                  | Same rationale as D4: the pattern is established, the shared extraction is follow-up scope. The card's `.styles.ts` imports `stepStateNodeBg`/`stepStateNodeFg` directly, same as `TimelineStep.styles.ts`.                                                                                                                |
| D6  | Add an `onAddEvidence?: () => void` prop (not in the original prop list)                                                          | Reuse `onChangeEvidenceType`; render the CTA without a handler  | The Intent Verification requires the "Add {type}" CTA to be present, and a CTA needs an `onPress`. "Change type" (#409) and "add a piece of evidence" are distinct actions, so they need distinct handlers. Real wiring is #377's.                                                                                         |
| D7  | Split shared atoms (`StateWordPill`, `MetadataBand`, `CapturedEvidenceRail`) into `FocusCurrentTaskCard.parts.tsx`                | Keep one file                                                   | The single file hit 391 lines, tripping the repo's 300-line `local/file-size-limit` warning. StepCard sets the local precedent (`StepCardTopBand`/`StepCardEvidenceCapture`/`StepOverviewCard` are sibling part-files). Both files now sit under the limit.                                                                |

## Affected Areas

- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx` — new component (4-state dispatcher + per-state views)
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.parts.tsx` — shared atoms: `StateWordPill`, `MetadataBand`, `CapturedEvidenceRail` (D7)
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles.ts` — Unistyles stylesheet
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.stories.tsx` — per-state stories + AllThemesMatrix
- `src/components/FocusCurrentTaskCard/index.ts` — barrel export
- `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx` — unit tests
- `src/i18n/resources/en/focusMode.json` — new i18n keys for card copy
- `src/i18n/resources/de/focusMode.json` — German translations for new keys
- `src/i18n/resources/pseudo/focusMode.json` — regenerated via `bun run gen:pseudo` (en↔pseudo key parity is enforced by `locale-parity.test.ts`)

## Implementation Plan

### Step 1: i18n keys for the four states

**Files**: `src/i18n/resources/en/focusMode.json`, `src/i18n/resources/de/focusMode.json`
**Commit**: `i18n(focusCurrentTaskCard): add copy keys for all 4 card states`
**Changes**:

- [x] Add `focusMode:currentTask.inProgress.*` keys:
  - `helperLine`: `"Only evidence unlocks complete — nothing here blocks you."`
  - `evidenceRequired`: `"Evidence · required"`
  - `changeEvidenceType`: `"change"`
  - `evidenceRailLabel`: `"Captured"`
  - `addTypeCta`: `"Add {{type}}"`
  - `pauseCta`: `"❙❙ Set this step aside"`
  - `markCompleteCta`: `"✓ Mark complete"`
  - `markCompleteA11y`: `"Mark this step complete"`
  - `pauseA11y`: `"Set this step aside — pause it"`
- [x] Add `focusMode:currentTask.paused.*` keys:
  - `body`: `"Set aside — still here, nothing lost. Your next step routes past it until you pick it back up."`
  - `pickUpCta`: `"► Pick this back up"`
  - `pickUpA11y`: `"Pick this step back up and continue"`
- [x] Add `focusMode:currentTask.completed.*` keys:
  - `reopenCta`: `"Reopen this step"`
  - `reopenA11y`: `"Reopen this step to add more evidence or continue work"`
- [x] Add `focusMode:currentTask.allComplete.*` keys:
  - `heading`: `"Every step done."`
  - `body`: `"🏆 Now design the badge that marks it — the keepsake comes at the end."`
  - `designBadgeCta`: `"Design your badge"`
  - `designBadgeA11y`: `"Design your badge to celebrate completing this goal"`
- [x] Mirror keys into `de/focusMode.json` (German)

### Step 2: Component and styles

**Files**: `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx`, `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles.ts`, `src/components/FocusCurrentTaskCard/index.ts`
**Commit**: `feat(focusCurrentTaskCard): four-state hero card with E·C·B band`
**Changes**:

- [x] Define `FocusCardStatus = "in-progress" | "paused" | "completed" | "all-complete"` (local union)
- [x] Define `FocusCapturedEvidenceItem` mirroring `CapturedEvidenceItem` from `StepCard.tsx:36-42` (id, type, caption)
- [x] Define `FocusCurrentTaskCardProps`:
  - `status: FocusCardStatus`
  - `title: string`
  - `plannedEvidenceType?: string | null` — the primary planned type label (display-only for in-progress)
  - `capturedEvidence?: readonly FocusCapturedEvidenceItem[]`
  - `onPause?: () => void`
  - `onPickUp?: () => void`
  - `onMarkComplete?: () => void`
  - `onReopen?: () => void`
  - `onDesignBadge?: () => void`
  - `onChangeEvidenceType?: () => void` — opens #409
  - `afterStep?: string` — C band (dependency): "after [step]"
  - `waitingOn?: { who: string; expected?: string }` — C band (dependency): "waiting on [who] · expected [date]"
  - `dueDate?: string` — B band (date): "due [date]", mono, no red
- [x] Implement `InProgressView` sub-function:
  - Title as `accessibilityRole="header"`
  - E·C·B band (0–3 lines) via inline `MetadataBand` function (mirrors `TimelineStep.tsx:259-286`); no state line (in-progress is silent)
  - "Evidence · required" attribute line — always shown (every step requires evidence); rendered in `theme.colors.textSecondary` as quiet text (Direction A's calm band, not a loud badge)
  - Planned evidence type + "change" affordance as a `Pressable` calling `onChangeEvidenceType` (accessibilityRole="button", minHeight 44)
  - Captured evidence rail (hidden when empty): label + chip row, same chip style as `StepCard.styles.ts:149-172`; chips are `accessibilityRole="text"`, never buttons
  - Helper line in `theme.colors.textSecondary`
  - Pause CTA (`Pressable`, accessibilityRole="button", minHeight 44, calls `onPause`)
  - "✓ Mark complete" CTA — conditional: only rendered when `capturedEvidence.length > 0` (evidence present reveals it; never shown as disabled when empty)
- [x] Implement `PausedView` sub-function:
  - State pill via `StateWordPill` (see below) with `status="paused"` — color+word from `stepStateColorMap`
  - Title (`accessibilityRole="header"`)
  - Body copy
  - "► Pick this back up" CTA (`Pressable`, accessibilityRole="button", minHeight 44, calls `onPickUp`)
- [x] Implement `CompletedView` sub-function:
  - State pill with `status="completed"`
  - Title (`accessibilityRole="header"`)
  - Captured evidence rail (same pattern as in-progress)
  - "Reopen this step" CTA (`Pressable`, calls `onReopen`)
- [x] Implement `AllCompleteView` sub-function:
  - No pill
  - "Every step done." heading
  - Trophy body copy
  - "Design your badge" CTA (`Pressable`, calls `onDesignBadge`)
- [x] Implement `StateWordPill` local function (mirrors `TimelineStep.tsx:242-248`):
  - Imports `stepStateNodeBg`, `stepStateNodeFg` from `../../components/TimelineNode/stepStateColorMap`
  - `StyleSheet.create((theme) => stateWordPill: (status) => ({ backgroundColor: stepStateNodeBg(theme, status), ... }))` pattern matching `TimelineStep.styles.ts:59-74`
  - Word sourced from `t(stepStateColorMap[status].badgeI18nKey)`
- [x] Implement `MetadataBand` local function (mirrors `TimelineStep.tsx:259-286`):
  - C line: `waitingOn` → `"waiting on ${who}${expected ? ' · expected ' + expected : ''}"`, else `afterStep` → `"after ${afterStep}"`, else null
  - B line: `dueDate` → `"due ${dueDate}"` in `theme.fontFamily.mono` (no red, no "overdue")
  - Returns null when both are null
- [x] `FocusCurrentTaskCard.styles.ts`: `StyleSheet.create((theme) => ...)` — no hardcoded hex; tokens from `theme.colors.*`, `theme.journey.*` (via helper fns), `theme.space.*`, `theme.radius.*`, `theme.borderWidth.*`, `theme.fontWeight.*`, `theme.fontFamily.*`, `theme.size.*`; `shadowStyle(theme, "cardElevation")` for card; `shadowStyle(theme, "cardElevationSmall")` for chips/CTAs
- [x] `index.ts`: export `FocusCurrentTaskCard` and `FocusCardStatus`

### Step 3: Stories

**Files**: `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.stories.tsx`
**Commit**: `storybook(focusCurrentTaskCard): per-state stories + AllThemesMatrix`
**Changes**:

- [x] `InProgress` story — evidence required + one planned type + two captured chips + pause + mark-complete visible
- [x] `InProgressNoEvidence` story — no captured evidence, mark-complete NOT rendered
- [x] `InProgressWithECBBand` story — all three band lines populated (afterStep, waitingOn is skipped to keep it a single C line; also a dueDate)
- [x] `Paused` story
- [x] `Completed` story — with captured evidence rail
- [x] `AllComplete` story
- [x] `AllThemesMatrix` story: reads `themes[name]` statically (same pattern as `TimelineNode.stories.tsx:213-254`); renders each of 4 states × 7 themes in a scrollable grid showing the state pill's bg+fg colors resolving from `stepStateNodeBg`/`stepStateNodeFg`; uses `MOOD_NAMES` map (copy from TimelineNode.stories.tsx:176-184)

### Step 4: Unit tests

**Files**: `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx`
**Commit**: `test(focusCurrentTaskCard): contract tests for all 4 states and no-"needed" rule`
**Changes**:

- [x] Test each of the 4 states renders without crashing
- [x] `test.each` over all 4 states: pill renders color+word (not color-only) — verify `accessibilityLabel` contains the state word
- [x] In-progress: "✓ Mark complete" is NOT present when `capturedEvidence` is empty
- [x] In-progress: "✓ Mark complete" IS present when `capturedEvidence` has items
- [x] In-progress: `onMarkComplete` is called when CTA pressed
- [x] In-progress: `onPause` is called when pause CTA pressed
- [x] In-progress: `onChangeEvidenceType` is called when "change" affordance pressed
- [x] Paused: `onPickUp` is called when pick-up CTA pressed
- [x] Completed: `onReopen` is called when reopen CTA pressed
- [x] AllComplete: `onDesignBadge` is called when design badge CTA pressed
- [x] No "missing" / "needed" / "blocked" text ever renders (`test.each` over all states)
- [x] Metadata band: "after [step]" line renders; "waiting on [who]" line renders; "due [date]" in mono (check `fontFamily` via style); date line never contains "overdue"
- [x] A11y: all interactive elements have `accessibilityRole="button"` and non-empty `accessibilityLabel`
- [x] A11y: all interactive elements have `minHeight: 44` (verify via style prop)

## Testing Strategy

- [x] Unit tests via `bun run test --testPathPatterns FocusCurrentTaskCard` (Jest 30, `@testing-library/react-native` v13, `renderWithProviders` from `src/__tests__/test-utils.tsx`)
- [x] Test file at `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx` (mirrors `src/` structure)
- [x] Use `test.each` for per-state repetition (matches established pattern in `StepCard.test.tsx:50-62` and `TimelineNode.test.tsx:16-24`)
- [ ] Manual Storybook verification: run web Storybook, open each named story, flip theme toolbar through all 7 themes; confirm AllThemesMatrix grid colors match TimelineNode grid for the same states — **NOT done by the implement run (headless); owner must verify visually before merge** (the visual gate is the design check, not the green test suite)

## Not in Scope

| Item                                                          | Reason                                                                                      | Follow-up                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| App wiring / screen import                                    | Out of scope per issue — #377 owns Focus Mode screen integration                            | #377                        |
| #409 evidence type change bottom sheet                        | CTA calls `onChangeEvidenceType` prop (noop in stories); sheet is a separate issue          | #409                        |
| Extracting `MetadataBand` / `StateWordPill` to shared package | Correct long-term; scope is C1 card delivery                                                | Follow-up issue to file     |
| `journey-step-paused-bg/fg` design tokens                     | TODO noted in `stepStateColorMap.ts:79`; `paused` uses `accentPurpleLight` fallback for now | Follow-up per the #406 TODO |
| AllComplete as a screen-level state                           | "Nothing in progress / N set aside" all-paused screen state is #377                         | #377                        |

_No items deferred that are required to meet the acceptance criteria for this issue._

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-30] Plan listed only `en`/`de` focusMode.json, but `locale-parity.test.ts` enforces
  en↔pseudo key parity per namespace. Added `pseudo/focusMode.json` via `bun run gen:pseudo`.
  The generator also rewrote `pseudo/completion.json` + `pseudo/editGoal.json` with pure
  padding-dot drift (unrelated to #408) — reverted those to keep the commit atomic.
- [2026-06-30] Added `onAddEvidence?: () => void` (D6): the AC requires the "Add {type}" CTA,
  which needs its own handler distinct from `onChangeEvidenceType`. Added a test for it.
- [2026-06-30] Split `FocusCurrentTaskCard.parts.tsx` out (D7) so neither file trips the
  300-line `local/file-size-limit` warning; matches the StepCard part-file precedent.
- [2026-06-30] Mark-complete CTA uses a `success`-tinted style (`completeCta`), distinct from
  the mint `primaryCta` (add/pick-up/design-badge), so the "you can finish now" affordance
  reads apart from the always-present add action. Secondary actions (pause/reopen) are outline.
- [2026-06-30] Step 4 test deviation: the plan's "`test.each` over all 4 states: pill renders
  color+word" can't hold literally — in-progress (D3) and all-complete render NO pill. Tests
  assert the pill word for the two pill-bearing states (paused/completed) AND assert no pill
  for the other two. Also fixed `StateWordPill` to use `useTranslation(["common","focusMode"])`
  (array form) so the typed `t()` accepts the `common:` prefixed `badgeI18nKey` — the single
  -string form returned `unknown` and broke type-check.
- [2026-06-30] Round 3 (R1–R8) applied: flattened the outer card frame, bumped title/heading
  to `3xl`, CTAs to 54pt + `modalElevation` + `radius.md`, planned box + callout to
  `cardElevation` + `radius.lg`, planned label/"change" to `sm`/`xs`, grouped the
  "EVIDENCE · REQUIRED" label with the planned box so it captions it (8px).
- [2026-06-30] R8 narrowed by Joe: the story is the **card only** at 344px width — NOT the
  recommended inert-chrome `PhoneFrame`. Joe rejected the mock header / progress / nav pill
  ("just the fucking card, no header/footer/timeline/nav"). The header, progress bar, and nav
  pill are #377's surfaces; the story must never imply this card owns them. R8's "recommended
  PhoneFrame decorator" above is **void** — the width box (`PhoneWidth`) is the whole of R8.
- [2026-06-30] Round-3 "all 35 tests stand" was wrong for R4: the a11y test asserted
  `minHeight === 44` on every button, but the CTAs are now 54pt. Relaxed to
  `>= 44` — 44pt is the WCAG floor, the assertion was over-specified. The a11y test stays;
  set-aside and the planned box still hold exactly 44.
- [2026-06-30] `helperLine` copy simplified to **"add evidence to complete"** per Joe —
  supersedes the prototype's longer "only evidence unlocks complete — nothing here blocks you"
  and the section-D lowercase note. en/de/pseudo updated (pseudo via `gen:pseudo`, unrelated
  `completion`/`editGoal` drift reverted).
