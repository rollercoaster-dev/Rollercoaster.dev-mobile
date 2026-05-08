# Sentry Usage Implementation Plan

**Status:** Planned
**Created:** 2026-05-06
**Related:** `../launch/sentry-usage-concept.md`, `../launch/sentry-setup.md`, `../launch/privacy-verification.md`, `../launch/crash-triage-runbook.md`

## Summary

Implement the Sentry usage concept as a phased rollout for `native-rd`, starting with privacy hardening and a narrow reporting API, then wiring critical caught errors, build environment separation, preview-only crash verification, and finally controlled breadcrumbs.

All reporting must stay categorical. Do not send user IDs, goal text, evidence URIs, route params, generic metadata bags, or free-text breadcrumb/report fields to Sentry.

## Key Changes

### Privacy backstop

- Extend `src/services/sentry-filters.ts` so `scrubEvent` deletes non-allowlisted `event.contexts` keys.
- Keep only Sentry-managed categorical contexts: `app`, `device`, `os`, `runtime`, and `react_native_context`.
- Preserve the current privacy behavior for `event.user`, `event.extra`, request metadata, email/path redaction, console/storage/touch breadcrumbs, and host-only HTTP breadcrumbs.

### Reporting API

- Add `src/services/sentry-report.ts`.
- Export `ReportContext` as a closed discriminated union for `area` and optional `kind`.
- Export `reportError(error, ctx)` that only sets `area` and optional `kind` tags before calling `Sentry.captureException`.
- Do not add `meta`, `setContext`, `setUser`, `captureMessage`, or generic string fields.
- Export `breadcrumb(input)` as a closed union with no generic `message: string` or generic `data` bag.

### Critical instrumentation

- Update the existing `src/components/ErrorBoundary/ErrorBoundary.tsx` so `componentDidCatch` calls `reportError(error, { area: "render" })`.
- Do not pass `info.componentStack` to Sentry.
- Add manual `reportError` calls in:
  - `src/hooks/useCreateBadge.ts` outer catch: `area: "badge.create"`.
  - `src/hooks/useUserKey.ts` key verify catch: `area: "key.verify"`.
  - `src/hooks/useUserKey.ts` key generation catch: `area: "key.generate"`.
- Do not separately report `bakePNG` inside the same `useCreateBadge` flow unless the outer catch stops reporting that error.

### Environment separation

- Add `EXPO_PUBLIC_SENTRY_ENVIRONMENT` to each `eas.json` build profile:
  - `development`
  - `preview`
  - `production`
- Pass `environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? "unknown"` to `Sentry.init`.
- Do not read `process.env.EAS_BUILD_PROFILE` from app runtime code.

### Logger bridge

- Modify `src/shims/rd-logger.js` so `error(...args)` still logs to console and additionally extracts only the first real `Error` instance.
- Implement `findError` to check direct args and plain object `error` / `cause` fields only.
- Never capture strings, loose objects, route params, metadata, or arbitrary primitives.
- Add `reportLoggerError(scope, err)` in `sentry-report.ts` with an explicit `SCOPE_TO_AREA` allowlist.
- Unknown scopes must return silently.
- Do not map the default `"app"` scope.
- If DB errors are later routed, first change `src/db/queries.ts` from `new Logger()` to `new Logger("db.queries")`, then allowlist `"db.queries"` only after auditing emitted `Error.message` values.

### Preview-only crash verification

- Add `onLongPress?: () => void` support to `SettingsRow`.
- In `SettingsScreen`, attach a preview/debug-only long press to the Version row that calls `Sentry.nativeCrash()`.
- Gate this behind `EXPO_PUBLIC_SENTRY_DEBUG_TOOLS === "true"`.
- Set `EXPO_PUBLIC_SENTRY_DEBUG_TOOLS` only for preview/internal builds, not production.

### Breadcrumbs

- Add breadcrumbs last, after core reporting works.
- Use only the closed-union `breadcrumb(input)` helper.
- Add breadcrumbs for goal/step mutation, evidence capture, badge phases, key phases, and focus enter/exit.
- Do not breadcrumb per-keystroke events, per-frame events, user text, IDs, counts, file names, URIs, route params, or generic data.

## Test Plan

### Unit tests

- Extend `src/services/__tests__/sentry-filters.test.ts`:
  - `event.contexts.user_data` is removed.
  - allowlisted Sentry contexts remain.
  - existing email/path/request/breadcrumb scrubber behavior still passes.
- Add `sentry-report` tests:
  - `reportError` sets only `area` and optional `kind`.
  - no `setContext`, `setUser`, or generic metadata path exists.
  - `breadcrumb` emits only allowed category/message/data shapes.
- Add logger bridge tests:
  - metadata containing a goal title is not forwarded.
  - string-only logger errors are not captured.
  - unknown scopes are silent.
  - email and `/Users/<name>` strings in captured `Error.message` are scrubbed by `scrubEvent`.
- Add component/hook tests:
  - `ErrorBoundary` calls `reportError(error, { area: "render" })`.
  - `useUserKey` verify/generate failures report the correct areas.
  - `useCreateBadge` reports once on failure.
  - `SettingsRow` supports `onLongPress`.
  - `SettingsScreen` exposes the native crash trigger only when debug tools env is enabled.

### Commands

```bash
bun test src/services/__tests__/sentry-filters.test.ts
bun test src/services
bun test src/components/ErrorBoundary
bun test src/components/SettingsRow
bun test src/screens/SettingsScreen
bun test src/hooks
bun run type-check
bun run lint
```

## Rollout Order

1. Privacy backstop: scrub non-allowlisted `event.contexts`, with tests.
2. `sentry-report.ts`: closed `ReportContext`, `reportError`, and report tests.
3. Existing `ErrorBoundary`: wire `componentDidCatch` to `reportError`.
4. Critical manual call sites: `useCreateBadge` and `useUserKey`.
5. Environment separation: `EXPO_PUBLIC_SENTRY_ENVIRONMENT` in `eas.json` and `Sentry.init`.
6. Preview-only crash trigger in Settings.
7. Logger bridge with an explicit scope allowlist.
8. Breadcrumb helper and selected breadcrumb call sites.
9. Run `privacy-verification.md` end to end on the build containing the above before external TestFlight use.

## Assumptions

- Implement in small PRs in the rollout order above.
- Root-level `ErrorBoundary` around `NavigationContainer` is deferred until real Sentry data shows nav/provider render errors.
- Logger bridge starts opt-in; no default `"app"` scope and no blanket DB coverage.
- Native crash verification requires a preview/internal EAS build and the existing proxy procedure in `privacy-verification.md`.
- Privacy policy and App Store nutrition label updates remain a separate gate before external TestFlight.
