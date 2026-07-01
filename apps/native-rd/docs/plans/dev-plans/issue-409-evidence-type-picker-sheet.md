# Development Plan: Issue #409

## Issue Summary

**Title**: [Storybook] Evidence-type picker sheet
**Type**: enhancement (re-skin existing component + add missing story)
**Complexity**: SMALL
**Estimated Lines**: ~260 lines (incl. story + tests + i18n)

Re-skins `src/components/EvidenceTypePicker/EvidenceTypePicker.tsx` — which already
owns the canonical 6-type list, labels, icons, and a11y keys — to add a new
**`mode="capture"`** presentation: the "Add evidence" modal bottom sheet from
`Add Evidence Nav.dc.html` (type-pick stage only) and `Focus Mode A Prototype.dc.html`'s
"Evidence type" sheet. Adds the missing `EvidenceTypePicker.stories.tsx` covering the
capture sheet, the existing authoring chip grid, and the compact variant, across all 7
product themes. No app wiring — not imported by any screen yet (#377 owns that).

**Canonical flow reference:** `App Shell (token-backed).dc.html` is the end-to-end
interactive prototype. It shows the picker as a single-select sheet (`focus.openPicker`
→ pick sets the planned type + closes) opened by an _external_ `[icon label  change]`
card row (line 165) — which #408's `FocusCurrentTaskCard` already ships. That fixes the
"change" affordance as external, not an in-sheet control (see D6).

## Intent Verification

- [x] When `mode="capture"` and `visible`, a modal bottom sheet renders with header
      "Add evidence", sub-line "Saving to your active step · {activeStepTitle}", and a
      3-column grid of the 6 `EVIDENCE_OPTIONS` (Photo, Video, Voice, Note, Link, File)
      using the same icons/labels as the authoring chip grid. _(Structure + copy unit-tested;
      rendering verified in `storybook:web` — Note pre-highlighted, DM-Mono sub-line, 3-up grid.)_
- [x] Tapping a type in the sheet calls `onSelectType(type)` — the sheet does not own
      capture-flow state (no "confirm"/"done" stages; those belong to the screen
      integration, out of scope here). _(Tested: `it.each` over all 6 types.)_
- [x] When a `selectedType` is passed to the capture sheet, that type renders with a
      selected/highlighted visual state and "Note" (`EvidenceType.text`) is the type
      pre-highlighted when no `selectedType` is given (prototype: "Note is the easy
      default"). _(Tested: default-Note + explicit-Photo highlight cases.)_
- [x] The "change" affordance is the sheet **being re-opened with the current type
      pre-highlighted** — NOT an in-sheet "Change" row. Opening the sheet with a
      non-default `selectedType`, then tapping a different cell, swaps the pick and fires
      `onSelectType`. The invokers (the planned-evidence card row shipped in #408, the
      nav "+") live outside this component (#377 wires them). Confirmed against
      `App Shell (token-backed).dc.html` (`focus.openPicker`/`closePicker` + the external
      `[icon label  change]` card row at line 165), which has no in-sheet "Change" control.
      _(No `onRequestChange`/Change row in the API; `CaptureSheetChangeScenario` story demos it.)_
- [x] The existing authoring chip grid (multi-select, `onToggleType`) and `compact`
      variant render unchanged — same DOM output, same tests pass, zero behavior
      regression. _(14 pre-existing tests pass unmodified.)_
- [x] `EvidenceTypePicker.stories.tsx` exposes: the capture sheet (default + a
      "change" open state), the authoring chip grid, the compact variant, and an
      `AllThemesMatrix` story rendering the capture sheet across all 7 product themes.
      _(Matrix tiles `CaptureSheetBody` inline per D7; verified in `storybook:web` — all 7
      themes render with correct per-theme tokens, no modal stacking.)_
- [x] Every color/spacing/radius/shadow value in new code resolves through `theme.*` —
      `grep -n "#[0-9a-fA-F]\{3,6\}"` on the two edited/added source files (excluding
      the emoji icon strings already in `EVIDENCE_OPTIONS`) returns nothing. _(Only match
      is `#377`, an issue reference in a doc comment — not a color.)_
- [x] All interactive targets (6 type cells + close + change) measure ≥44×44pt and
      carry `accessibilityRole`/`accessibilityLabel`. _(Cells `minHeight:44` + ~⅓ sheet width;
      close `44×44`; each cell `role="radio"`+label, close `role="button"`+label.)_

## Dependencies

| Issue | Title                                               | Status | Type |
| ----- | --------------------------------------------------- | ------ | ---- |
| none  | Issue body states "Dependencies: none — start now." | ✅ Met | —    |

**Status**: ✅ All dependencies met — no blockers.

Not a dependency, but load-bearing context: **#408** (`FocusCurrentTaskCard`, merged in
`824c1f52`) already ships `onChangeEvidenceType?: () => void` — a bare callback the
in-progress card wires to a pressable "planned evidence" box + inline "change" text —
with an explicit comment: `// app plumbing (#377 owns the real wiring; #409 owns the
type-change sheet)`. This issue's capture-sheet API is what that callback will
eventually open (wiring itself is #377, not this issue).

## Objective

Add a `mode` prop to the existing `EvidenceTypePicker` that switches its presentation
between the current inline authoring chip grid (`mode="authoring"`, the default — fully
backward compatible) and a new modal bottom-sheet capture picker (`mode="capture"`)
matching the prototype. Both modes read from the same `EVIDENCE_OPTIONS` /
`evidenceLabel` / `common:a11y.*` source — no second type list. Ship
`EvidenceTypePicker.stories.tsx` with theme coverage. No screen imports this component
yet; that lands in #377.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Alternatives Considered                                                                                                                                                                                                                                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Add `mode="capture"` **to the existing component** (not a thin wrapper).                                                                                                                                                                                                                                                                                                                                                                                                | (a) Thin `EvidenceTypeSheet` wrapper component that imports `EVIDENCE_OPTIONS`/`evidenceLabel` directly and renders its own grid, delegating nothing to `EvidenceTypePicker`. (b) Wrapper that renders `<Modal>` around the existing `EvidenceTypePicker` full-mode chip grid unstyled. | (b) fails the acceptance criterion outright — the prototype's sheet is a 3-column icon-over-label grid with single-select-to-highlight semantics, visually and interactively distinct from the multi-select pill chips; wrapping the existing render output can't reshape it. (a) satisfies "single option/label/icon/a11y source" only by re-importing the same modules a second time, duplicating the render/JSX logic (icon+label cell, a11y hint construction) across two files for one component's two facades — more surface area for the two to drift, and it's a second public component to discover/import correctly. Extending the existing component with a `mode` prop keeps one file owning "how a 6-type option renders," with `mode` only changing selection semantics (multi-toggle vs. single-pick-to-highlight) and container (`View` vs. `Modal` sheet). This matches the issue's own framing ("keep the option/label/icon/a11y source single") most directly. |
| D2  | Sheet uses RN's built-in `Modal` (`transparent`, `animationType="slide"`, `onRequestClose`, `accessibilityViewIsModal`) — the same primitive as `ConfirmDeleteModal`, `IconPickerModal`, `PhotoViewerModal`, `VideoPlayerModal`, `AudioPlayerModal`, `TextNoteViewerModal`.                                                                                                                                                                                             | `EvidenceDrawer`'s bespoke `Animated.View` + manual overlay + `useSharedValue` height animation (no `Modal`, always mounted, positioned `absolute` inside the screen).                                                                                                                  | `EvidenceDrawer` is legacy pre-redesign code explicitly slated for deletion in #377 ("delete `MiniTimeline`/`ProgressDots`/`CardCarousel`/`EvidenceDrawer` usage" — `docs/plans/2026-06-29-full-ride-redesign-rescope.md`). Every other modal in the app (6 of them) uses RN `Modal`, which also gives free platform a11y behavior (VoiceOver/TalkBack focus containment, Android back-button → `onRequestClose`) satisfying the issue's "focus management + dismiss + a11y roles" acceptance line without hand-rolling it. `Modal` also matches web Storybook's `@storybook/react-native-web-vite` shim, which portals via `react-native-web`'s `Modal` (preserves React context, so `ScopedTheme` in the `AllThemesMatrix` story still resolves correctly through the portal).                                                                                                                                                                                                  |
| D3  | Capture-sheet API is a **single-select picker**: tapping a cell fires `onSelectType(type)` and the controlled caller sets the planned type + flips `visible` to close (matching the prototype's `pick: () => …{planned:{...o}}, pickerOpen:false`). This component only renders **the type-pick stage** of the prototype sheet (header, sub-line, 6-cell grid) — no confirm/done stages.                                                                                | Building the full 3-stage prototype flow (pick → confirm "Save to step {title}" with a step-swap list → "Saved to {title}" done toast) inside this component.                                                                                                                           | The confirm/done stages operate on **steps**, not evidence types — "Save to step {title}", the step-swap list, and "Your evidence count just ticked up" all require step data and capture-flow state this presentational component has no reason to hold. The issue itself draws this line: "No app wiring — the nav '+' + active-step targeting is #377."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D6  | **No in-sheet "change" control.** The "change" affordance is the _external_ planned-evidence card row (`[icon  label  change]`) that opens this sheet — already shipped in #408's `FocusCurrentTaskCard` via `onChangeEvidenceType`. This component satisfies "change" by being re-openable with the current pick pre-highlighted (`selectedType`) so the user can tap a different type. (Supersedes the researcher's earlier optional `onRequestChange` in-sheet row.) | An optional `onRequestChange` prop rendering a "Change" row inside the sheet (earlier draft).                                                                                                                                                                                           | `App Shell (token-backed).dc.html` is the canonical end-to-end flow and has **no** in-sheet "Change" control: line 165 is the external card row (`onClick=focus.openPicker`, with a blue "change" label), and the picker sheet at line 624 (`focus.openPicker`/`closePicker`) is a bare `Evidence type ×` grid that highlights the current planned type (`bg: cs.planned.label === o.label ? …`) and closes on pick. Rendering a "Change" row inside the sheet would duplicate the external affordance and diverge from the prototype.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D4  | New copy strings ("Add evidence", "Saving to your active step · {title}", "Change") go in the existing `common` namespace (`src/i18n/resources/en/common.json`), nested under a new `evidenceTypePicker` key — not a new namespace.                                                                                                                                                                                                                                     | New `focusMode.json` keys (since the sub-line references "active step") or a brand-new namespace.                                                                                                                                                                                       | `EvidenceTypePicker` already imports only `common` (`useTranslation(["common"])`, `evidenceLabel`/`common:a11y.*`). The component has no screen/feature affinity — it's used from step-authoring today and will be used from Focus Mode later (#377) — so its own copy belongs beside its own `a11y.*` block in `common`, not borrowed into a screen-specific namespace it doesn't otherwise depend on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D5  | "Note" (`EvidenceType.text`) is the default highlighted cell in capture mode when the caller passes no `selectedType`, matching `Focus Mode A Prototype.dc.html`'s "Note is the easy default."                                                                                                                                                                                                                                                                          | Requiring callers to always pass an explicit `selectedType`; defaulting to the first `EVIDENCE_OPTIONS` entry (Photo).                                                                                                                                                                  | The issue quotes this prototype line verbatim as a requirement, and `EVIDENCE_OPTIONS[0]` is `photo`, not `text` — so the default has to be an explicit fallback in the component, not "just pick index 0."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

| D7 | Extract the sheet body (handle + header + sub-line + 3-up grid) into an internal `CaptureSheetBody` component in the same file — rendered inside the `Modal` by the capture branch, and rendered **without** the Modal by the `AllThemesMatrix` story. **Not** exported from the barrel `index.ts`. (Added during implementation.) | (a) Keep the body inline and have `AllThemesMatrix` render seven full `mode="capture"` modals. (b) Drop `AllThemesMatrix`, verify themes via Storybook's global theme toolbar on the single `CaptureSheet` story. | (a) doesn't work: react-native-web 0.21.2 (the `@storybook/react-native-web-vite` runtime) renders `Modal` via `ModalPortal` (`createPortal` to a `<body>`-appended div) with `position: fixed` — seven live modals stack full-screen, so the "matrix" would show only the last theme. A stacked-modal matrix is a fake visual gate. (b) drops an explicit acceptance criterion. Extracting an internal presentational body keeps **one** source of the grid JSX (Modal branch and matrix render the same component — no duplication, so D1's single-source intent still holds) and lets the matrix tile real per-theme sheets inline. Kept out of the barrel so it isn't a second _public_ picker (the D1 concern); the story imports it directly from the `.tsx`. |

## Affected Areas

- `src/components/EvidenceTypePicker/EvidenceTypePicker.tsx`: add `mode: "authoring" \| "capture"` prop (default `"authoring"`, preserving current behavior exactly); add capture-mode render path (`Modal` + header + sub-line + 3-col grid, no in-sheet "change" row per D6); add `selectedType`, `onSelectType`, `activeStepTitle`, `visible`, `onClose` props scoped to capture mode. Prop names `visible`/`onClose` match the sibling-modal convention (`IconPickerModal`, `PhotoViewerModal`, `TextNoteViewerModal`, `AudioPlayerModal` all use `visible: boolean` + `onClose: () => void`).
- `src/components/EvidenceTypePicker/EvidenceTypePicker.styles.ts`: add capture-sheet styles (`overlay`, `sheet`, `handle`, `header`, `subLine`, `grid`, `cell`, `cellSelected`, `cellIcon`, `cellLabel`, `changeAffordance`) using `theme.*` tokens (`theme.radius.xl` for top corners per `EvidenceDrawer` prior art, `theme.shadow.modalElevation`/`shadowStyle` for the sheet, `theme.colors.shadow` + alpha for the overlay per `ConfirmDeleteModal`/`EvidenceDrawer` prior art).
- `src/components/EvidenceTypePicker/__tests__/EvidenceTypePicker.test.tsx`: extend with a `describe("capture mode")` block; existing `full mode` / `compact mode` blocks untouched (still exercise `mode="authoring"` default, backward compatible — no prop changes needed on existing call sites since `mode` defaults to `"authoring"` and `compact` behavior is unchanged).
- `src/components/EvidenceTypePicker/EvidenceTypePicker.stories.tsx` (new): capture sheet (default, "Note" highlighted; a second story with a non-default `selectedType`), authoring chip grid, compact variant, `AllThemesMatrix` for the capture sheet across all 7 product themes.
- `src/i18n/resources/en/common.json`: add `evidenceTypePicker.addEvidence` and `evidenceTypePicker.savingToActiveStep` (`{{title}}` interpolation). Reuse `common:actions.close` for the sheet's close/backdrop a11y label (no new key). No `change` key (D6).
- `src/i18n/resources/de/common.json`, `src/i18n/resources/pseudo/common.json`: populated by `bun run i18n:sync` after the `en` keys land (not hand-written; doesn't count against the LOC budget per `docs/plans/2026-06-29-full-ride-redesign-rescope.md`, D11 precedent).

## Implementation Plan

### Step 1: Extend types + props for capture mode

**Files**: `src/components/EvidenceTypePicker/EvidenceTypePicker.tsx`
**Commit**: `feat(evidence-type-picker): add capture mode prop surface`
**Changes**:

- [ ] Add `mode?: "authoring" | "capture"` (default `"authoring"`) to `EvidenceTypePickerProps`.
- [ ] Add capture-only props: `visible?: boolean` (Modal visibility — capture mode only), `activeStepTitle?: string`, `selectedType?: EvidenceTypeValue` (defaults to `EvidenceType.text` inside the capture branch per D5), `onSelectType?: (type: EvidenceTypeValue) => void` (fires on cell tap; controlled caller updates selection + closes), `onClose?: () => void` (closes the sheet — wired to `Modal.onRequestClose`, backdrop tap, and the header `×` control). No `onRequestChange` (D6 — the "change" affordance is external).
- [ ] Guard: when `mode === "capture"`, `compact` and `onToggleType`/`selectedTypes` (the multi-select props) are ignored — keep the existing prop set on the interface as-is (no breaking removal) but branch rendering on `mode` before `compact`.
- [ ] Import `EvidenceType` from `../../db` (already a test-only import today; promote to a real import for the D5 default) and `Modal`, `Pressable` (already imported) from `react-native`.

### Step 2: Capture-sheet render path + styles

**Files**: `src/components/EvidenceTypePicker/EvidenceTypePicker.tsx`, `src/components/EvidenceTypePicker/EvidenceTypePicker.styles.ts`
**Commit**: `feat(evidence-type-picker): render capture-mode modal sheet`
**Changes**:

- [ ] `EvidenceTypePicker.styles.ts`: add `overlay` (absolute fill, backgroundColor built as a template literal on `theme.colors.shadow` with an alpha suffix, directly inside the `StyleSheet.create((theme) => ...)` callback — confirmed working via `EvidenceDrawer.styles.ts:20`'s identical template-literal-alpha-on-`theme.colors.shadow` usage; no inline-style workaround needed), `sheet` (bottom-anchored, `borderTopLeftRadius`/`borderTopRightRadius: theme.radius.xl`, `borderTopWidth: theme.borderWidth.thick`, `borderColor: theme.colors.border`, `backgroundColor: theme.colors.background`, `...shadowStyle(theme, "modalElevation")`), `handle` (small centered bar, `theme.colors.textMuted` or `border`), `sheetHeader` (title row), `sheetTitle`, `subLine` (`theme.colors.textMuted`, `fontFamily: theme.fontFamily.mono` matching the prototype's DM Mono sub-line), `grid` (`flexDirection: row`, `flexWrap: wrap`, 3-up via `width: "31%"` or `flexBasis` — verify against existing grid patterns in the codebase for the exact 3-column technique, e.g. `IconPickerModal.styles`'s `MODAL_GRID_COLUMNS` constant approach), `cell` (`minHeight: 44`, `borderWidth: theme.borderWidth.thick`, `borderColor: theme.colors.border`, `backgroundColor: theme.colors.background`, `...shadowStyle(theme, "cardElevationSmall")`), `cellSelected` (`backgroundColor: theme.colors.accentPrimary` matching the existing `chipSelected` treatment for consistency), `cellIcon`, `cellLabel`, `cellLabelSelected`. (No `changeRow` style — D6.)
- [ ] `EvidenceTypePicker.tsx`: add the capture branch — checked first in the render function, before the existing `if (compact)` check. Structure: `<Modal transparent animationType="slide" visible={visible} onRequestClose={onClose} accessibilityViewIsModal>` wrapping an overlay `Pressable` (dismiss on backdrop tap, `accessibilityLabel` via reused `common:actions.close`) + the bottom sheet `View` containing: handle bar, header row ("Add evidence" title using `common:evidenceTypePicker.addEvidence` + a `×` close `Pressable` calling `onClose`, matching the prototype's `Evidence type ×` header control), sub-line (`common:evidenceTypePicker.savingToActiveStep` interpolated with `activeStepTitle` — render nothing if `activeStepTitle` is omitted, don't throw), and the 6-cell grid (map `EVIDENCE_OPTIONS`, same icon/label source, `accessibilityRole="radio"` + `accessibilityState={{ checked: opt.type === effectiveSelectedType }}` since this is single-select, not the authoring grid's `checkbox` role). No "Change" row (D6).
- [ ] Each grid cell's `onPress` calls `onSelectType?.(opt.type)`. No internal `stage` state machine (confirm/done) — pressing a cell is a single synchronous callback; the controlled caller updates the selection and closes the sheet (`visible=false`), mirroring the prototype's `pick` handler (`{planned:{...o}}, pickerOpen:false`). Consistent with D3.

### Step 3: i18n keys (en source + sync)

**Files**: `src/i18n/resources/en/common.json`
**Commit**: `feat(i18n): add evidence-type picker capture-sheet copy`
**Changes**:

- [ ] Add `evidenceTypePicker: { addEvidence: "Add evidence", savingToActiveStep: "Saving to your active step · {{title}}" }` to `src/i18n/resources/en/common.json`. (No `change` key — the "change" label lives on #408's already-shipped card, not this sheet; D6.)
- [ ] Decide close-button a11y label: reuse `common:actions.close` (already exists, generic "Close") rather than minting a new key — apply it directly in Step 2's close/backdrop `accessibilityLabel`.
- [ ] Run `bun run i18n:sync` to populate `de`/`pseudo` locales (excluded from the LOC budget; verify it completes without manual edits needed, per `docs/plans/2026-06-29-full-ride-redesign-rescope.md` D11 precedent).
- [ ] Run `bun run i18n:lint-source` if it's part of the standard pre-PR gate (check `package.json` script list at implementation time — it's `bun run scripts/i18n/lintSource.cli.ts`).

### Step 4: Tests

**Files**: `src/components/EvidenceTypePicker/__tests__/EvidenceTypePicker.test.tsx`
**Commit**: `test(evidence-type-picker): cover capture-mode sheet`
**Changes**:

- [ ] New `describe("capture mode")` block: renders all 6 options with correct labels/icons when `mode="capture"` and `visible`; defaults to `EvidenceType.text` ("Note") highlighted when `selectedType` omitted (D5); highlights the passed `selectedType` when provided (the "change" re-open scenario — D6); calls `onSelectType` with the correct type on cell press; each cell has `accessibilityRole="radio"` and correct `accessibilityState={{ checked }}`; renders the sub-line with the interpolated `activeStepTitle` when provided, omits it when not; `onClose` fires on backdrop press, on the header `×`, and via `onRequestClose`.
- [ ] Confirm existing `full mode` / `compact mode` describe blocks pass unmodified (they exercise the default `mode="authoring"` path — no prop changes required on those call sites).
- [ ] Use `test.each` for the 6-option label/icon assertions where the existing suite already does (mirrors existing `it.each` for hint text).

### Step 5: Storybook stories

**Files**: `src/components/EvidenceTypePicker/EvidenceTypePicker.stories.tsx` (new)
**Commit**: `docs(evidence-type-picker): add capture sheet, authoring grid, compact stories`
**Changes**:

- [ ] `CaptureSheet` story: `useState` for `visible`/`selectedType` (mirrors `ConfirmDeleteModal.stories.tsx`'s trigger-button + `useState` pattern), a trigger button, `activeStepTitle="Wire the relay panel"` (prototype's sample step title), Note pre-highlighted.
- [ ] `CaptureSheetChangeScenario` story: same as above but opened with a non-default `selectedType` (e.g. `photo`) — the "change" re-open case (D6), demonstrating the highlighted cell differs from the Note default. (No `onRequestChange`/in-sheet "Change" row; this story IS the "change" affordance demonstration — the sheet re-opened on an existing pick.)
- [ ] `AuthoringChipGrid` story: existing full-mode multi-select chip grid (`mode="authoring"` — the default; can omit `mode` entirely to also prove backward compatibility).
- [ ] `Compact` story: existing compact variant.
- [ ] `AllThemesMatrix` story: capture sheet only (the newly-added surface), looping `themeNames` from `../../themes/compose` with `ScopedTheme`, following `FocusCurrentTaskCard.stories.tsx`'s `AllThemesMatrix` pattern exactly (same `MOOD_NAMES` map literal, same matrix container/label/card styling approach) — reuse rather than reinvent the per-theme labeling.

## Testing Strategy

- [ ] Unit tests for `EvidenceTypePicker` capture mode (Jest 30, `@testing-library/react-native` v13) — colocated in the existing `src/components/EvidenceTypePicker/__tests__/EvidenceTypePicker.test.tsx` (this component's established convention is a local `__tests__/` dir, not the `src/__tests__/` mirror — keep consistent with the existing file rather than relocating).
- [ ] `test.each` for the 6-option assertions, matching the existing suite's style.
- [ ] Manual testing: `bun run storybook:web`, verify the `CaptureSheet`, `CaptureSheetWithChange`, `AuthoringChipGrid`, `Compact`, and `AllThemesMatrix` stories render correctly via the theme toolbar / matrix across all 7 product themes (`light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`, `light-autismFriendly`, `light-lowVision`, `light-lowInfo`); confirm no hardcoded hex via `grep -n "#[0-9a-fA-F]\{3,6\}" src/components/EvidenceTypePicker/EvidenceTypePicker.tsx src/components/EvidenceTypePicker/EvidenceTypePicker.styles.ts` (expect zero matches outside the `EVIDENCE_OPTIONS` emoji icon strings, which live in `src/types/evidence.ts`, not these two files).
- [ ] `bun run type-check` and `bun run lint` after each commit.
- [ ] `bun run test --testPathPatterns EvidenceTypePicker` scoped run before the full suite.

## Not in Scope

| Item                                                                                                                                                            | Reason                                                                                                                                               | Follow-up                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Confirm stage ("Save to step {title}", step-swap list) and done stage ("Saved to {title}. Your evidence count just ticked up.") from `Add Evidence Nav.dc.html` | Operates on step-target state, not evidence type; issue explicitly scopes this out ("No app wiring — the nav '+' + active-step targeting is #377")   | #377                                     |
| Wiring the nav "+" button or #408's `onChangeEvidenceType` callback to actually open this sheet                                                                 | App integration; this issue ships Storybook-only, not imported by any screen                                                                         | #377                                     |
| Deleting `EvidenceDrawer`/`FABMenu`/`MiniTimeline`/`ProgressDots`/`CardCarousel` (old Focus Mode chrome)                                                        | Tracked separately as part of the Focus Mode rebuild integration                                                                                     | #377 (per rescope plan)                  |
| Actual evidence capture (photo/video/voice/note/link/file input screens)                                                                                        | Pre-existing capture screens (`CaptureTextNote`, `CapturePhoto`, etc.) already exist independently; this sheet only picks a type, it doesn't capture | none — out of this epic's scope entirely |
| A dedicated a11y string for the sheet's close affordance                                                                                                        | `common:actions.close` (generic "Close") already covers it; minting a duplicate key adds maintenance surface for no behavioral gain                  | none                                     |

## Discovery Log

- [2026-07-01 20:20] **Commit order swapped (i18n before render).** `src/i18n/i18next.d.ts`
  strictly types translation keys against `typeof en/common.json`, so referencing
  `common:evidenceTypePicker.*` before the key exists is a compile error, not a
  runtime miss. Step 3 (i18n keys) therefore landed as commit `4240770` _before_
  Step 2's render commit `849a20a`. Each still type-checks in isolation (unused
  keys are fine). Correspondingly, the `EvidenceType` / `Modal` / `SafeAreaView`
  imports the plan listed under Step 1 were deferred to the render commit where
  they're actually used (importing them unused fails `no-unused-vars`); Step 1 is
  interface-only and lint-clean.
- [2026-07-01 20:20] **Pseudo locale is regenerated by `gen:pseudo`, not `i18n:sync`.**
  `scripts/i18n/syncCore.ts` has `SUPPORTED_TARGETS = ["de"]` — `bun run i18n:sync`
  only writes `de/common.json`. The `pseudo/*.json` files are committed static
  snapshots regenerated by `bun run gen:pseudo` (`scripts/generate-pseudo-locale.ts`).
  Ran both. `gen:pseudo` also rewrote three unrelated, already-stale pseudo files
  (`completion`, `editGoal`, `focusMode`); reverted those to keep this PR scoped to
  #409 (pre-existing drift is a separate concern).
- [2026-07-01 20:20] **Sub-line/title use `fontFamily.headline`.** There is no
  `fontFamily.heading` token — the headline face (Anybody) is `headline`; the
  DM Mono sub-line uses `fontFamily.mono` as planned.
- [2026-07-01 20:35] **Visual pass done (`storybook:web`).** Ran Storybook web and
  eyeballed `CaptureSheet` (Note pre-highlighted, DM-Mono sub-line, 3-up grid),
  `CaptureSheetChangeScenario` (Photo highlighted — the D6 re-open case), and
  `AllThemesMatrix`. The matrix tiles all 7 product themes correctly (no modal
  stacking, per D7) with faithful per-theme tokens: Note's highlight tracks each
  theme's `accentPrimary` (blue/teal/black/slate), highContrast/autismFriendly drop
  shadows, dyslexia uses Lexend on cream, lowVision enlarges type + wraps the
  sub-line. One benign `Unistyles: no theme selected yet` console error fires once
  on first paint (global Storybook+Unistyles startup race, not component-specific;
  render is correct).
- [2026-07-01 20:20] **Extracted `CaptureSheetBody` (D7).** See Decisions. The
  `AllThemesMatrix` story could not tile seven live `Modal`s (react-native-web
  0.21.2 portals each Modal to `<body>` with `position: fixed`, so they stack).
  Extracted the sheet body into an internal component (not exported from the
  barrel) rendered by both the Modal branch and the matrix story — one source of
  the grid JSX, no duplication.
