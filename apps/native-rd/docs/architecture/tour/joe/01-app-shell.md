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

_(filled in during prep)_

**Notes**

- Navigation primitives (TabNavigator, stacks, FocusPillTabBar) — slice 2
- Theme bootstrap internals (`useTheme`, `useThemePersistence` persistence half) — slice 3 (data) + slice 4 (theming)
- Build-pipeline Sentry plugin config (sourcemap upload, debug-id flow) — slice 8

## File map

- `index.ts` — entrypoint
  - biggest take away is the ordering of the requires
  - Order matters: crypto → polyfills → unistyles → sentry → i18n → app
    - each step is kind of needed so the next step can depend on it
    - all imports use require to ensure the order is preserved
    - crypto is first because the following steps depend on it and it has a carve out for web where a browser native package replaces it
    - Hermes is RN's JavaScript engine. It lags behind V8 and it pulls in a few polyfills to compensate
    - Unistyles is the styling solution used in the app. Must be imported before any components that use it
    - sentry, error tracking. as soon as its loaded we get error tracking enabled automatically. It also uses the polyfills and is crucial for catching if i18n throws
    - c
- `App.tsx`
  - storybook renders it's own app shell instead of a seperate instance when env var is set.
- `src/hooks/useTheme.ts` — theme context and persistence logic
  - added an input guard to isValidThemeName
  - deferring until 04 (theming)
- `src/components/ErrorBoundary/**` still uses classes, never ported to hooks
  - https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
  - no hook equivalent for componentDidCatch / getDerivedStateFromError
  - Issues:
    - #: #265 (https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/265)
      Finding: Don't render raw error.message to users
      Labels: accessibility, type:bug
      Priority: medium
    - #: #266 (https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/266)
      Finding: "Try Again" is a no-op for deterministic errors
      Labels: type:bug
      Priority: medium
    - #: #267 (https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/267)
      Finding: No SR focus/announcement on fallback
      Labels: accessibility, type:bug
      Priority: medium
    - #: #268 (https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/268)
      Finding: Gate console.error to **DEV**
      Labels: type:chore
      Priority: low
    - #: #269 (https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/269)
      Finding: Capture componentStack via allowlisted arg
      Labels: accessibility, enhancement
      Priority: medium
- `src/components/Toast/**` found multiple a11y issues https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/264
- `src/hooks/useFirstLaunch.ts`

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

Storybook rendering a wrapper and how providers work. very oniony.

## Lens scan

### type-safety

### RN/Expo idiom

### perf hot paths

### a11y / ND-a11y

### test coverage gaps

## Findings

- index.ts
  - added // eslint-disable-next-line @typescript-eslint/no-require-imports where missing

## Open questions

- _(none yet)_
