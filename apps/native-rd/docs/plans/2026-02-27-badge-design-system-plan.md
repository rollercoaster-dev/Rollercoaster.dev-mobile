# Badge Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the full badge design system — currency-style frame overlays, text-on-path, monogram center, and banner/ribbon — as described in `docs/plans/2026-02-27-badge-design-system.md`.

**Architecture:** 6-layer SVG composition in `BadgeRenderer`. Frame overlays are pluggable generators keyed by `BadgeFrame` type. Shape contours provide geometry for frames and text. Data mapper computes frame parameters from goal journey data. All new layers are optional and backward-compatible.

**Tech Stack:** TypeScript, react-native-svg (`Path`, `Text`, `TextPath`, `G`, `Defs`, `ClipPath`), Evolu (data queries), Jest + RNTL (testing), Storybook (visual regression).

**Design doc:** `docs/plans/2026-02-27-badge-design-system.md`

---

## Phase 1: Foundation (Types + Contours)

Everything else depends on these. Types define the data contract, contours provide the geometry.

---

### Task 1: Update BadgeDesign type

**Files:**
- Modify: `src/badges/types.ts:48-60`
- Modify: `src/badges/__tests__/types.test.ts`

**Step 1: Write the failing tests**

Add tests for the new `centerMode` field in `createDefaultBadgeDesign` and backward compatibility of `parseBadgeDesign`:

```typescript
// In describe('createDefaultBadgeDesign')
test('defaults to icon centerMode', () => {
  const design = createDefaultBadgeDesign('Test');
  expect(design.centerMode).toBe('icon');
});

test('does not include new optional fields by default', () => {
  const design = createDefaultBadgeDesign('Test');
  expect(design.monogram).toBeUndefined();
  expect(design.centerLabel).toBeUndefined();
  expect(design.pathText).toBeUndefined();
  expect(design.pathTextPosition).toBeUndefined();
  expect(design.pathTextBottom).toBeUndefined();
  expect(design.banner).toBeUndefined();
});

// In describe('parseBadgeDesign')
test('parses legacy design without new fields (backward compat)', () => {
  const legacy = JSON.stringify({
    shape: 'circle',
    frame: 'none',
    color: '#a78bfa',
    iconName: 'Trophy',
    iconWeight: 'regular',
    title: 'Old Badge',
  });
  const result = parseBadgeDesign(legacy);
  expect(result).not.toBeNull();
  expect(result!.shape).toBe('circle');
  // centerMode not present in legacy — that's fine, renderer defaults to 'icon'
  expect(result!.centerMode).toBeUndefined();
});

test('parses design with all new fields', () => {
  const full = JSON.stringify({
    shape: 'shield',
    frame: 'guilloche',
    color: '#ffe50c',
    iconName: 'Star',
    iconWeight: 'bold',
    title: 'Full Badge',
    centerMode: 'monogram',
    monogram: 'JS',
    centerLabel: 'CERT',
    pathText: 'JavaScript Mastery',
    pathTextPosition: 'both',
    pathTextBottom: '2026',
    banner: { text: 'EARNED', position: 'bottom' },
    frameParams: {
      variant: 0,
      stepCount: 5,
      evidenceCount: 12,
      daysToComplete: 45,
      evidenceTypes: 3,
      stepNames: ['Plan', 'Build', 'Test', 'Deploy', 'Document'],
    },
  });
  const result = parseBadgeDesign(full);
  expect(result).not.toBeNull();
  expect(result!.centerMode).toBe('monogram');
  expect(result!.monogram).toBe('JS');
  expect(result!.banner?.text).toBe('EARNED');
  expect(result!.frameParams?.stepCount).toBe(5);
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test --testPathPatterns types.test.ts`
Expected: FAIL — `centerMode` doesn't exist on default design.

**Step 3: Update the BadgeDesign type and createDefaultBadgeDesign**

In `src/badges/types.ts`, update the `BadgeDesign` type to add new fields:

```typescript
/** Center content mode */
export const BadgeCenterMode = {
  icon: 'icon',
  monogram: 'monogram',
} as const;

export type BadgeCenterMode = (typeof BadgeCenterMode)[keyof typeof BadgeCenterMode];

/** Text-on-path placement */
export const PathTextPosition = {
  top: 'top',
  bottom: 'bottom',
  both: 'both',
} as const;

export type PathTextPosition = (typeof PathTextPosition)[keyof typeof PathTextPosition];

/** Banner position */
export const BannerPosition = {
  center: 'center',
  bottom: 'bottom',
} as const;

export type BannerPosition = (typeof BannerPosition)[keyof typeof BannerPosition];

/** Data-driven frame parameters, computed from goal journey data */
export type FrameDataParams = {
  variant: number;
  stepCount: number;
  evidenceCount: number;
  daysToComplete: number;
  evidenceTypes: number;
  stepNames?: string[];
};

/** Badge visual design configuration */
export type BadgeDesign = {
  shape: BadgeShape;
  color: string;
  title: string;
  label?: string;

  frame: BadgeFrame;
  frameParams?: FrameDataParams;

  centerMode: BadgeCenterMode;
  iconName: string;
  iconWeight: BadgeIconWeight;
  monogram?: string;
  centerLabel?: string;

  pathText?: string;
  pathTextPosition?: PathTextPosition;
  pathTextBottom?: string;

  banner?: {
    text: string;
    position: BannerPosition;
  };
};
```

Update `createDefaultBadgeDesign` to include `centerMode: 'icon'`.

**Step 4: Run tests to verify they pass**

Run: `bun test --testPathPatterns types.test.ts`
Expected: PASS

**Step 5: Run typecheck to verify no breakage**

Run: `bun run typecheck`
Expected: PASS (or identify any callers that need updating due to required `centerMode`)

**Step 6: Fix any type errors in callers**

The `createDefaultBadgeDesign` result now has `centerMode: 'icon'`. This is additive. But anywhere that constructs a `BadgeDesign` literal manually may need `centerMode` added. Check:
- `src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` (the designer)
- `src/badges/__tests__/BadgeRenderer.test.tsx` (test fixtures)
- Any Storybook stories with inline `BadgeDesign` objects

**Step 7: Run full test suite**

Run: `npx jest --no-coverage`
Expected: PASS

**Step 8: Commit**

```bash
git add src/badges/types.ts src/badges/__tests__/types.test.ts
# + any files fixed in step 6
git commit -m "feat(badges): extend BadgeDesign type with center mode, text, banner, frame params"
```

---

### Task 2: Shape contour system

**Files:**
- Create: `src/badges/shapes/contours.ts`
- Create: `src/badges/__tests__/contours.test.ts`

**Step 1: Write the failing tests**

```typescript
import { generateContour } from '../shapes/contours';
import { BadgeShape } from '../types';
import type { ShapeContour } from '../shapes/contours';

const SIZE = 256;
const INSET = 2;

function expectValidContour(contour: ShapeContour) {
  // All paths should be non-empty closed paths
  expect(contour.outerPath).toMatch(/^M .+Z$/);
  expect(contour.innerPath).toMatch(/^M .+Z$/);
  expect(contour.textPathTop.length).toBeGreaterThan(0);
  expect(contour.textPathBottom.length).toBeGreaterThan(0);
  // Vertices should have at least 1 point
  expect(contour.vertices.length).toBeGreaterThan(0);
  // All vertices within bounds
  for (const v of contour.vertices) {
    expect(v.x).toBeGreaterThanOrEqual(0);
    expect(v.x).toBeLessThanOrEqual(SIZE);
    expect(v.y).toBeGreaterThanOrEqual(0);
    expect(v.y).toBeLessThanOrEqual(SIZE);
  }
}

const ALL_SHAPES = Object.values(BadgeShape) as BadgeShape[];

describe('generateContour', () => {
  test.each(ALL_SHAPES)('produces valid contour for "%s"', (shape) => {
    const contour = generateContour(shape, SIZE, INSET);
    expectValidContour(contour);
  });

  test('inner path is smaller than outer path', () => {
    // Circle: inner radius < outer radius
    const contour = generateContour('circle', SIZE, INSET);
    // Inner path should contain smaller coordinate values
    const outerNums = (contour.outerPath.match(/[\d.]+/g) ?? []).map(Number);
    const innerNums = (contour.innerPath.match(/[\d.]+/g) ?? []).map(Number);
    const outerMax = Math.max(...outerNums);
    const innerMax = Math.max(...innerNums);
    expect(innerMax).toBeLessThan(outerMax);
  });

  test('hexagon has 6 vertices', () => {
    const contour = generateContour('hexagon', SIZE, INSET);
    expect(contour.vertices).toHaveLength(6);
  });

  test('star has 5 vertices (tips only)', () => {
    const contour = generateContour('star', SIZE, INSET);
    expect(contour.vertices).toHaveLength(5);
  });

  test('diamond has 4 vertices', () => {
    const contour = generateContour('diamond', SIZE, INSET);
    expect(contour.vertices).toHaveLength(4);
  });

  test('circle has N vertices (evenly distributed)', () => {
    const contour = generateContour('circle', SIZE, INSET);
    // Circle uses 8 evenly-spaced points
    expect(contour.vertices.length).toBeGreaterThanOrEqual(4);
  });

  test('shield has 3 vertices (shoulders + point)', () => {
    const contour = generateContour('shield', SIZE, INSET);
    expect(contour.vertices).toHaveLength(3);
  });

  test('roundedRect has 4 vertices (corners)', () => {
    const contour = generateContour('roundedRect', SIZE, INSET);
    expect(contour.vertices).toHaveLength(4);
  });

  test('scaling works — different sizes produce different contours', () => {
    const small = generateContour('circle', 100, INSET);
    const large = generateContour('circle', 400, INSET);
    expect(small.outerPath).not.toBe(large.outerPath);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test --testPathPatterns contours.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement contours.ts**

Create `src/badges/shapes/contours.ts`. This file provides:

- `generateContour(shape, size, inset)` → `ShapeContour`
- Uses existing path generators from `paths.ts` for `outerPath`
- Generates `innerPath` by calling the same generator with a larger inset (frame band width ~12% of size)
- Generates `textPathTop` and `textPathBottom` as open arc/line paths (not closed) at ~85% radius for text placement
- Computes `vertices` per shape:
  - circle: 8 evenly-spaced points at 80% radius
  - shield: left shoulder, right shoulder, bottom point
  - hexagon: 6 vertices from hexagon geometry
  - roundedRect: 4 corner centers
  - star: 5 outer tip points
  - diamond: 4 cardinal points

The frame band width constant (`FRAME_BAND_RATIO = 0.12`) defines how wide the frame region is as a fraction of badge size.

**Step 4: Run tests to verify they pass**

Run: `bun test --testPathPatterns contours.test.ts`
Expected: PASS

**Step 5: Export from shapes/index.ts**

Add exports for `generateContour` and `ShapeContour` type from `src/badges/shapes/index.ts`.

**Step 6: Commit**

```bash
git add src/badges/shapes/contours.ts src/badges/__tests__/contours.test.ts src/badges/shapes/index.ts
git commit -m "feat(badges): add shape contour system for frame and text geometry"
```

---

### Task 3: Data mapper — goal data to frame parameters

**Files:**
- Create: `src/badges/frames/dataMapper.ts`
- Create: `src/badges/__tests__/dataMapper.test.ts`

**Step 1: Write the failing tests**

Test the pure mapping functions (no Evolu dependency — pass raw data in):

```typescript
import { computeFrameParams } from '../frames/dataMapper';
import type { FrameDataParams } from '../types';

describe('computeFrameParams', () => {
  test('computes params from goal data', () => {
    const params = computeFrameParams({
      stepCount: 5,
      stepNames: ['Plan', 'Build', 'Test', 'Deploy', 'Document'],
      evidenceCount: 12,
      evidenceTypes: 3,
      createdAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-02-15T00:00:00Z',
    });

    expect(params.stepCount).toBe(5);
    expect(params.evidenceCount).toBe(12);
    expect(params.evidenceTypes).toBe(3);
    expect(params.daysToComplete).toBe(45);
    expect(params.stepNames).toEqual(['Plan', 'Build', 'Test', 'Deploy', 'Document']);
    expect(params.variant).toBe(0);
  });

  test('handles same-day completion', () => {
    const params = computeFrameParams({
      stepCount: 1,
      stepNames: ['Do it'],
      evidenceCount: 1,
      evidenceTypes: 1,
      createdAt: '2026-02-27T10:00:00Z',
      completedAt: '2026-02-27T15:00:00Z',
    });
    expect(params.daysToComplete).toBe(0);
  });

  test('handles zero steps and zero evidence', () => {
    const params = computeFrameParams({
      stepCount: 0,
      stepNames: [],
      evidenceCount: 0,
      evidenceTypes: 0,
      createdAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-02T00:00:00Z',
    });
    expect(params.stepCount).toBe(0);
    expect(params.evidenceCount).toBe(0);
    expect(params.daysToComplete).toBe(1);
  });

  test('handles missing completedAt (uses current date)', () => {
    const params = computeFrameParams({
      stepCount: 3,
      stepNames: ['A', 'B', 'C'],
      evidenceCount: 5,
      evidenceTypes: 2,
      createdAt: '2026-02-20T00:00:00Z',
      completedAt: null,
    });
    expect(params.daysToComplete).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test --testPathPatterns dataMapper.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement dataMapper.ts**

Create `src/badges/frames/dataMapper.ts`:

- `computeFrameParams(input)` — pure function, takes raw goal stats, returns `FrameDataParams`
- Input type: `{ stepCount, stepNames, evidenceCount, evidenceTypes, createdAt, completedAt }`
- `daysToComplete` = diff between createdAt and completedAt (or now if null), in days
- `variant` = 0 (reserved for future precomputed guilloche configs)
- No Evolu imports — this is a pure data transformation

Also create a separate `computeFrameParamsFromGoal(goalId)` function that does the Evolu query and calls the pure function. This won't be unit-tested here (integration test later), but having the pure function separate makes testing easy.

**Step 4: Run tests to verify they pass**

Run: `bun test --testPathPatterns dataMapper.test.ts`
Expected: PASS

**Step 5: Create frames/index.ts barrel**

Create `src/badges/frames/index.ts` exporting `computeFrameParams` and the type.

**Step 6: Commit**

```bash
git add src/badges/frames/dataMapper.ts src/badges/__tests__/dataMapper.test.ts src/badges/frames/index.ts
git commit -m "feat(badges): add data mapper for goal data to frame parameters"
```

---

## Phase 2: Frame Generators

Each frame type is an independent module. They can be built in parallel once Phase 1 is done.

---

### Task 4: Frame generator interface + registry + boldBorder

**Files:**
- Create: `src/badges/frames/types.ts`
- Modify: `src/badges/frames/index.ts`
- Create: `src/badges/frames/boldBorder.ts`
- Create: `src/badges/__tests__/boldBorder.test.ts`

**Step 1: Write failing tests for boldBorder**

```typescript
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server'; // or test via RNTL
import { boldBorderGenerator } from '../frames/boldBorder';

// Note: frame generators return React elements (SVG nodes).
// Test them by checking the returned element structure.

describe('boldBorderGenerator', () => {
  const baseConfig = {
    shape: 'circle' as const,
    size: 256,
    inset: 2,
    innerInset: 32,
  };

  test('returns SVG elements for low step count (double border)', () => {
    const result = boldBorderGenerator({
      ...baseConfig,
      params: { variant: 0, stepCount: 2, evidenceCount: 0, daysToComplete: 1, evidenceTypes: 0, stepNames: [] },
    });
    expect(result).not.toBeNull();
    // Should render 2 concentric Path elements
  });

  test('returns SVG elements for high step count (triple border)', () => {
    const result = boldBorderGenerator({
      ...baseConfig,
      params: { variant: 0, stepCount: 6, evidenceCount: 0, daysToComplete: 1, evidenceTypes: 0, stepNames: [] },
    });
    expect(result).not.toBeNull();
    // Should render 3 concentric Path elements
  });

  test.each(['circle', 'shield', 'hexagon', 'roundedRect', 'star', 'diamond'] as const)(
    'renders without error for shape "%s"',
    (shape) => {
      const result = boldBorderGenerator({
        ...baseConfig,
        shape,
        params: { variant: 0, stepCount: 3, evidenceCount: 0, daysToComplete: 1, evidenceTypes: 0, stepNames: [] },
      });
      expect(result).not.toBeNull();
    },
  );
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test --testPathPatterns boldBorder.test.ts`
Expected: FAIL — module not found.

**Step 3: Create frame types and registry**

Create `src/badges/frames/types.ts`:

```typescript
import type { ReactElement } from 'react';
import type { BadgeShape, FrameDataParams } from '../types';

export type FrameGeneratorConfig = {
  shape: BadgeShape;
  size: number;
  inset: number;
  innerInset: number;
  params: FrameDataParams;
};

export type FrameGenerator = (config: FrameGeneratorConfig) => ReactElement | null;
```

**Step 4: Implement boldBorder.ts**

Create `src/badges/frames/boldBorder.ts`:

- Uses `generateShapePath` from `../shapes/paths` at 2-3 different inset levels
- stepCount 1-3 → 2 concentric paths; 4+ → 3 concentric paths
- Each path is a `<Path>` element with `stroke` only (no fill), using theme border color
- Stroke widths decrease slightly for inner rings (e.g., 2px, 1.5px, 1px)

**Step 5: Run tests to verify they pass**

Run: `bun test --testPathPatterns boldBorder.test.ts`
Expected: PASS

**Step 6: Update frames/index.ts with registry**

Add a `frameRegistry` map: `Record<BadgeFrame, FrameGenerator>` that maps frame names to generators. For now only `boldBorder` has an implementation; others return `null`.

**Step 7: Commit**

```bash
git add src/badges/frames/
git commit -m "feat(badges): add frame generator interface and boldBorder frame"
```

---

### Task 5: Guilloche frame generator

**Files:**
- Create: `src/badges/frames/guilloche.ts`
- Create: `src/badges/__tests__/guilloche.test.ts`

**Step 1: Write failing tests**

Test that guilloche produces SVG path elements, that wave count scales with step count, and that it works for all 6 shapes.

```typescript
import { guillocheGenerator } from '../frames/guilloche';

describe('guillocheGenerator', () => {
  const baseConfig = {
    shape: 'circle' as const,
    size: 256,
    inset: 2,
    innerInset: 32,
  };

  test('produces more complex output for higher step count', () => {
    const simple = guillocheGenerator({
      ...baseConfig,
      params: { variant: 0, stepCount: 1, evidenceCount: 0, daysToComplete: 1, evidenceTypes: 0, stepNames: [] },
    });
    const complex = guillocheGenerator({
      ...baseConfig,
      params: { variant: 0, stepCount: 10, evidenceCount: 0, daysToComplete: 1, evidenceTypes: 0, stepNames: [] },
    });
    expect(simple).not.toBeNull();
    expect(complex).not.toBeNull();
    // Complex should have more path data (longer d attribute or more child elements)
  });

  test.each(['circle', 'shield', 'hexagon', 'roundedRect', 'star', 'diamond'] as const)(
    'renders without error for shape "%s"',
    (shape) => {
      const result = guillocheGenerator({
        ...baseConfig,
        shape,
        params: { variant: 0, stepCount: 5, evidenceCount: 0, daysToComplete: 1, evidenceTypes: 0, stepNames: [] },
      });
      expect(result).not.toBeNull();
    },
  );
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test --testPathPatterns guilloche.test.ts`

**Step 3: Implement guilloche.ts**

The guilloche generator:
- Gets the shape contour (outer + inner paths)
- Samples points along the contour at regular intervals
- Generates sine wave oscillations between outer and inner boundary
- Wave count = `clamp(stepCount * 1.5, 3, 14)` (minimum 3, max 14 loops)
- Outputs one or two `<Path>` elements with the wavy line
- Stroke only, no fill. Stroke color derived from badge color at reduced opacity.

This is the most math-heavy frame. The key algorithm:
1. Sample N points along the shape contour (N = wave count * points per wave)
2. For each point, offset perpendicular to the contour by `sin(t) * amplitude`
3. Connect sampled points with smooth cubic bezier curves
4. Optionally add a second wave offset by phase for interlocking pattern

**Step 4: Run tests to verify they pass**

Run: `bun test --testPathPatterns guilloche.test.ts`
Expected: PASS

**Step 5: Register in frames/index.ts**

**Step 6: Commit**

```bash
git add src/badges/frames/guilloche.ts src/badges/__tests__/guilloche.test.ts src/badges/frames/index.ts
git commit -m "feat(badges): add guilloche frame generator with shape-aware sine waves"
```

---

### Task 6: CrossHatch frame generator

**Files:**
- Create: `src/badges/frames/crossHatch.ts`
- Create: `src/badges/__tests__/crossHatch.test.ts`

**Step 1: Write failing tests**

Test that line density varies with `daysToComplete`, works for all shapes, and produces `<Path>` elements with line segments.

**Step 2: Run tests to verify they fail**

**Step 3: Implement crossHatch.ts**

- Generate two sets of diagonal lines (45deg and -45deg) across the badge bounding box
- Line spacing = `clamp(map(daysToComplete, 1, 120, 20, 4), 4, 20)` — more days = tighter spacing
- Clip lines to shape boundary using `<ClipPath>` with the shape path
- Only render lines in the frame band (between outer and inner inset)

**Step 4: Run tests, verify pass**

**Step 5: Register in frames/index.ts**

**Step 6: Commit**

```bash
git commit -m "feat(badges): add crossHatch frame generator with time-driven density"
```

---

### Task 7: Microprint frame generator

**Files:**
- Create: `src/badges/frames/microprint.ts`
- Create: `src/badges/__tests__/microprint.test.ts`

**Step 1: Write failing tests**

Test that microprint uses `stepNames` and `title` from params, works for all shapes, and produces `<Text>` elements along paths.

**Step 2: Run tests to verify they fail**

**Step 3: Implement microprint.ts**

- Generate concentric text paths inside the frame band (2-4 rings depending on evidence count)
- Text content: join step names with `" \u2022 "` separator, repeat to fill path length
- Use SVG `<Defs>` + `<TextPath>` for each ring
- Font size: ~3% of badge size (tiny — reads as texture)
- Opacity: 40-60% of badge color for subtlety

**Step 4: Run tests, verify pass**

**Step 5: Register in frames/index.ts**

**Step 6: Commit**

```bash
git commit -m "feat(badges): add microprint frame generator with goal data text"
```

---

### Task 8: Rosette frame generator

**Files:**
- Create: `src/badges/frames/rosette.ts`
- Create: `src/badges/__tests__/rosette.test.ts`

**Step 1: Write failing tests**

Test that petal count scales with evidence count, rosettes appear at shape-specific vertex positions, works for all shapes.

**Step 2: Run tests to verify they fail**

**Step 3: Implement rosette.ts**

- For each vertex in `contour.vertices`, draw a rosette pattern
- Rosette = overlapping circular arcs centered at the vertex
- Petal count = `clamp(Math.ceil(evidenceCount / 2), 4, 14)`
- Each petal is an arc `<Path>` rotated around the center
- Rosette radius = ~60% of frame band width
- Stroke only, matching frame color scheme

**Step 4: Run tests, verify pass**

**Step 5: Register in frames/index.ts**

**Step 6: Commit**

```bash
git commit -m "feat(badges): add rosette frame generator with evidence-driven complexity"
```

---

### Task 9: FrameOverlay component — integrates registry with BadgeRenderer

**Files:**
- Create: `src/badges/frames/FrameOverlay.tsx`
- Create: `src/badges/__tests__/FrameOverlay.test.tsx`
- Modify: `src/badges/BadgeRenderer.tsx:130-132`

**Step 1: Write failing tests**

Test that `FrameOverlay` renders nothing for `frame: 'none'`, delegates to correct generator for each frame type, and passes contour + params through.

**Step 2: Run tests to verify they fail**

**Step 3: Implement FrameOverlay.tsx**

```typescript
export function FrameOverlay({
  frame, shape, size, inset, params
}: {
  frame: BadgeFrame;
  shape: BadgeShape;
  size: number;
  inset: number;
  params?: FrameDataParams;
}) {
  if (frame === 'none' || !params) return null;
  const contour = generateContour(shape, size, inset);
  const generator = frameRegistry[frame];
  return generator({
    shape, size, inset,
    innerInset: inset + size * FRAME_BAND_RATIO,
    params,
  });
}
```

**Step 4: Wire into BadgeRenderer.tsx**

Replace the `{/* Layer 3: Frame — not yet implemented */}` comment with:

```tsx
{/* Layer 3: Frame overlay */}
<FrameOverlay
  frame={design.frame}
  shape={design.shape}
  size={size}
  inset={inset}
  params={design.frameParams}
/>
```

**Step 5: Run tests, verify pass**

Run: `bun test --testPathPatterns FrameOverlay.test && bun test --testPathPatterns BadgeRenderer.test`

**Step 6: Verify backward compatibility**

Run: `npx jest --no-coverage`
All existing tests must still pass — badges without `frameParams` render as before.

**Step 7: Commit**

```bash
git commit -m "feat(badges): integrate frame overlay system into BadgeRenderer"
```

---

## Phase 3: Text System

Center monogram, center label, text-on-path, and banner. Each is independent.

---

### Task 10: MonogramCenter component

**Files:**
- Create: `src/badges/text/MonogramCenter.tsx`
- Create: `src/badges/__tests__/MonogramCenter.test.tsx`

**Step 1: Write failing tests**

Test: renders SVG `<Text>` element, scales font size for 1/2/3 chars, uses WCAG contrast color, returns null for empty string.

**Step 2: Run tests to verify they fail**

**Step 3: Implement MonogramCenter.tsx**

- SVG `<Text>` centered in badge at same position as icon
- Font: Anybody Bold (use `fontFamily` prop)
- Size: 1 char = `size * 0.35`, 2 chars = `size * 0.28`, 3 chars = `size * 0.22`
- Color: passed in (WCAG contrast, calculated by parent)
- `textAnchor="middle"`, `alignmentBaseline="central"`

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git commit -m "feat(badges): add MonogramCenter SVG text component"
```

---

### Task 11: CenterLabel component

**Files:**
- Create: `src/badges/text/CenterLabel.tsx`
- Create: `src/badges/__tests__/CenterLabel.test.tsx`

**Step 1: Write failing tests**

Test: renders below center content, font size is ~15% of badge size, returns null when text is undefined/empty.

**Step 2: Implement, test, commit**

```bash
git commit -m "feat(badges): add CenterLabel SVG text component"
```

---

### Task 12: PathText component

**Files:**
- Create: `src/badges/text/PathText.tsx`
- Create: `src/badges/__tests__/PathText.test.tsx`

**Step 1: Write failing tests**

Test: renders `<Defs>` + `<TextPath>` for top position, renders both arcs for "both" position, uses contour text paths, returns null when no text.

**Step 2: Run tests to verify they fail**

**Step 3: Implement PathText.tsx**

- Uses `<Defs>` to define the text path from `contour.textPathTop` / `contour.textPathBottom`
- `<Text>` + `<TextPath>` referencing the defined path
- Font: DM Mono, size ~8-10% of badge diameter
- Color: WCAG contrast at 70% opacity
- For "both" position: two text elements, one per arc

**Important:** Verify `react-native-svg` supports `<TextPath>` on iOS. If not supported, fall back to sampling points along the path and placing individual `<Text>` elements at each point (manual text-on-path). Add a note in the code about which approach is used.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git commit -m "feat(badges): add PathText component for text-on-path inscriptions"
```

---

### Task 13: Banner component

**Files:**
- Create: `src/badges/text/Banner.tsx`
- Create: `src/badges/__tests__/Banner.test.tsx`

**Step 1: Write failing tests**

Test: renders rectangle + text for center position, renders at bottom for bottom position, has own shadow, returns null when no banner config.

**Step 2: Run tests to verify they fail**

**Step 3: Implement Banner.tsx**

- SVG `<G>` containing:
  - Shadow rect (offset 2px down-right, black fill)
  - Background rect (solid fill, contrasting color)
  - Border rect (stroke only, 2-3px)
  - `<Text>` centered inside
- Position: center = `y: size * 0.42`, bottom = `y: size * 0.75`
- Banner height: ~18% of badge size
- Banner width: ~80% of badge size
- No border radius (neo-brutalist)
- Banner color: derived from badge color (lighter/darker for contrast)

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git commit -m "feat(badges): add Banner ribbon overlay component"
```

---

### Task 14: Wire text system into BadgeRenderer

**Files:**
- Create: `src/badges/text/index.ts`
- Modify: `src/badges/BadgeRenderer.tsx`
- Modify: `src/badges/__tests__/BadgeRenderer.test.tsx`

**Step 1: Write failing tests**

Add tests to BadgeRenderer.test.tsx:

```typescript
test('renders monogram instead of icon when centerMode is monogram', () => {
  const design = {
    ...defaultDesign,
    centerMode: 'monogram' as const,
    monogram: 'JS',
  };
  const { queryByTestId } = render(<BadgeRenderer design={design} />);
  // Monogram should be present, icon should not
});

test('renders path text when pathText is set', () => {
  const design = {
    ...defaultDesign,
    pathText: 'My Achievement',
    pathTextPosition: 'top' as const,
  };
  const { queryByTestId } = render(<BadgeRenderer design={design} />);
  // Should contain text-on-path elements
});

test('renders banner when banner config is set', () => {
  const design = {
    ...defaultDesign,
    banner: { text: 'EARNED', position: 'bottom' as const },
  };
  const { queryByTestId } = render(<BadgeRenderer design={design} />);
  // Should contain banner elements
});

test('existing badges without new fields render identically', () => {
  const legacyDesign = {
    shape: 'circle' as const,
    frame: 'none' as const,
    color: '#a78bfa',
    iconName: 'Trophy',
    iconWeight: 'regular' as const,
    title: 'Test',
    centerMode: 'icon' as const,
  };
  // Should render without errors, showing icon
  const { getByTestId } = render(<BadgeRenderer design={legacyDesign} />);
  expect(getByTestId('badge-renderer')).toBeTruthy();
});
```

**Step 2: Run tests to verify they fail**

**Step 3: Update BadgeRenderer.tsx**

Add imports for `MonogramCenter`, `CenterLabel`, `PathText`, `Banner`, and `FrameOverlay`. Update the render method to include all 6 layers:

```tsx
{/* Layer 3: Frame overlay */}
<FrameOverlay ... />

{/* Layer 4: Text on path */}
{design.pathText && (
  <PathText
    contour={contour}
    text={design.pathText}
    position={design.pathTextPosition ?? 'top'}
    bottomText={design.pathTextBottom}
    color={iconColor}
    size={size}
  />
)}

{/* Layer 5: Center content */}
{design.centerMode === 'monogram' && design.monogram ? (
  <MonogramCenter text={design.monogram} color={iconColor} size={size} />
) : (
  IconComponent && (
    <G x={iconOffset} y={iconOffset}>
      <IconComponent size={iconSize} weight={...} color={iconColor} />
    </G>
  )
)}
{design.centerLabel && (
  <CenterLabel text={design.centerLabel} color={iconColor} size={size} />
)}

{/* Layer 6: Banner */}
{design.banner && (
  <Banner
    text={design.banner.text}
    position={design.banner.position}
    size={size}
    badgeColor={design.color}
  />
)}
```

**Step 4: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All tests pass including backward compat.

**Step 5: Commit**

```bash
git commit -m "feat(badges): wire all 6 layers into BadgeRenderer"
```

---

## Phase 4: Designer UI

New selectors for the BadgeDesignerScreen.

---

### Task 15: FrameSelector component

**Files:**
- Create: `src/badges/FrameSelector.tsx`
- Create: `src/badges/__tests__/FrameSelector.test.tsx`

**Step 1: Write failing tests**

Test: renders 6 options (none + 5 frames), calls `onSelectFrame` on tap, selected state has bold border, all options have `accessibilityRole="radio"` and `accessibilityLabel`.

**Step 2: Implement FrameSelector.tsx**

Follow the same pattern as `ShapeSelector.tsx`:
- Horizontal `ScrollView` with frame thumbnails
- Each thumbnail shows a small simplified preview of the pattern (can be a static icon/symbol per frame initially)
- Selected state: bold border matching accent color
- Labels: "None", "Bold Border", "Guilloche", "Cross Hatch", "Microprint", "Rosette"

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git commit -m "feat(badges): add FrameSelector component for designer UI"
```

---

### Task 16: CenterModeSelector component

**Files:**
- Create: `src/badges/CenterModeSelector.tsx`
- Create: `src/badges/__tests__/CenterModeSelector.test.tsx`

**Step 1: Write failing tests**

Test: renders icon/monogram toggle, shows text input when monogram selected, enforces 3-char max, calls callbacks on change, has a11y roles.

**Step 2: Implement CenterModeSelector.tsx**

- Two-option toggle (icon / monogram) — uses `Pressable` with selected state
- When monogram selected: `TextInput` appears with maxLength 3
- When icon selected: monogram input hides
- Neo-brutalist styling: hard borders, no radius, bold toggle states

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git commit -m "feat(badges): add CenterModeSelector with icon/monogram toggle"
```

---

### Task 17: PathTextEditor component

**Files:**
- Create: `src/badges/PathTextEditor.tsx`
- Create: `src/badges/__tests__/PathTextEditor.test.tsx`

**Step 1: Write failing tests**

Test: toggle enables/disables text-on-path, text input defaults to goal title, position picker has 3 options, shows second input for "both" position, has a11y roles.

**Step 2: Implement PathTextEditor.tsx**

- Enable/disable toggle (Pressable checkbox)
- Text input (defaults to goal title passed as prop)
- Position picker: 3-option radio group (top / bottom / both)
- Second text input visible only when "both" selected
- All 44pt touch targets, a11y labels

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git commit -m "feat(badges): add PathTextEditor for text-on-path controls"
```

---

### Task 18: BannerEditor component

**Files:**
- Create: `src/badges/BannerEditor.tsx`
- Create: `src/badges/__tests__/BannerEditor.test.tsx`

**Step 1: Write failing tests**

Test: toggle enables/disables banner, text input for banner content, position picker (center / bottom), has a11y roles.

**Step 2: Implement BannerEditor.tsx**

- Enable/disable toggle
- Text input for banner content
- Two-option position picker (center / bottom)
- Same styling patterns as other editors

**Step 3: Run tests, verify pass**

**Step 4: Commit**

```bash
git commit -m "feat(badges): add BannerEditor for banner/ribbon controls"
```

---

### Task 19: Wire new selectors into BadgeDesignerScreen

**Files:**
- Modify: `src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`
- Modify: `src/screens/BadgeDesignerScreen/__tests__/BadgeDesignerScreen.test.tsx`

**Step 1: Write failing tests**

Test the full designer flow: frame selection updates preview, monogram toggle switches center content, path text appears in preview, banner appears in preview, save persists all new fields.

**Step 2: Run tests to verify they fail**

**Step 3: Add state handlers and new sections**

Add state for:
- `frame` (BadgeFrame)
- `centerMode` ('icon' | 'monogram')
- `monogram` (string)
- `centerLabel` (string)
- `pathText` (string)
- `pathTextPosition` (PathTextPosition)
- `pathTextBottom` (string)
- `banner` ({ text, position } | null)

Add new sections after existing icon picker:
1. FrameSelector
2. CenterModeSelector (conditionally shows icon picker or monogram input)
3. CenterLabel input (TextInput, max 10 chars)
4. PathTextEditor
5. BannerEditor

Update `handleSave` to include all new fields in the serialized `BadgeDesign` JSON.

**Step 4: Run tests, verify pass**

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git commit -m "feat(badges): wire frame, text, and banner controls into badge designer"
```

---

### Task 20: Storybook stories for new features

**Files:**
- Modify: `src/stories/badges/BadgeDesigner.stories.tsx`
- Create: `src/stories/badges/FrameOverlays.stories.tsx`
- Create: `src/stories/badges/TextFeatures.stories.tsx`

**Step 1: Add frame overlay matrix story**

Create a story that renders all 30 frame × shape combinations (5 frames × 6 shapes) in a grid. Use sample frame params for visual verification.

**Step 2: Add text feature stories**

Stories for: monogram (1/2/3 chars), center label, text-on-path (top/bottom/both), banner (center/bottom), and a "kitchen sink" story with all features combined.

**Step 3: Add data-driven stories**

Stories showing the same frame type with different data params — e.g., guilloche with 2 steps vs 10 steps, crossHatch with 3 days vs 180 days — to verify the data-driven visual scaling.

**Step 4: Update existing designer story**

Update `BadgeDesigner.stories.tsx` to include the new frame and text controls.

**Step 5: Commit**

```bash
git commit -m "feat(badges): add Storybook stories for frames, text, and data-driven badges"
```

---

### Task 21: Final integration test + backward compatibility verification

**Files:**
- Modify: `src/screens/BadgeDesignerScreen/__tests__/BadgeDesignerScreen.test.tsx`

**Step 1: Write integration test for full designer flow**

Test the complete happy path: open designer, select frame, toggle to monogram, add path text, add banner, save — verify the persisted JSON has all fields.

**Step 2: Write backward compatibility test**

Load a legacy `BadgeDesign` (without new fields) and verify it renders identically to before — no visual changes for existing badges.

**Step 3: Run full test suite**

Run: `npx jest --no-coverage`
Expected: ALL PASS

**Step 4: Run typecheck and lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

**Step 5: Commit**

```bash
git commit -m "test(badges): add integration tests for full badge design system"
```

---

## Dependency Graph

```
Task 1 (types)
  ├── Task 2 (contours) ──┬── Task 4 (boldBorder) ──┐
  │                        ├── Task 5 (guilloche) ────┤
  │                        ├── Task 6 (crossHatch) ───┤
  │                        ├── Task 7 (microprint) ───┤
  │                        └── Task 8 (rosette) ──────┤
  │                                                    ├── Task 9 (FrameOverlay)
  ├── Task 3 (dataMapper) ────────────────────────────┘        │
  │                                                            │
  ├── Task 10 (MonogramCenter) ──┐                             │
  ├── Task 11 (CenterLabel) ─────┤                             │
  ├── Task 12 (PathText) ────────┼── Task 14 (wire into renderer) ── depends on Task 9
  └── Task 13 (Banner) ──────────┘         │
                                           │
  Task 15 (FrameSelector) ────┐            │
  Task 16 (CenterModeSelector)┤            │
  Task 17 (PathTextEditor) ───┼── Task 19 (wire into designer) ── depends on Task 14
  Task 18 (BannerEditor) ─────┘            │
                                           │
                              Task 20 (Storybook) ── depends on Task 19
                              Task 21 (integration tests) ── depends on Task 19
```

### Parallelism Opportunities

Once Task 1 (types) is done:
- **Stream A:** Task 2 → Tasks 4-8 (parallel) → Task 9
- **Stream B:** Tasks 10-13 (parallel)
- **Stream C:** Task 3 (dataMapper, independent)

Once Tasks 9 + all text components done:
- Task 14 (wire renderer)

Once Task 14 done:
- **Stream D:** Tasks 15-18 (parallel) → Task 19 → Tasks 20-21 (parallel)
