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

### Step 6: Build `BorderColorPicker` and `BorderScopeSelector` components ✅ DONE

**Files**: `apps/native-rd/src/badges/BorderColorPicker.tsx`, `apps/native-rd/src/badges/BorderScopeSelector.tsx`, `apps/native-rd/src/badges/index.ts`, `apps/native-rd/src/i18n/resources/en/badgeDesigner.json`
**Commit**: `feat(badges): add BorderColorPicker and BorderScopeSelector UI components`

**Status (2026-06-06):** Both components built and exported. EN i18n keys folded into this commit (see Plan adjustment below). DE/pseudo translations + parity test remain in Step 8.

**Plan adjustment (2026-06-06):** The original plan said i18n keys would land in Step 8 and "until then the UI shows raw keys for one commit (acceptable trade-off for a clean i18n-only Step 8 commit)." That overlooked the typed-i18n setup — `t()`'s return type is a union of literal keys inferred from `en/badgeDesigner.json`, so 9 `t("borderColor.*")` / `t("borderScope.*")` call sites failed with TS2345 ("not assignable to ... `color.options.purple` etc."). Joe (2026-06-06) chose to fold the EN keys into this commit; DE/pseudo stay in Step 8 (translation-only, no type impact). Step 8 shrinks to DE/pseudo + parity assertion.

**Changes**:

**`BorderColorPicker.tsx`** — committed:

- [x] Props: `selectedBorderColor: typeof BADGE_COLOR_THEME_SENTINEL | string`, `onSelectBorderColor(value): void`, `onOpenCustomPicker(): void`, `testID?`.
- [x] Renders horizontal `ScrollView` of swatches — matches `ColorPicker.tsx`'s layout, not `CenterModeSelector`'s chip-row, because 9 cells (1 sentinel + 7 palette + 1 custom) need horizontal scrolling rather than a static chip row.
- [x] "Match theme" sentinel: first cell, fills with `theme.colors.border` (so users see the inherited color), stores `BADGE_COLOR_THEME_SENTINEL` when selected.
- [x] Palette swatches: iterates over the existing exported `ACCENT_COLORS` from `ColorPicker.tsx` — no duplicated constant.
- [x] "Custom…" cell: last cell, shows a `+` glyph inside the swatch when no custom value is selected, OR shows the currently-selected custom hex as the fill when `selectedBorderColor` is neither the sentinel nor a palette swatch. `accessibilityRole="button"` (not `radio`) because it opens the modal rather than committing a value directly.
- [x] Selection ring uses `theme.colors.accentPrimary` (matches the Step 4 fix — `theme.colors.primary` does not exist; the correct token is `accentPrimary`).
- [x] `accessibilityRole="radiogroup"` on container; the two value-setting swatch types are `accessibilityRole="radio"` with `accessibilityState.checked`.
- [x] i18n keys: `borderColor.a11y`, `borderColor.optionA11y`, `borderColor.matchTheme`, `borderColor.custom`, `borderColor.customHint`, `borderColor.options.<id>` — all added to `en/badgeDesigner.json` this commit.

**`BorderScopeSelector.tsx`** — committed:

- [x] Props: `selectedScope: BadgeBorderScope`, `onSelectScope(scope: BadgeBorderScope): void`, `testID?`.
- [x] Three options: `shape` ("Shape"), `shapeAndFrame` ("Shape + Frame"), `all` ("All").
- [x] Layout mirrors `CenterModeSelector` — horizontal row of pressable chips (3 options fit cleanly without scrolling).
- [x] Options derived from `Object.values(BadgeBorderScope)` — same drift-protection as `CenterModeSelector`; adding a 4th enum value surfaces automatically.
- [x] `accessibilityRole="radiogroup"` on container.
- [x] i18n keys: `borderScope.a11y`, `borderScope.optionA11y`, `borderScope.options.<scope>` — all added to `en/badgeDesigner.json` this commit.
- [x] Export from `badges/index.ts` (alongside `BorderColorPicker`).
- [x] **Update plan + commit** — Step 6 boxes checked, commit both picker components + EN i18n keys + the plan update together.

**Verification**:

- [x] `bun run type-check` clean (4/4 turbo tasks).
- [x] `bun run lint`: 0 errors on new files (pre-existing 153 warnings in `utils/` files, baseline noted in Step 5).
- [x] `npx jest --testPathPatterns "badges/__tests__"`: 6452/6473 pass; the 21 failures are the documented pre-existing `IconPicker.test.tsx` Modal/native-bridge failures unchanged from `main` (see Step 3 verification).

**Estimated LOC**: ~120 LOC planned; actual ~120 LOC component + ~30 LOC EN i18n + ~6 LOC index exports = ~156 LOC.

---

### Step 7: Wire new controls into BadgeDesignerScreen ✅ DONE

**Files touched (final scope):**

- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — new imports, three handlers, `colorPickerTarget` state, resolved sentinel values, `colorSummary` "Custom" suffix, Colors accordion rebuild, modal mount, contrast warning render.
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.styles.ts` — added `contrastWarning` style.
- `apps/native-rd/src/badges/ColorPicker.tsx` — added optional `onOpenCustomPicker` prop + trailing "Custom…" cell that previews the live custom hex. Keeps existing callers (Storybook, tests) working since the prop is optional.
- `apps/native-rd/src/badges/ColorPickerModal.tsx` — replaced four hardcoded English strings (title/close/cancel/confirm hint) with `t()` calls under the new `colorPicker.*` namespace. Forced into this commit by the typed-i18n / modal-render pairing (modal is now mounted from a localized surface).
- `apps/native-rd/src/badges/IconColorPicker.tsx` (NEW) — mirrors `BorderColorPicker` but the sentinel cell is "Auto" and previews `getSafeTextColor(fillColor)`. Stored value is `BADGE_COLOR_THEME_SENTINEL` for Auto (so the renderer continues to use `getSafeTextColor(design.color)`), hex for everything else.
- `apps/native-rd/src/badges/index.ts` — export `IconColorPicker` + props type.
- `apps/native-rd/src/i18n/resources/en/badgeDesigner.json` — added `iconColor.*`, `colorPicker.*`, and `accordion.summary.colorCustom` keys (DE/pseudo deferred to Step 8 per plan).

**Commit**: `feat(badges): wire custom color pickers into Colors accordion`

**Plan adjustment (2026-06-06):** Same forcing function as Step 6 — the typed-i18n setup makes `t("iconColor.*")` and `t("colorPicker.*")` a hard prerequisite for `tsc`. The wiring commit therefore folds in:

1. EN keys for `iconColor` (a11y, optionA11y, matchAuto, matchAutoHint, custom, customHint, contrastWarning, options.<id>) plus `colorPicker` (title, confirm, cancel, close, confirmHint) plus `accordion.summary.colorCustom`.
2. ColorPickerModal's English-string retirement (the modal already existed from Step 5; today it acquires its first real-world caller, so its strings can't stay hardcoded).

DE/pseudo translations + the parity assertion still ship in Step 8 as planned.

**Plan adjustment #2 — dedicated IconColorPicker (2026-06-06):** Step 7 originally said "third `<ColorPicker>`-style row OR a dedicated component". Chose dedicated. Rationale: the icon channel needs an "Auto" sentinel whose preview swatch is _computed_ (`getSafeTextColor(fillColor)`), not static like Border's `theme.colors.border`. Mirroring the BorderColorPicker shape keeps the UX consistent across both border + icon and gives a clean place to document the sentinel-semantics divergence.

**Changes**:

- [x] Added handlers: `handleBorderColorChange`, `handleIconColorChange`, `handleBorderScopeChange`. `handleIconColorChange` strips the field from the design when the user picks the sentinel, so parsed designs round-trip identically (Auto = field absent).
- [x] Added `colorPickerTarget` state: `'fill' | 'border' | 'icon' | null`. One modal mount, three call sites.
- [x] Rendered `ColorPickerModal` once inside `DesignEditor`, after the preview overlay. `onConfirm` dispatches to the appropriate handler based on the current target then resets the target to `null`. `initialColor` resolves sentinels (border `'theme'` → `theme.colors.border`; icon `'theme'` → `getSafeTextColor(design.color)`) so the picker always opens on a concrete starting hex.
- [x] Colors accordion now contains, in order: fill `<ColorPicker onOpenCustomPicker>`, `<BorderColorPicker>`, `<BorderScopeSelector>`, `<IconColorPicker>`, conditional contrast warning. All inside the existing `sectionStack`.
- [x] `colorSummary` now appends `· Custom` (via `accordion.summary.colorCustom`) when any of fill/border/icon is a non-preset hex. Falls back to the existing palette-label behavior otherwise.
- [x] Contrast warning: when `iconColor` is explicitly set AND `meetsWCAG(resolvedIconColor, currentDesign.color)` fails AA 4.5:1, renders a `<Text variant="caption">` with `iconColor.contrastWarning`. The warning is gated on the sentinel-not-Auto check so the warning never shows for the auto-derived color (which `getSafeTextColor` already picked for max contrast — Resolved Decision #1).
- [x] `bun run type-check` clean (4/4 turbo tasks).
- [x] **Update plan + commit** — Step 7 boxes checked, single atomic commit.

**Estimated LOC**: ~100 LOC planned. Actual: ~70 LOC in `BadgeDesignerScreen.tsx`, ~5 LOC in styles, ~50 LOC in `ColorPicker.tsx` (Custom… cell + styles), ~10 LOC in `ColorPickerModal.tsx` (i18n swap), ~210 LOC in new `IconColorPicker.tsx`, ~32 LOC of EN i18n. Total ~377 LOC (the IconColorPicker shifted scope from Step 7 — was previously implied as part of "another ColorPicker row" — into a full mirror component).

---

### Step 7.5: Refactor Colors accordion into tabs + add Frame channel ✅ DONE

**Commit**: `refactor(badges): collapse Colors accordion into tabs + add Frame channel` (8e9ca6e)

**What changed and why:** Stacking three palettes (Fill / Border / Icon) inside one accordion read as duplicated swatches in the simulator — every channel reuses `ACCENT_COLORS`, so the same eight cells appeared three times. Folded into a tabbed picker (Fill / Border / Frame / Icon) where each tab owns the channel; one `ColorPickerModal` is shared across all four "Custom…" triggers.

**Schema shift (greenfield, no migration needed — #248 hasn't shipped):**

- Added optional `BadgeDesign.frameColor` (sentinel or hex). Absent → renderer falls back to `theme.colors.border`.
- Dropped `BadgeBorderScope` const, `BadgeBorderScope` type, and `BadgeDesign.borderScope`. Parser strips the retired `borderScope` field on read so any pre-existing in-flight JSON re-serialises clean.
- Renderer no longer reads `borderScope`. Frame stroke comes from `resolvedFrameColor`; banner border reverted to `theme.colors.border` always.

**Components retired:** `BorderColorPicker.tsx`, `IconColorPicker.tsx`, `BorderScopeSelector.tsx`, and the throwaway `ColorsAccordionPrototype` scaffold. Replaced by a single `BadgeColorsAccordion.tsx` co-located in `screens/BadgeDesignerScreen/`, which internally renders `TabHeader` + `ChannelPalette` helpers.

**Implications for Steps 8 + 9:**

- No DE/pseudo translations for `borderScope.*` (the namespace is gone from EN).
- DE/pseudo need to gain a `frameColor.*` namespace (new) alongside the rest.
- Step 9 no longer tests separate `BorderColorPicker` / `BorderScopeSelector` components — testing concentrates on `BadgeColorsAccordion` (which is where the channel-switching, sentinel selection, custom-trigger, and Frame-tab gating logic now lives) and the unchanged renderer / types contracts.

---

### Step 8: Extend i18n resources

**Scope (2026-06-06, post-refactor):** EN already has every new key (`borderColor`, `frameColor`, `iconColor`, `colorPicker`, `colorChannels`, `accordion.summary.colorCustom`) thanks to the typed-i18n forcing function in Steps 6 / 7. DE has `borderColor` only (synced via `ac257ca`); pseudo has nothing new. Step 8 fills DE + pseudo and adds the parity assertion for the new namespaces.

**Files**: `apps/native-rd/src/i18n/resources/de/badgeDesigner.json`, `pseudo/badgeDesigner.json`, `apps/native-rd/src/i18n/__tests__/option-key-parity.test.ts`
**Commit**: `feat(badges): add i18n keys for custom color controls`
**Changes**:

Reference — full key set under `badgeDesigner` namespace (English; ✅ already in `en/badgeDesigner.json` after Steps 6 + 7):

```json
"borderColor": {
  "a11y": "Badge border color",
  "optionA11y": "{{label}} border color",
  "matchTheme": "Match theme",
  "custom": "Custom",
  "customHint": "Opens the color picker",
  "options": { "purple": "Purple", "mint": "Mint", "yellow": "Yellow", "emerald": "Emerald", "teal": "Teal", "orange": "Orange", "sky": "Sky" }
},
"frameColor": { /* same shape as borderColor */ },
"iconColor": {
  "a11y": "Icon color",
  "optionA11y": "{{label}} icon color",
  "matchAuto": "Auto",
  "matchAutoHint": "Picks black or white based on fill contrast",
  "custom": "Custom",
  "customHint": "Opens the color picker",
  "contrastWarning": "Low contrast — text may be hard to read",
  "options": { /* same as borderColor */ }
},
"colorChannels": { "fill": "Fill", "border": "Border", "frame": "Frame", "icon": "Icon" },
"colorPicker": { "title": "Choose Color", "confirm": "Confirm", "cancel": "Cancel", "close": "Close color picker", "confirmHint": "Use color {{hex}}" },
"accordion": { "summary": { "colorCustom": "Custom" /* + existing keys */ } }
```

- [x] DE: added `frameColor`, `iconColor`, `colorChannels`, `colorPicker`, and `accordion.summary.colorCustom` to `de/badgeDesigner.json`. (`borderColor` already populated by `ac257ca`.)
- [x] Pseudo: added `borderColor`, `frameColor`, `iconColor`, `colorChannels`, `colorPicker`, and `accordion.summary.colorCustom` to `pseudo/badgeDesigner.json` following the existing pseudo-locale conventions (Latin-Extended-A characters + bracket padding).
- [x] Exported `BADGE_COLOR_CHANNELS` (runtime const tuple) + `Channel` type from `BadgeColorsAccordion.tsx` so the parity test can reverse-walk the tab union.
- [x] In `option-key-parity.test.ts`, added forward + reverse parity blocks following the existing `BadgeShape` / `BadgeFrame` patterns:
  - `colorChannels` keyset matches `BADGE_COLOR_CHANNELS`.
  - `borderColor.options`, `frameColor.options`, and `iconColor.options` keysets each match `ACCENT_COLORS` (single `describe.each` over the three namespaces — no duplicated test bodies).
  - No `BadgeBorderScope` parity test — the enum no longer exists.
- [x] Verified: `bun run type-check` clean (4/4 turbo tasks); `bun run lint` clean (0 errors, 158 pre-existing warnings in `utils/`); `npx jest --testPathPatterns "option-key-parity|locale-parity"` → 117/117 pass.
- [x] **Update plan + commit** — Step 8 boxes checked, single atomic commit for DE + pseudo + parity + plan update.

**Estimated LOC**: ~120 LOC across DE + pseudo JSON; ~40 LOC test additions.

---

### Step 9: Tests ✅ DONE

**Files**: `apps/native-rd/src/badges/__tests__/BadgeRenderer.test.tsx` (additions), `ColorPicker.test.tsx` (additions), `ColorPickerModal.test.tsx` (new), `BadgeColorsAccordion.test.tsx` (new — under `src/screens/BadgeDesignerScreen/__tests__/`)
**Commit**: `test(badges): cover custom color renderer resolution and tabbed Colors accordion`

**`types.test.ts`** — already comprehensive (committed in Step 2 + refactor). Covers `createDefaultBadgeDesign` returning `borderColor: '#000000'`, `borderColor` / `iconColor` / `frameColor` sanitization matrices via `test.each`, and the parser stripping the retired `borderScope` field. No additions needed.

**`BadgeRenderer.test.tsx` additions** (12 new tests under a `custom color resolution` describe):

- [x] When `design.borderColor` is `'theme'` (sentinel), shape stroke equals `theme.colors.border`.
- [x] When `design.borderColor` is absent, shape stroke equals `theme.colors.border` (defensive: missing-field path).
- [x] When `design.borderColor` is `'#ff0000'`, shape stroke equals `'#ff0000'`.
- [x] When `design.frameColor` is absent, every frame stroke equals `theme.colors.border` (boldBorder frame with `frameParams` supplied).
- [x] When `design.frameColor` is `'#00ff00'`, frame strokes use that hex while the shape stroke stays on `borderColor`.
- [x] Banner stroke stays on `theme.colors.border` regardless of `borderColor` / `frameColor` overrides (banner is no longer scope-driven).
- [x] When `design.iconColor` is a hex, icon mock's `color` prop uses that hex.
- [x] When `design.iconColor` is absent, icon `color` falls back to `getSafeTextColor(design.color)`.
- [x] When `design.iconColor === 'theme'` (sentinel), icon `color` falls back to `getSafeTextColor(design.color)`.
- [x] When `centerMode === 'monogram'` and `design.iconColor` is set, the monogram text uses the same resolved hex.

Helper added: `payloadToHex` normalises react-native-svg's packed `{type, payload}` color shape back into a lowercase `#rrggbb` so assertions stay readable. `walk()` traverses the toJSON tree; `findShapeStrokeHex` / `findAllStrokeHexes` / `findAllFillHexes` are channel-specific finders.

**`ColorPicker.test.tsx` additions** (5 new tests):

- [x] Selected swatch ring uses `theme.colors.accentPrimary` (the Step 4 fix — `theme.colors.primary` does not exist; correct token is `accentPrimary`).
- [x] Custom… trigger renders when `onOpenCustomPicker` is provided.
- [x] Custom… trigger does NOT render when `onOpenCustomPicker` is omitted (back-compat for legacy call sites).
- [x] Pressing the Custom… trigger fires `onOpenCustomPicker`.
- [x] Custom… cell is highlighted when the selected color is not in the palette.

**`ColorPickerModal.test.tsx`** (new, 8 tests):

- [x] Renders nothing visible when `visible=false`.
- [x] Renders modal body when `visible=true` (testID `reanimated-color-picker` present + `color-picker-modal` root).
- [x] `onClose` fires when Cancel is pressed.
- [x] `onClose` fires when the header close (X) button is pressed.
- [x] `onConfirm` is called with the initial color when Confirm is pressed before any change.
- [x] `onConfirm` is called with the latest color after `onChangeJS` fires (via the mock's testID press surface).
- [x] Renders the default i18n title `"Choose Color"`.
- [x] Uses an explicit `title` prop when provided.

Mock strategy: `reanimated-color-picker` is mocked with an inert `ColorPicker` that exposes its `onChangeJS` callback through a Pressable testID. The RN auto-mock for `Modal` is overridden (`react-native/Libraries/Modal/Modal` → ES-module passthrough that gates on `visible` and re-emits `children`) because the default `mockComponent` shim `requireActual`s the real Modal and fails on `__fbBatchedBridgeConfig`.

**`BadgeColorsAccordion.test.tsx`** (new, 16 tests under `src/screens/BadgeDesignerScreen/__tests__/`):

- [x] Tab visibility: Fill / Border / Icon always present; Frame tab hidden when `design.frame === 'none'`; Frame tab shown when set.
- [x] Tab switching: pressing a tab header switches the visible palette body.
- [x] Frame-tab redirect: when the active Frame tab unmounts (user clears the frame), the `useEffect` guard switches to Border.
- [x] Border channel: Match-theme fires `onChangeBorder(BADGE_COLOR_THEME_SENTINEL)`, swatch fires `onChangeBorder(hex)`, Custom… fires `onOpenCustomPicker('border')`.
- [x] Frame channel: Match-theme + swatch callbacks fire correctly.
- [x] Icon channel: Auto fires `onChangeIcon(BADGE_COLOR_THEME_SENTINEL)`, swatch fires `onChangeIcon(hex)`.
- [x] Fill channel: swatch press fires `onChangeFill(hex)` (no tab switch needed — Fill is the initial tab).
- [x] Contrast warning renders when `iconColor` is an explicit hex with low contrast against `design.color` (white-on-white forces failure deterministically).
- [x] Contrast warning is hidden when `iconColor === BADGE_COLOR_THEME_SENTINEL` (auto-derived color is safe by construction).
- [x] Contrast warning is hidden when `iconColor` passes AA against the fill (`#000000` on `#ffffff`).

**Verification**:

- [x] `bun run type-check` clean (4/4 turbo tasks).
- [x] `bun run lint` 0 errors (162 pre-existing utils/ warnings — within the baseline noted in earlier steps).
- [x] `npx jest --testPathPatterns "badges/__tests__|BadgeColorsAccordion"` → 6491/6512 pass. The 21 failures are the unchanged pre-existing `IconPicker.test.tsx` Modal/native-bridge baseline reproducible on `main`.
- [x] **Update plan + commit** — Step 9 boxes checked, single atomic commit for renderer + ColorPicker + ColorPickerModal + accordion tests.

**Estimated LOC**: ~250 LOC planned. Actual: ~210 LOC `BadgeRenderer.test.tsx` additions, ~70 LOC `ColorPicker.test.tsx` additions, ~150 LOC new `ColorPickerModal.test.tsx`, ~220 LOC new `BadgeColorsAccordion.test.tsx` = ~650 LOC. Higher than the estimate because each channel (Border/Frame/Icon) needed its own per-handler coverage and the contrast-warning matrix grew to 3 cases for adequate confidence in the icon channel's gating logic.

---

## Testing Strategy

- [ ] Unit tests: Jest 30, `@testing-library/react-native` v13. Test files mirror `src/` under `src/__tests__/`.
- [ ] Use `test.each` for the parser sanitization matrix (valid hex / invalid hex / sentinel / missing → expected output).
- [ ] `BadgeRenderer.test.tsx` color-resolution tests: use existing `createDesign()` helper with overrides for new fields; assert SVG prop values via RNTL queries on testID.
- [ ] Mock `reanimated-color-picker` in jest (similar to `react-native-svg` mock pattern) — expose a controlled `onColorChange` callback so modal tests don't depend on native Reanimated internals.
- [ ] Manual testing: open designer, switch through all four tabs (Fill / Border / Frame / Icon); for each, pick a sentinel, an accent swatch, and a custom hex via the modal; verify Frame tab disappears when frame is cleared and reappears when set; save; reload badge; share/export PNG; verify visual in highContrast and autismFriendly themes.
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

**7. Border scope retired in favour of a separate `frameColor` channel (2026-06-06).** The original three-value `BadgeBorderScope` (`shape` / `shapeAndFrame` / `all`) collapsed under simulator review — three stacked palettes read as duplicates and the "All" scope's banner coupling never felt like a real product affordance. Replaced with a 4th channel (`frameColor`) so the user picks "what to color" by tab instead of layering a scope enum on top of border color. Banner border reverts to `theme.colors.border` always; if someone later wants colored banners, that's a separate channel.
