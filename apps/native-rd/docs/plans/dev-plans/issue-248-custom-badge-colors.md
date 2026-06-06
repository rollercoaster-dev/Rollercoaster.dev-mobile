# Development Plan: Issue #248

## Issue Summary

**Title**: feat(native-rd): support custom badge fill, border, and center colors
**Type**: feature
**Complexity**: LARGE
**Estimated Lines**: ~700 LOC hand-written (implementation + tests), plus ~80 LOC generated i18n JSON additions across en/de/pseudo

## Intent Verification

Observable criteria derived from the acceptance criteria:

- [ ] When a user opens the Colors accordion, they see separate sub-sections for Fill, Border, and Icon/Monogram color — each containing the existing palette swatches plus a "Custom…" button that opens the `reanimated-color-picker` modal.
- [ ] When a user selects "Match theme" in the Border picker, the rendered badge border tracks `theme.colors.border` and the saved design stores `borderColor: 'theme'`.
- [ ] When a user picks a hex via the custom picker (any of the three channels), the badge preview updates immediately and the value round-trips through save → reload → sync → PNG export unchanged.
- [ ] When the border scope is set to "Shape", only `stroke` on the `<Path>` shape element uses `borderColor`; Frame stroke and Banner stroke remain on `theme.colors.border`.
- [ ] When the border scope is set to "Shape + Frame", both the shape `<Path>` stroke and `FrameOverlay strokeColor` use `borderColor`; Banner stroke remains on `theme.colors.border`.
- [ ] When the border scope is set to "All", the shape stroke, frame stroke, AND banner `stroke` all use `borderColor`; the banner hard shadow fill stays `#000000`.
- [ ] When the selected swatch ring is rendered in `ColorPicker.tsx`, it uses `theme.colors.primary` instead of `theme.colors.border`, so the ring is always visible regardless of the user's chosen border color.
- [ ] When a badge created before this PR is loaded, `parseBadgeDesign` applies default `borderColor: 'theme'` and omits `iconColor` (falling back to `getSafeTextColor`), so existing badges render identically to before.
- [ ] When `BadgeDesign` with an invalid `borderColor` or `iconColor` is parsed, `parseBadgeDesign` sanitizes it to the safe default (`'theme'` or omitted).
- [ ] When `createDefaultBadgeDesign` is called for a new badge, it returns `borderColor: '#000000'` (not `'theme'`).
- [ ] A non-blocking AA-contrast warning is shown inline beside the icon/fill color picker when the chosen fill + icon combination does not meet 4.5:1; no hard block.
- [ ] All new interactive controls meet the 44×44 pt minimum touch target and have `accessibilityRole` + `accessibilityLabel`.

## Dependencies

| Issue | Title                                | Status                          | Type         |
| ----- | ------------------------------------ | ------------------------------- | ------------ |
| #247  | Badge designer accordion restructure | Met (PR #249 merged 2026-06-06) | Prerequisite |

**Status**: All dependencies met.

## Objective

Add custom fill, border, and icon/monogram color controls to the badge designer's Colors accordion. Introduce a `BadgeBorderScope` enum and `borderColor` / `iconColor` tagged-union fields to `BadgeDesign`. Update the renderer to route each field's color to the correct SVG layer. Wire `reanimated-color-picker` (already indirectly available via `react-native-reanimated 4.2.1`) into a new `ColorPickerModal` component opened from existing swatch rows. Keep backward compat via parser sanitization; new badges default to `borderColor: '#000000'`.

## Decisions

| ID  | Decision                                                                                                                                                            | Alternatives Considered                                               | Rationale                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `borderColor: 'theme' \| string`, `iconColor?: 'theme' \| string` tagged-union fields on `BadgeDesign`                                                              | Separate boolean `borderTracksTheme` flag; nested color config object | Tagged union is self-documenting, matches `centerMode`-style convention already in the file, and makes the "Match theme" choice a saved first-class value rather than field absence |
| D2  | `BadgeBorderScope` const enum: `shape`, `shapeAndFrame`, `all`                                                                                                      | Freeform enum string; boolean `applyBorderToFrame`                    | Enum matches existing const/type pattern; three-value scope matches the three variants in the issue exactly                                                                         |
| D3  | `reanimated-color-picker` in a `Modal` (same pattern as `IconPickerModal`)                                                                                          | Inline color input; system color picker; custom wheel built from Skia | Library is a direct dep of Reanimated (already present at v4.2.1); `IconPickerModal` gives an established full-screen modal pattern to follow                                       |
| D4  | Parser default for `borderColor`: missing field → `'theme'` (existing designs track theme); `createDefaultBadgeDesign` returns `'#000000'` (new badges start black) | Always default to `'theme'`; always default to `'#000000'`            | Split intent: existing stored records should change appearance minimally; brand-new badges should show the intended neo-brutalist black border                                      |
| D5  | Banner shadow (`fill="#000000"` on `<Rect>`) is NOT touched by `borderColor`; only banner `stroke` changes under "All" scope                                        | Apply `borderColor` to shadow too                                     | Hard shadow is part of the neo-brutalist signature; issue body explicitly says "banner hard shadow stays on theme.colors.border"                                                    |
| D6  | Selection ring in `ColorPicker.tsx` moves from `theme.colors.border` to `theme.colors.primary`                                                                      | Dedicated ring color token                                            | `primary` is the established active-state token; border token can equal any user-chosen value                                                                                       |
| D7  | `reanimated-color-picker` not yet in `package.json`; must be added as an explicit dep                                                                               | Use Expo's built-in APIs                                              | Library is the agreed-upon choice; version pin to the Reanimated-compatible release                                                                                                 |

## Affected Areas

- `apps/native-rd/src/badges/types.ts`: Add `BadgeBorderScope` const/type, add `borderColor` and `iconColor` fields to `BadgeDesign`, update `createDefaultBadgeDesign`, extend `parseBadgeDesign` sanitization.
- `apps/native-rd/src/badges/BadgeRenderer.tsx`: Resolve `borderColor` and `iconColor` from design at lines 237 (iconColor), 272–273 (shape stroke), 286 (FrameOverlay strokeColor), 341 (Banner borderColor); thread `borderScope` through.
- `apps/native-rd/src/badges/text/Banner.tsx`: Accept optional `borderColor` prop that the renderer passes (already exists, just routed through `theme.colors.border` now — this becomes conditional on scope).
- `apps/native-rd/src/badges/frames/FrameOverlay.tsx`: `strokeColor` prop is already present; renderer now conditionally passes either `theme.colors.border` or resolved `borderColor` depending on scope.
- `apps/native-rd/src/badges/ColorPicker.tsx`: Fix selection-ring to `theme.colors.primary`. Add "Custom…" trigger button at the end of the swatch row. Accept `onOpenCustomPicker` prop.
- `apps/native-rd/src/badges/ColorPickerModal.tsx` (NEW): Full-screen modal wrapping `reanimated-color-picker`. Receives initial hex, calls `onConfirm(hex)` / `onClose()`.
- `apps/native-rd/src/badges/ColorPickerModal.styles.ts` (NEW): Unistyles stylesheet for the modal.
- `apps/native-rd/src/badges/BorderColorPicker.tsx` (NEW): Thin wrapper — swatch row for border color including a "Match theme" swatch sentinel + palette presets + "Custom…" trigger.
- `apps/native-rd/src/badges/BorderScopeSelector.tsx` (NEW): Three-option selector (Shape / Shape + Frame / All) mirroring `CenterModeSelector` layout.
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`: Add handlers for `borderColor`, `iconColor`, `borderScope` changes; wire new pickers into the `colors` accordion section; update `colorSummary` derivation.
- `apps/native-rd/src/i18n/resources/en/badgeDesigner.json`: Add keys for border color, icon color, border scope, custom picker UI, contrast warning.
- `apps/native-rd/src/i18n/resources/de/badgeDesigner.json`: Same additions (German copy).
- `apps/native-rd/src/i18n/resources/pseudo/badgeDesigner.json`: Same additions (pseudo locale).
- `apps/native-rd/src/i18n/resources/_register/badgeDesigner.yml`: Register any new top-level namespaces if needed (likely no new namespaces — all under `badgeDesigner`).
- `apps/native-rd/src/badges/__tests__/types.test.ts`: Tests for new fields in `createDefaultBadgeDesign`, `parseBadgeDesign` sanitization of `borderColor` / `iconColor` / `borderScope`.
- `apps/native-rd/src/badges/__tests__/BadgeRenderer.test.tsx`: Tests for color resolution at each renderer site (shape stroke, frame stroke, banner stroke, icon color).
- `apps/native-rd/src/badges/__tests__/ColorPicker.test.tsx`: Tests for selection-ring using primary token, "Custom…" button presence/press.
- `apps/native-rd/src/badges/__tests__/ColorPickerModal.test.tsx` (NEW): Modal open/close, confirm callback, initial color wired correctly.
- `apps/native-rd/src/badges/__tests__/BorderColorPicker.test.tsx` (NEW): "Match theme" swatch, palette swatches, custom trigger.
- `apps/native-rd/src/badges/__tests__/BorderScopeSelector.test.tsx` (NEW): Three options render, selection state, callback fires.
- `apps/native-rd/src/i18n/__tests__/option-key-parity.test.ts`: Add parity assertions for `BadgeBorderScope` enum ↔ i18n keys.
- `apps/native-rd/package.json`: Add `reanimated-color-picker` dependency.

## Implementation Plan

### Step 1: Add `reanimated-color-picker` dependency ✅ DONE (committed 74aab82)

**Status**: Installed via `bun add reanimated-color-picker@~4.2.0`. Committed alongside the dev plan as `chore(native-rd): add reanimated-color-picker dependency` (74aab82).

**Files**: `apps/native-rd/package.json`
**Commit**: `chore(native-rd): add reanimated-color-picker dependency`
**Changes**:

- [x] Run `bun add reanimated-color-picker@~4.2.0` under `apps/native-rd/`. Pinned to 4.2.x — see Discovery Log entry [2026-06-06]. 4.3.0 bumps the `expo` peer to `"56"` (still optional, but a runtime concern on Expo 55).
- [x] Confirmed the package resolves without a lockfile conflict (bun install succeeded cleanly).
- [ ] Re-evaluate version pin when the repo upgrades to Expo 56.
- [x] Library ships its own types at `lib/typescript/index.d.ts` — no `vendor.d.ts` stub needed. Default export is `ColorPicker` (forwardRef → `ColorPickerRef.setColor`); panel/slider/swatch components are individual named exports (`Panel1`, `HueSlider`, `Preview`, etc.) composed as children.
- [x] **Update plan + commit** — checked the Step 1 box, committed the dep + the plan doc together.

**Estimated LOC**: ~2 LOC (package.json entry + optional ambient decl)

---

### Step 2: Extend `BadgeDesign` types and parser ✅ DONE

**Files**: `apps/native-rd/src/badges/types.ts`, `apps/native-rd/src/badges/index.ts`, `apps/native-rd/src/badges/__tests__/types.test.ts`
**Commit**: `feat(badges): add borderColor, iconColor, borderScope fields to BadgeDesign`
**Changes**:

- [x] Add `BadgeBorderScope` const + type following existing `BadgeCenterMode` pattern:
  ```
  shape | shapeAndFrame | all
  ```
- [x] Add to `BadgeDesign`:
  ```ts
  borderColor?: 'theme' | string;  // hex or sentinel; default via parser = 'theme'
  iconColor?: 'theme' | string;    // hex or sentinel; absent = getSafeTextColor auto
  borderScope?: BadgeBorderScope;  // absent = 'shape'
  ```
- [x] Added exported `BADGE_COLOR_THEME_SENTINEL` (`"theme"` as const) so call sites don't have to repeat the magic string.
- [x] Update `createDefaultBadgeDesign` to return `borderColor: '#000000'` (new badges default to black).
- [x] In `parseBadgeDesign`: added `sanitizeBadgeColorField()` (validates sentinel OR `isValidHexColor`; caller picks the fallback — `'theme'` for `borderColor`, `undefined` for `iconColor`) and `sanitizeBorderScope()` (validates against `BadgeBorderScope` values; falls back to `'shape'`). Parser now uses build-then-strip so sanitized-to-undefined fields don't appear as `key: undefined` properties.
- [x] Export `BadgeBorderScope` + `BADGE_COLOR_THEME_SENTINEL` from `badges/index.ts`.
- [x] Tests: 57/57 pass (`npx jest --no-coverage --testPathPatterns "badges/__tests__/types.test.ts"`); `bun run type-check` clean.
- [x] **Update plan + commit** — Step 2 boxes checked, committed as one atomic feat commit.

**Estimated LOC**: ~60 LOC

---

### Step 3: Update renderer color resolution ✅ DONE

**Files**: `apps/native-rd/src/badges/BadgeRenderer.tsx`, `apps/native-rd/src/badges/text/MonogramCenter.tsx`
**Commit**: `feat(badges): resolve custom borderColor, iconColor, borderScope in renderer`
**Changes**:

- [x] Added `resolvedBorderColor` `useMemo` in `BadgeRenderer.tsx`. Falls back to `theme.colors.border` when value is missing OR equals `BADGE_COLOR_THEME_SENTINEL`.
- [x] Added `resolvedIconColor` `useMemo`. Returns hex when explicitly set and not the sentinel; otherwise `getSafeTextColor(design.color)` (legacy behaviour preserved).
- [x] Derived `resolvedScope = design.borderScope ?? BadgeBorderScope.shape` and split into `frameStrokeColor` / `bannerBorderColor` for prop-site clarity.
- [x] Shape `<Path>` stroke now uses `resolvedBorderColor` (always in scope).
- [x] `<FrameOverlay strokeColor>` uses `resolvedBorderColor` for `shapeAndFrame` and `all`, theme border otherwise.
- [x] `<Banner borderColor>` uses `resolvedBorderColor` only for `all` scope. Banner `fill` and the `#000000` shadow are untouched.
- [x] Icon `color` prop now reads `resolvedIconColor`.
- [x] `MonogramCenter` gained an optional `textColor` prop; the renderer threads `resolvedIconColor` so monogram tracks icon color per Resolved Decision #2. When `textColor` is omitted the component still falls back to `getSafeTextColor(fillColor)` so existing call sites are unaffected.
- [x] Verified: `bun run type-check` clean, `npx jest --testPathPatterns "badges/__tests__/BadgeRenderer"` → 37/37 pass. Pre-existing `IconPicker.test.tsx` Modal/native-bridge failures (21) reproduce on `main` without this diff and are unrelated.
- [x] **Update plan + commit** — Step 3 boxes checked, committed as one atomic feat commit.

**Estimated LOC**: ~40 LOC in `BadgeRenderer.tsx`; ~10 LOC in `MonogramCenter.tsx`.

---

### Step 4: Decouple active-selection ring from the badge fill color across all designer selectors ✅ DONE

**Scope expanded after Joe pushback (2026-06-06):** the original plan only patched `ColorPicker.tsx`. The real problem was bigger — `BadgeDesignerScreen` passed `accentColor={currentDesign.color}` into six selectors, and each one used `resolvedAccent = accentColor ?? theme.colors.accentPrimary` for its active-state border + label color. So when the user picked "purple" as the badge fill, every active selection ring across `ShapeSelector`, `FrameSelector`, `CenterModeSelector`, `BannerEditor`, `PathTextEditor`, and `IconPicker` also turned purple — that's the "tied to the badge" behaviour Joe flagged.

**Files touched (final scope):**

- `apps/native-rd/src/badges/ColorPicker.tsx` — selection ring `borderColor` swapped from `theme.colors.border` to `theme.colors.accentPrimary` (line 92).
- `apps/native-rd/src/badges/ShapeSelector.tsx` — `accentColor` prop removed; `resolvedAccent` references replaced with `theme.colors.accentPrimary` (active ring + shape thumbnail `fillColor`).
- `apps/native-rd/src/badges/FrameSelector.tsx` — same pattern; prop removed, active ring + label color use `accentPrimary`.
- `apps/native-rd/src/badges/CenterModeSelector.tsx` — same pattern.
- `apps/native-rd/src/badges/BannerEditor.tsx` — same pattern.
- `apps/native-rd/src/badges/PathTextEditor.tsx` — same pattern.
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — five `accentColor={currentDesign.color}` pass-sites removed (Shape, Frame, CenterMode, PathText, Banner). IconPicker's pass-site is deliberately left as-is — see follow-up note below.
- `apps/native-rd/src/stories/badges/BadgeDesigner.stories.tsx` — same five storybook pass-sites removed.

**Commit**: `fix(badges): decouple designer active-selection ring from badge fill`
**Changes**:

- [x] Confirmed in-repo that `theme.colors` does NOT expose a `primary` key. The `Colors` interface (`src/themes/colorModes.ts`) defines `accentPrimary`. The earlier ColorPicker edit (`theme.colors.primary`) compiled only because the swatch style is a plain inline object, not Unistyles-typed — it would have rendered `undefined` at runtime.
- [x] Fixed ColorPicker.tsx:92 to use `theme.colors.accentPrimary`.
- [x] Removed five `accentColor={currentDesign.color}` props in `BadgeDesignerScreen.tsx` (Shape, Frame, CenterMode, PathText, Banner). IconPicker's prop pass-through is kept — see deferred follow-up.
- [x] **Decision**: `accentColor` prop deleted entirely from the five selectors. Joe confirmed on 2026-06-06 that no legitimate caller exists; defaulting to `theme.colors.accentPrimary` is the right behaviour. Removing the prop simplifies the API and prevents future re-introduction of the same bug. ShapeSelector's `fillColor={resolvedAccent}` thumbnail also defaults to `accentPrimary` now — the live BadgeRenderer preview at the top of the screen already shows the user's chosen fill, so the shape picker's role is purely type selection, not preview.
- [x] **IconPicker / IconPickerModal**: deferred per Joe (2026-06-06). They use `resolvedAccent` for _content_ — the trigger icon-box background and selected-grid-item highlight — not just an active-state ring. That's plausibly a feature (live preview of fill colour in the icon area), not a bug. Decision is parked and flagged as Open Question for a later commit; for now the `accentColor` prop and pass-site remain.
- [x] No test changes needed — no test file in `apps/native-rd/src` passes `accentColor` to any of the five selectors (verified via grep). All affected tests pass: `BadgeDesignerScreen` (50/50), badges selectors + renderer + types (178/178).
- [x] `bun run type-check` clean (4/4 turbo tasks pass).
- [x] **Update plan + commit** — boxes checked, commit fix + plan update together.

**Estimated LOC**: ~30 LOC across five selectors + designer screen + storybook; 0 LOC test updates.

**Open follow-up (deferred from Step 4):**

- IconPicker / IconPickerModal still receive `accentColor={currentDesign.color}` and use it for the trigger icon-box background and selected-grid-item highlight. Joe deferred the call on whether that's a desired live-preview behaviour or the same conflation bug. Revisit in a follow-up commit; if it's a bug, the fix mirrors this one (remove prop, default to `accentPrimary`).

---

### Step 5: Build `ColorPickerModal` component ✅ DONE

**Files**: `apps/native-rd/src/badges/ColorPickerModal.tsx`, `apps/native-rd/src/badges/ColorPickerModal.styles.ts`, `apps/native-rd/src/badges/index.ts`
**Commit**: `feat(badges): add ColorPickerModal wrapping reanimated-color-picker`
**Changes**:

- [x] Created `ColorPickerModal.tsx` using `<Modal animationType="slide" presentationStyle="fullScreen">`, `SafeAreaProvider`, `useSafeAreaInsets`. Content mounted only when `visible=true` so initialColor + live preview reset on every open (same pattern as `IconPickerModal`).
- [x] Composed `reanimated-color-picker` as `<ColorPicker value={initialColor} onChangeJS={handleColorChange}>` with three children: `<Preview>` (current vs initial side-by-side), `<Panel1>` (saturation/brightness 2D area), `<HueSlider>`. Used `onChangeJS` (not `onChange`) because the worklet variant can't call `setState`.
- [x] Skipped the try/catch render-path — `reanimated-color-picker` doesn't have a separate native module; it composes Reanimated 4 worklets which already gate the runtime. A native-module-missing failure would surface in the existing `IconPickerModal` too, and the wider Reanimated dep is required for the rest of the app.
- [x] Props: `visible`, `initialColor: string`, `onConfirm(hex: string): void`, `onClose(): void`, optional `title?`, `testID?`.
- [x] Footer: Cancel + Confirm buttons via the neo-brutalist `Button` component (`secondary` / `primary` variants). Wrapped each in a `<View style={styles.footerButton}>` because `Button` doesn't accept a `style` prop and we need 50/50 flex distribution.
- [x] `<Preview>` component shows the picked color, the initial color, and the hex text by default — covers the "selected color preview" requirement without a separate swatch.
- [x] Close button (X), Cancel, and Confirm all 48×48 (≥44pt touch targets). `accessibilityRole`, `accessibilityLabel` on every interactive element. Header has `accessibilityRole="header"`, footer has `accessibilityRole="toolbar"`.
- [x] `ColorPickerModal.styles.ts`: Unistyles stylesheet following `IconPickerModal.styles.ts` pattern — `modalRoot`, `contentArea`, `headerTitle`, `closeButton`, `pickerContainer`, `previewWrapper`, `panel`, `hueSlider`, `footer`, `footerButton`.
- [x] Exported `ColorPickerModal` + `ColorPickerModalProps` from `badges/index.ts`.
- [x] `bun run type-check` clean. `bun run lint`: 0 errors on new files (pre-existing 153 warnings in unrelated `utils/` files).
- [x] **Update plan + commit** — Step 5 boxes checked, commit the modal component and the plan update together.

**Estimated LOC**: ~120 LOC (final: 137 LOC tsx + 76 LOC styles + 3 LOC index export)

---

### Step 6: Build `BorderColorPicker` and `BorderScopeSelector` components

**Files**: `apps/native-rd/src/badges/BorderColorPicker.tsx`, `apps/native-rd/src/badges/BorderScopeSelector.tsx`
**Commit**: `feat(badges): add BorderColorPicker and BorderScopeSelector UI components`
**Changes**:

**`BorderColorPicker.tsx`**:

- [ ] Props: `selectedBorderColor: 'theme' | string`, `onSelectBorderColor(v: 'theme' | string): void`, `onOpenCustomPicker(): void`, `testID?`.
- [ ] Renders a swatch row: first swatch is "Match theme" (sentinel `'theme'`), followed by `ACCENT_COLORS` palette presets, then a "Custom…" trigger cell.
- [ ] "Match theme" swatch displays `theme.colors.border` as its fill but labels itself "Match theme" in i18n.
- [ ] Selection ring uses `theme.colors.primary` (consistent with Step 4 fix).
- [ ] `accessibilityRole="radiogroup"` on container; each swatch `accessibilityRole="radio"`.

**`BorderScopeSelector.tsx`**:

- [ ] Props: `selectedScope: BadgeBorderScope`, `onSelectScope(scope: BadgeBorderScope): void`, `testID?`.
- [ ] Three options: `shape` ("Shape"), `shapeAndFrame` ("Shape + Frame"), `all` ("All").
- [ ] Layout mirrors `CenterModeSelector` — horizontal row of pressable chips.
- [ ] `accessibilityRole="radiogroup"` on container.
- [ ] **Update plan + commit** — check Step 6 boxes, commit the picker components and the plan update together.

**Estimated LOC**: ~120 LOC

---

### Step 7: Wire new controls into BadgeDesignerScreen

**Files**: `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`
**Commit**: `feat(badges): wire custom color pickers into Colors accordion`
**Changes**:

- [ ] Add handlers: `handleBorderColorChange`, `handleIconColorChange`, `handleBorderScopeChange`.
- [ ] Add `colorPickerTarget` state: `'fill' | 'border' | 'icon' | null` to track which channel opened the modal.
- [ ] Render `ColorPickerModal` once at the `DesignEditor` level; `onConfirm` dispatches to the correct design field based on `colorPickerTarget`.
- [ ] In the `colors` accordion section, render:
  1. Existing `<ColorPicker>` for fill (with `onOpenCustomPicker` prop added).
  2. `<BorderColorPicker>` with `onOpenCustomPicker`.
  3. `<BorderScopeSelector>` below the border picker (visible regardless of `borderColor` value — scope always applies).
  4. A third `<ColorPicker>`-style row for icon/monogram color, or a dedicated `IconColorPicker` if the component needs the "Match theme" sentinel logic.
- [ ] Update `colorSummary` string (shown in accordion header) to reflect custom color presence: e.g. append "· Custom border" if `borderColor !== 'theme'`.
- [ ] Add contrast warning: when `iconColor` is explicitly set, compute `meetsWCAG(resolvedIconColor, design.color)` and render a small warning `<Text>` below the icon color row if it fails. No hard block.
- [ ] **Update plan + commit** — check Step 7 boxes, commit the screen wiring and the plan update together.

**Estimated LOC**: ~100 LOC

---

### Step 8: Extend i18n resources

**Files**: `apps/native-rd/src/i18n/resources/en/badgeDesigner.json`, `de/badgeDesigner.json`, `pseudo/badgeDesigner.json`, `apps/native-rd/src/i18n/__tests__/option-key-parity.test.ts`
**Commit**: `feat(badges): add i18n keys for custom color controls`
**Changes**:

New keys to add under `badgeDesigner` namespace (English):

```json
"borderColor": {
  "a11y": "Badge border color",
  "optionA11y": "{{label}} border color",
  "matchTheme": "Match theme",
  "custom": "Custom",
  "options": {
    "theme": "Match theme",
    "purple": "Purple",
    "mint": "Mint",
    "yellow": "Yellow",
    "emerald": "Emerald",
    "teal": "Teal",
    "orange": "Orange",
    "sky": "Sky"
  }
},
"iconColor": {
  "a11y": "Icon color",
  "optionA11y": "{{label}} icon color",
  "matchAuto": "Auto",
  "custom": "Custom",
  "contrastWarning": "Low contrast — text may be hard to read"
},
"borderScope": {
  "a11y": "Border scope",
  "optionA11y": "{{label}} scope",
  "options": {
    "shape": "Shape",
    "shapeAndFrame": "Shape + Frame",
    "all": "All"
  }
},
"colorPicker": {
  "title": "Choose Color",
  "confirm": "Confirm",
  "cancel": "Cancel",
  "preview": "Selected color preview"
}
```

- [ ] Add German and pseudo translations for the same keys.
- [ ] In `option-key-parity.test.ts`: add `BadgeBorderScope` forward/reverse parity assertions mirroring the existing `BadgeShape` pattern. Note: `BorderColorPicker` uses the same `ACCENT_COLORS` array as fill — those keys are already covered; only `theme` sentinel key needs explicit assertion.
- [ ] **Update plan + commit** — check Step 8 boxes, commit the i18n additions and the plan update together.

**Estimated LOC**: ~80 LOC across all JSON files; ~25 LOC test additions.

---

### Step 9: Tests

**Files**: `apps/native-rd/src/badges/__tests__/types.test.ts`, `BadgeRenderer.test.tsx`, `ColorPicker.test.tsx`, `ColorPickerModal.test.tsx` (new), `BorderColorPicker.test.tsx` (new), `BorderScopeSelector.test.tsx` (new)
**Commit**: `test(badges): cover custom color types, renderer resolution, and picker components`
**Changes**:

**`types.test.ts` additions**:

- [ ] `createDefaultBadgeDesign` returns `borderColor: '#000000'`.
- [ ] `parseBadgeDesign` with missing `borderColor` → defaults to `'theme'`.
- [ ] `parseBadgeDesign` with invalid `borderColor: 'not-valid'` → sanitizes to `'theme'`.
- [ ] `parseBadgeDesign` with valid hex `borderColor: '#ff0000'` → passes through unchanged.
- [ ] `parseBadgeDesign` with `borderScope: 'invalid'` → sanitizes to `'shape'`.
- [ ] `parseBadgeDesign` with `iconColor: '#123456'` → passes through.
- [ ] `BadgeBorderScope` has 3 values: `shape`, `shapeAndFrame`, `all`.
- [ ] Use `test.each` for the sanitization cases.

**`BadgeRenderer.test.tsx` additions**:

- [ ] When `design.borderColor` is `'theme'`, shape stroke equals `theme.colors.border`.
- [ ] When `design.borderColor` is `'#ff0000'`, shape stroke equals `'#ff0000'`.
- [ ] When `borderScope === 'shape'`, frame `strokeColor` equals `theme.colors.border`.
- [ ] When `borderScope === 'shapeAndFrame'`, frame `strokeColor` equals `resolvedBorderColor`.
- [ ] When `borderScope === 'all'`, banner `borderColor` prop equals `resolvedBorderColor`.
- [ ] When `borderScope === 'all'`, banner shadow fill remains `#000000`.
- [ ] When `design.iconColor` is set to a hex, icon `color` prop uses that hex.
- [ ] When `design.iconColor` is absent, icon `color` prop uses `getSafeTextColor(design.color)`.

**`ColorPicker.test.tsx` update**:

- [ ] Selected swatch `borderColor` uses `theme.colors.primary`, not `theme.colors.border`.

**`ColorPickerModal.test.tsx`** (new):

- [ ] Renders nothing when `visible=false`.
- [ ] Renders modal content when `visible=true`.
- [ ] `onClose` fires when Cancel is pressed.
- [ ] `onConfirm` is called with current hex when Confirm is pressed.

**`BorderColorPicker.test.tsx`** (new):

- [ ] "Match theme" swatch renders and is labeled correctly.
- [ ] Palette swatches render (same count as `ACCENT_COLORS`).
- [ ] "Custom…" cell renders and calls `onOpenCustomPicker` when pressed.
- [ ] Selected state (`accessibilityState.checked`) tracks `selectedBorderColor`.

**`BorderScopeSelector.test.tsx`** (new):

- [ ] All three scope options render with correct labels.
- [ ] Selected option has `checked: true`; others `checked: false`.
- [ ] Pressing a scope option calls `onSelectScope` with the correct value.
- [ ] Container has `radiogroup` role.
- [ ] **Update plan + commit** — check Step 9 boxes, run final `bun run type-check` + `bun run lint`, commit the test additions and the plan update together. This is the last step before PR.

**Estimated LOC**: ~180 LOC across all test files.

---

## Testing Strategy

- [ ] Unit tests: Jest 30, `@testing-library/react-native` v13. Test files mirror `src/` under `src/__tests__/`.
- [ ] Use `test.each` for the parser sanitization matrix (valid hex / invalid hex / sentinel / missing → expected output).
- [ ] `BadgeRenderer.test.tsx` color-resolution tests: use existing `createDesign()` helper with overrides for new fields; assert SVG prop values via RNTL queries on testID.
- [ ] Mock `reanimated-color-picker` in jest (similar to `react-native-svg` mock pattern) — expose a controlled `onColorChange` callback so modal tests don't depend on native Reanimated internals.
- [ ] Manual testing: open designer, pick all three channels through both palette swatches and the custom picker wheel; toggle border scope; save; reload badge; share/export PNG; verify visual in highContrast and autismFriendly themes.
- [ ] Run `bun run type-check` and `bun run lint` before opening PR.

## Not in Scope

| Item                                              | Reason                                                              | Follow-up  |
| ------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| Gradient fill support                             | Requires SVG gradient support in react-native-svg; orthogonal scope | none filed |
| Color palette customization (add/remove swatches) | Separate UX decision; beyond this issue                             | none filed |
| Android-specific color picker testing             | No verified Android build pipeline yet                              | none filed |
| Persisting per-user custom color history          | No product decision yet                                             | none filed |
| Hard-blocking AA contrast enforcement             | Deliberately deferred; see Open Questions #1                        | none filed |

## Discovery Log

- [2026-06-06] `reanimated-color-picker@4.2.0` peer deps confirmed: `expo: ">=44.0.0"` with `peerDependenciesMeta.expo.optional: true`. 4.3.0 bumps to `expo: "56"` (still optional) but the version bump may rely on Expo 56 APIs, so we honor the plan's `~4.2.0` pin via `bun add reanimated-color-picker@~4.2.0`.
- [2026-06-06] Library ships its own `index.d.ts` at `lib/typescript/`. Default export is the `ColorPicker` component (forwardRef → `ColorPickerRef.setColor`). Key props: `value`, `onChange` (worklet), `onChangeJS`, `onComplete`, `onCompleteJS`. Panels/Sliders are individual exports (`Panel1`, `HueSlider`, etc.) — composed children, not built-in.

---

## Resolved Decisions

All six items the researcher initially surfaced are settled by the issue body or by Joe's pre-research answers. Recorded here so the implementer does not re-litigate.

**1. Contrast policy — advisory only.** Show a non-blocking AA warning beside the picker when chosen color vs. its background fails 4.5:1; no hard block, Confirm always enabled. `getSafeTextColor()` remains the implicit default ONLY when `iconColor === 'theme'` (absent). Once the user explicitly picks a hex, their choice wins and the warning is informational. Pair to test: `iconColor` vs. `design.color` (icon vs. fill) and, separately for the fill picker, `design.color` vs. theme background. Matches the project's non-punitive design instinct: name without score.

**2. One `iconColor` field governs both icon and monogram.** Issue body says "icon/monogram color" as a single control. `MonogramCenter` gains a `textColor` prop in Step 3 and the renderer threads `design.iconColor` (resolved) into both the Phosphor icon and the monogram.

**3. Picker pinned to `reanimated-color-picker@^4.2.0`.** See Step 1 — 4.3.0+ and 5.x have a too-strict `expo: "56"` peer that this repo (Expo 55) won't satisfy. 4.2.0 declares `expo: ">=44"` and `reanimated: ">=2.0.0"`, which fits Reanimated 4.2.1.

**4. Accordion summary for custom colors: short label only.** When any of the three channels is non-preset, the summary shows the literal `"Custom"` token (i18n key `color.summary.custom`). Specific hex values appear in the picker, not the accordion header — keeps the header tight regardless of how many channels are customized. When all three channels match presets, fall back to the existing preset-label behavior.

**5. Icon/monogram color lives in the Colors accordion.** Literal reading of the issue: "Add custom color controls to the badge designer Colors section for: Fill, Border, Icon/monogram." Third color row in Colors, below Border.

**6. Border palette parity test: reuse `ACCENT_COLORS` parity coverage + add a single assertion for the `'theme'` sentinel key.** No new `BORDER_COLOR_SWATCHES` constant. The existing parity test for `ACCENT_COLORS` already guarantees the palette swatches; we add one extra `expect(t('borderColor.options.theme')).toBeDefined()`-style check and stop. Keeps the test surface proportionate to what's actually new.
