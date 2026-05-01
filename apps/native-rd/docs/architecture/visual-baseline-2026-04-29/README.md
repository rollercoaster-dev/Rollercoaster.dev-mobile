# Visual Baseline — 2026-04-29

Captured to validate the fix in #932 (two-tone safe-area band caused by
Unistyles v3 Babel plugin not transforming `SafeAreaView`).

## What's here

- `SettingsScreen-light-dyslexia.png` — `<ScreenHeader>` rendered on
  `light-dyslexia` (Warm Studio). Single solid purple band covering both
  the status-bar inset and the "Settings" title row, with hard shadow
  on the bottom edge. No two-tone split.

## What's missing

Storybook covers the 14-theme matrix in-tree (see
`apps/native-rd/src/components/ScreenHeader/ScreenHeader.stories.tsx`),
but the bug class lives in _Babel-plugin transformation of third-party
components at runtime_, so device captures are still useful evidence.

The themes where the bug was loudest in the original issue
(`dark-default`, `light-highContrast`) still need device captures for
`GoalsScreen` (tier-1) and `FocusModeScreen` (tier-2). These can be
added in a follow-up — they require manual theme switching on the
running simulator and were skipped in this PR because the autonomous
toolchain can't drive simulator UI events.
