# Slice 2 — Navigation

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

All navigation primitives in one place: the tab navigator, each stack, the custom focus-pill tab bar, route typing, and the inset hook used to keep tab screen content above the bottom safe area + custom tab bar.

**In scope:**

- `src/navigation/index.ts` — barrel
- `src/navigation/TabNavigator.tsx` — root tab navigator (Goals, Badges, Settings)
- `src/navigation/FocusPillTabBar.tsx` — custom neo-brutalist tab bar
- `src/navigation/FocusPillTabBar.stories.tsx` — Storybook story for the tab bar
- `src/navigation/GoalsStack.tsx` — Goals tab stack
- `src/navigation/BadgesStack.tsx` — Badges tab stack
- `src/navigation/SettingsStack.tsx` — Settings tab stack
- `src/navigation/types.ts` — ParamList types across all stacks
- `src/navigation/useTabScreenContentInset.ts` — bottom inset hook (safe area + tab bar height)

**Deferred:**

- `NavigationContainer` itself + the nav theme — slice 1 (it lives in `App.tsx`)
- Individual screens routed through each stack — their domain slices (Goals→6, Evidence→7, Badges→9, Settings→4)

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

_(filled in during walkthrough — expect: react-navigation v7 native-stack vs JS stack, custom tab bar contract, `BottomTabBarProps`, `useSafeAreaInsets`, route typing patterns, deep-linking surface)_

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
