# Development Plan: Badge Designer Bug Fixes (TDD-driven)

## Background

Two visual bugs in the native-rd badge designer are documented as failing TDD tests on branch `test/native-rd-badge-designer-tdd` (commit `91654aa0`). This plan describes the fixes that turn those tests green.

**Tracking**: no GitHub issue. The failing tests themselves are the contract.

**Failing tests (4 total)**:

- `BadgeDesignerScreen.test.tsx` — "attaches frameParams when a non-none frame is selected"
- `BadgeDesignerScreen.test.tsx` — "clears frameParams when frame is set back to none"
- `contours.test.ts` — "top arc geometry varies with the text it must contain"
- `contours.test.ts` — "bottom arc geometry varies with the text it must contain"

## Intent Verification

Observable criteria for "fixed":

- [ ] All 4 failing TDD tests pass
- [ ] No previously-passing test regresses (BadgeDesignerScreen baseline: 31 passing; contours: 9 passing; PathText: 22 passing; FrameOverlay: 11 passing)
- [ ] On simulator: selecting a non-"none" frame renders a visible border ring around the badge in the live preview (visual confirmation of bug 1)
- [ ] On simulator: enabling path text and typing renders the text centered along the top of the badge, not bunched on the right (visual confirmation of bug 2)
- [ ] `e2e/flows/badge-redesign.yaml` runs end-to-end without selector errors

## Dependencies

None. The TDD branch is already pushed; this plan can be implemented in a follow-up branch.

## Objective

Make the badge designer's frame and path-text controls produce visually correct output. Both bugs sit at the rendering boundary between designer state and `BadgeRenderer` SVG output. The fixes must respect existing test contracts (a11y labels, save round-trips) and avoid introducing pixel-level visual regressions on other shapes/themes.

## Decisions

| ID  | Decision                                                                                                 | Alternatives Considered                             | Rationale                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Wire `useFrameParamsForGoal` directly into `BadgeDesignerContentBadge` and `BadgeDesignerContentNewGoal` | Compute params lazily in `handleFrameChange`        | Keeps the params in sync with goal data when steps/evidence change underneath. Hook approach matches how the rest of the screen reads Evolu data.                                                  |
| D2  | Pass `topText` / `bottomText` into `generateContour` via an opts object (4th arg, optional)              | Widen positional params to 5 args                   | Optional opts arg keeps existing call sites working (story fixtures call `generateContour(shape, size, inset)` without text). Adding a 4th positional arg would force every story fixture updated. |
| D3  | Char-width estimation via `text.length * fontSize * 0.6` for DM Mono                                     | Use `react-native-svg`'s `Text.measureText` (async) | Sync estimation is good enough for an inscription that visually fits inside ±90° of arc. Real glyph metrics would be async and require state plumbing through the renderer.                        |
| D4  | Remove the 180° rotation transform on the `<G>` group in `PathText.tsx`                                  | Keep rotation, fix arc start/end points             | The rotation existed only to compensate for arcs that read upside-down. Once arcs are sized to text and positioned at top/bottom, they read naturally in the reading direction without rotation.   |
| D5  | Phase 1 (frames) and Phase 2 (path text) ship as **separate PRs**                                        | Single PR                                           | Phase 1 is ~30 minutes and unblocks visual confirmation. Phase 2 touches 6 shape contours + the rotation transform + existing PathText tests; reviewing them together is harder than separate.     |
| D6  | Clamp computed arc angle to `≤ 0.9π` (162°)                                                              | Allow up to π                                       | Prevents long inscriptions from wrapping around the full half-circle and meeting at the start/end seam. UX falls back to truncating overlong text (existing `maxLength` already in input).         |

## Affected Areas

### Phase 1 — Frame rendering (Bug 1)

**Modified files**:

- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — wire `useFrameParamsForGoal` into both content components; rewrite `handleFrameChange` to attach/clear `frameParams` based on selection
- `apps/native-rd/src/badges/__tests__/dataMapper.test.ts` — add regression test that `computeFrameParams` returns a valid object (not `NaN`s) for empty step/evidence inputs (defensive — only if Phase 1 implementation surfaces a problem)

### Phase 2 — Path text centering (Bug 2)

**New files**:

- `apps/native-rd/src/badges/text/measureTextWidth.ts` — pure function returning estimated text width for a given length + fontSize (DM Mono assumption documented inline)
- `apps/native-rd/src/badges/text/__tests__/measureTextWidth.test.ts` — unit tests for the estimator

**Modified files**:

- `apps/native-rd/src/badges/shapes/contours.ts` — widen `generateContour` signature; update all 6 shape contour generators to size top/bottom arcs from text length when provided
- `apps/native-rd/src/badges/text/PathText.tsx` — remove 180° rotation transform on the `<G>` group; update prop pass-through so `BadgeRenderer` forwards `pathText` / `pathTextBottom` into the contour generator
- `apps/native-rd/src/badges/BadgeRenderer.tsx` — pass text content into `generateContour` call (currently no text plumbing through)
- `apps/native-rd/src/badges/__tests__/PathText.test.tsx` — invert/delete the "rotates the full path text layer 180 degrees" test (PathText.test.tsx:170-180); update geometry expectations
- `apps/native-rd/src/badges/__tests__/contours.test.ts` — reconcile sweep-flag assertions (lines 81-91) with new natural-direction arcs

## Implementation Plan

### Phase 1 — Frame rendering

#### Step 1.1: Wire `useFrameParamsForGoal` into redesign mode

**Files**: `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`

**Commit**: `fix(native-rd): attach frameParams when designer frame is selected`

**Changes**:

- [ ] In `BadgeDesignerContentBadge`: import `useFrameParamsForGoal`; call it with `badge.goalId`, `badge.createdAt`, `badge.completedAt`. Store result in a local const (e.g. `derivedFrameParams`).
- [ ] In `BadgeDesignerContentNewGoal`: same hook call but with `goalId`, `goal.createdAt`, `null` (goal isn't completed yet during new-goal design flow).
- [ ] Lift `handleFrameChange` to take `derivedFrameParams` from the closure. Logic:
  ```ts
  const handleFrameChange = useCallback(
    (frame: BadgeFrame) => {
      if (frame === BadgeFrame.none) {
        onDesignChange({ ...currentDesign, frame, frameParams: undefined });
      } else {
        onDesignChange({
          ...currentDesign,
          frame,
          frameParams: derivedFrameParams,
        });
      }
    },
    [currentDesign, derivedFrameParams, onDesignChange],
  );
  ```
- [ ] Run `npx jest --no-coverage --testPathPatterns BadgeDesignerScreen` — 33 tests should pass (was 31 + 2 fixed).

#### Step 1.2: Visual verification on simulator

**Files**: none (manual verification step)

**Commit**: n/a

**Changes**:

- [ ] Rebuild iOS E2E: `bun run native:ios:e2e`
- [ ] Reuse `/tmp/recon-v3.yaml` to navigate to the designer with Guilloche selected
- [ ] Take screenshot, confirm the badge preview now shows a visible Guilloche frame ring (was: identical to baseline)

### Phase 2 — Path text centering

#### Step 2.1: Add char-width estimator

**Files**:

- `apps/native-rd/src/badges/text/measureTextWidth.ts`
- `apps/native-rd/src/badges/text/__tests__/measureTextWidth.test.ts`

**Commit**: `feat(native-rd): add text-width estimator for path-text arc sizing`

**Changes**:

- [ ] Create `measureTextWidth.ts` exporting `measureTextWidth(text: string, fontSize: number): number`. Implementation: `return text.length * fontSize * 0.6` with comment explaining DM Mono char-width assumption (~0.6 em).
- [ ] Tests assert linear scaling with text length and font size, plus zero-length input returns 0.

#### Step 2.2: Widen `generateContour` signature; update `circleContour`

**Files**: `apps/native-rd/src/badges/shapes/contours.ts`

**Commit**: `refactor(native-rd): make contour generation text-aware for path-text centering`

**Changes**:

- [ ] Widen signature: `generateContour(shape, size, inset, opts?: { topText?, bottomText?, fontSize? })`. Default behavior (no opts) preserves the current half-circle output so story fixtures don't break.
- [ ] In `circleContour`: when `opts.topText` is provided, compute `arcAngle = clamp(measureTextWidth(topText, fontSize) / textR, 0, 0.9 * π)`. Compute arc start/end at angle `±arcAngle/2` from top-center.
- [ ] Generate the top arc going CCW from right-end to left-end via the top (sweep flag chosen so text reads left-to-right when read along the path direction, no rotation needed).
- [ ] Mirror logic for `bottomText` along the bottom of the badge.
- [ ] Run `npx jest --no-coverage --testPathPatterns contours.test` — the 2 TDD tests should pass; existing 9 tests need their sweep-flag expectations reconciled (next step).

#### Step 2.3: Update remaining 5 shape contours

**Files**: `apps/native-rd/src/badges/shapes/contours.ts`

**Commit**: `refactor(native-rd): apply text-aware arcs to hexagon, shield, rounded-rect, star, diamond contours`

**Changes**:

- [ ] For each shape, derive a top/bottom inscription baseline (a horizontal line at the top/bottom of the shape's interior) and an arc/curve aligned with the shape's natural contour at that location.
- [ ] Hexagon and rounded-rect: the inscription path can follow a slight curve along the top/bottom edge; size proportional to text width.
- [ ] Shield: top inscription follows the curved upper crest; bottom is a short flat baseline above the point.
- [ ] Star and diamond: inscription paths bridge between two adjacent vertices on the top/bottom.
- [ ] Each shape gets a regression unit test asserting the path is non-empty for any non-empty text input.

#### Step 2.4: Remove rotation transform; plumb text through `BadgeRenderer`

**Files**:

- `apps/native-rd/src/badges/text/PathText.tsx`
- `apps/native-rd/src/badges/BadgeRenderer.tsx`

**Commit**: `fix(native-rd): drop 180° path-text rotation now that arcs read naturally`

**Changes**:

- [ ] In `PathText.tsx`: delete the `rotateTransform` constant and the `transform={rotateTransform}` prop on `<G>`. Children render in natural direction.
- [ ] In `BadgeRenderer.tsx`: pass `pathText` and `pathTextBottom` into `generateContour` call so the contour can size arcs to text. Compute font size first (already derived for Text element) and pass as `fontSize` opt.
- [ ] In `PathText.test.tsx`: delete the "rotates the full path text layer 180 degrees" test; the "G transform exists" assumption no longer holds. Update any other tests that check for the rotation.

#### Step 2.5: Visual verification on simulator

**Files**: none (manual verification step)

**Commit**: n/a

**Changes**:

- [ ] Rebuild iOS E2E
- [ ] Reuse `/tmp/recon-v5.yaml` to enable path text and type "ACHIEVEMENT"
- [ ] Take screenshot, confirm the text now reads centered along the top arc (was: bunched on right side per user-supplied screenshot from 2026-04-27)

### Phase 3 — End-to-end flow validation

#### Step 3.1: Run badge-redesign.yaml end-to-end

**Files**: none (validation only)

**Commit**: n/a

**Changes**:

- [ ] `cd apps/native-rd && bun --filter native-rd test:e2e:single e2e/flows/badge-redesign.yaml`
- [ ] Confirm flow passes through all assertions: navigation into designer, frame/color/shape state propagation, save round-trip via Badges tab re-entry.
- [ ] If any selectors break (e.g. text changes after fixes), update the flow to match.

### Phase 1.5 — Always-visible badge preview (side quest)

**Motivation**: While verifying Phase 1 visually, the user observed that scrolling
to interact with form controls (Frame, Color, Path Text) hides the badge preview
entirely. Editing without live feedback is frustrating and works against the
ND-friendly "predictable, immediate-feedback" goal of the app.

**Approach**: Hoist the preview into an absolutely-positioned overlay above the
ScrollView. Bind its `translateY` to the ScrollView's scroll offset via
`Animated.event` with `useNativeDriver`. Preview slides over `topBar` at exact
scroll rate; form sections continue to scroll _under_ `topBar` as today. No
scaling, no parallax, no layout animation — pure z-index + scroll-bound translate.

**Why this approach over alternatives**:

- **Hoist + static (Option A)** — Simpler but takes ~200px of screen permanently;
  preview never reaches the topBar area, so we waste vertical space.
- **Collapsing parallax header** — Looks cool but introduces motion that conflicts
  with `autismFriendly` / `lowInfo` variants and `useReducedMotion()`. Not worth
  the a11y plumbing for a side quest.
- **`stickyHeaderIndices={[0]}`** — Works but pins the preview at full size below
  topBar; doesn't allow the preview to overlap topBar (which is the user's
  preferred behavior).

**Modified files**:

- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.styles.ts`

#### Step 1.5.1: Layout restructure with scroll-bound preview overlay

**Commit**: `feat(native-rd): keep badge preview always visible while editing`

**Changes**:

- [ ] Pull `previewContainer` out of the ScrollView into a sibling
      `Animated.View` overlay positioned `absolute, top: topBarBottom`.
- [ ] Add `scrollY = useRef(new Animated.Value(0)).current` in `DesignEditor`.
- [ ] Replace `<ScrollView>` with `<Animated.ScrollView>` and bind
      `onScroll={Animated.event([{nativeEvent:{contentOffset:{y:scrollY}}}], {useNativeDriver:true})}`,
      `scrollEventThrottle={16}`.
- [ ] Overlay style: `transform: [{ translateY: Animated.multiply(scrollY, -1) }]`,
      `zIndex: 2`, `pointerEvents: "none"` so back-button taps pass through when
      the preview is covering topBar.
- [ ] Add `paddingTop: PREVIEW_HEIGHT` to ScrollView's `contentContainerStyle`
      so form starts below the preview at rest.
- [ ] Verify: `previewRef` stays attached to the inner View — `captureBadge`
      flow unaffected.
- [ ] Verify: BadgeDesignerScreen tests still pass (33/33).
- [ ] Simulator visual check: scroll up → preview slides over topBar → back
      button still tappable while covered.

**Risk**: `useNativeDriver: true` for `translateY` is safe; transforms are
GPU-friendly. Tests use accessibility-label queries, not layout positions, so
they're unaffected.

## Out of Scope

- E2E seed mechanism (deep-link + `EXPO_PUBLIC_E2E_MODE` gate to bypass the 30-second goal-lifecycle setup). Tracked as a separate follow-up; the current `runFlow:` setup is the minimal-effort working answer.
- Real glyph-metrics-based text measurement (would require async measure calls and state plumbing). The 0.6-em estimate is good enough for the inscription length range users actually input.
- Visual regression tests / snapshot images. Once both phases ship, a Storybook visual story would be the cleanest forcing function — but adding visual-regression CI is its own piece of work.
- Updating the `useFrameParamsForGoal` hook to accept null `completedAt`. If the hook currently requires a non-null timestamp, Phase 1 Step 1.1 will need a small adjustment to pass through pre-completion goal data; flag during implementation if the type narrows reject the call.
