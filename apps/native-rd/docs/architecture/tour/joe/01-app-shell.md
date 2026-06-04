# Slice 1 — App shell & observability

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

The always-on runtime spine: how the app boots, how the first-launch gate works, what's mounted at the root, and how crashes are caught and reported. Sentry lives here (not in a separate observability slice) because `ErrorBoundary` routes into `sentry-report` and breadcrumbs hang off lifecycle events — reviewing them apart would force forward references both ways.

**In scope:**

- `App.tsx` — root component, provider stack, theme bootstrap, first-launch gating
- `index.ts` — app entry point, Sentry init, root component registration
- `src/components/ErrorBoundary/**` — error fallback UI + Sentry-report wiring
- `src/components/Toast/**` — toast provider + context consumed under `NavigationContainer`
- `src/hooks/useFirstLaunch.ts` — Evolu-backed `hasSeenWelcome` gate
- `src/screens/WelcomeScreen/**` — the first-launch gate UI (sits above `NavigationContainer`)
- `src/services/sentry.ts` — SDK init, DSN config, breadcrumb setup
- `src/services/sentry-filters.ts` — privacy scrubbing + noise reduction rules
- `src/services/sentry-report.ts` — manual error/feedback reporting hooks
- `src/hooks/useEvidenceStartBreadcrumb.ts` — lifecycle breadcrumb recorder
- `src/shims/rd-logger.js` — console.log polyfill used in Node/Jest contexts

**Deferred:**

- Navigation primitives (TabNavigator, stacks, FocusPillTabBar) — slice 2
- Theme bootstrap internals (`useTheme`, `useThemePersistence` persistence half) — slice 3 (data) + slice 4 (theming)
- Build-pipeline Sentry plugin config (sourcemap upload, debug-id flow) — slice 8

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

_(filled in during walkthrough — expect: dev-client vs Expo Go, `expo-router` vs raw react-navigation root, SafeAreaProvider, Sentry React Native debug-ID sourcemap flow, top-level `registerRootComponent`)_

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
