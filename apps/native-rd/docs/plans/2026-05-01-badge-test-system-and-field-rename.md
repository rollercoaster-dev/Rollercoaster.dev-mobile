# Badge Component Test System + Field Rename Refactor

**Date:** 2026-05-01
**Status:** Phases 0 + 1 + 2 complete — Phases 3-4 pending
**Owner:** Joe

## Context

The native-rd badge designer composes 6 layers (shadow, shape, frame overlay, path text, center content, banner) across 6 shapes × 6 frames × 2 center modes × 3 path-text positions × 2 banner positions = **400+ visual permutations**. Today there are **zero tests asserting that design features render centered and non-overlapping** — only element counts, accessibility labels, and shadow/banner overflow math are checked. Centering relies on per-shape magic Y offsets in `layout.ts:24-31` (e.g. `shield: -0.01`, `star: 0.015`) tuned by eye, with no regression net.

At the same time, two field labels in `BadgeDesign` contradict their visible behavior — confirmed by the user's "Full blown badge" screenshot:

- `centerLabel` actually renders **below** the badge (`CenterLabel.tsx:26-30`), not in the center.
- `banner.position: 'center'` actually renders the **top strap** straddling the top edge, not the center.

A third field (`BadgeDesign.label`) is dead code — accepted by the parser, never read.

The project is **pre-release**: no persisted badges to migrate, so renames are free.

**Outcome:** a tiered test system that catches centering/overlap regressions across all permutations, plus correct field naming so future test code (and the UI) say what they do.

## Approach — iterative, four phases

Stop after each phase and decide whether the next is needed. Logic-only tests are expected to catch ~80% of regressions; only escalate to pixel snapshots if the matrix story shows visual drift that logic tests miss.

---

### Phase 0 — Rename mismatched fields ✅

**Status:** Complete (2026-05-01).
Mechanical rename, foundation for everything else. One PR.

**Renames:**

| Old                                                  | New                           | Rationale                                  |
| ---------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| `BadgeDesign.centerLabel`                            | `BadgeDesign.bottomLabel`     | Renders below the badge, not in the center |
| `CENTER_LABEL_*` constants in `text/CenterLabel.tsx` | `BOTTOM_LABEL_*`              | Matches the field                          |
| `CenterLabel` component + file                       | `BottomLabel`                 | Matches the field                          |
| `BannerPosition.center` enum value `"center"`        | `"top"` (keep enum key `top`) | Renders at the top edge                    |
| `hasVisibleCenterBanner` (`layout.ts:33`)            | `hasVisibleTopBanner`         | Matches the value                          |
| `STAR_BANNER_TOP_VISIBLE_RATIO` (`Banner.tsx`)       | keep — already correct        | —                                          |
| `BadgeDesign.label`                                  | **delete**                    | Dead code, never rendered                  |

**Files touched (~13):**

- `badges/types.ts` (BadgeDesign, BannerPosition, parseBadgeDesign)
- `badges/layout.ts` (helpers, metrics computation)
- `badges/BadgeRenderer.tsx`
- `badges/text/CenterLabel.tsx` → rename file to `BottomLabel.tsx` + update `text/index.ts`
- `badges/text/Banner.tsx`
- `badges/BannerEditor.tsx`
- `badges/__tests__/{BadgeRenderer,Banner,BannerEditor,CenterLabel,layout,types}.test.tsx`
- `screens/BadgeDesignerScreen/{BadgeDesignerScreen.tsx,.styles.ts,__tests__/...}`
- `stories/badges/{BadgeDesigner,TextFeatures}.stories.tsx`
- `components/CardCarousel/CardCarousel.tsx` (uses BannerPosition)

**UI labels** in `BadgeDesignerScreen` and `BannerEditor` — verify the user-facing copy also reflects "Bottom label" / "Top banner". Adjust if stale.

**Validation:** `bun run type-check && bun run lint && bun test --testPathPatterns badges`. Existing tests must pass with renamed identifiers.

**Outcome (2026-05-01):**

- 19 files modified, 2 renamed (`text/CenterLabel.tsx` → `text/BottomLabel.tsx`, `__tests__/CenterLabel.test.tsx` → `__tests__/BottomLabel.test.tsx`).
- `bun run type-check`, `bun run lint`, and `npx jest --testPathPatterns badges|BadgeDesignerScreen` all green (656/656 tests).
- One UI assertion updated (`"Center label"` → `"Bottom label"` accessibility label).
- Use `npx jest --no-coverage` rather than `bun test` for native-rd — `bun test` segfaults on this suite (Bun 1.3.8). Plan command updated below.

---

### Phase 1 — Extract testable layout primitives ✅

**Status:** Complete (2026-05-01).
Centralise geometry so tests can assert against pure functions, not rendered SVG.

**New function in `badges/layout.ts`** (or co-located as `badges/layoutBoxes.ts`):

```ts
type Box = { x: number; y: number; w: number; h: number };

type LayoutBoxes = {
  viewBox: Box;
  shape: Box;
  frame: Box | null;
  iconOrMonogram: { cx: number; cy: number; size: number };
  pathTextTop: Box | null;
  pathTextBottom: Box | null;
  banner: Box | null;
  bottomLabel: Box | null;
};

export function getBadgeLayoutBoxes(
  design: BadgeDesign,
  size: number,
): LayoutBoxes;
```

Implementation reuses existing exports rather than re-deriving:

- `getBadgeLayoutMetrics` from `layout.ts`
- `BOTTOM_LABEL_SIZE_RATIO`, `getBottomLabelY`, `getBottomLabelBottomOverflow` from `text/BottomLabel.tsx`
- `getBannerHeight`, banner offset math from `text/Banner.tsx`
- `getPathTextRadius` (currently buried in `shapes/contours.ts`) — **extract and export**
- `ICON_SIZE_RATIO = 0.45` from `BadgeRenderer.tsx` — **lift to `layout.ts`**

`BadgeRenderer.tsx` is then refactored to consume `getBadgeLayoutBoxes` so renderer and tests share one source of truth. Behaviour must be unchanged — verified by snapshot of existing renderer test output.

**Outcome (2026-05-01):**

- Three atomic commits:
  1. `12b0da20` — lift `ICON_SIZE_RATIO` into `layout.ts`, export `getPathTextRadius` from `shapes/contours.ts` (per-shape radii preserved exactly, including shield's bottom 0.8 reduction).
  2. `4742e5c0` — add `getBadgeLayoutBoxes(design, size, options?)` returning a pure `LayoutBoxes` description (viewBox, shape, frame, iconOrMonogram, pathTextTop/Bottom, banner, bottomLabel, density). 21 unit tests cover viewport math, shape/frame, icon/monogram positioning, path text bands, banner positions, bottom-label star offset, density propagation.
  3. `c429c034` — refactor `BadgeRenderer` to consume `getBadgeLayoutBoxes`. The boxes return type was extended with `metrics`, `inset`, `innerInset`, `bannerTopVisibleRatio`, `bottomLabelExtraOffset` so the renderer needs only a single call.
- Net delta: −63/+41 lines in renderer (duplicate viewport math removed); 644 → 677 badge + designer tests, all green.
- Behaviour unchanged: existing renderer/Banner/BottomLabel/PathText/screen tests pass without modification.

---

### Phase 2 — Logic-only invariant test matrix ✅

**Status:** Complete (2026-05-01).

**New file: `badges/__tests__/layout.invariants.test.ts`**

Build the cartesian product of all permutations (yields ~432 combos) and assert invariants per case:

```ts
const matrix = cartesian({
  shape: SHAPES,
  frame: FRAMES,
  centerMode: CENTER_MODES,
  pathTextPosition: [...PATH_POSITIONS, undefined],
  bannerPosition: [...BANNER_POSITIONS, undefined],
  hasBottomLabel: [false, true],
  size: [80, 200, 400], // small / default / large
});

test.each(matrix)("layout invariants: %s", (design, size) => {
  const boxes = getBadgeLayoutBoxes(design, size);
  // Centering invariants
  expect(boxes.iconOrMonogram.cx).toBeCloseTo(size / 2, 1);
  expect(boxes.iconOrMonogram.cy).toBeCloseTo(layout.centerY, 1);
  // Containment invariants
  forEachBox(boxes, (b) => expect(boxIsInside(b, boxes.viewBox)).toBe(true));
  // Non-overlap invariants for foreground layers
  forEachPair(collectForegroundBoxes(boxes), (a, b) => {
    expect(boxesOverlap(a, b)).toBe(false);
  });
  // Bottom label sits below shape with margin > 0
  if (boxes.bottomLabel) {
    expect(boxes.bottomLabel.y).toBeGreaterThan(boxes.shape.y + boxes.shape.h);
  }
});
```

**Structural overlaps** (intentional, asserted separately):

- `frame` ↔ `shape` (frame overlay sits on shape)
- `pathTextTop` / `pathTextBottom` ↔ `frame` (path text rides the frame band)
- `banner` ↔ `shape` (banner straddles edge by design)
- `iconOrMonogram` ↔ `shape` (centered inside)

These are not part of the foreground collision matrix because `shape` and the
current `frame` box are coarse structural boxes. Foreground layers (`pathText*`,
`banner`, `bottomLabel`, `iconOrMonogram`) must not collide with each other.

**Edge cases as separate tests** (not in matrix):

- Longest legal `pathText` + longest `pathTextBottom` simultaneously
- Monogram = 3 chars at smallest size
- Banner with longest legal text on each shape
- Bottom banner plus bottom label, to ensure the label clears the banner

Performance target: full matrix < 2s. If slower, sample size set down to `[200]`.

**Outcome (2026-05-01):**

- Implementation now includes:
  1. `84f8a233` — `__tests__/_geometryHelpers.ts`: `boxesOverlap`, `boxIsInside`, `cartesian`, `collectBoxes` (treating `iconOrMonogram` as a symbolic square box around its centre), `collectForegroundBoxes`, `forEachBox`, and `forEachPair`.
  2. `d4fc3085` — `__tests__/layout.invariants.test.ts`: 5,184-row cartesian matrix plus edge-case suites (long top + long bottom path text per shape, 3-char monogram at smallest size per shape, longest banner text on each shape × position, bottom banner + bottom label).
  3. Follow-up fix — `layoutBoxes.ts` offsets bottom labels below bottom-position banners instead of codifying the overlap as allowed.
- Full matrix + edge cases run in ~1.9s on dev hardware (well under the 2s budget).
- Verified by deliberately setting `SHAPE_CENTER_Y_OFFSET.circle = 0.15`: 198 cases failed with diagnostics like `pathTextBottom ↔ iconOrMonogram` plus full bbox dumps for both layers.
- All 5,859 badge tests still green; `bun run type-check` passes; `bun run lint` has 0 errors and the repo's existing warning baseline.

---

### Phase 3 — Storybook coverage of representative cases

New file `stories/badges/BadgeMatrix.stories.tsx` with three stories:

1. **`AllShapesAllFrames`** — a 6×6 grid showing every shape × frame combo with default features. Visual sanity check.
2. **`FullyLoaded`** — one badge per shape with every feature on (banner + top path + bottom path + bottom label + frame). Mirrors the user's screenshot.
3. **`EdgeCases`** — smallest size, longest text, 3-char monogram, banner overflow cases.

These stories are for **manual visual review during PR** — they don't add automated assertions. Embed screenshots in the PR description.

Existing stories continue to work after Phase 0 renames.

---

### Phase 4 — Automated visual guardrails

After Phase 3 the user reviews the matrix story. If the fully loaded examples
still show spacing/legibility problems, add automated tests in three layers
instead of trying to make the full cartesian matrix pixel-based.

1. **Tighten logic invariants** — keep the cheap `getBadgeLayoutBoxes`
   matrix, but add bounded spacing rules:
   - top banners must clear the badge apex by a minimum visual gap
   - bottom labels must sit within a min/max gap range, not merely below the shape
   - foreground layers (`banner`, `pathText*`, `bottomLabel`, `iconOrMonogram`) must not overlap
   - center content must stay inside the usable interior when both path-text arcs are present
2. **Add path-geometry tests** — validate `PathText`/contour math directly:
   - top path midpoint stays near top-center
   - bottom path midpoint stays near bottom-center
   - bottom path direction keeps text readable on the lower arc
   - path text baselines stay in the intended frame band instead of cutting through decorative contour lines
3. **Add a small rendered regression suite** — render representative badges
   rather than the whole matrix:
   - fully loaded badge for each shape
   - smallest-size monogram + path text
   - top banner + both path-text arcs
   - bottom banner + bottom label
   - longest legal banner/path/bottom-label text
4. **Add region assertions where snapshots are too blunt**:
   - banner bottom region does not touch the badge apex region
   - bottom label gap remains within the approved range
   - center icon region does not intersect path text regions
   - bottom path text occupies the lower arc band, not a diagonal band through the interior

Closing state: the fast invariant matrix guards broad geometry regressions in
CI, path tests guard arc math, and a small visual suite guards the cases humans
can spot in the fully loaded screenshot.

---

## Critical files

**Rename surface (Phase 0):**

- `apps/native-rd/src/badges/types.ts` — `BadgeDesign`, `BannerPosition`
- `apps/native-rd/src/badges/layout.ts` — helpers
- `apps/native-rd/src/badges/text/CenterLabel.tsx` → `BottomLabel.tsx`
- `apps/native-rd/src/badges/text/Banner.tsx`
- `apps/native-rd/src/badges/BadgeRenderer.tsx`
- `apps/native-rd/src/screens/BadgeDesignerScreen/`
- `apps/native-rd/src/badges/__tests__/*.test.{ts,tsx}` (10 files reference `centerLabel`, 11 reference banner `"center"`)
- `apps/native-rd/src/stories/badges/{BadgeDesigner,TextFeatures}.stories.tsx`
- `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx`

**Refactor surface (Phase 1):**

- `apps/native-rd/src/badges/layout.ts` — extend with `getBadgeLayoutBoxes`
- `apps/native-rd/src/badges/shapes/contours.ts` — export `getPathTextRadius` and frame band constants
- `apps/native-rd/src/badges/BadgeRenderer.tsx` — consume the new function
- `apps/native-rd/src/badges/text/Banner.tsx` — export banner box helpers if not already

**New test files (Phase 2):**

- `apps/native-rd/src/badges/__tests__/layout.invariants.test.ts`
- Possible helper: `apps/native-rd/src/badges/__tests__/_geometryHelpers.ts` (`boxesOverlap`, `boxIsInside`, `cartesian`)

**New stories (Phase 3):**

- `apps/native-rd/src/stories/badges/BadgeMatrix.stories.tsx`

## Reused functions / utilities

- `getBadgeLayoutMetrics` (`layout.ts:61`) — density, centerY, scales
- `getCenterLabelY`, `getCenterLabelBottomOverflow`, `CENTER_LABEL_*` (`text/CenterLabel.tsx:18-36`) — to be renamed
- `getSafeTextColor` (`utils/accessibility.ts`) — already used by all text layers
- `parseBadgeDesign` (`types.ts:204`) — for fixture loading
- Phosphor icon registry (`badges/iconRegistry.ts`) — for choosing valid `iconName` in fixtures
- `test.each` pattern — already standard per `apps/native-rd/CLAUDE.md` ("use `test.each` instead of duplicating tests")

## Verification

After each phase:

```bash
# From apps/native-rd (bun test segfaults on this suite — use jest)
bun run type-check
bun run lint
npx jest --no-coverage --testPathPatterns badges  # native-rd badge tests only
```

**Phase 0 specific:**

- `npx jest --no-coverage --testPathPatterns "BadgeDesignerScreen|BadgeRenderer|Banner|BottomLabel|layout|types"` — all green with renamed identifiers
- Manually open `BadgeDesignerScreen` (`npx expo run:ios`) and confirm UI form labels say "Bottom label" / "Top banner"

**Phase 2 specific:**

- `npx jest --no-coverage --testPathPatterns layout.invariants` runs in < 2s
- Deliberately break a centering offset in `layout.ts` and confirm tests fail with a useful message
- Confirm structural overlaps (e.g. icon ↔ shape) are asserted separately from foreground collisions

**Phase 3 specific:**

- Run Storybook for native-rd, navigate to `Badges / Matrix`
- Capture screenshots of `AllShapesAllFrames`, `FullyLoaded`, `EdgeCases` — attach to PR
- User visually reviews, decides on Phase 4

## Out of scope

- Vue `packages/openbadges-ui` badges — those are OB2/OB3 _display_ only, not the designable badge in scope here
- Visual snapshot / pixel-diff tests — deferred to Phase 4 if needed
- Migrations for persisted badges — pre-release, none exist
- Reworking the per-shape magic Y offsets themselves — tests will pin current behaviour first; tuning is a separate concern
