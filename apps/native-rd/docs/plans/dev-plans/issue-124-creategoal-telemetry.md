# Development Plan: Issue #124

## Issue Summary

**Title**: createGoal failure path discards Result error (no telemetry)
**Type**: bug
**Complexity**: TRIVIAL
**Estimated Lines**: ~30 lines (implementation + test extension)

## Intent Verification

Observable criteria derived from the issue:

- [x] When `createGoal` returns `{ ok: false }`, a `reportError` call fires with `area: "goal.mutate", kind: "create"` before `setTitleErrorKey("errors.createFailed")` is called.
- [x] When `createGoal` throws (Evolu insert error bubbling past the re-throw in `queries.ts`), a `try/catch` in `handleCreate` catches it, calls `reportError`, and sets the user-facing error key.
- [x] The localized string shown to the user (`errors.createFailed`) is unchanged.
- [x] A Sentry breadcrumb is NOT added at the modal layer — `queries.ts` already emits `breadcrumb({ category: "goal", message: "create" })` before the insert, which is the right layer for intent tracking.
- [x] The existing test `"shows error when createGoal fails"` is extended to assert that `reportError` was called with the correct context.

_"createGoal fails" in the current mock uses `{ ok: false }` with no error payload — the test extension should also cover the thrown-error path._

## Dependencies

| Issue | Title                                | Status                   |
| ----- | ------------------------------------ | ------------------------ |
| #67   | i18n migration (surfaced this issue) | Closed — no blocking dep |

**Status**: All dependencies met.

## Objective

Add `reportError(error, { area: "goal.mutate", kind: "create" })` to `NewGoalModal.handleCreate` for both the `!result.ok` path and the missing `try/catch` wrapper around `createGoal`. Mirror the pattern already established in `EditModeScreen`.

## Decisions

| ID  | Decision                                                            | Alternatives Considered                                           | Rationale                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use `reportError` directly (not Logger)                             | Add `new Logger("NewGoalModal")`                                  | `NewGoalModal` has no other logger usage. `reportError` is the right surface for caught errors at the screen layer — see `EditModeScreen`, `CompletionFlowScreen`, `CaptureLinkScreen`. Logger is appropriate for components with multiple warn/info paths.                                                                                                                                                       |
| D2  | Wrap entire `createGoal` call in try/catch, keep `result.ok` branch | Remove `result.ok` check and assume no-throw = success            | Confirmed from `@evolu/common/dist/src/local-first/Schema.d.ts:107-109` — `Mutation` returns `Result<Success, ValidMutationSizeError \| MergeObjectTypeErrors<...>>`. Evolu's normal validation-failure path is the Result, not a throw. `queries.ts` only re-throws JS `Error` instances caught around the insert call. Both surfaces are reachable: Result-false for validation, throw for the JS rethrow path. |
| D3  | No Sentry breadcrumb in the modal                                   | Add breadcrumb here                                               | `queries.ts:createGoal` already emits `breadcrumb({ category: "goal", message: "create" })` at the point of intent, before the insert. Adding another in the modal would double-report. The breadcrumb marks the attempt; `reportError` marks the failure.                                                                                                                                                        |
| D4  | No new error ID constant                                            | Add to `constants/errorIds.ts`                                    | No `errorIds.ts` file exists in this codebase. The issue references it, but it was not created. `ReportContext` closed-enum in `sentry-report.ts` is the privacy-safe vocabulary used everywhere; `{ area: "goal.mutate", kind: "create" }` is the correct identifier.                                                                                                                                            |
| D5  | No `console.error` dev-debug line                                   | Mirror `EditModeScreen`'s `console.error("[Screen] ...")` pattern | Joe confirmed: `reportError` only. Issue is scoped to telemetry; console noise stays out.                                                                                                                                                                                                                                                                                                                         |
| D6  | Pass raw `result.error` to `reportError`                            | Wrap as `new Error("goal.create: <discriminant>")` sentinel       | Joe confirmed: trust `scrubEvent` in `sentry-filters.ts` to handle any PII from the evolu error object. Matches the catch-block path which already forwards raw caught errors.                                                                                                                                                                                                                                    |

## Affected Areas

- `apps/native-rd/src/screens/NewGoalModal/NewGoalModal.tsx`: add `try/catch` around `createGoal`, add `reportError` call in both the catch block and the `!result.ok` branch, add import for `reportError`.
- `apps/native-rd/src/screens/NewGoalModal/__tests__/NewGoalModal.test.tsx`: extend `"shows error when createGoal fails"` to assert `reportError` was called; add a second case for the thrown-error path.

## Implementation Plan

### Step 1: Add reportError to NewGoalModal failure paths

**Files**: `apps/native-rd/src/screens/NewGoalModal/NewGoalModal.tsx`
**Commit**: `fix(native-rd): report createGoal failure to Sentry (#124)`
**Changes**:

- [x] Import `reportError` from `../../services/sentry-report`
- [x] Wrap `createGoal(trimmed)` call in `try { ... } catch (error) { ... }`
- [x] In the catch block: call `reportError(error, { area: "goal.mutate", kind: "create" })`, then `setTitleErrorKey("errors.createFailed")`
- [x] In the existing `!result.ok` else branch: call `reportError(result.error, { area: "goal.mutate", kind: "create" })` before `setTitleErrorKey`

The resulting `handleCreate` shape:

```ts
function handleCreate() {
  const trimmed = title.trim();
  if (!trimmed) {
    setTitleErrorKey("errors.titleRequired");
    return;
  }

  try {
    const result = createGoal(trimmed);
    if (result.ok) {
      navigation.replace("BadgeDesigner", {
        mode: "new-goal",
        goalId: result.value.id,
      });
    } else {
      reportError(result.error, { area: "goal.mutate", kind: "create" });
      setTitleErrorKey("errors.createFailed");
    }
  } catch (error) {
    reportError(error, { area: "goal.mutate", kind: "create" });
    setTitleErrorKey("errors.createFailed");
  }
}
```

### Step 2: Extend tests for the failure branch

**Files**: `apps/native-rd/src/screens/NewGoalModal/__tests__/NewGoalModal.test.tsx`
**Commit**: `test(native-rd): assert reportError on createGoal failure (#124)`
**Changes**:

- [x] Mock `../../services/sentry-report` at the top of the file (alongside the existing `../../../db` mock): `jest.mock("../../services/sentry-report", () => ({ reportError: jest.fn() }))`
- [x] Capture the mock: `const { reportError } = require("../../services/sentry-report")`
- [x] Extend the existing `"shows error when createGoal fails"` test (renamed to `"shows error and reports to Sentry when createGoal returns !ok"`) to assert `reportError` was called with the exact `result.error` payload and `{ area: "goal.mutate", kind: "create" }`
- [x] Add a second test `"shows error and reports to Sentry when createGoal throws"` that sets `createGoal.mockImplementation(() => { throw new Error("db locked") })`, submits the form, and asserts `reportError` was called with the thrown error and the error string is shown

## Testing Strategy

- [ ] Unit tests: extend `NewGoalModal.test.tsx` — two cases: `{ ok: false }` Result path and thrown-error path
- [ ] Test file path: `src/screens/NewGoalModal/__tests__/NewGoalModal.test.tsx` (already exists)
- [ ] Run: `bun test --testPathPatterns NewGoalModal`
- [ ] Manual: not required — this is pure telemetry; the user-facing string is unchanged

## Not in Scope

| Item                                                                | Reason                                                                                                   | Follow-up                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Creating `constants/errorIds.ts`                                    | File does not exist; the closed-enum `ReportContext` in `sentry-report.ts` is the established vocabulary | None — if error IDs are needed as a system, that's a separate design decision |
| Changing the user-facing error message                              | Issue explicitly scopes this to telemetry only                                                           | None                                                                          |
| Adding a Sentry breadcrumb at the modal layer                       | `queries.ts` already emits one at the correct intent boundary                                            | None                                                                          |
| Fixing the `SCOPE_TO_AREA` gap (NewGoalModal is not a logger scope) | Not applicable — NewGoalModal will use `reportError` directly, not Logger                                | None                                                                          |

## Discovery Log

- [2026-06-07 00:00] `constants/errorIds.ts` referenced in the issue does not exist in the codebase. The `ReportContext` discriminated union in `sentry-report.ts` is the established error vocabulary. `{ area: "goal.mutate", kind: "create" }` is the correct ReportContext — it already exists in the closed enum.
- [2026-06-07 00:00] `createGoal` in `queries.ts` re-throws on both validation failure (empty/too-long title) and Evolu insert failure. The `!result.ok` branch in `NewGoalModal` covers the case where `evolu.insert` returns `{ ok: false }` synchronously (e.g. `ValidMutationSizeError`) without the JS `catch` firing. Both paths need `reportError`.
- [2026-06-07 00:00] `queries.ts:createGoal` already emits `breadcrumb({ category: "goal", message: "create" })` before the insert. No breadcrumb needed in the modal.
- [2026-06-07 00:00] Established pattern for screen-level mutation error reporting: `console.error("[ScreenName] message", { ... })` + `reportError(error, ctx)`. The `console.error` call is optional dev-debug signal — `EditModeScreen` uses it; it can be included or omitted. Given `NewGoalModal` currently has no logger and the issue is scoped to telemetry, a `console.error` is reasonable but not required by the issue.
- [2026-06-07] Q4 resolved: `!result.ok` branch is **reachable**, not dead code. `@evolu/common/dist/src/local-first/Schema.d.ts:107-109` shows `Mutation` returns `Result<Success, ValidMutationSizeError | MergeObjectTypeErrors<...>>`. The Result-false path is evolu's standard synchronous validation-error surface (e.g. column-size brand failures). The throw path in `queries.ts` is the catch-and-rethrow around `evolu.insert` plus `NonEmptyString1000.orNull` failure for over-1000-char titles.
