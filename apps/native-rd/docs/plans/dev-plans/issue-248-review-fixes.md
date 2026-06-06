# PR #250 Review Fixes — Custom Badge Colors

Tracker for findings from `/pr-review-toolkit:review-pr` run on 2026-06-06.
Companion to [`issue-248-custom-badge-colors.md`](./issue-248-custom-badge-colors.md).

PR: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/250
Branch: `feat/issue-248-custom-badge-colors`
Agents: code-reviewer · pr-test-analyzer · silent-failure-hunter · type-design-analyzer · comment-analyzer

---

## Critical (must address before merge)

### C1. IconPicker tests regressed by `reanimated-color-picker` dep

- [ ] Verify: `npx jest --testPathPatterns 'IconPicker.test'` — currently 21/21 FAIL on this branch, 21/21 PASS on `main`
- [ ] Root cause: `reanimated-color-picker` (or peer) triggers real `react-native/Libraries/Modal/Modal` load during IconPicker test setup → `__fbBatchedBridgeConfig is not set`
- [ ] Fix path A: extend `jest.mock("react-native/Libraries/Modal/Modal", …)` from `ColorPickerModal.test.tsx:25-32` into `IconPicker.test.tsx`
- [ ] Fix path B (preferred): hoist the Modal mock into a jest setup file so all Modal-using tests are insulated
- [ ] Update PR body — the "21 pre-existing IconPicker failures reproducible on main" line is false; rewrite
- [ ] Re-run full badges test suite, confirm 6512/6512 pass

**File:** `apps/native-rd/src/badges/__tests__/IconPicker.test.tsx` · `apps/native-rd/package.json:98` · `apps/native-rd/jest.setup.ts` (or new setup file)

---

### C2. `sanitizeBadgeColorField` silently coerces malformed input

- [ ] Add `field: string` param to `sanitizeBadgeColorField` for diagnostic context
- [ ] Add `__DEV__ console.warn` for the "raw is present but invalid" branch (not for the absent branch — that's the documented path)
- [ ] Match the existing `[parseBadgeDesign] Failed to parse JSON` warn style
- [ ] Update call sites in `parseBadgeDesign` to pass the field name
- [ ] Add a test: malformed hex (e.g. `"#zzzzzz"`) produces a dev warn + falls back

**File:** `apps/native-rd/src/badges/types.ts:209-216` · call sites at `:271-276`

---

### C3. `parseBadgeDesign` JSON-parse failure has no production signal

- [ ] Import `reportError` (or whatever the project's standard is — check what `BadgeDesignerScreen.tsx:64` uses)
- [ ] Call `reportError(error, { area: "badge.parse", kind: "design-json" })` in the catch
- [ ] Keep the existing `__DEV__ console.warn` for local visibility
- [ ] Consider whether to distinguish "no raw" from "parse failed" in callers (`BadgeDesignerScreen.tsx:574, :715`) — currently both treat `null` identically. Decide: in scope here, or follow-up?

**File:** `apps/native-rd/src/badges/types.ts:295-304`

---

### C4. `ColorPickerModal` doesn't validate `reanimated-color-picker` output

- [ ] Validate `color.hex` against `isValidHexColor` in `handleColorChange` before `setCurrentColor`
- [ ] If invalid: log via project logger, don't update `currentColor`
- [ ] Add a test: mocked picker emits malformed hex → confirm refuses to fire

**File:** `apps/native-rd/src/badges/ColorPickerModal.tsx:86-92`

---

## Important (should fix in this PR)

### I1. Storybook story not updated to the shipped UX

- [ ] Replace the `<ColorPicker>` block in `BadgeDesigner.stories.tsx:139-150` with `<BadgeColorsAccordion>`
- [ ] Wire the four `onChange*` handlers backed by `setDesign` (thin wrapper if needed)
- [ ] Confirm the story compiles + renders in Storybook

**File:** `apps/native-rd/src/stories/badges/BadgeDesigner.stories.tsx:139-150`

---

### I2. `BadgeColorsAccordion.tsx` is 558 lines — fails `local/file-size-limit` (max 300)

- [ ] Extract `ChannelPalette` helper (lines ~300-481) → `apps/native-rd/src/screens/BadgeDesignerScreen/ChannelPalette.tsx`
- [ ] Extract `StyleSheet.create` block (lines ~487-557) → `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.styles.ts`
- [ ] Re-run `bun run lint -- apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.tsx` → 0 warnings on this file
- [ ] Update tests if imports need adjusting

**File:** `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.tsx`

---

### I3. Zero screen-level test coverage of new handlers

- [ ] Add tests to `BadgeDesignerScreen.test.tsx` covering:
  - [ ] `handleBorderColorChange` — sentinel stored as literal `'theme'` (pin the asymmetry)
  - [ ] `handleIconColorChange` — sentinel triggers `delete next.iconColor`
  - [ ] `handleFrameColorChange` — sentinel triggers `delete next.frameColor`
  - [ ] `handleConfirmModalColor` — dispatches by `colorPickerTarget` to the correct channel (4 cases)
  - [ ] `modalInitialColor` — border-sentinel → `theme.colors.border`; icon-sentinel → `getSafeTextColor(design.color)`; fill → `design.color`
  - [ ] `hasAnyCustom` summary chip: appears when any channel has a custom hex
- [ ] ~6 tests, ~80 LOC

**File:** `apps/native-rd/src/screens/BadgeDesignerScreen/__tests__/BadgeDesignerScreen.test.tsx` (new tests, file exists)
**Source code:** `BadgeDesignerScreen.tsx:148-191, 282-340, 543-549`

---

### I4. No regression guard for `accentColor` removal across 5 selectors

- [ ] Add an "active-selection ring uses theme.colors.accentPrimary, not design.color" test to each:
  - [ ] `ShapeSelector.test.tsx`
  - [ ] `FrameSelector.test.tsx`
  - [ ] `CenterModeSelector.test.tsx`
  - [ ] `BannerEditor.test.tsx`
  - [ ] `PathTextEditor.test.tsx`
- [ ] Mirror the helper pattern from `ColorPicker.test.tsx:102-130`
- [ ] ~5 tests, ~50 LOC

---

### I5. Stale `frameColor` survives `frame: 'none'` switch

- [ ] Decide UX: (a) drop `frameColor` when frame becomes `none`, or (b) document explicitly that frame color persists across frame swaps
- [ ] If (a): in `handleFrameChange`, when new frame is `none`, also `delete next.frameColor` (mirror the `frameParams: undefined` pattern)
- [ ] Add a test pinning the decision
- [ ] Update the JSDoc on `frameColor` field if (b)

**File:** `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx:187-200`

---

### I6. File-header comment in `BadgeColorsAccordion.tsx` violates two rules at once

- [ ] Remove the `(issue #248)` inline reference
- [ ] Remove the references to retired `BorderColorPicker` / `IconColorPicker` components
- [ ] Replace with a single forward-looking line (e.g. `// Tabbed channel picker; Frame tab only mounts when a frame is on the design.`) or delete the header entirely

**File:** `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.tsx:9-10`

---

### I7. Persistence asymmetry between channels

- [ ] Decide: drop-on-sentinel everywhere, OR store-literal-on-sentinel everywhere
- [ ] Recommended: drop-on-sentinel for `borderColor` too (mirror icon/frame) — keeps stored JSON minimal
- [ ] Update `handleBorderColorChange` in `BadgeDesignerScreen.tsx:148-151` accordingly
- [ ] Update `parseBadgeDesign` if needed (currently `borderColor` absent → `'theme'`, which is fine either way)
- [ ] Add/update tests to pin the new behavior
- [ ] Update field JSDoc on `borderColor` to reflect the decision

**File:** `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx:148-179` · `apps/native-rd/src/badges/types.ts:135-153`

---

### I8. Tab-redirect `useEffect` has a one-frame blank

- [ ] Replace post-hoc `setTab("border")` with a derived `effectiveTab` value:
  ```ts
  const effectiveTab: Channel =
    tab === "frame" && !frameEnabled ? "border" : tab;
  ```
- [ ] Use `effectiveTab` in render; sync `tab` state only in `onPress` callbacks
- [ ] Remove the `useEffect`
- [ ] Update the test at `BadgeColorsAccordion.test.tsx:91-112` to confirm no intermediate blank-body state

**File:** `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.tsx:91-93`

---

## Suggestions (polish — defer to follow-up if appetite is low)

### S1. Extract `resolveBadgeColors(design, theme): ResolvedBadgeColors` helper

- [ ] Create helper in `apps/native-rd/src/badges/types.ts` (or sibling `colorResolution.ts`):
  ```ts
  export type ResolvedBadgeColors = {
    fill: string;
    border: string;
    icon: string;
    frame: string | null; // null when design.frame === 'none'
  };
  export function resolveBadgeColors(
    design: BadgeDesign,
    themeBorder: string,
  ): ResolvedBadgeColors;
  ```
- [ ] Replace `useMemo` ladder in `BadgeRenderer.tsx:241-273` with a single `useMemo(() => resolveBadgeColors(...))`
- [ ] Replace duplicate ladder in `BadgeColorsAccordion.tsx:74-84`
- [ ] Replace duplicate in `BadgeDesignerScreen.tsx` icon-color resolution (`:295-297`)
- [ ] Add tests for the helper
- [ ] ~30 LOC + tests; deletes ~40 LOC of duplication

---

### S2. Brand `HexColor` at the picker boundary

- [ ] Add to `types.ts`:
  ```ts
  export type HexColor = string & { readonly __brand: "HexColor" };
  ```
- [ ] Promote `isValidHexColor` return to type guard: `value is HexColor`
- [ ] Update `ColorPickerModal.onConfirm: (hex: HexColor) => void`
- [ ] Update channel `onChange*` handlers to accept `BADGE_COLOR_THEME_SENTINEL | HexColor`
- [ ] Stack with S1 (resolveBadgeColors returns concrete strings, sentinels only exist on storage shape)

---

### S3. Per-channel a11y labels (don't reuse `borderColor.custom` on Fill tab)

- [ ] Add `colorPicker.custom` / `colorPicker.customHint` generic keys, OR
- [ ] Add per-channel keys: `fill.custom`, `iconColor.custom`, `frameColor.custom`
- [ ] Update `ColorPicker.tsx:130-131` to use the right key for the active channel
- [ ] Update `BadgeColorsAccordion.test.tsx:153-160` to drop the DOM-walk workaround
- [ ] Add EN/DE/pseudo translations + parity test entries

---

### S4. Verify `createDefaultBadgeDesign` border default in dark/autismFriendly themes

- [ ] Manual check: open Badge Designer for a NEW goal in light theme — confirm `#000000` border is intentional
- [ ] Same check in `highContrast` theme
- [ ] Same check in `autismFriendly` theme
- [ ] If divergence between cohorts (new vs legacy) is unintentional: switch default to `BADGE_COLOR_THEME_SENTINEL`

**File:** `apps/native-rd/src/badges/types.ts:196`

---

### S5. Comment cleanup pass

- [ ] `types.ts:110-117` — collapse `BADGE_COLOR_THEME_SENTINEL` JSDoc to one line
- [ ] `types.ts:135-153` — collapse three field JSDocs to single trailing comments each
- [ ] `types.ts:202-208` — remove JSDoc on private `sanitizeBadgeColorField`
- [ ] `BadgeRenderer.tsx:236-273` — remove the three sibling `useMemo` JSDocs (or keep one anchor line)
- [ ] `ColorPickerModal.tsx:1-10` — replace file header with one inline comment at the `props.visible &&` gate
- [ ] `ColorPicker.tsx:16-21` — collapse `onOpenCustomPicker` JSDoc to one line
- [ ] `MonogramCenter.tsx:21-25` — drop "prior auto-contrast behaviour" + caller reference; collapse to one line
- [ ] `BadgeColorsAccordion.tsx:28-31` — drop the caller-reference second sentence on `BADGE_COLOR_CHANNELS`
- [ ] `BadgeDesignerScreen.tsx:295-297` — drop the caller-reference clause on `resolvedIconColor`
- [ ] `BadgeDesignerScreen.tsx:327-328` — remove `modalInitialColor` narrating comment
- [ ] Add WHY comments at: `BadgeRenderer.tsx:274` (banner intentionally not customizable), `types.ts:196` (asymmetric new-vs-legacy default)

---

### S6. Test-quality nits

- [ ] `BadgeRenderer.test.tsx` — add an early sanity assertion `expect(findShapeStrokeHex(simpleBadge)).not.toBeNull()` to catch rn-svg packing changes
- [ ] `ColorPickerModal.test.tsx:36` — fix the `require("react")` lint warning (top-level import + reuse, or one-line eslint-disable with rationale)
- [ ] `BadgeColorsAccordion.test.tsx` — add "Icon tab stays Icon when frame drops" test (~10 LOC)
- [ ] `MonogramCenter.test.tsx` — add explicit `textColor` prop test (~2 lines, optional)

---

## Strengths to preserve (don't accidentally refactor away)

- Parser sanitization `test.each` matrix in `types.test.ts:315-398` — gold standard, keep the shape
- i18n parity test reverse-walking `BADGE_COLOR_CHANNELS` against the JSON keyset (`option-key-parity.test.ts:260-310`)
- Renderer tests walk the SVG tree via `payloadToHex`, not source props
- `captureBadge` error handling (`BadgeDesignerScreen.tsx:612-624, :763-770`) — the model the rest of the PR should match
- DCO trailers clean on all 11 commits
- `BadgeBorderScope` removal is mechanically complete

---

## Recommended order of operations

1. **C1** (IconPicker mock) — falsifiable claim in PR body, fix first
2. **C2 + C3** (parser diagnostics) — single commit, ~10 LOC, kills the largest silent-failure class
3. **C4** (modal validation) — one-line guard, prevents corruption chain
4. **I7** (asymmetry) — small decision, locks in a coherent contract before tests get written
5. **I3 + I4** (test coverage gaps) — adds ~130 LOC of regression guards
6. **I2 + I6** (file size + header comment) — mechanical cleanups
7. **I1** (Storybook) — single-file refactor
8. **I5** (frameColor cleanup) — UX decision needed first
9. **I8** (derived tab) — small refactor, removes a useEffect
10. **S1** (resolveBadgeColors helper) — consider as follow-up PR; deletes duplication, S5 comments become redundant
11. **S2-S6** — opportunistic during follow-ups
