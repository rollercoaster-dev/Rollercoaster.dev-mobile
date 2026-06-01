# Slice 4 — Theming + ND accessibility

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

The 14-theme × 6-a11y-variant matrix and everything that serves it.

**In scope:**

- `src/themes/**` — adapter, compose, contrast tests, variants
- `src/styles/**` — shadows, type, layout primitives
- `@rollercoaster-dev/design-tokens` workspace package
- `react-native-unistyles` v3 integration + Babel plugin
- `src/utils/accessibility.ts` (contrast checker)
- `src/components/ThemeChipGrid`, `src/components/ThemeSwitcher`
- `src/screens/SettingsScreen/**` — the user-facing control surface for theme variant, density, animation preference, language, and Sentry debug tools
- `src/__tests__/accessibility.test.tsx`, `src/themes/__tests__/contrast.test.ts`
- Font stack: Anybody, Instrument Sans, DM Mono, Lexend, Atkinson Hyperlegible
- ND variants: highContrast, largeText, dyslexia, lowVision, autismFriendly, lowInfo

**Lens emphasis:** a11y/ND-a11y is the load-bearing lens here — expect this chapter to be heavier on that section.

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

_(filled in during walkthrough — expect: Unistyles reactive theming, Babel plugin role, Yoga layout, font loading via `expo-font`, StyleSheet vs inline)_

## Lens scan

### type-safety

### RN/Expo idiom

### perf hot paths

### a11y / ND-a11y

### test coverage gaps

## Findings

- _(none yet)_

## Open questions

- _(none yet)_
