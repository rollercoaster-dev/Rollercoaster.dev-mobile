# Issue #253: Duotone Opacity Slider

**Status:** Implemented in PR #255; review fixes pushed 2026-06-07

## Summary

Add a reusable, theme-aware `BrutalistSlider` and expose it in the Badge
Designer Colors accordion's Icon tab when the selected icon weight is
`duotone`. Persist the selected fill opacity on `BadgeDesign`, pass it to
Phosphor icons only for duotone rendering, and preserve the library's `0.2`
fallback for existing designs.

Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/253
PR: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/255

## Implementation Status

The implementation landed on `feat/issue-253-duotone-opacity-slider` as the
planned four commits plus follow-up hardening and review fixes:

- Added the reusable, theme-aware `BrutalistSlider` with gesture, RTL,
  accessibility, Storybook, and focused test coverage.
- Added validated `iconDuotoneOpacity` persistence and duotone-only renderer
  forwarding while preserving the legacy Phosphor fallback.
- Added the conditional Badge Designer control, translations, and component
  tests.
- Removed the direct `@react-native-community/slider` dependency.
- Wrapped the app and Storybook roots with `GestureHandlerRootView`.
- Corrected gesture coordinates for the slider's padded touch target and
  expanded the shared gesture-handler Jest mock after PR review.

### Plan Deviations

- The slider implementation exceeded the scope guard's approximate 150-line
  threshold, but remained in the same PR because it did not require separate
  gesture-conflict infrastructure and the feature commits stayed independently
  reviewable.
- The planned `BadgeDesignerScreen.test.tsx` save/weight-switch integration
  test was not added. Coverage is split across `BadgeColorsAccordion`,
  `BadgeDesign` parsing, and `BadgeRenderer` tests.
- Manual verification across iOS, Android, all themes, RTL, large text,
  VoiceOver, and TalkBack remains a release verification task.

## Repository Findings

- `BadgeDesign` is parsed with the manual sanitizer in `src/badges/types.ts`;
  there is no Zod schema to update.
- Shared components use a directory with a component file, styles file, barrel
  export, tests, and usually a Storybook story.
- Locale resources live in `src/i18n/resources/{en,de,pseudo}/`, with parity
  tests enforcing matching keys.
- `@react-native-community/slider` is unused by app source, but is an optional
  peer of Storybook's on-device controls. Remove the direct dependency and
  regenerate `bun.lock`, then verify Storybook dependency resolution.

## Implementation Plan

### Commit 1: Add the reusable BrutalistSlider primitive

Create:

- `src/components/BrutalistSlider/BrutalistSlider.tsx`
- `src/components/BrutalistSlider/BrutalistSlider.styles.ts`
- `src/components/BrutalistSlider/index.ts`
- `src/components/BrutalistSlider/__tests__/BrutalistSlider.test.tsx`
- `src/components/BrutalistSlider/BrutalistSlider.stories.tsx`

Implement a controlled slider API with `value`, `minimumValue`,
`maximumValue`, `step`, `onValueChange`, and accessibility label/hint props.
Use `Gesture.Pan`, `GestureDetector`, and Reanimated shared values for drag
position. Measure the track width with `onLayout`, clamp pointer position,
convert it to a value, and snap to the nearest step. Keep snap/clamp helpers
pure and exported only if needed for focused unit tests.

Render a square thumb, hard border/shadow, filled track, and step marks using
Unistyles theme tokens so runtime theme switches update all colors. Make the
whole control meet the minimum touch target without requiring the visual track
to be 44 points tall.

Expose `accessibilityRole="adjustable"` and percentage-based
`accessibilityValue`. Handle `increment` and `decrement` accessibility actions
through the same clamp/snap path as gestures. Ensure external `value` changes
resynchronize the thumb, and support RTL by reversing the position/value
mapping.

Test:

- initial and externally updated values
- clamping at 20% and 100%
- snapping to 10% steps
- accessibility role/value
- increment/decrement actions, including edge values
- RTL position/value mapping or its pure conversion helper

Add a dedicated Storybook story with controls for value, min, max, and step,
including light/dark theme verification through the existing Storybook theme
toolbar.

### Commit 2: Persist and render duotone opacity

Update `src/badges/types.ts`:

- add `iconDuotoneOpacity?: number` to `BadgeDesign`
- set `iconDuotoneOpacity: 0.2` in `createDefaultBadgeDesign`
- sanitize a present stored value as a finite number in the inclusive
  `0.2...1.0` range
- drop invalid stored values so old/corrupt designs use the renderer/library
  fallback rather than silently changing appearance

Do not force the field onto parsed legacy designs that lack it. This preserves
the acceptance criterion that existing JSON continues to use Phosphor's
default.

Update `src/badges/BadgeRenderer.tsx` to pass:

```tsx
duotoneOpacity={
  design.iconWeight === BadgeIconWeight.duotone
    ? design.iconDuotoneOpacity
    : undefined
}
```

Do not pass a separate `duotoneColor`; Phosphor should continue deriving it
from the existing resolved icon color.

Extend:

- `src/badges/__tests__/types.test.ts` for default creation, valid round-trip,
  missing legacy field, range edges, and invalid values
- `src/badges/__tests__/BadgeRenderer.test.tsx` so the icon mock captures
  `duotoneOpacity`, proving it is forwarded for duotone and omitted for other
  weights

### Commit 3: Wire the slider into Badge Designer

Update `BadgeColorsAccordionProps` with
`onChangeIconDuotoneOpacity: (value: number) => void`.

In the Icon tab body, render a labeled slider row only when
`design.iconWeight === BadgeIconWeight.duotone`. Configure it with:

- minimum `0.2`
- maximum `1`
- step `0.1`
- value `design.iconDuotoneOpacity ?? 0.2`
- visible rounded percentage text, for example `60%`

Add layout styles to `BadgeColorsAccordion.styles.ts` using theme spacing,
typography, and colors. Keep the slider mounted independently of the icon
contrast warning.

In `BadgeDesignerScreen.tsx`, add a handler that merges
`iconDuotoneOpacity` into `currentDesign` and pass it to the accordion. The
existing weight-change handler must not clear the field, so switching away
from duotone and back restores the saved value.

Update `BadgeDesigner.stories.tsx` to pass the new callback and initialize the
interactive story with a controllable duotone opacity path.

Add English and German keys under `iconColor` for the visible label,
accessibility label/hint, and percentage value text. Regenerate or update the
pseudo locale consistently, and update the badge designer translation
register only if the new copy needs translator-specific intent notes.

Extend `BadgeColorsAccordion.test.tsx` to cover:

- slider absent for every non-duotone weight
- slider visible at 20% when duotone has no stored field
- stored percentage displayed when present
- callback receives the adjusted value
- rerendering away from and back to duotone restores the persisted value

Add one `BadgeDesignerScreen.test.tsx` integration test proving an opacity
change reaches the saved design JSON and remains present after weight
switches.

### Commit 4: Remove the unused native slider dependency

Remove `@react-native-community/slider` from
`apps/native-rd/package.json` and run `bun install` from the repository root to
regenerate `bun.lock`. Confirm the package remains present only if Bun retains
it as Storybook's optional peer; the app must no longer declare it directly.

## Validation

Run from the repository root:

```sh
bun run type-check
bun run lint
bun test apps/native-rd/src/components/BrutalistSlider/__tests__/BrutalistSlider.test.tsx
bun test apps/native-rd/src/badges/__tests__/types.test.ts
bun test apps/native-rd/src/badges/__tests__/BadgeRenderer.test.tsx
bun test apps/native-rd/src/screens/BadgeDesignerScreen/__tests__/BadgeColorsAccordion.test.tsx
bun test apps/native-rd/src/screens/BadgeDesignerScreen/__tests__/BadgeDesignerScreen.test.tsx
bun test apps/native-rd/src/i18n/__tests__/locale-parity.test.ts
```

Then verify manually on iOS and Android:

1. The slider appears only for duotone icons.
2. Dragging snaps from 20% through 100% in 10% increments.
3. The preview fill visibly changes while outline/fill color remains shared.
4. The value survives weight switches and a save/reopen cycle.
5. VoiceOver and TalkBack announce an adjustable percentage and perform
   increment/decrement actions.
6. The control remains legible and usable in all 14 themes, RTL, large text,
   and inside the accordion's vertical scroll gesture.

### Validation Results

Completed on 2026-06-07:

- `bun run type-check`
- `bun run lint` with no errors; existing warnings remain
- full Jest suite: 174 suites and 8,735 tests
- `bun run build`
- focused `BrutalistSlider` tests after the coordinate fix
- focused `StepList` tests after expanding the gesture-handler mock
- `git diff --check`

CI checks for CodeQL, DCO, docs, packages, and i18n passed during review.

## Scope Guard

Keep this as one PR unless the slider primitive exceeds roughly 150 LOC or
requires substantial gesture-conflict infrastructure. In that case, land the
primitive/tests/story first and the badge-specific persistence and wiring
second.
