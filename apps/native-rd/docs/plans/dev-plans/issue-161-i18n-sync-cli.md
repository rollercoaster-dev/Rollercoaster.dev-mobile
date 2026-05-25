# Development Plan: Issue #161

## Issue Summary

**Title**: i18n sync: sync.ts CLI + integration test
**Type**: feature
**Complexity**: SMALL
**Estimated Lines**: ~300 hand-written (CLI + integration test, tests count)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] Running `bun run i18n:sync` with no flags walks all 15 namespaces in `src/i18n/resources/en/` and writes translated content to `src/i18n/resources/de/<ns>.json` for each namespace that has gaps.
- [ ] Running `bun run i18n:sync --namespace common` translates only `common.json`; passing `--namespace nonexistent` exits non-zero with a clear error naming the unknown namespace.
- [ ] Running `bun run i18n:sync --dry-run` calls `translateNamespace` (calls the LLM) but does not write any file to disk; the `de/` files remain unchanged.
- [ ] Running `bun run i18n:sync --target fr` exits non-zero with a clear error naming `fr` as unsupported; `--target de` succeeds.
- [ ] Running `bun run i18n:sync` twice in a row when nothing in `en/` has changed between runs results in zero file writes on the second run (idempotency verified by integration test).
- [ ] An existing `de/` value is never overwritten: adding a new key to `en/<ns>.json` and running sync fills the new key; the existing German values remain verbatim (gap-only, verified by integration test).
- [ ] When the LLM drops a `{{placeholder}}` token, the CLI exits non-zero and prints a clear error naming the offending key; no partial file is written (verified by integration test with mocked LLM).
- [ ] Output JSON files preserve the same top-level key order as the `en/` source (deterministic git diffs, verified by integration test).
- [ ] `bun run type-check` and `bun run lint` pass on the new files.

## Dependencies

| Issue | Title                                                       | Status                          | Type    |
| ----- | ----------------------------------------------------------- | ------------------------------- | ------- |
| #160  | i18n sync: translator + promptBuilder — batch orchestration | ✅ Met (CLOSED, commit 8523718) | Blocker |

**Status**: All dependencies met.

## Objective

Ship `apps/native-rd/scripts/i18n/sync.ts` — the Bun CLI entry point that orchestrates the en→de sync pipeline — and a Jest integration test that covers idempotency, gap-only behaviour, placeholder mismatch exit, and key-order preservation. The test mocks `llmGateway.callModel` (the same pattern used in `translator.test.ts`) so no network or API key is required.

## Decisions

| ID  | Decision                                                                                                                                                       | Alternatives Considered                                 | Rationale                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `sync.ts` owns `import.meta` (file-system bootstrap, arg parsing, `.env.local` loading); no `.cli.ts` split needed                                             | Split to `sync.cli.ts` + `sync.ts` (lintSource pattern) | The lintSource split exists because lintSource.ts is imported by its own test; sync.ts's logic is thin orchestration glue — the integration test exercises it by mocking `llmGateway` rather than importing `sync.ts` as a pure module. A single-file CLI is fine here. |
| D2  | `--model` flag defaults to `claude-haiku-4-5`                                                                                                                  | Any registry entry                                      | Cheapest strong-register model in the bakeoff pool; a sensible CI default before the bakeoff verdict is in. Callers can override.                                                                                                                                       |
| D3  | Register file path: `<appDir>/src/i18n/resources/_register/<ns>.yml`; missing register is a hard error                                                         | Warn and skip namespace                                 | Locked decision #2 in i18n-llm-sync.md: register files live at `src/i18n/resources/_register/`. Missing register means the namespace cannot be synced safely (no voice context). Hard-fail keeps the pipeline honest.                                                   |
| D4  | Only `de` is a supported `--target` locale for v1; unsupported locale = non-zero exit                                                                          | Accept any string, pass through                         | Matches locked decision in plan: "de only for v1, fr is near-trivial add later". Hard-fail prevents silent mis-targeting.                                                                                                                                               |
| D5  | Integration test: single test file at `scripts/i18n/__tests__/sync.test.ts`; mocks `llmGateway` and `node:fs` write path                                       | Separate fixture files on disk                          | Consistent with `translator.test.ts` pattern (`jest.mock("../llmGateway")`). No disk I/O in test means no temp-dir teardown complexity.                                                                                                                                 |
| D6  | `.env.local` loading via the same `set -a / source` pattern from `run-bakeoff.sh` — handled in a wrapper shell script OR inline `dotenv` at the top of sync.ts | Bash wrapper only                                       | `sync.ts` uses `import.meta` so it already must run under Bun. Inline dotenv (using `bun`'s built-in `Bun.env` + a manual `.env.local` read) keeps it as a pure Bun script entry without a bash shim. See open question Q1.                                             |

## Affected Areas

- `apps/native-rd/scripts/i18n/sync.ts` — **new** — CLI entry point
- `apps/native-rd/scripts/i18n/__tests__/sync.test.ts` — **new** — integration test
- `apps/native-rd/package.json` — **modify** — add `"i18n:sync"` script entry

## Implementation Plan

### Step 1: sync.ts CLI + package.json entry

**Files**:

- `apps/native-rd/scripts/i18n/sync.ts` (new, ~150 LOC)
- `apps/native-rd/package.json` (modify, +1 line)

**Commit**: `feat(native-rd/i18n): add sync.ts CLI — namespace walker + gap-only writer`

**Changes**:

- [ ] Load `.env.local` from `<appDir>/.env.local` using `node:fs` + split-on-newline dotenv parse (same guard as `llmGateway.ts`: throw if `OPENROUTER_API_KEY` absent before any LLM call). Use `import.meta.dir` to anchor the app root (same pattern as `lintSource.cli.ts`).
- [ ] Parse CLI flags with `process.argv` slice (no third-party arg parser — consistent with existing scripts that use manual `process.argv` slicing):
  - `--namespace <name>` — scope to one namespace; error on unknown name
  - `--dry-run` — skip disk writes, still call LLM
  - `--target <locale>` — default `de`; reject anything else with non-zero exit
  - `--model <name>` — default `claude-haiku-4-5`
- [ ] Build namespace list: `readdirSync(<enDir>)` filtering `*.json`, strip `.json` extension → 15 names. If `--namespace` given, validate it is in this list.
- [ ] Validate `--target`: only `"de"` accepted; print `"unsupported locale: <value>. Supported: de"` to stderr and `process.exit(1)`.
- [ ] For each namespace in scope:
  - Read `en/<ns>.json` → `JSON.parse`
  - Read `de/<ns>.json` → `JSON.parse` (treat missing file as `{}`)
  - Read `src/i18n/resources/_register/<ns>.yml` → string (missing register = throw with namespace name)
  - Call `translateNamespace({ enTree, deTree, ns, modelName, registerText })`
  - If `--dry-run`, skip write; otherwise `writeFileSync` with `JSON.stringify(result, null, 2) + "\n"` (preserves key order from `mergeTranslations` which inherits source key order via `deepFillMissingStrings`)
  - Catch errors per-namespace: print `"[sync] namespace <ns>: <message>"` to stderr, set exit code to 1 (accumulate failures — don't abort on first; write completed namespaces before exiting)
- [ ] Exit 0 if all namespaces succeeded; exit 1 if any failed.
- [ ] Add to `package.json` scripts: `"i18n:sync": "bun run scripts/i18n/sync.ts"`

**Key order note**: `JSON.stringify` preserves insertion order of object keys. `mergeTranslations` (in `jsonTreeUtils.ts`) builds the result via `deepFillMissingStrings` which iterates `Object.entries(source)` first, then appends extra target keys — this naturally preserves `en/` key order in the output. No additional sorting needed.

### Step 2: Integration test

**Files**:

- `apps/native-rd/scripts/i18n/__tests__/sync.test.ts` (new, ~150 LOC)

**Commit**: `test(native-rd/i18n): integration test for sync.ts — idempotency, gap-only, placeholder mismatch, key order`

**Changes**:

- [ ] `jest.mock("../llmGateway", () => ({ callModel: jest.fn() }))` — same pattern as `translator.test.ts`
- [ ] `jest.mock("node:fs", ...)` — spy on `writeFileSync` to capture writes without touching disk. Also spy on `readFileSync` to return fixture data.
- [ ] Fixture: a two-namespace mini-tree:
  - `en/alpha.json`: `{ "greet": "Hello", "farewell": "Goodbye {{name}}" }`
  - `en/beta.json`: `{ "save": "Save" }`
  - `de/alpha.json`: `{}` (initially empty)
  - `de/beta.json`: `{}` (initially empty)
  - `_register/alpha.yml` + `_register/beta.yml`: minimal YAML stubs matching `RegisterData` shape
- [ ] Test: **idempotency** — pre-fill `de/alpha.json` with `{ "greet": "Hallo", "farewell": "Auf Wiedersehen {{name}}" }`. Mock `callModel` to throw if called. Run sync on `alpha`. Assert `writeFileSync` not called; `callModel` not called.
- [ ] Test: **gap-only** — pre-fill `de/alpha.json` with `{ "greet": "Hallo" }` (one key present). Mock `callModel` to return `JSON.stringify({ k0: "Auf Wiedersehen {{name}}" })`. Run sync on `alpha`. Assert written output contains `"greet": "Hallo"` (preserved) and `"farewell": "Auf Wiedersehen {{name}}"` (filled).
- [ ] Test: **placeholder mismatch exits non-zero** — pre-fill `de/alpha.json` as `{}`. Mock `callModel` to return `JSON.stringify({ k0: "Hallo", k1: "Auf Wiedersehen" })` (drops `{{name}}`). Run sync on `alpha`. Assert `process.exitCode` is 1 (or `process.exit` was called with 1); assert `writeFileSync` not called for `alpha`.
- [ ] Test: **key order preserved** — `en/beta.json` has keys `{ z: "Z", a: "A", m: "M" }`. Mock `callModel` to return keys in same order (`{ k0: "Z_de", k1: "A_de", k2: "M_de" }`). Assert written JSON string has `z` before `a` before `m`.
- [ ] Test: **`--namespace` unknown name** — call with `--namespace nonexistent`. Assert exits 1 with error message containing "nonexistent".
- [ ] Test: **`--target fr` unsupported** — call with `--target fr`. Assert exits 1 with message containing "unsupported locale".
- [ ] Test: **`--dry-run`** — call with `--dry-run`. Mock `callModel` to return valid translations. Assert `callModel` was called (LLM still invoked), `writeFileSync` never called.

**Note on testing `sync.ts` as a module**: Because `sync.ts` uses `import.meta` (for path anchoring), it cannot be `require()`'d by Jest's Node/babel-jest pipeline directly. The integration test instead imports the sync pipeline's constituent functions (`translateNamespace` from `translator.ts` + the file-walking logic) and tests at that boundary — or invokes `sync.ts` with `spyOn(process, 'exit')` and mocked `fs` to simulate the CLI contract. The exact approach (import-core-logic vs. full-module-invoke) is the open question Q2 below.

## Testing Strategy

- [ ] Unit tests: covered by the integration test in Step 2 (no separate unit tests for sync.ts — it is thin orchestration glue)
- [ ] Test file: `scripts/i18n/__tests__/sync.test.ts` (mirrors scripts path under `__tests__/`)
- [ ] jest config: `jest.config.js` already includes `"**/scripts/**/__tests__/**/*.test.ts"` — no config change needed
- [ ] `tsconfig.scripts-test.json` already has `"types": ["jest", "bun"]` — no change needed
- [ ] `tsconfig.scripts.json` already includes `scripts/**/*.ts` and excludes `__tests__/` — sync.ts covered automatically
- [ ] Manual smoke test (requires `OPENROUTER_API_KEY` in `.env.local`): `bun run i18n:sync --namespace common --dry-run`
- [ ] Manual smoke test (writes): `bun run i18n:sync --namespace welcome`

## Not in Scope

| Item                                                | Reason                                                                                                                                                      | Follow-up                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Register YAMLs for all 15 namespaces                | Only `common.yml` exists today; sync hard-fails on missing register — the remaining 14 must be authored. Authoring voice register content is PR #8's scope. | Issue for PR #8                                      |
| `--target fr` support                               | Locked to `de` only for v1                                                                                                                                  | None (design doc notes fr as near-trivial add later) |
| Concurrent batching (parallel namespace processing) | Locked decision #5 in i18n-llm-sync.md: single-threaded for v1                                                                                              | Post-v1                                              |
| CI workflow invocation (`i18n-sync.yml`)            | PR #9's scope                                                                                                                                               | Issue for PR #9                                      |
| Sidecar intent loader (`en/*.intents.json`)         | PR #8's scope; `translateNamespace` already accepts `intents` param, sync.ts passes `undefined` for now                                                     | Issue for PR #8                                      |
| Glossary loading                                    | PR #8's scope                                                                                                                                               | Issue for PR #8                                      |

## Open Questions — Joe to answer before implementation

**Q1 — `.env.local` loading in sync.ts**

`run-bakeoff.sh` loads `.env.local` via bash `set -a / source`. The `package.json` entry `"i18n:sync": "bun run scripts/i18n/sync.ts"` invokes the script directly under Bun without a bash wrapper. Two options:

- **Option A (inline)**: At the top of `sync.ts`, read `.env.local` manually with `node:fs` + string split, calling `process.env[key] = value` for each line. Bun does not auto-load `.env.local` for `bun run <script.ts>` (it does for `bun run <package-script>` entries that resolve to `bunx` — but we go through the `bun run scripts/i18n/sync.ts` path which is a direct file exec). Needs verification.
- **Option B (wrapper)**: Add `scripts/i18n/run-sync.sh` mirroring `run-bakeoff.sh` (bash loads `.env.local`, execs `bun run scripts/i18n/sync.ts`), and point the package.json entry at the shell wrapper.

Preference? Option A keeps everything in one file and matches how the eventual CI workflow will inject secrets via env (no `.env.local` in CI anyway). Leaning Option A unless Bun's env-load behavior for direct file execs is confirmed otherwise.

**Q2 — Integration test strategy for `sync.ts` given `import.meta`**

`sync.ts` will call `import.meta.dir` to anchor its paths. Jest + babel-jest transforms `import.meta` with `@babel/plugin-transform-modules-commonjs` but stubs `import.meta.dir` as `undefined` unless we add `import-meta-transform` or a babel plugin. Three options:

- **Option A (extract)**: Move the file-walking + per-namespace orchestration logic into `syncCore.ts` (no `import.meta`, pure functions taking absolute paths as args). `sync.ts` is a thin CLI wrapper (just like `lintSource.cli.ts`). `syncCore.ts` is what the test imports. This is the same pattern that already works for `lintSource.ts`.
- **Option B (spawn)**: Test by spawning `bun` as a child process and asserting on stdout/stderr/exit code + file contents. No `import.meta` issue; clean CLI contract test. Slower, requires disk fixtures.
- **Option C (mock import.meta.dir)**: Use a Jest `moduleNameMapper` or manual mock to stub `import.meta.dir`. Fragile.

The lintSource pattern (Option A / extract) is already proven in this codebase and the cleanest for a unit-style integration test. This would mean a `sync.cli.ts` + `syncCore.ts` split instead of a single `sync.ts`. Joe: do you want the cli/core split, or would you prefer Option B (spawn-based) to keep `sync.ts` as a single file?

**Q3 — Missing register YAMLs for 14 of 15 namespaces**

Only `common.yml` exists in `src/i18n/resources/_register/`. Per Decision D3, a missing register is a hard error. This means `bun run i18n:sync` (all 15 namespaces) will fail for 14 of them until those files exist. Three options:

- **Option A**: Stub the 14 missing registers with the same minimal content as `common.yml` in this PR so the CLI is immediately runnable.
- **Option B**: The sync.ts hard-fails on missing register and prints a clear error per namespace; PR #8 authors the real register content. `bun run i18n:sync --namespace common` works immediately; full-sweep is gated on PR #8.
- **Option C**: `--namespace` required if registers are missing; default "all 15" only works after PR #8 lands.

Option A (stub all registers now with placeholder content) makes the CLI immediately runnable for full-sweep smoke tests while making it clear the register content is a stub. Option B is cleaner but means the CLI is only useful for `--namespace common` until PR #8 lands.

## Resolutions (autonomous mode, 2026-05-25)

Open questions resolved before implementation:

- **Q1 → Option A (inline `.env.local`)**: `sync.cli.ts` loads `.env.local` inline via `node:fs` + manual parse. CI injects secrets via env directly; no bash wrapper needed.
- **Q2 → Option A (split: `syncCore.ts` + `sync.cli.ts`)**: Proven pattern in this codebase (`lintSource.ts` / `lintSource.cli.ts`). Overrides D1 — splitting is required to make the integration test importable without `import.meta` transform headaches. `syncCore.ts` exports pure functions taking absolute paths; `sync.cli.ts` is the thin CLI wrapper that owns `import.meta.dir` + arg parsing.
- **Q3 → Option B (hard-fail on missing register)**: Authoring real register YAMLs is PR #8's scope. `bun run i18n:sync --namespace common` works end-to-end now; full-sweep is gated on PR #8. The integration test uses fixture registers so test coverage is unaffected. Each missing register produces a clear per-namespace error before exiting non-zero.

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
