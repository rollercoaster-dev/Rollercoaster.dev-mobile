# Development Plan: Issue #126

## Issue Summary

**Title**: useDensity unsafe DensityLevel cast on DB read
**Type**: bug
**Complexity**: SMALL
**Estimated Lines**: ~80 lines

## Intent Verification

Observable criteria derived from the issue.

- [ ] When `useDensity` reads a `null` density from DB, `densityLevel` is `"default"` and no log is emitted.
- [ ] When `useDensity` reads a valid `DensityLevel` string from DB (`"compact"`, `"default"`, `"comfortable"`), it is used as-is.
- [ ] When `useDensity` reads an unrecognised string from DB (e.g. `"cozy"`, `"large"`, any arbitrary value), `densityLevel` falls back to `"default"` AND a `logger.error` call is made with an `Error` instance carrying the bad value, so the rd-logger shim forwards it to Sentry.
- [ ] The `as DensityLevel` cast is gone from `useDensity.ts`; TypeScript compilation passes with no suppressions.
- [ ] A new unit test in `src/hooks/__tests__/useDensity.test.ts` passes a bogus string via `mockUseQuery` and asserts both the fallback and the error log emission.

## Dependencies

No upstream dependencies.

**Status**: All dependencies met.

## Objective

Replace the unsafe `as DensityLevel` cast in `useDensity.ts` with a proper runtime type guard that narrows DB values to `DensityLevel`, falls back to `"default"` for anything unrecognised, and emits a `logger.error` (carrying an `Error` instance) so corrupted rows reach Sentry via the rd-logger shim.

## Decisions

| ID  | Decision                                                                             | Alternatives Considered                                                    | Rationale                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Add `isDensityLevel` type guard and `narrowDensity` helper to `src/utils/density.ts` | Inline ternary or IIFE in `useDensity.ts`; guard in a separate `guards.ts` | `density.ts` already owns the union and `densityOptions` array; co-locating the guard keeps the module self-contained and matches the `isValidThemeName` pattern in `useTheme.ts`. A named `narrowDensity` helper (user decision 2026-06-11) makes the unknown-value path directly testable in `density.test.ts`. |
| D2  | Use `logger.error` with an `Error` instance for unknown DB value                     | `logger.warn` (console-only)                                               | User decision 2026-06-11: corrupted density rows must reach Sentry. The `rd-logger` shim's `reportLoggerError` only forwards calls when at least one arg is an `Error`, so we pass a constructed `Error("Unknown density value: " + raw)` plus a metadata object.                                                 |
| D3  | Do not auto-write the fallback back to Evolu                                         | Auto-correct the stored value                                              | Consistent with `useThemePersistence`'s rationale: the user might restore the row on the next sync or upgrade; silently clobbering it loses intent. Confirmed by user 2026-06-11.                                                                                                                                 |
| D4  | Export `isDensityLevel` and `narrowDensity` from `density.ts`                        | Keep them unexported / internal to the hook                                | Both are testable directly in `density.test.ts`. `narrowDensity` encapsulates the fallback + logging policy so the hook stays a thin consumer.                                                                                                                                                                    |

## Affected Areas

- `apps/native-rd/src/utils/density.ts`: add `DENSITY_LEVELS` set, `isDensityLevel(value: unknown): value is DensityLevel` type guard, and `narrowDensity(raw: unknown, logger: Logger): DensityLevel` helper that handles `null`/valid/invalid branches and emits the Sentry-reaching `logger.error` for the invalid branch. Export all three.
- `apps/native-rd/src/hooks/useDensity.ts`: import `narrowDensity` and `Logger`, replace the unsafe cast with a single `narrowDensity(settings?.density, logger)` call, add a module-level `const logger = new Logger("useDensity")`.
- `apps/native-rd/src/hooks/__tests__/useDensity.test.ts`: add `describe("unknown DB value fallback")` with two cases: bogus string falls back to `"default"`, `logger.error` is called once with an `Error` instance.
- `apps/native-rd/src/utils/__tests__/density.test.ts`: add `isDensityLevel` guard tests (valid values, invalid strings, non-strings) and `narrowDensity` tests (null → "default" no log, valid → passthrough no log, invalid → "default" with `logger.error` called with an `Error`).

## Implementation Plan

### Step 1: Add `isDensityLevel` guard and `narrowDensity` helper to density utilities

**Files**: `apps/native-rd/src/utils/density.ts`, `apps/native-rd/src/utils/__tests__/density.test.ts`
**Commit**: `fix(density): add isDensityLevel guard and narrowDensity helper`
**Changes**:

- [ ] Export `DENSITY_LEVELS: ReadonlySet<DensityLevel>` built from the keys of `DENSITY_MULTIPLIERS` (no separate string array needed — the Record already has the canonical list).
- [ ] Export `isDensityLevel(value: unknown): value is DensityLevel` that checks `typeof value === "string"` then `DENSITY_LEVELS.has(value as DensityLevel)`.
- [ ] Export `narrowDensity(raw: unknown, logger: Logger): DensityLevel` with this contract:
  ```ts
  export function narrowDensity(raw: unknown, logger: Logger): DensityLevel {
    if (raw === null || raw === undefined) return "default";
    if (isDensityLevel(raw)) return raw;
    logger.error(new Error(`Unknown density value in DB: ${String(raw)}`), {
      rawDensity: raw,
    });
    return "default";
  }
  ```
  The `Error` instance is required — the `rd-logger` shim's `reportLoggerError` only forwards to Sentry when at least one arg is an `Error`. Import `Logger` from `../shims/rd-logger`.
- [ ] In `density.test.ts`:
  - `describe("isDensityLevel")` block using `test.each` for all three valid values, a sample of invalid strings, and non-string inputs (`null`, `42`, `undefined`).
  - `describe("narrowDensity")` block: pass a stub logger (`{ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }`-shaped) and assert (a) `null` → `"default"` with no logger calls, (b) `undefined` → `"default"` with no logger calls, (c) valid `"compact"` → `"compact"` with no logger calls, (d) bogus `"cozy"` → `"default"` AND `logger.error` called once with first arg `instanceof Error`.

### Step 2: Fix unsafe cast in `useDensity` by delegating to `narrowDensity`

**Files**: `apps/native-rd/src/hooks/useDensity.ts`
**Commit**: `fix(useDensity): replace unsafe DensityLevel cast with validated narrowing`
**Changes**:

- [ ] Import `narrowDensity` from `../utils/density`.
- [ ] Import `Logger` from `../shims/rd-logger`.
- [ ] Add module-level `const logger = new Logger("useDensity")` (matches `useThemePersistence` pattern).
- [ ] Replace lines 23-24:
  ```ts
  const densityLevel: DensityLevel =
    (settings?.density as DensityLevel) || "default";
  ```
  with:
  ```ts
  const densityLevel: DensityLevel = narrowDensity(settings?.density, logger);
  ```

### Step 3: Add unit tests for the hook's fallback path

**Files**: `apps/native-rd/src/hooks/__tests__/useDensity.test.ts`
**Commit**: `test(useDensity): cover unknown DB value fallback and error emission`
**Changes**:

- [ ] Mock `../shims/rd-logger` at the top of the test file (same pattern as `../../db` mock already present); expose `mockLoggerError` spy on the `Logger` class's `error` method.
- [ ] Add `describe("unknown DB value fallback")`:
  - `it("falls back to 'default' when density is an unrecognised string")` — feeds `{ density: "cozy" }` via `makeSettings`, asserts `densityLevel === "default"` from hook result, asserts `mockLoggerError` called once with first arg `instanceof Error`.
  - `it("does not log when density is null")` — feeds `{ density: null }`, asserts fallback `"default"` and `mockLoggerError` NOT called.

## Testing Strategy

- [ ] Unit tests for `isDensityLevel` guard and `narrowDensity` helper in `src/utils/__tests__/density.test.ts` using `test.each` for all valid values + invalid samples.
- [ ] Unit tests for the hook's fallback path in `src/hooks/__tests__/useDensity.test.ts` with a mocked `Logger` asserting `error` is called with an `Error` instance.
- [ ] Test file paths mirror `src/` under `src/__tests__/` (already the case for both files).
- [ ] No new screen-level test required — `SettingsScreen` renders `densityLevel` via `DensityPicker`, and the guard lives entirely in the hook.
- [ ] Run: `bun test --testPathPatterns "useDensity|density"` to validate both test files.

## Not in Scope

| Item                                                                        | Reason                                                                         | Follow-up |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------- |
| Auto-correcting the corrupted DB row                                        | Consistent with `useThemePersistence` policy; recovery via sync/upgrade        | none      |
| SettingsScreen snapshot/integration test for the literal-key render symptom | The guard prevents the symptom entirely; symptom-level test would be redundant | none      |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
