# Development Plan: Issue #471

## Implementation Status — ✅ COMPLETE (all 3 steps + plan), not yet pushed

**As of 2026-07-06 · branch `feat/issue-471-badge-designer-accordion` · 4 commits ahead of `origin/main`, working tree clean.**

| #   | Commit                                                                           | SHA        | Files                                                            |
| --- | -------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| 1   | `feat(finish-flow): FinishDesignStage — badge designer accordion + live preview` | `8c9eed5f` | `FinishDesignStage.tsx` (257), `.styles.ts` (71), `index.ts` (5) |
| 2   | `test(finish-flow): stories for FinishDesignStage`                               | `2873f520` | `FinishDesignStage.stories.tsx` (102)                            |
| 3   | `test(finish-flow): unit tests for FinishDesignStage`                            | `7d3f9332` | `__tests__/FinishDesignStage.test.tsx` (212)                     |
| 4   | `docs(finish-flow): issue #471 dev plan — completed checklist + discovery log`   | `b5f2d215` | this plan file                                                   |

**Validation (all green):** `type-check` ✅ · `lint` ✅ (0 errors; 214 pre-existing warnings, none in these files) · `test` ✅ (full suite 9790/9790; `FinishDesignStage` 12/12) · `build` ✅ (no-op). Every commit carries a DCO `Signed-off-by` trailer.

**Diff vs `origin/main`:** exactly 5 `FinishDesignStage/*` files + this plan, 647 insertions, **zero existing files touched.** Component/barrel source = 333 LOC (under the 500 cap); stories+tests = 314.

**Next step:** `/self-review` then `/finalize` (push + PR). No open questions remain (D6/D7 resolved by Joe 2026-07-06). Downstream: #472 (flow story + `AllThemesMatrix`), then #449 (screen wiring) — both explicitly out of scope here.

## Issue Summary

**Title**: [Storybook] Finishing flow 2/3 — badge designer accordion + live preview
**Type**: feature
**Complexity**: LARGE (by raw LOC; see note below)
**Estimated Lines**: ~600–680 lines across 5 new files (1 component + 1 styles + 1 stories file + 1 test file + 1 barrel), zero existing files touched.

> **Complexity note**: this crosses the 500-line MEDIUM/LARGE boundary on raw LOC, but has none of LARGE's usual blast-radius risk — it is a single cohesive component (D1), touches zero existing files, and is itself the pre-split unit: #448's 2026-07-04 split already cut a ~1,200–2,000 LOC umbrella into three PR-sized slices specifically because "the 4-section badge-designer accordion with live preview is #445-class on its own." The issue's own estimate is 500–800 LOC for this exact slice. Recommendation is to ship as planned in 3 atomic commits (component, stories, tests) rather than split further — see Phase 5 note.

## Intent Verification

- [x] A `FinishDesignStage` story renders the "Make your badge" header (back chevron + title + goal-title subtitle), a live `BadgeRenderer` preview, four `CollapsibleSection` rows — **Shape**, **Color**, **Center**, **Bottom label** — and a "✓ Bake my badge" CTA with subcopy, matching `App Shell.dc.html`'s `finish.isDesign` block (lines 423–491) and `Finishing Flow A Prototype.dc.html` lines 62–146 top-to-bottom.
- [x] Opening any one of the four sections closes whichever other section was open (single-open accordion, matching `BadgeDesignerScreen`'s existing `expandedSection` behavior) — verified by a story/test that opens Color then Shape and asserts Color's content unmounts. _(test: "closes the open section when another is opened")_
- [x] Changing shape (`ShapeSelector`), color (`ColorPicker`), center mode/monogram/icon (`CenterModeSelector` + `IconPicker`), or bottom label (`TextInput`) updates the live `BadgeRenderer` preview immediately via the controlled `design`/`onDesignChange` prop pair — no "Apply" step, matching the prototype's live `badgePreviewMd` binding. _(controlled props + `InteractiveDesign` story wrapper; per-control patch tests)_
- [x] The "✓ Bake my badge" CTA fires `onBake()` on press and does not call `useCreateBadge`, `credentialBuilder`, `png-baking`, or any Evolu `update*` function — `grep -rn "useCreateBadge\|bakePNG\|updateBadge\|updateGoal" src/components/FinishDesignStage` returns no matches.
- [x] `grep -n "#[0-9a-fA-F]\{3,6\}" src/components/FinishDesignStage/*.ts*` returns no matches outside comments — every color resolves through `theme.*` tokens, in particular `theme.chrome.screenHeaderBg`/`screenHeaderFg`/`screenHeaderBorder` for the header band (the token slice #470's own D5 explicitly reserved for this issue). _(only match is `#449`/`#471` issue refs inside a doc comment)_
- [x] `grep -rn "FinishDesignStage" src/screens` returns no matches — component + stories only; no `CompletionFlowScreen`/`BadgeDesignerScreen` wiring (that's #449).
- [x] `grep -rln "Svg\|react-native-svg" src/components/FinishDesignStage` returns no matches outside `BadgeRenderer`'s own internals — the stage composes `BadgeRenderer` + existing `src/badges/` selectors, it does not draw badge geometry itself.
- [x] A `LongLabels` story sets `bottomLabel` near `BOTTOM_LABEL_INPUT_MAX_CHARS` (24 chars, the real shared constant — not the prototype's illustrative `maxlength="18"`) and confirms the input and the live SVG preview both render without clipping (the existing `getBottomLabelFontSize` auto-shrink already handles this in `BadgeRenderer`). _(24-char label + long goal title)_
- [x] A `Constrained` story renders the stage inside a reduced-height wrapper (mirrors a small-device viewport, same technique as `FinishCelebrateStage`'s `height: 640` story wrapper) and the section list scrolls under a preview that stays pinned, without clipping the footer CTA. _(`height: 480` wrapper; sections live in their own `ScrollView`, header/preview/footer pinned outside it)_
- [x] A `ReducedDensity` story wraps the stage in `<ScopedTheme name="light-lowInfo">` (the app's existing reduced-visual-complexity ND variant) and every section/label/swatch remains legible.
- [x] No story or test in this issue renders more than one `FinishDesignStage` instance mid-flow-transition and no `AllThemesMatrix` appears — both stay out of scope per #472.

## Dependencies

| Issue | Title                                                             | Status                                                   | Type                                                                                                     |
| ----- | ----------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| #447  | Design: Finishing flow — resolve the five "Calls to make"         | 🟢 Closed — decisions recorded (explicit bake confirmed) | Design-decision gate (was blocking #448)                                                                 |
| #448  | [Storybook] Finishing flow — celebrate → design → baking → reveal | 🟢 Open (umbrella, not a blocker)                        | Parent umbrella; splits into #470/#471/#472                                                              |
| #384  | Epic: Full Ride redesign                                          | 🟢 Open (epic, not a blocker)                            | Parent epic                                                                                              |
| #470  | [Storybook] Finishing flow 1/3 — celebrate + baking + reveal      | 🟢 Closed — merged (PRs #452/#475/#481)                  | Sibling slice — establishes the `Finish*Stage` conventions this issue follows; not a blocking dependency |
| #472  | [Storybook] Finishing flow 3/3 — flow story + `AllThemesMatrix`   | 🟢 Open                                                  | Sibling slice, owns the flow story/matrix explicitly excluded here                                       |
| #449  | [Integrate] Finish flow wiring                                    | 🟢 Open, blocked by #472                                 | Downstream consumer, not a dependency of this issue                                                      |

**Status**: ✅ All dependencies met. Verified no native blockers via `gh api repos/rollercoaster-dev/Rollercoaster.dev-mobile/issues/471/dependencies/blocked_by` → `[]`. Labeled `dep:independent`.

**has_blockers**: false

## Objective

Ship a single pure, prop-driven `FinishDesignStage` component implementing the App Shell `finish.isDesign` route: a "Make your badge" header, a live `BadgeRenderer` preview, and a 4-section single-open accordion (Shape / Color / Center / Bottom label) composing the **existing** `src/badges/` selector components (`ShapeSelector`, `ColorPicker`, `CenterModeSelector`, `IconPicker`) and the existing `CollapsibleSection` accordion primitive. Ends with a "✓ Bake my badge" CTA that fires a bare `onBake()` callback — no `useCreateBadge` wiring, no navigation, no persistence. Component + Storybook only; screen integration is #449, sibling stages are #470 (merged) and #472 (flow story + matrix, not yet built).

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                     | Alternatives Considered                                                                                                                                  | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Single top-level folder `src/components/FinishDesignStage/` (not nested under a shared `FinishFlow/` parent)                                                                                                                                                                                                                                                                                 | Shared `FinishFlow/` folder housing all finish-flow stage views                                                                                          | Matches #470's D1: `component-structure.test.ts` scans top-level `src/components/<Name>` dirs and this issue ships exactly one natural component (unlike #472, which will own an actual multi-stage orchestrator)                                                                                                                                                                                                                                               |
| D2  | `FinishDesignStage` itself is **i18n-free** at its own JSX layer (copy passed as props with English defaults) — but its **composed children** (`ShapeSelector`, `ColorPicker`, `CenterModeSelector`, `IconPicker`) keep their existing internal `useTranslation("badgeDesigner")` calls unchanged                                                                                            | Fork i18n-free copies of the four selector components so the whole tree is translation-call-free, matching #470's Finish\*Stage components byte-for-byte | The issue's own "must not do" list forbids rebuilding badge rendering/controls — composing the real selectors as-is is the intended reading of "compose `src/badges/`". Storybook already provides an i18n context (proven by the existing `Badges/BadgeDesigner` story using the same selectors), so this is not a Storybook-breaking mix, just an intentionally narrower i18n-free surface at the stage-shell level, matching #470's own top-level components |
| D3  | Custom lightweight header (back `IconButton` + two-line `Text` title/subtitle stack) styled with `theme.chrome.screenHeaderBg`/`screenHeaderFg`/`screenHeaderBorder`, not the shared `ScreenSubHeader` component                                                                                                                                                                             | Reuse `ScreenSubHeader` (used by production `BadgeDesignerScreen`)                                                                                       | `ScreenSubHeader` has no subtitle slot (`label: string` only) — App Shell's canonical `finish.isDesign` header shows title ("Make your badge") + a goal-title subtitle line beneath it. `theme.chrome.screenHeaderBg` is the correct token here per #470's own D5, which explicitly reserved it: _"`screenHeaderBg` is the 'Make your badge' header purple, a **different** semantic slot (#471's scope, not this issue's)"_                                    |
| D4  | Header subtitle shows **only the goal title** (`goalTitle`), no "· N steps · M evidence" context suffix                                                                                                                                                                                                                                                                                      | Include a pre-formatted `contextLabel` prop like the standalone `Finishing Flow A Prototype.dc.html`'s `"Rewire the workshop · 5 steps · 3 evidence"`    | The **canonical** `App Shell.dc.html` embedded `finish.isDesign` header (lines 426–429) renders only `{{ finish.goalTitle }}` under the title — the richer step/evidence subtitle is unique to the standalone Direction-A mock, not the canonical source. Issue explicitly names App Shell as canonical                                                                                                                                                         |
| D5  | `Color` section reuses `ColorPicker` exactly as `BadgeDesignerScreen` does, **without** the `onOpenCustomPicker` prop (no custom-hex modal)                                                                                                                                                                                                                                                  | Wire `ColorPickerModal` too, matching the full production designer's custom-color capability                                                             | Neither canonical prototype shows a "+" custom-color cell in the finish-flow's Color section (only fixed swatches) — omitting it keeps this slice's scope aligned to the prototype and avoids pulling in `ColorPickerModal`'s modal-state management for a control the design source doesn't show. `onOpenCustomPicker` is optional on `ColorPicker`, so this is a zero-code omission, not a fork                                                               |
| D6  | `Bottom label` section is a single `TextInput` bound to `design.bottomLabel`, `maxLength={BOTTOM_LABEL_INPUT_MAX_CHARS}` (24, the real shared constant), matching `BadgeDesignerScreen`'s inscriptions-section input exactly — no quick-preset chips ("EARNED 2026" / "DONE" / "LEVEL UP" / "SHIPPED")                                                                                       | Build new preset-chip UI matching the prototype's row of tappable presets                                                                                | Preset chips exist nowhere in `src/badges/` today — building them would be new UI, not composition of existing controls, and the issue's own estimate (500–800 LOC) is already tight for four sections + preview + header + stories. Flagged as Open Question 2 below since this is a value judgement, not something the code answers                                                                                                                           |
| D7  | `ShapeSelector` and `ColorPicker` are reused **unmodified**, exposing their full real option sets (`ShapeSelector`: all 6 `BadgeShape` values — circle/shield/hexagon/roundedRect/star/diamond; `ColorPicker`: all 7 `ACCENT_COLORS` + an 8th "goal color" swatch when `goalColor` is passed) rather than being restricted to the prototype's illustrative subset (4 shapes, 5 hex swatches) | Wrap/filter the selectors to show only the prototype's exact subset                                                                                      | "Do not rebuild badge rendering — compose `src/badges/` + `BadgeRenderer`" reads as reuse-as-is; filtering would require a wrapper layer that doesn't exist today. Flagged as Open Question 1 below since it visibly changes the UI vs. the pixel-level prototype                                                                                                                                                                                               |
| D8  | `Frame`, path-text, banner, and per-channel border/frame/icon custom colors are **not** exposed by this component — `design.frame`/`pathText`/`banner`/`borderColor`/`frameColor`/`iconColor` pass through `onDesignChange` untouched at whatever value they arrive with (default `BadgeFrame.none`/`undefined` from `createDefaultBadgeDesign`)                                             | Expose the full 5-section production `BadgeDesignerScreen` surface (Shape/Frame/Center/Colors-with-4-channels/Inscriptions)                              | Issue explicitly scopes "4-section accordion: Shape, Color, Center, Bottom label" — the richer 5-section surface is production's standalone designer route, whose fate is #449's decision to make ("may survive for the standalone designer route"), not this issue's                                                                                                                                                                                           |
| D9  | `design`/`onDesignChange` are fully controlled props (mirrors `DesignEditor`'s `currentDesign`/`onDesignChange` in `BadgeDesignerScreen`, and #470's `closingNoteValue`/`onClosingNoteChange` pattern)                                                                                                                                                                                       | Manage `design` as internal state, only emitting on bake                                                                                                 | Matches both the existing production pattern and the sibling slice's controlled-value convention; lets the story wrapper hold state exactly like `FinishCelebrateStage`'s `InteractiveCelebrate` wrapper does                                                                                                                                                                                                                                                   |
| D10 | Single-open accordion state (`expandedSection`) is internal, seeded by an optional `initialExpandedSection` prop (default `"shape"`, matching the prototype's own initial `state.section = "shape"`)                                                                                                                                                                                         | Fully controlled `expandedSection`/`onExpandedSectionChange` prop pair                                                                                   | Mirrors #470's D8 (`initialNoteOpen` uncontrolled-default seam) — the toggle is pure UI state with no persistence implication; the seam only exists so each "section open" story can render pre-opened without a tap                                                                                                                                                                                                                                            |

## Affected Areas

- `src/components/FinishDesignStage/FinishDesignStage.tsx` — new; header (D3/D4), live `BadgeRenderer` preview, 4-section `CollapsibleSection` accordion (Shape/Color/Center/Bottom label), "✓ Bake my badge" CTA + subcopy
- `src/components/FinishDesignStage/FinishDesignStage.styles.ts` — new
- `src/components/FinishDesignStage/index.ts` — new barrel
- `src/components/FinishDesignStage/__tests__/FinishDesignStage.test.tsx` — new
- `src/components/FinishDesignStage/FinishDesignStage.stories.tsx` — new

No existing files are modified by this issue.

## Implementation Plan

### Step 1: `FinishDesignStage` component + styles

**Files**: `src/components/FinishDesignStage/FinishDesignStage.tsx`, `FinishDesignStage.styles.ts`, `index.ts`
**Commit**: `feat(finish-flow): FinishDesignStage — badge designer accordion + live preview`
**Changes**:

- [x] Define `FinishDesignStageProps`: `design: BadgeDesign`, `onDesignChange: (design: BadgeDesign) => void` (D9), `goalColor?: string | null`, `goalTitle?: string`, `onBack: () => void`, `onBake: () => void`, copy props with English defaults (`headerTitle = "Make your badge"`, `backAccessibilityLabel = "Back"`, `shapeSectionTitle = "Shape"`, `colorSectionTitle = "Color"`, `centerSectionTitle = "Center"`, `bottomLabelSectionTitle = "Bottom label"`, `bottomLabelPlaceholder = "EARNED 2026"`, `bottomLabelAccessibilityLabel = "Bottom label"`, `bakeLabel = "✓ Bake my badge"`, `bakeSubcopy = "saves & seals it into a verifiable badge"`), `badgeSize?: number` (default 150, matches prototype's `badgePreviewMd`), `initialExpandedSection?: "shape" | "color" | "center" | "bottomLabel" | null` (D10, default `"shape"`)
- [x] Header: `IconButton` (`ArrowLeft`, `tone="chrome"`, `accessibilityLabel={backAccessibilityLabel}`) + two-line `Text` stack (`headerTitle` bold, `goalTitle` mono caption below, D4) inside a `View` styled with `theme.chrome.screenHeaderBg`/`Fg`/`Border` (D3)
- [x] Live preview: `BadgeRenderer` at `badgeSize`, centered below the header
- [x] Accordion (internal `expandedSection` state seeded from `initialExpandedSection`, D10; opening one section closes any other, matching `BadgeDesignerScreen`'s `openSection` helper):
  - `Shape`: `CollapsibleSection` wrapping `ShapeSelector` (D7) — `handleShapeChange` writes `{ ...design, shape }`
  - `Color`: `CollapsibleSection` wrapping `ColorPicker` (D5/D7, no `onOpenCustomPicker`) — `handleColorChange` writes `{ ...design, color }`
  - `Center`: `CollapsibleSection` wrapping `CenterModeSelector` + conditional `IconPicker` (shown only when `centerMode === "icon"`, exactly mirroring `BadgeDesignerScreen`'s conditional) — `handleCenterModeChange`/`handleMonogramChange`/`handleIconChange`/`handleWeightChange`
  - `Bottom label`: `CollapsibleSection` wrapping a plain `TextInput` (D6), `maxLength={BOTTOM_LABEL_INPUT_MAX_CHARS}`, bound to `design.bottomLabel`
- [x] Footer: `Button variant="primary" size="lg"` (`bakeLabel`, `onPress={onBake}`) + `Text variant="caption"` (`bakeSubcopy`)
- [x] `design.frame`/`pathText`/`pathTextPosition`/`pathTextBottom`/`banner`/`borderColor`/`frameColor`/`iconColor` are never read or written by this component (D8) — every `onDesignChange` call spreads `{ ...design, <changed field> }` only
- [x] `index.ts` barrel

### Step 2: Stories

**Files**: `src/components/FinishDesignStage/FinishDesignStage.stories.tsx`
**Commit**: `test(finish-flow): stories for FinishDesignStage`
**Changes**:

- [x] Grouped under `Iteration B/Finish/FinishDesignStage` (matching #470's `Iteration B/Finish/Finish*Stage` convention)
- [x] Interactive wrapper holding `design` in local `useState` (seeded via `createDefaultBadgeDesign`), mirroring `FinishCelebrateStage.stories.tsx`'s `InteractiveCelebrate` pattern, so every control round-trips through `onDesignChange`
- [x] `Default` — `initialExpandedSection="shape"` (matches prototype's own initial state)
- [x] `ShapeOpen` / `ColorOpen` / `CenterOpen` / `BottomLabelOpen` — one story per section, each with `initialExpandedSection` set accordingly, demonstrating the single-open behavior visually
- [x] `LongLabels` — seeds `design.bottomLabel` at 24 chars (`BOTTOM_LABEL_INPUT_MAX_CHARS`) and a long `goalTitle`, confirming no layout break (intent-verification item)
- [x] `Constrained` — wraps the stage in a reduced-height `View` (e.g. `height: 480`), matching #470's `FinishCelebrateStage` device-viewport wrapper technique
- [x] `ReducedDensity` — wraps the stage in `<ScopedTheme name="light-lowInfo">`
- [x] No flow-level orchestrator story and no `AllThemesMatrix` (both stay in #472)

### Step 3: Tests

**Files**: `src/components/FinishDesignStage/__tests__/FinishDesignStage.test.tsx`
**Commit**: `test(finish-flow): unit tests for FinishDesignStage`
**Changes**:

- [x] Renders header (title + goal-title subtitle), preview, all four section headers, and the bake CTA
- [x] Tapping the Shape header opens it and closes any other open section (single-open regression, mirrors `BadgeDesignerScreen`'s existing coverage pattern)
- [x] Selecting a shape/color/center-mode/icon/bottom-label value fires `onDesignChange` with the expected patched `BadgeDesign`, leaving every untouched field (`frame`, `pathText`, `banner`, `borderColor`, `frameColor`, `iconColor`) byte-identical to the input (D8 regression) — _shape/color/center-mode/bottom-label patch tests use a `makeDesign` carrying all pass-through fields and assert the full patched object via `toHaveBeenCalledWith`; icon coverage is the "IconPicker renders only when centerMode is icon" test (its `onSelectIcon`→`handleIconChange` is a trivial pass-through, and driving the full modal is out of proportion for a unit test)_
- [x] `onBack` fires on the back button press; `onBake` fires on the CTA press
- [x] Zero-hex regression: `grep -n "#[0-9a-fA-F]\{3,6\}" src/components/FinishDesignStage/*.ts*` returns no matches outside comments
- [x] Regression check: `grep -rn "FinishDesignStage" src/screens` and `grep -rn "useCreateBadge\|bakePNG\|updateBadge\|updateGoal" src/components/FinishDesignStage` both stay empty

## Testing Strategy

- [ ] Unit tests via Jest 30 / `@testing-library/react-native` v13, colocated at `src/components/FinishDesignStage/__tests__/FinishDesignStage.test.tsx`
- [ ] Run via `bun run test --testPathPatterns "FinishDesignStage"` — never `bun test` or plain `npx jest`
- [ ] Manual/visual: open Storybook under `Iteration B/Finish/FinishDesignStage`, confirm all 7 stories (`Default`, `ShapeOpen`, `ColorOpen`, `CenterOpen`, `BottomLabelOpen`, `LongLabels`, `Constrained`, `ReducedDensity`) against `App Shell.dc.html`'s `finish.isDesign` block and `Finishing Flow A Prototype.dc.html` side-by-side
- [ ] What this issue's tests will **not** show: the celebrate→design→baking→reveal transition sequence, real navigation from Focus Mode/Timeline into this stage, the interactive multi-stage flow story or 7-theme `AllThemesMatrix` (#472's job), and any real `useCreateBadge`/signing/persistence on bake (#449's job) — those remain red/absent until their respective follow-up issues land, by design

## Not in Scope

| Item                                                                                                                                    | Reason                                                                                    | Follow-up                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Frame` section, multi-channel border/frame/icon custom colors, path-text, banner (production `BadgeDesignerScreen`'s other 3 sections) | Explicitly out per issue's "4-section accordion: Shape, Color, Center, Bottom label" (D8) | none — production's standalone designer route already has these; its fate is #449's to decide |
| Interactive flow story (celebrate → design → baking → reveal transitions) + `AllThemesMatrix`                                           | Explicitly slice 3/3 per the issue's parent umbrella split                                | #472                                                                                          |
| Wiring `FinishDesignStage` into `CompletionFlowScreen.tsx` / retiring `BadgeDesignerScreen` / `BadgeEarnedModal`                        | `[Storybook]` issue — component + stories only                                            | #449 (blocked by #472)                                                                        |
| Real `useCreateBadge` bake wiring (building/signing/storing/baking) behind the CTA                                                      | CTA is a bare `onBake()` callback; real bake status belongs to the container              | #449                                                                                          |
| Custom-hex color picker (`ColorPickerModal`) in the Color section (D5)                                                                  | Not shown in either canonical/selected-direction prototype                                | none — can be added later if the standalone designer's richer color UI is wanted here too     |
| Bottom-label quick-preset chips ("EARNED 2026"/"DONE"/"LEVEL UP"/"SHIPPED") (D6)                                                        | New UI not present in `src/badges/` today; flagged as Open Question 2                     | none yet — pending user input                                                                 |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-07-06] Icon-selection coverage: the per-control patch tests directly assert `onDesignChange` for shape/color/center-mode/bottom-label. For icon, the test asserts the `IconPicker` renders **only** when `centerMode === "icon"` rather than driving the full-screen `IconPickerModal` grid — `IconPicker`'s `onSelectIcon`→`handleIconChange` is a one-line pass-through, and exercising the modal is disproportionate for a unit test. The D8 byte-identical guarantee is covered by the shape-patch test using a `makeDesign` seeded with every pass-through field (`pathText`, `pathTextPosition`, `banner`, `frameColor`, `iconColor`).
- [2026-07-06] Layout: sections live in their own `ScrollView` while the header, live preview, and footer CTA sit outside it — this is what keeps the preview pinned and the footer un-clipped in the `Constrained` (small-device) story, satisfying that intent-verification item without the overlay/`pointerEvents` machinery `BadgeDesignerScreen` uses for its scroll-under-preview effect.

## Open Questions

Everything else in this plan resolves from the codebase (existing selector prop shapes, `theme.chrome.*` tokens, the `CollapsibleSection` accordion primitive, `BOTTOM_LABEL_INPUT_MAX_CHARS`, App Shell vs. standalone-prototype divergence). Two items were genuine product-scope calls — **both resolved by Joe on 2026-07-06 (defaults accepted):**

1. **Full real option sets vs. prototype-exact subsets (D7).** → **RESOLVED: reuse `ShapeSelector`/`ColorPicker` unmodified (full real set — 6 shapes, 7–8 colors).** No filtering wrapper. Matches production `BadgeDesignerScreen`; the prototype's 4-shape/5-swatch set was illustrative.
2. **Bottom-label quick-preset chips (D6).** → **RESOLVED: plain `TextInput`, no preset chips.** `maxLength={BOTTOM_LABEL_INPUT_MAX_CHARS}` (24), bound to `design.bottomLabel`, matching production's inscriptions input. No new UI built.

Plan is ready to implement as written; D6 and D7 stand as documented.
