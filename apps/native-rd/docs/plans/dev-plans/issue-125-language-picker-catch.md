# Development Plan: Issue #125

## Issue Summary

**Title**: void i18n.changeLanguage(...) swallows promise rejection in LanguagePicker
**Type**: tech-debt
**Complexity**: TRIVIAL
**Estimated Lines**: ~15 lines (implementation + test additions)

## Intent Verification

Observable criteria derived from the issue:

- [x] When `i18n.changeLanguage` rejects, the error is logged via `logger.error(...)` rather than silently discarded.
- [x] The toggle's displayed state is driven by `i18n.language` (reactive read), so a failed language switch leaves the toggle at its pre-change value — no explicit revert needed.
- [x] The existing test "switches language to pseudo and back when the toggle changes" continues to pass.
- [x] A new test asserts that when `changeLanguage` rejects, `logger.error` is called with the error.

_Write criteria that a reviewer could verify by running the tests or reading the implementation._

## Dependencies

No upstream dependencies. Issue #67 (i18n migration) is already closed; this issue was surfaced during that review but is standalone.

| Issue | Title                                            | Status | Type         |
| ----- | ------------------------------------------------ | ------ | ------------ |
| #67   | i18n: migrate Welcome, NewGoal, Settings screens | Closed | Context only |

**Status**: All dependencies met.

## Objective

Replace `void i18n.changeLanguage(...)` in `LanguagePicker` with a `.catch` handler that logs the rejection via the project's standard `Logger` primitive. This eliminates the UnhandledPromiseRejection silent-fail and aligns the handler with the app-wide error-logging convention.

## Decisions

| ID  | Decision                                                                                                       | Alternatives Considered                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use `Logger` from `../../shims/rd-logger` (same shim used by `src/i18n/index.ts` and all screen-level loggers) | `console.error` directly; Sentry directly                     | `Logger.error` is the single logging primitive in this codebase. It wraps `console.error`, extracts `Error` instances, and routes them to `reportLoggerError` (Sentry bridge). Using it directly gives free Sentry capture without extra code.                                                                                                                             |
| D2  | No explicit toggle-state revert                                                                                | Explicit `setState` call to undo the visual toggle            | `isPseudo` is derived from `i18n.language` via `useTranslation`, which re-renders when the language changes. If `changeLanguage` rejects, `i18n.language` stays unchanged, so the toggle re-renders back to the pre-change value on the next render. No manual revert needed.                                                                                              |
| D3  | Scope the logger name to `"SettingsScreen"`                                                                    | `"LanguagePicker"`, `"i18n"`                                  | Matches the convention every other screen uses (e.g. `new Logger("BadgeDesignerScreen")`). The i18n module already has its own `new Logger("i18n")` instance.                                                                                                                                                                                                              |
| D4  | Single commit — no split                                                                                       | Two commits (impl + test)                                     | The implementation change is one expression in one file; the test update is in the co-located test file. Both are small enough to land atomically. Splitting would produce a red-CI commit (unhandled rejection, but no test yet).                                                                                                                                         |
| D5  | Wrap non-Error rejections before logging                                                                       | Pass `err` through as-is (relying on rd-logger's `findError`) | rd-logger's Sentry bridge only fires when an `Error` instance is detected. If `changeLanguage` ever rejects with a non-Error (string, plain object), bypassing the bridge would silently drop the Sentry breadcrumb. One-line wrap (`err instanceof Error ? err : new Error(String(err))`) closes that gap with zero downside. User-driven decision during implementation. |

## Affected Areas

- `apps/native-rd/src/screens/SettingsScreen/SettingsScreen.tsx`: add `Logger` import, instantiate module-level `logger`, attach `.catch` to `changeLanguage` call.
- `apps/native-rd/src/screens/SettingsScreen/__tests__/SettingsScreen.test.tsx`: add a test asserting `logger.error` is called when `changeLanguage` rejects.

## Implementation Plan

### Step 1: Attach `.catch` to `changeLanguage` and add rejection test

**Files**:

- `apps/native-rd/src/screens/SettingsScreen/SettingsScreen.tsx`
- `apps/native-rd/src/screens/SettingsScreen/__tests__/SettingsScreen.test.tsx`

**Commit**: `fix(settings): handle changeLanguage rejection in LanguagePicker`

**Changes**:

- [x] Add `import { Logger } from "../../shims/rd-logger";` near the top of `SettingsScreen.tsx` (group with other local imports).
- [x] Add `const logger = new Logger("SettingsScreen");` as a module-level constant (after imports, before the component functions).
- [x] Replace `void i18n.changeLanguage(next ? "pseudo" : "en");` with the `.catch` handler (including the D5 non-Error wrap).
- [x] In `SettingsScreen.test.tsx`, within the `LanguagePicker (dev-only)` describe block, add a test that captures the SettingsScreen logger instance (via `Logger.mock.results` at module load — see Discovery Log) and asserts `logger.error` is called when `changeLanguage` rejects.

## Testing Strategy

- [ ] Unit test: `changeLanguage` rejection calls `logger.error` (Jest 30, `@testing-library/react-native` v13)
- [ ] Test file: `src/screens/SettingsScreen/__tests__/SettingsScreen.test.tsx` (co-located, already exists)
- [ ] Existing tests must stay green — the spy approach must not mutate i18n state for sibling tests
- [ ] Manual: flip the pseudo toggle in the dev client; observe no console errors for the happy path; observe a logged error if `changeLanguage` is forced to throw

## Not in Scope

| Item                                        | Reason                                                                                                           | Follow-up  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| Lazy-load translation protection            | Issue explicitly scopes this to "if we ever lazy-load" — that's a future concern                                 | none filed |
| Sentry breadcrumb / alert for the rejection | Dev-only UI; `logger.error` already routes to Sentry via `reportLoggerError` if the error is an `Error` instance | none       |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-07] **jest globally mocks `rd-logger`** via `moduleNameMapper` in `jest.config.js` (maps `../shims/rd-logger` → `src/db/__tests__/mocks/rd-logger.ts`). The mock returns a fresh `{ error, warn, info, debug }` per `new Logger(...)`. To assert on logger behaviour, the test has to reach the mocked instance — `console.error` spies don't fire because the real shim is never loaded under jest.
- [2026-06-07] **Capturing the SettingsScreen logger instance**: the existing `beforeEach(() => jest.clearAllMocks())` wipes `Logger.mock.calls` and `Logger.mock.results`, so the instance can't be looked up inside a test. Captured once at module-load time at the top of the test file (after imports but before describe blocks). The instance reference persists; its `error` jest.fn() call history still gets cleared per-test, which is the desired behaviour.
- [2026-06-07] **Used `waitFor` instead of microtask-drain pattern**: `.catch` fires asynchronously after `fireEvent`; `await Promise.resolve()` twice was insufficient in this environment. `waitFor` from `@testing-library/react-native` retries the assertion until it passes or times out, which is the canonical RN-testing pattern for async-handler side effects.
