# Badge Designer Accordion Refactor

**Status:** Ready for implementation
**Tracking issue:** [#247 — reorganize badge designer as single-open accordion](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/247)
**Follow-up:** [#248 — support custom badge fill, border, and center colors](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/248)
**Prototype:** `apps/native-rd/prototypes/badge-designer-a-accordion.html`
**Last updated:** 2026-06-06

## Objective

Refactor the native badge designer toward the approved HTML prototype by
replacing the current flat stack of controls with a one-section-at-a-time
accordion. Preserve the existing badge design model, rendering, persistence,
and save behavior.

The expanded custom-color model is intentionally deferred to a separate issue
and PR.

## Decisions

1. Section order is **Shape → Frame → Center → Colors → Inscriptions**.
2. Exactly one section is expanded at a time.
3. Shape is expanded whenever the screen is first opened.
4. Expansion state is local UI state and is not persisted.
5. Center contains both center-mode selection and the conditional icon picker.
6. Inscriptions contains bottom label, path text, and banner controls.
7. Colors contains the existing fill-color picker only in this PR.
8. Custom fill, border, and icon/monogram colors ship separately.
9. The fixed badge preview and save behavior remain unchanged.

## Current State

`BadgeDesignerScreen.tsx` renders the controls as separate flat sections inside
one `ScrollView`:

- Shape
- Color
- Frame
- Center
- Icon, conditionally
- Bottom label
- Path text
- Banner
- Save

The screen already centralizes design state and update handlers in
`DesignEditor`. The individual selectors and editors are reusable and should
not need behavioral rewrites.

`src/components/CollapsibleSection` provides an existing disclosure primitive,
but it currently manages its own expansion state. The badge designer requires
controlled expansion so the parent can enforce the one-open-at-a-time rule.

## Proposed Structure

Keep design state, derived values, and callbacks in `DesignEditor`. Extract the
layout into focused screen-local section components:

- `ShapeSection`
- `FrameSection`
- `CenterSection`
- `ColorsSection`
- `InscriptionsSection`

Each section receives only the values and callbacks it needs. Do not move badge
domain behavior into the accordion component.

Enhance `CollapsibleSection` to support:

- controlled `expanded` state
- `onExpandedChange`
- optional summary/meta text
- prototype-style bordered card presentation
- existing uncontrolled behavior for current consumers
- translated accessibility labels rather than constructed English strings

`DesignEditor` owns an `expandedSection` union initialized to `"shape"`.
Selecting a closed section replaces the current value. Pressing the open
section should leave it open, preserving the invariant that exactly one section
is expanded.

## Implementation Steps

### 1. Extend the disclosure primitive

**Files:**

- `src/components/CollapsibleSection/CollapsibleSection.tsx`
- `src/components/CollapsibleSection/CollapsibleSection.styles.ts`
- `src/components/CollapsibleSection/__tests__/CollapsibleSection.test.tsx`
- related Storybook story

Add controlled-state support without breaking existing callers. Add optional
summary content and a card variant or equivalent styling API suitable for the
designer. Preserve reduced-motion handling and 44pt minimum interaction size.

Add tests for controlled expansion, summary rendering, accessibility state,
and the inability of a controlled caller to collapse without accepting the
state change.

### 2. Extract badge designer sections

**Files:**

- `src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`
- new screen-local section module(s), following the smallest structure that
  keeps the screen readable
- `BadgeDesignerScreen.styles.ts`

Move existing controls into the five approved groups without changing their
props or domain behavior. Keep the section components stateless.

Suggested summary values:

- Shape: selected shape label
- Frame: selected frame label
- Center: selected mode plus monogram or icon label
- Colors: selected fill-color label
- Inscriptions: concise enabled/content summary, avoiding long user text

Summary copy must use `badgeDesigner` i18n keys.

### 3. Add accordion coordination

Add local `expandedSection` state to `DesignEditor`, initialized to `shape`.
Wire every section as a controlled disclosure. Opening one section closes the
previous section. The currently open section cannot be collapsed to an
all-closed state.

Do not persist this state to Evolu or another store.

### 4. Update localization and tests

**Files:**

- `src/i18n/resources/_register/badgeDesigner.yml`
- generated locale resources as required by the repository i18n workflow
- `src/screens/BadgeDesignerScreen/__tests__/BadgeDesignerScreen.test.tsx`
- `src/stories/badges/BadgeDesigner.stories.tsx`
- `e2e/flows/badge-redesign.yaml`, only if selectors need adjustment

Cover:

- Shape starts expanded.
- Other sections start collapsed.
- Opening Frame closes Shape.
- Pressing the already-open Frame header does not close it.
- Center exposes the icon picker only in icon mode.
- Existing edit and save round trips still work.
- Accessibility state announces the active disclosure correctly.

## Acceptance Criteria

- The designer renders sections in this order: Shape, Frame, Center, Colors,
  Inscriptions.
- Shape is the only expanded section on screen entry.
- Opening a section closes the previously open section.
- The UI never enters an all-sections-collapsed state.
- Center contains center-mode, monogram, icon, and icon-weight controls as
  applicable.
- Inscriptions contains bottom label, path-text, and banner controls.
- Colors continues to edit the existing badge fill color.
- The fixed preview updates as controls change.
- Existing badge save, capture, and navigation behavior is unchanged.
- Disclosure headers expose correct accessibility role and expanded state.
- Reduced-motion preferences remain respected.
- Tests, type-check, and lint pass.

## Validation

```bash
bun run type-check
bun run lint
bun test --testPathPatterns CollapsibleSection BadgeDesignerScreen
bun run test:e2e:single e2e/flows/badge-redesign.yaml
```

Perform a simulator check across at least the default, low-information, and
large-text themes. Verify long translated summaries do not crowd the chevron or
reduce the header touch target.

## Out of Scope

- Custom color picker UI
- Border color and border-scope controls
- Icon/monogram color
- Changes to `BadgeDesign` persistence or parsing
- Changes to `BadgeRenderer` color resolution
- Sticky save behavior
- Persisting accordion expansion state
- Reworking the fixed preview

## Risks

- `CollapsibleSection` is shared. Controlled-state additions must remain
  backward compatible and should not force card styling on existing consumers.
- Inscriptions is substantially taller than other sections. Keyboard and
  scroll-to-input behavior need simulator verification.
- Summary values can become noisy or leak long user-authored text. Keep them
  concise and deterministic.
- Existing E2E selectors may assume all controls are mounted simultaneously.
  Prefer opening the relevant section in the flow instead of weakening the
  accordion by keeping collapsed content mounted and accessible.

## Follow-Up: Custom Colors

The separate custom-color issue should cover:

- custom fill color
- custom border color with theme-matching default
- custom icon/monogram color
- border scope: shape, shape + frame, or all including banner
- schema parsing and backward-compatible defaults
- renderer plumbing for shape, frame, banner, icon, and monogram
- contrast and transparent-border policy
- native custom-color picker UX
- export/capture parity and tests
