# Slice 5 — Infra (i18n, Sentry, build, navigation, db, scripts)

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

Cross-cutting concerns that don't fit a domain slice.

**In scope:**

- i18n: `src/i18n/**`, `locales/*.json` (en/de), pseudo-locale generator
- Sentry: `src/services/sentry.ts`, `sentry-filters.ts`, `sentry-report.ts`
- Build pipeline: `scripts/run-ios.sh`, `scripts/run-android.sh`, EAS profiles, `app.config.*`, native projects
- Navigation primitives: `TabNavigator`, `FocusPillTabBar`, `useTabScreenContentInset`
- Evolu: `src/db/evolu.ts`, `src/db/schema.ts`, `src/db/queries.ts`, `src/db/index.ts`
- `scripts/**` utilities (release notes, badge verify, a11y audit, etc.)
- ErrorBoundary, Toast, top-level wiring in `App.tsx` / `index.ts`

**Lens emphasis:** RN-idiom and perf (build/startup-path hot spots).

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

_(filled in during walkthrough — expect: Metro bundler, EAS Build/Submit, react-navigation v7 deep architecture, Hermes vs JSC, dev-client vs Expo Go)_

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
