# Development Plan: Issue #156

## Issue Summary

**Title**: i18n sync: placeholderGuard + responseParser (Zod) hard-fail validation
**Type**: enhancement (foundation)
**Complexity**: SMALL
**Estimated Lines**: ~250 hand-written across 4 source files + ~20 lines of infra changes (jest config, tsconfig, package.json)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [x] `placeholderGuard.checkPlaceholders(source, candidate, key)` throws (or returns a structured error — see D1) when any `{{name}}` from the source is absent from the candidate, when the candidate adds a placeholder not in the source, or when a placeholder appears more than once in the candidate. Passes silently when sets match exactly.
- [x] `responseParser.parseAndValidate(raw, expectedKeys)` returns a typed `Record<string, string>` when `raw` is a valid JSON object whose keys exactly match `expectedKeys` and all values are non-empty strings. Returns a structured error (not throws) for wrong type, missing key, extra key, non-string value, empty string value, and non-JSON input.
- [x] Both modules are pure — importing them has no I/O side effects; the test suite runs with no network, filesystem, or LLM calls.
- [x] `bun run type-check` passes (covers scripts via `tsconfig.scripts.json` + new `tsconfig.scripts-test.json`).
- [x] `bun run test` picks up and passes all tests in `scripts/i18n/__tests__/`.

## Dependencies

| Issue | Title                                                             | Status                | Type |
| ----- | ----------------------------------------------------------------- | --------------------- | ---- |
| #155  | i18n sync: jsonTreeUtils — pure tree ops for gap-only translation | Open (not yet landed) | Soft |

**Status**: No hard blockers. Issue #155 (jsonTreeUtils) is independent and can land in any order; neither module imports from jsonTreeUtils and neither is imported by jsonTreeUtils. The two issues are peers in the PR sequence (see i18n-llm-sync.md PR table rows #1 and #2).

## Objective

Ship the two hard-fail validation layers that sit between the raw LLM response and anything writing to `de/*.json`. Both are pure TypeScript functions — no I/O, no LLM calls — so they are independently testable and reviewable. This is key invariant #2 from the i18n-llm-sync plan: "Placeholder guard hard-fails. Wrong-shape LLM output aborts the batch, no silent ship."

## Decisions

| ID  | Decision                                                                                                                                              | Alternatives Considered                           | Rationale                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `placeholderGuard` returns a discriminated union `{ ok: true } \| { ok: false; error: PlaceholderError }` rather than throwing                        | Throw `Error` directly                            | Returning a typed result keeps the caller in control of error surfacing strategy (throw, log, accumulate). Matches `responseParser`'s return shape. The discriminated union is also easier to assert in tests without wrapping in `expect(() => ...).toThrow()`. |
| D2  | `responseParser.parseAndValidate` also returns a discriminated union `{ ok: true; data: Record<string, string> } \| { ok: false; error: ParseError }` | Throw ZodError                                    | Consistent with D1. `translator.ts` (PR #5) will orchestrate both guards; a single result type across both validators makes the orchestration uniform.                                                                                                           |
| D3  | Zod added as a direct dep in `apps/native-rd/package.json`                                                                                            | Rely on transitive hoisting from `@expo/cli`      | Transitive deps are not guaranteed to resolve in Bun workspaces and should never be imported directly. `zod@^3` is already in the workspace lock at `3.25.76` so no new network fetch.                                                                           |
| D4  | Script tests live in `scripts/i18n/__tests__/` with `jest.config.js` extended to also match that path                                                 | Put tests under `src/__tests__/scripts/`          | Keeps test files co-located with the source they test. The `src/__tests__/` path would be misleading for non-React-Native code with no native dependencies.                                                                                                      |
| D5  | Add `tsconfig.scripts-test.json` with `types: ["jest"]` covering `scripts/**/*.ts`                                                                    | Extend `tsconfig.test.json` to include `scripts/` | `tsconfig.scripts.json` uses `types: ["bun"]` (for `import.meta`); test files need `types: ["jest"]`. A dedicated tsconfig is the clean separation. The `type-check` script already checks three tsconfigs; adding a fourth is consistent.                       |
| D6  | Placeholder regex: `/\{\{([^}]+)\}\}/g`                                                                                                               | ICU, named capture with nesting                   | Issue explicitly scopes to mustache-style i18next interpolation only (`{{name}}`). No ICU, no nested. Keeping the regex minimal avoids over-engineering before translator.ts is written.                                                                         |
| D7  | `PlaceholderError` and `ParseError` carry structured fields (`key`, `expected`, `actual`, `reason`) rather than a message string alone                | Plain message string                              | The plan calls for "enough context (key, expected set, actual set) to debug". Structured fields let the orchestrator format the error message in the style that suits the CLI vs. test output.                                                                   |

## Affected Areas

- `apps/native-rd/package.json`: add `"zod": "^3"` to `dependencies`
- `apps/native-rd/jest.config.js`: extend `testMatch` to also cover `scripts/**/__tests__/**/*.test.ts`
- `apps/native-rd/tsconfig.scripts-test.json`: new file — `types: ["jest"]`, includes `scripts/**/*.ts`, extends base tsconfig
- `apps/native-rd/scripts/i18n/tsconfig.json`: (if preferred) — alternatively handled by `tsconfig.scripts-test.json` at the app root
- `apps/native-rd/scripts/i18n/placeholderGuard.ts`: new module
- `apps/native-rd/scripts/i18n/__tests__/placeholderGuard.test.ts`: new test file
- `apps/native-rd/scripts/i18n/responseParser.ts`: new module
- `apps/native-rd/scripts/i18n/__tests__/responseParser.test.ts`: new test file
- `apps/native-rd/scripts/package-lock.json` / `bun.lock`: no change expected (zod already in workspace lock)

## Implementation Plan

### Step 1: Infra — Zod dep + test harness for scripts

**Files**:

- `apps/native-rd/package.json`
- `apps/native-rd/jest.config.js`
- `apps/native-rd/tsconfig.scripts-test.json`

**Commit**: `chore(native-rd): wire Zod dep + script test harness`

**Changes**:

- [x] Add `"zod": "^3"` to `dependencies` in `apps/native-rd/package.json` (no install needed — already in workspace lock at `3.25.76`)
- [x] Extend `testMatch` in `jest.config.js` from `["**/src/**/__tests__/**/*.test.{ts,tsx}"]` to `["**/src/**/__tests__/**/*.test.{ts,tsx}", "**/scripts/**/__tests__/**/*.test.ts"]`
- [x] Create `apps/native-rd/tsconfig.scripts-test.json`:
  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "types": ["jest"]
    },
    "include": ["scripts/**/*.ts"],
    "exclude": []
  }
  ```
- [x] Update `type-check` script in `package.json` to also run `tsc --noEmit -p tsconfig.scripts-test.json` (alongside existing three tsconfig checks)

**Note**: This step has no test output on its own — it only unlocks Steps 2 and 3. It is a single atomic commit because the three changes are a single coherent "wire-up" concern.

---

### Step 2: `placeholderGuard.ts` + tests

**Files**:

- `apps/native-rd/scripts/i18n/placeholderGuard.ts`
- `apps/native-rd/scripts/i18n/__tests__/placeholderGuard.test.ts`

**Commit**: `feat(native-rd/i18n): placeholderGuard — hard-fail {{}} placeholder validation`

**Changes**:

- [x] Define `PlaceholderError` type with fields: `key: string`, `missing: string[]`, `extra: string[]`, `duplicates: string[]` (where `missing` = in source but not candidate, `extra` = in candidate but not source, `duplicates` = appear >1× in candidate)
- [x] Implement `extractPlaceholders(str: string): string[]` — pure regex scan using `/\{\{([^}]+)\}\}/g`, returns array preserving duplicates (so the caller can detect them)
- [x] Implement `checkPlaceholders(source: string, candidate: string, key: string): { ok: true } | { ok: false; error: PlaceholderError }`:
  - Extract both sets
  - Detect `missing` (in source set, not in candidate set)
  - Detect `extra` (in candidate set, not in source set)
  - Detect `duplicates` (candidate array has same placeholder >1×)
  - Return `{ ok: true }` iff all three arrays are empty
- [x] Export `checkPlaceholders`, `PlaceholderError`, `extractPlaceholders`
- [x] Test cases (use `test.each` for the mismatch variants):
  - [x] Matching placeholders → ok
  - [x] Source has `{{name}}`, candidate omits it → error with `missing: ["name"]`
  - [x] Candidate adds `{{extra}}` not in source → error with `extra: ["extra"]`
  - [x] Candidate renames `{{name}}` → `{{nom}}` → error with both `missing` and `extra`
  - [x] Candidate duplicates `{{name}}` twice → error with `duplicates: ["name"]`
  - [x] Empty source + empty candidate (no placeholders) → ok
  - [x] Source has no placeholders, candidate has none → ok
  - [x] Source has no placeholders, candidate adds one → error with `extra`
  - [x] Multiple placeholders in source, all present exactly once in candidate → ok

---

### Step 3: `responseParser.ts` + tests

**Files**:

- `apps/native-rd/scripts/i18n/responseParser.ts`
- `apps/native-rd/scripts/i18n/__tests__/responseParser.test.ts`

**Commit**: `feat(native-rd/i18n): responseParser — Zod-validated LLM response parser`

**Changes**:

- [x] Define `ParseError` type with fields: `reason: string`, `detail?: string` (human-readable, structured enough to surface the exact violation)
- [x] Define Zod schema `llmResponseSchema` as `z.record(z.string().min(1))` — a record where all values are non-empty strings
- [x] Implement `parseAndValidate(raw: unknown, expectedKeys: string[]): { ok: true; data: Record<string, string> } | { ok: false; error: ParseError }`:
  - If `raw` is a string, attempt `JSON.parse` — on throw, return `{ ok: false, error: { reason: "malformed-json", detail: ... } }`
  - Parse through `llmResponseSchema.safeParse` — on failure, return `{ ok: false, error: { reason: "schema-mismatch", detail: ... } }`
  - Compute `actualKeys = Object.keys(data)`, compare with `expectedKeys`:
    - Missing keys (in expected but not actual) → `{ ok: false, error: { reason: "missing-keys", detail: ... } }`
    - Extra keys (in actual but not expected) → `{ ok: false, error: { reason: "extra-keys", detail: ... } }`
  - Return `{ ok: true, data }` only when schema + key set both pass
- [x] Export `parseAndValidate`, `ParseError`, `llmResponseSchema`
- [x] Test cases (use `test.each` for error variants):
  - [x] Valid response matching `expectedKeys` → ok with typed dict
  - [x] Response with extra key not in `expectedKeys` → error `reason: "extra-keys"`
  - [x] Response missing a key from `expectedKeys` → error `reason: "missing-keys"`
  - [x] Response with a non-string value (e.g. `{ k0: 42 }`) → error `reason: "schema-mismatch"`
  - [x] Response with an empty string value (`{ k0: "" }`) → error `reason: "schema-mismatch"`
  - [x] Malformed JSON string → error `reason: "malformed-json"`
  - [x] `raw` is a plain object (not string, already parsed) — `parseAndValidate` handles both pre-parsed and raw string inputs
  - [x] `raw` is `null` → error
  - [x] `raw` is an array → error
  - [x] `expectedKeys` is `[]` and response is `{}` → ok (empty-translation edge case)

## Testing Strategy

- [x] Jest 30, no React Native environment needed — script tests run in the default Node environment (no `testEnvironment` override needed since they never touch RN globals)
- [x] Test files at `scripts/i18n/__tests__/placeholderGuard.test.ts` and `scripts/i18n/__tests__/responseParser.test.ts`
- [x] Use `test.each` for the mismatch/error-reason variant tables in both files
- [x] No mocks needed — both modules are pure functions with no I/O
- [x] Manual smoke: after writing files, run `bun test --testPathPatterns scripts/i18n` to confirm Jest picks them up and passes

## Not in Scope

| Item                                                              | Reason                                                                    | Follow-up                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------- |
| Placeholder repair / fuzzy matching                               | Issue explicitly: "they validate, they don't repair"                      | None — by design              |
| ICU/plural syntax validation                                      | Issue scopes to mustache-style `{{name}}` only                            | Could extend in a future pass |
| Integration with `translator.ts`                                  | That is PR #5; these modules are consumed by it, not the other way around | #160                          |
| `checkPlaceholders` operating on full translation trees (batches) | That orchestration belongs in `translator.ts`                             | #160                          |
| Zod type inference re-export for downstream consumers             | Not needed yet; `Record<string, string>` is sufficient for PR #5          | None                          |

## Discovery Log

- [2026-05-24] Tsconfig split: `tsconfig.scripts-test.json` `include` was narrowed from `scripts/**/*.ts` to `scripts/**/__tests__/**/*.ts`. The broader glob caused TS to type-check non-test scripts (e.g. `verify-badge.ts`) under jest-only types, which broke them since they rely on bun globals (`process`). Imports from test files transitively type-check the modules they consume, so scoping the include to tests is sufficient.
- [2026-05-24] Step 1 commit moved the tsconfig-scripts-test wire-up out and into Step 2. Reason: an empty `__tests__` include yields TS18003 ("No inputs were found"), which would fail Step 1's atomic type-check gate. Step 2 creates the first test file and the tsconfig together, so the gate passes from commit #2 onward.

---

## Research Notes

**k0/k1 format origin**: Defined in issue #155 (`translatableSubtree`). The anonymised dict maps real key paths to positional `k0`, `k1`, ... `kN` keys before the batch is sent to the LLM. `responseParser` validates the LLM's response against the expected `kN` keys using `expectedKeys: string[]` — the caller (translator.ts) will compute and pass those keys.

**Zod availability**: `zod@3.25.76` is already in the workspace `bun.lock` as a transitive dep of `@expo/cli`. Adding it as a direct dep in `apps/native-rd/package.json` requires no new install — the lock file already resolves it.

**Jest `testMatch` constraint**: The current `testMatch` only covers `**/src/**/__tests__/**`. Script tests need an additional glob. The babel transform pipeline (`babel-jest` + `babel-preset-expo`) already handles plain TypeScript, so no new transform config is needed — only the `testMatch` extension and a jest-typed tsconfig for type-checking.

**`tsconfig.scripts.json` uses `types: ["bun"]`**: Test files in `scripts/` need `types: ["jest"]` (for `describe`, `test`, `expect`). Adding a `tsconfig.scripts-test.json` alongside the existing `tsconfig.scripts.json` is the clean solution — analogous to how `tsconfig.test.json` exists alongside the base `tsconfig.json`.
