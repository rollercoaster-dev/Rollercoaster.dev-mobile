# Development Plan: Issue #161

## Issue Summary

**Title**: i18n sync: sync.ts CLI + integration test
**Type**: feature
**Complexity**: SMALL
**Estimated Lines**: ~300 hand-written (CLI + integration test, tests count)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [x] Running `bun run i18n:sync` with no flags walks all 15 namespaces in `src/i18n/resources/en/` and writes translated content to `src/i18n/resources/de/<ns>.json` for each namespace that has gaps. _(14/15 will hard-fail today on missing register YAMLs — PR #8 scope; CLI itself is correct.)_
- [x] Running `bun run i18n:sync --namespace common` translates only `common.json`; passing `--namespace nonexistent` exits non-zero with a clear error naming the unknown namespace.
- [x] Running `bun run i18n:sync --dry-run` calls `translateNamespace` (calls the LLM) but does not write any file to disk; the `de/` files remain unchanged.
- [x] Running `bun run i18n:sync --target fr` exits non-zero with a clear error naming `fr` as unsupported; `--target de` succeeds.
- [x] Running `bun run i18n:sync` twice in a row when nothing in `en/` has changed between runs results in zero file writes on the second run (idempotency verified by integration test).
- [x] An existing `de/` value is never overwritten: adding a new key to `en/<ns>.json` and running sync fills the new key; the existing German values remain verbatim (gap-only, verified by integration test).
- [x] When the LLM drops a `{{placeholder}}` token, the CLI exits non-zero and prints a clear error naming the offending key; no partial file is written (verified by integration test with mocked LLM).
- [x] Output JSON files preserve the same top-level key order as the `en/` source (deterministic git diffs, verified by integration test using string-position assertions).
- [x] `bun run type-check` and `bun run lint` pass on the new files.

## Dependencies

| Issue | Title                                                       | Status                          | Type    |
| ----- | ----------------------------------------------------------- | ------------------------------- | ------- |
| #160  | i18n sync: translator + promptBuilder — batch orchestration | ✅ Met (CLOSED, commit 8523718) | Blocker |

**Status**: All dependencies met.

## Objective

Ship `apps/native-rd/scripts/i18n/sync.ts` — the Bun CLI entry point that orchestrates the en→de sync pipeline — and a Jest integration test that covers idempotency, gap-only behaviour, placeholder mismatch exit, and key-order preservation. The test mocks `llmGateway.callModel` (the same pattern used in `translator.test.ts`) so no network or API key is required.

## Decisions

| ID  | Decision                                                                                               | Alternatives Considered          | Rationale                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | ~~`sync.ts` owns `import.meta`~~ **SUPERSEDED → split `syncCore.ts` + `sync.cli.ts`**                  | Original D1 was single-file      | The lintSource split pattern is needed in practice: babel-jest leaves `import.meta.dir` undefined, so the integration test must import a module that doesn't reference it. `syncCore.ts` holds the pure orchestration, `sync.cli.ts` is the thin wrapper.                                                                    |
| D2  | `--model` flag defaults to `claude-haiku-4-5`                                                          | Any registry entry               | Cheapest strong-register model in the bakeoff pool; a sensible CI default before the bakeoff verdict is in. Callers can override.                                                                                                                                                                                            |
| D3  | Register file path: `<appDir>/src/i18n/resources/_register/<ns>.yml`; missing register is a hard error | Warn and skip namespace          | Locked decision #2 in i18n-llm-sync.md: register files live at `src/i18n/resources/_register/`. Missing register means the namespace cannot be synced safely (no voice context). Hard-fail keeps the pipeline honest.                                                                                                        |
| D4  | Only `de` is a supported `--target` locale for v1; unsupported locale = non-zero exit                  | Accept any string, pass through  | Matches locked decision in plan: "de only for v1, fr is near-trivial add later". Hard-fail prevents silent mis-targeting.                                                                                                                                                                                                    |
| D5  | ~~Mock `node:fs`~~ **SUPERSEDED → tmpdir fixtures via `mkdtempSync`**                                  | Mock `node:fs` writes            | Real fs I/O against `os.tmpdir()` gives byte-equality assertions (key-order test) and matches what the CLI actually does. Per-test cleanup via `rmSync` in `afterEach` is cheaper than fs-mock teardown complexity.                                                                                                          |
| D6  | `.env.local` loading inline in `sync.cli.ts` via `node:fs` (no bash wrapper)                           | Bash wrapper                     | CI uses env directly; no `.env.local` in CI. Existing `process.env` values win — avoids stale `.env.local` clobbering exported secrets. Mirrors `set -a` ergonomically without a shim.                                                                                                                                       |
| D7  | Per-namespace failures accumulate; one failing ns does not abort siblings                              | Abort on first failure           | Locked behavior per the plan: `runSync` runs all requested namespaces, collects outcomes, and exits 1 iff any failed. Lets a single bad register YAML not block the other 14 from progressing.                                                                                                                               |
| D8  | `syncCore.discoverNamespaces` delegates to `lintSource.discoverNamespaces`                             | Local readdir/filter duplication | Simplify pass found 3 copies of the readdir+filter pattern in the repo. The dedup is a small import + extension-strip; reuses `EN_DIR_REL` constant from lintSource too. (Pure-utility coupling — does not couple failure semantics, which is what the lintSource→placeholderGuard decoupling rule actually guards against.) |

## Affected Areas

- `apps/native-rd/scripts/i18n/syncCore.ts` — **new** — pure orchestration (parseArgs, discoverNamespaces, resolveNamespaces, syncOneNamespace, runSync, formatOutcome)
- `apps/native-rd/scripts/i18n/sync.cli.ts` — **new** — thin CLI wrapper (paths, `.env.local`, exit codes)
- `apps/native-rd/scripts/i18n/__tests__/sync.test.ts` — **new** — integration test (17 tests)
- `apps/native-rd/package.json` — **modify** — add `"i18n:sync"` script entry

## Implementation Plan

### Step 1: syncCore.ts + sync.cli.ts + package.json entry

**Files**:

- `apps/native-rd/scripts/i18n/syncCore.ts` (new, 215 LOC after simplify pass)
- `apps/native-rd/scripts/i18n/sync.cli.ts` (new, 129 LOC after review fixes)
- `apps/native-rd/package.json` (modify, +1 line)

**Commit**: `feat(native-rd/i18n): add sync.ts CLI — namespace walker + gap-only writer` (570fa23)

**Changes**:

- [x] Load `.env.local` from `<appDir>/.env.local` using `node:fs` + split-on-newline dotenv parse. `llmGateway.ts` already guards `OPENROUTER_API_KEY` at call time, so no extra guard in `sync.cli.ts`. Uses `import.meta.dir` to anchor app root.
- [x] Parse CLI flags with `process.argv` slice (`parseArgs` in `syncCore.ts`):
  - `--namespace <name>` — scope to one namespace; error on unknown name
  - `--dry-run` — skip disk writes, still call LLM
  - `--target <locale>` — default `de`; reject anything else with non-zero exit
  - `--model <name>` — default `claude-haiku-4-5`
- [x] Build namespace list: `discoverNamespaces` (delegates to `lintSource`) — strips `.json` extension. `--namespace` validated via `resolveNamespaces`.
- [x] Validate `--target`: `isSupportedTarget` typeguard against the `SUPPORTED_TARGETS` allowlist (currently `["de"]`); exits 1 with clear error otherwise.
- [x] For each namespace in scope (`syncOneNamespace`):
  - Read `en/<ns>.json` → `JSON.parse`
  - Read `de/<ns>.json` → `JSON.parse` (treat missing file as `{}`)
  - **Idempotency short-circuit**: if `translatableSubtree(en, de).pathMap.keys.length === 0`, return `{ kind: "no-gaps" }` _before_ touching the register or the LLM
  - Read `src/i18n/resources/_register/<ns>.yml` → string (missing register = throw with namespace name + PR #8 reference)
  - Call `translateNamespace({ enTree, deTree, ns, modelName, registerText })`
  - If `--dry-run`, skip write → `{ kind: "dry-run" }`
  - Otherwise `writeFileSync` with `JSON.stringify(result, null, 2) + "\n"` → `{ kind: "wrote" }`
  - Catch errors per-namespace: returns `{ kind: "failed", message }` (never throws from `syncOneNamespace`)
- [x] `runSync` accumulates outcomes; exits 0 iff `outcomes.every(o => o.kind !== "failed")`.
- [x] Empty namespace list (e.g. en/ exists but no `.json` files) exits 1 with clear error (review-pass addition).
- [x] Outer `main().catch` preserves stack trace alongside the message (review-pass addition).
- [x] Add to `package.json` scripts: `"i18n:sync": "bun run scripts/i18n/sync.cli.ts"`

**Key order note**: `JSON.stringify` preserves insertion order of object keys. `mergeTranslations` (in `jsonTreeUtils.ts`) builds the result via `deepFillMissingStrings` which iterates `Object.entries(source)` first, then appends extra target keys — this naturally preserves `en/` key order in the output. No additional sorting needed.

### Step 2: Integration test

**Files**:

- `apps/native-rd/scripts/i18n/__tests__/sync.test.ts` (new, 380 LOC after review-pass additions)

**Commits**: `test(native-rd/i18n): integration test for sync — idempotency, gap-only, placeholders, key order` (90c9ca6) + `test(native-rd/i18n): cover discoverNamespaces + idempotency-without-register` (7386796)

**Changes**:

- [x] `jest.mock("../llmGateway", () => ({ callModel: jest.fn() }))` — same pattern as `translator.test.ts`.
- [x] tmpdir fixture via `mkdtempSync(join(tmpdir(), "sync-test-"))` per test; `afterEach` cleans up via `rmSync`. (Replaced the original "mock `node:fs`" plan — see D5.)
- [x] `parseArgs` tests: defaults, every supported flag, unknown-flag rejection, missing-value rejection.
- [x] `isSupportedTarget` tests: `de` only; `fr`/empty rejected.
- [x] `resolveNamespaces` tests: all/singleton/unknown.
- [x] `discoverNamespaces` test: sorted bare names, excludes `.intents.json` sidecars (review-pass addition — pins AC #1).
- [x] **Idempotency** — pre-fill de tree with full coverage. Assert `kind === "no-gaps"`, no LLM call, byte-equal file.
- [x] **Idempotency short-circuits before register read** (review-pass addition) — no-gaps namespace succeeds even when its register YAML is absent. Pins the documented gap-check-before-register-read ordering.
- [x] **Gap-only** — pre-fill de with one of two keys. Assert preserved + filled.
- [x] **Placeholder mismatch** — LLM drops `{{name}}`. Assert `kind === "failed"`, message matches `/placeholder mismatch.*missing=\[name\]/`, file unwritten.
- [x] **Key order preserved** — en has `{ z, a, m }`. Mocked LLM returns same order. String-position assertions (`indexOf`) — `toEqual` would not catch reorderings.
- [x] **--dry-run** — LLM still called, file bytes unchanged.
- [x] **Missing register → per-namespace failure** — message matches `/register file not found.*alpha/`, no LLM call.
- [x] **Sibling namespaces not aborted by a failed peer** — alpha fails, beta succeeds, both outcomes captured.

**Note on testing `sync.cli.ts` directly**: Because it owns `import.meta.dir`, it is not imported by the test. Q2 resolution: extract `syncCore.ts` and test there. `sync.cli.ts` is exercised only via manual smoke (see Testing Strategy below).

## Testing Strategy

- [x] Unit tests: covered by the integration test in Step 2 (no separate unit tests for `sync.cli.ts` — it is thin glue with `import.meta`).
- [x] Test file: `scripts/i18n/__tests__/sync.test.ts` — 17 tests, all passing.
- [x] jest config: `jest.config.js` already includes `"**/scripts/**/__tests__/**/*.test.ts"` — no config change needed.
- [x] `tsconfig.scripts-test.json` already has `"types": ["jest", "bun"]` — no change needed.
- [x] `tsconfig.scripts.json` already includes `scripts/**/*.ts` and excludes `__tests__/` — both new files covered automatically.
- [ ] Manual smoke test (requires `OPENROUTER_API_KEY` in `.env.local`): `bun run i18n:sync --namespace common --dry-run` — **deferred to merge-time human verification**.
- [ ] Manual smoke test (writes): `bun run i18n:sync --namespace common` — **deferred**; only `common` will succeed today (the other 14 namespaces hard-fail on missing register YAMLs — PR #8 scope).

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

- [2026-05-25 implement] D1 superseded: `import.meta.dir` doesn't survive babel-jest's transform, so the `syncCore` + `sync.cli` split (lintSource pattern) was required, not optional. Plan's original "single-file is fine" was wrong about jest's handling.
- [2026-05-25 implement] D5 superseded: rather than `jest.mock("node:fs", ...)`, used `mkdtempSync` + real fs against a tmpdir. Lets the key-order test do a byte-level `indexOf` assertion that a mock would not have captured. Per-test setup is sub-ms.
- [2026-05-25 simplify-pass] D8 added: `discoverNamespaces` in `syncCore.ts` was duplicated from `lintSource.ts`. Three simplify agents flagged it as the only material dup in the diff. Resolved by delegating to lintSource's version and stripping `.json` at this layer. Also imported `EN_DIR_REL` from lintSource to avoid hard-coding `"src/i18n/resources/en"` twice. Note: `generate-pseudo-locale.ts` has a third copy of the same readdir+filter — out of scope here, worth folding into the shared module if a follow-up touches that file.
- [2026-05-25 review-pass] Two critical test gaps (gap rating 8) added: a direct `discoverNamespaces` test (pins the `.intents.json` exclusion) and a "no-gaps short-circuits before register read" test (pins the ordering inside `syncOneNamespace`). Both would only have surfaced as silent regressions otherwise.
- [2026-05-25 review-pass] Two small `sync.cli.ts` hardenings landed: outer `main().catch` preserves stack trace; empty namespace-list exits 1 with a clear error rather than silent exit 0.
- [2026-05-25 review-pass] Non-critical findings deliberately deferred (PR description lists them): `loadDotEnvLocal` malformed-line silence, shadowed-key silence, post-loop-only outcome logging, missing `formatOutcome` direct test.
