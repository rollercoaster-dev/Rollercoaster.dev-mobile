# Plan: Fix curved path text on built (device) badge renders

## Context

In the native-rd badge designer, **bottom** path text on shaped badges renders correctly in the iOS Simulator but is visibly broken in built/TestFlight builds (screenshots: hexagon, rounded rect, star, diamond all show `"BOTTOM PATH TEXT"` truncated symmetrically on both ends — e.g. star reads `"M TOM PATH TC"`, diamond reads `"TOMPATE"`).

Two root causes are at play:

1. **Star bottom arc sits too high** — visually crammed into the inward indent between the two bottom star points instead of sitting cleanly below the silhouette (mirroring the top arc which clears the top tip).
2. **Bottom-arc length is fitted to an _estimated_ glyph width that under-counts on device.** `measureTextWidth` uses `0.7 × fontSize × length` (apps/native-rd/src/badges/text/measureTextWidth.ts:6). On simulator iOS falls back to a tighter font; on device the fallback renders wider, so `arcAngleForText` produces an arc shorter than the text actually needs. `TextPath` with `textAnchor="middle"` + `startOffset="50%"` centers the text — when it overflows, characters drop off **both** ends symmetrically. Exactly the pattern in the screenshots.

User asked: lower the star's bottom path, and (follow-up) set per-shape max characters wired into form validation.

## Critical files

- `apps/native-rd/src/badges/shapes/contours.ts` — `PATH_TEXT_CENTER_Y_OFFSET` (line 83-93) controls per-shape arc center Y; star bottom is currently `+3` px and needs to be lowered.
- `apps/native-rd/src/badges/text/PathText.tsx` — renders TextPath; no change.
- `apps/native-rd/src/badges/PathTextEditor.tsx` — TextInputs for top/bottom path text; needs `maxLength` + shape-aware capacity.
- `apps/native-rd/src/badges/text/measureTextWidth.ts` — single source of glyph-width estimate. Used both by arc sizing AND will be reused to derive `MAX_PATH_TEXT_CHARS` per shape.
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — call site of `PathTextEditor`; passes `shape` through to the new prop.
- `apps/native-rd/src/badges/text/BottomLabel.tsx` — reference pattern for the `BOTTOM_LABEL_INPUT_MAX_CHARS` constant + truncation slice approach.
- `apps/native-rd/src/badges/__tests__/contours.test.ts` & `PathText.test.tsx` & `PathTextEditor.test.tsx` — extend with the new behaviour.

## Implementation

### Step 1 — Lower star bottom arc (geometry)

In `contours.ts:83-93`, increase the star bottom Y offset so the arc clears the silhouette like the top does. Star outer radius is `size/2`; the top uses `-8` to lift above the upper tip. The bottom needs an equivalent push. Bump:

```ts
star: { top: -8, bottom: 14 },   // was: { top: -8, bottom: 3 }
```

This moves the arc center from `size/2 + 3` to `size/2 + 14`. At preview size 160 that shifts the visible arc baseline ~11 px lower — enough to clear the two bottom inward indents and let the text sit beneath the star body. No other shape changes (their bottom paths render fine in the screenshots).

Verify via:

- `contours.test.ts` already has shape-agnostic invariants; tweak the star-specific assertion if it pins the previous offset.
- Layout invariant matrix in `__tests__/layout-invariant.test.ts` (added in commit `1996623`) will re-run automatically and surface any new overlap.

### Step 2 — Conservative glyph-width estimate

In `measureTextWidth.ts`, bump `AVG_CHAR_WIDTH_RATIO` from `0.7` to `0.8`. The comment already documents the iOS DM Mono fallback issue (originally 0.6, raised to 0.7). The TestFlight build evidence shows 0.7 still under-counts. Keeping a single source-of-truth ratio means both the arc-sizing path and the max-char calculation stay consistent.

This is a small change but invalidates a number of fixed-pixel snapshots in `contours.test.ts`. Update those snapshot values rather than special-casing the constant.

### Step 3 — Per-shape max chars, derived from arc capacity

Add a new module `apps/native-rd/src/badges/text/pathTextLimits.ts` exporting `getPathTextMaxChars(shape, side)`. The cap is computed from `getPathTextRadius * MAX_ARC_ANGLE` divided by a single-character width derived from `measureTextWidth("X", fontSize)` — calling the function rather than re-declaring the `0.8` ratio so the two stay in lockstep. Includes a `0.92` safety margin for the `largeText` / `dyslexia` a11y font scales.

Also add `export type PathTextSide = "top" | "bottom"` to `contours.ts` and replace the four inline `"top" | "bottom"` spellings (in `getPathTextRadius`, `getPathTextCenterY`, `arcSized`, `PickArcConfig`) so the side type has one home.

`REFERENCE_INSET` matches `metrics.pathTextInset` at preview size 160 in default density (≈ 15.9 → 16) rather than `strokeWidth/2 = 1.5`. BadgeRenderer passes `layout.pathTextInset` into PathText/generateContour, not the stroke half-width, so the cap derivation must use the same wider inset or it overestimates arc capacity and still lets strings overflow on device (this was flagged in review of the first cap draft).

Approximate caps at the reference size (informational, not committed):

| shape       | top | bottom |
| ----------- | --- | ------ |
| circle      | 10  | 10     |
| hexagon     | 8   | 8      |
| roundedRect | 10  | 10     |
| shield      | 10  | 10     |
| star        | 15  | 16     |
| diamond     | 6   | 6      |

Diamond is binding — matches the visible space in the screenshots ("TOMPATE" was 7 chars before truncation).

### Step 4 — Wire validation into `PathTextEditor`

In `PathTextEditor.tsx`:

- Add `shape: BadgeShape` to `PathTextEditorProps`.
- Derive `maxTop = getPathTextMaxChars(shape, "top")` and `maxBottom = getPathTextMaxChars(shape, "bottom")` once per render (pure, cheap; no `useMemo`).
- Pass `maxLength={maxTop}` / `maxLength={maxBottom}` to the inputs. `TextInput.maxLength` is the only truncation point in the editor — the simplify pass dropped the earlier defensive `.slice()` wrappers since they duplicated `maxLength` + the parent-side truncation below.

In `BadgeDesignerScreen.tsx` (~line 113), `handleShapeChange` is the truncation point when shape changes mid-edit: early-return if shape is unchanged, otherwise slice stored `pathText` / `pathTextBottom` to the new shape's caps before propagating via `onDesignChange`. This mirrors `BOTTOM_LABEL_INPUT_MAX_CHARS`'s `.slice()` pattern in `buildBottomLabelBox`.

Pass `shape={currentDesign.shape}` from the screen and from `BadgeDesigner.stories.tsx`.

### Step 5 — User-visible character counter

Mirror the `CaptureTextNote.tsx` pattern — a `{used}/{max}` counter under each path-text input that turns warning-colored (`accentPrimary`, bold) within 3 chars of the cap. Without this the input silently stops accepting characters when the cap hits; the counter makes the limit legible and gives the screen reader an audible "Top: 5 of 20 characters used" via `accessibilityLabel`.

Lives in a small `CharCounter` component inside `PathTextEditor.tsx` (not extracted globally — `bottomLabel` etc. don't get it in this scope).

### Step 6 — Tests

- `__tests__/pathTextLimits.test.ts` (new): assert `getPathTextMaxChars` returns positive integers for every `BadgeShape × side` combo and that diamond ≤ star (smoke test).
- `__tests__/PathTextEditor.test.tsx`: add `shape: BadgeShape.circle` to `defaultProps`; assert the top/bottom counters render with the right `{count}/{max}` accessibility label.
- `__tests__/contours.test.ts`: bump the star bottom-Y pin to `cy + 14`.
- `__tests__/measureTextWidth.test.ts`: bump the ratio assertion to `0.8`.
- `__tests__/BottomLabel.test.tsx`: relax the exact-fit assertion to `toBeLessThanOrEqual(... + 1e-9)` — the wider ratio surfaces a pre-existing FP-drift in `getBottomLabelFontSize`'s shrink ratio.
- Existing badge layout invariant matrix (5208 combos) runs unchanged and validates the new offset doesn't cause new overlaps.

## Verification

1. **Local typecheck + lint + tests:**
   ```bash
   cd apps/native-rd
   bun run type-check
   bun run lint
   npx jest --no-coverage badges
   ```
2. **Visual regression (simulator):** `npx expo run:ios` → Design Badge → cycle through all 6 shapes with `pathTextPosition="both"` and `pathText="TOP PATH TEXT"`, `pathTextBottom="BOTTOM PATH TEXT"`. Confirm star bottom path now sits below the silhouette and inputs are capped per shape (typing past the cap stops).
3. **Built/device validation:** install via TestFlight or `eas build --profile preview --platform ios`. Re-shoot the same four shapes. Bottom text must be fully readable on hexagon, rounded rect, star, diamond.
4. **A11y variants:** repeat shape cycle once in `largeText` and once in `dyslexia` to confirm the 0.92 safety margin holds.
