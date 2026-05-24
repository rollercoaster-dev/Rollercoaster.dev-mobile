# Development Plan: Issue #157

## Issue Summary

**Title**: i18n sync: models registry + Vercel AI SDK + OpenRouter wrapper + ADR (gateway)
**Type**: enhancement (foundation)
**Complexity**: SMALL
**Estimated Lines**: ~250 hand-written across 3 code files (~190 LOC) + ADR markdown (~60 lines, called out separately)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] `models.ts` exports a typed registry containing at minimum the 8 candidate models from the plan doc bake-off table. Each entry is reachable by a string name without touching a raw OpenRouter model-ID string in downstream code.
- [ ] Every registry entry has `temperature: 0.0` as its effective default (invariant #6). A per-model override field exists and is accepted by the type system, but is never set on any of the 8 base entries unless the entry is explicitly annotated as an override opt-in.
- [ ] The wrapper function rejects with a clear, synchronous error (thrown before any network call) when `OPENROUTER_API_KEY` is absent from `process.env`.
- [ ] The wrapper function accepts a registry entry **name** (string key), not a raw model-ID string. Passing an unknown name produces a typed error, not a silent no-op.
- [ ] When the upstream API returns an error response, the wrapper surfaces that error verbatim — it does not swallow, remap, or stringify into a generic message.
- [ ] `ADR-0007-i18n-gateway.md` exists under `apps/native-rd/docs/decisions/`, follows the established format, references the plan doc, and explicitly notes it follows the supersession-not-amendment pattern (ADR-0006).
- [ ] `bun run type-check` passes (covers scripts via `tsconfig.scripts.json` + `tsconfig.scripts-test.json`).
- [ ] `bun run lint` passes with no new suppressions.
- [ ] `bun run test` picks up and passes all new tests in `scripts/i18n/__tests__/models.test.ts`.

## Dependencies

| Issue | Title                                        | Status        | Type |
| ----- | -------------------------------------------- | ------------- | ---- |
| #155  | i18n sync: jsonTreeUtils                     | Merged (#164) | Soft |
| #156  | i18n sync: placeholderGuard + responseParser | Merged (#165) | Soft |

**Status**: No blockers. Issue #157 is labeled `dep:independent` — can start immediately. The merged PRs for #155 and #156 established the `scripts/i18n/__tests__/` harness, tsconfig split, and jest `testMatch` extension that this PR inherits without modification.

## Objective

Ship the model registry, the OpenRouter/Vercel AI SDK wrapper, and the ADR that formalises the gateway decision. This is PR #3 in the i18n-llm-sync plan sequence. It makes `translator.ts` (PR #5) possible — that module will import `callModel` and `MODELS` from this PR's files.

## Decisions

Architectural and implementation choices made during research. Populated when the researcher encounters multiple valid approaches.

| ID  | Decision                                                                                                                                                             | Alternatives Considered                                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Registry is a plain `Record<string, ModelEntry>` object exported as `MODELS`, with a typed lookup helper `getModel(name)` that throws on unknown name                | Exported named consts per model (e.g. `export const GPT4O_MINI = ...`), or a `Map<>`          | String-keyed lookup is the cheapest swap surface: `translator.ts` passes a name, config files pass a name, promptfoo configs pass a name. Named consts require an import change per model swap. `Map<>` adds no benefit over a plain object here.                                                                                                          |
| D2  | New devDependencies `ai` (Vercel AI SDK core) + `@ai-sdk/openai` (the OpenRouter-compatible provider) added to `apps/native-rd/package.json` under `devDependencies` | `dependencies`, or `@openrouter/ai-sdk-provider` instead of `@ai-sdk/openai`                  | The sync script is a dev-time CLI, never bundled into the app. `devDependencies` keeps the production bundle clean. `@ai-sdk/openai` works against OpenRouter's OpenAI-compatible endpoint and is the recommended integration path in Vercel AI SDK docs; `@openrouter/ai-sdk-provider` (`v2.9.0`) is a community package with less update cadence.        |
| D3  | `callModel` is `async` and returns `Promise<string>` (raw text content of the LLM response)                                                                          | Return a structured object, return the full SDK response object                               | `translator.ts` is the parsing/validation layer — it will pipe the raw string through `responseParser.parseAndValidate`. Returning the full SDK response object couples the wrapper to SDK internals and makes tests heavier.                                                                                                                              |
| D4  | API key fail-fast is a synchronous throw inside `callModel`, before the `await`                                                                                      | Validate at import time (module-level guard), validate via Zod at call time                   | Import-time validation runs even in tests that never call the function and would require test setup. Call-time Zod is overkill for a single env var string check. Synchronous throw at call entry is the minimal, conventional pattern.                                                                                                                    |
| D5  | Upstream API errors surface verbatim — `callModel` does not catch/remap errors from the Vercel AI SDK                                                                | Catch and wrap into a custom error class                                                      | The issue acceptance criterion explicitly requires "surfaces upstream API errors verbatim rather than swallowing." Remapping adds a layer that obscures root cause. `translator.ts` (PR #5) owns retry/circuit-breaker logic.                                                                                                                              |
| D6  | ADR number is **ADR-0007** — next sequential after ADR-0006                                                                                                          | —                                                                                             | `docs/decisions/index.md` lists ADR-0006 as the current highest. ADR-0007 is the next available slot.                                                                                                                                                                                                                                                      |
| D7  | `temperature` default lives on each `ModelEntry` (not as a module constant), and per-entry overrides are allowed via the same field                                  | Module-level `DEFAULT_TEMPERATURE = 0.0` constant, model entries omit it                      | Makes the per-entry default explicit and readable in the registry table. The plan says "per-model overrides allowed but require explicit opt-in" — an override is just setting `temperature` to a non-zero value, which the type allows but reviewers will see in the diff.                                                                                |
| D8  | Registry keys are short human-readable strings (`"gpt-4o-mini"`, `"claude-sonnet-4-6"`), not full OpenRouter paths                                                   | Use the full OpenRouter model ID as the key (`"openai/gpt-4o-mini"`)                          | Decouples the lookup name from the provider path so a model swap to a different provider can keep the same key. Same keys will be referenced from promptfoo bake-off configs. Locked 2026-05-24 (Q2).                                                                                                                                                      |
| D9  | `gpt-oss-120b` registry entry uses model ID `openai/gpt-oss-120b`; OpenRouter handles Groq routing transparently                                                     | Use a Groq-specific model ID                                                                  | OpenRouter routes this through Groq's inference endpoint without any caller-side change. Keeps the registry uniform. Locked 2026-05-24 (Q3).                                                                                                                                                                                                               |
| D10 | `callModel` signature is `(name, systemPrompt, userContent) => Promise<string>` from the start                                                                       | Start with single-prompt `(name, prompt)` and evolve in PR #5                                 | Translator (PR #5) needs system + user split for prompt engineering. Getting the shape right now avoids a breaking change to a foundation file. ~5 LOC cost now vs. a downstream rewrite. Locked 2026-05-24 (Q4).                                                                                                                                          |
| D11 | Wrapper sends **no** OpenRouter attribution headers (`HTTP-Referer`, `X-Title` both omitted)                                                                         | Hardcode `HTTP-Referer: https://rollercoaster.dev` + `X-Title: native-rd-i18n-sync`; or defer | Headers are purely opt-in for OpenRouter's public leaderboard at `openrouter.ai/rankings`. Joe explicitly does not want project name indexed there. Spend separation, if ever needed, is achievable via separate API keys instead. ADR must document this deliberately so a future "best practices" cleanup doesn't add them back. Locked 2026-05-24 (Q5). |

## Affected Areas

- `apps/native-rd/package.json`: add `ai` and `@ai-sdk/openai` to `devDependencies`
- `apps/native-rd/scripts/i18n/models.ts`: new file — typed registry + `getModel` lookup helper (~60 LOC)
- `apps/native-rd/scripts/i18n/llmGateway.ts`: new file — `callModel` wrapper using Vercel AI SDK + OpenRouter (~50 LOC)
- `apps/native-rd/scripts/i18n/__tests__/models.test.ts`: new test file — registry + gateway tests (~80 LOC)
- `apps/native-rd/docs/decisions/ADR-0007-i18n-gateway.md`: new ADR file — gateway choice formalised (~60 lines markdown)
- `apps/native-rd/docs/decisions/index.md`: add ADR-0007 row
- `bun.lock`: lockfile churn from two new devDeps (generated, not counted)

## Pre-flight Checklist

Things to verify in the codebase before the first commit:

- [ ] **Deps not already present**: `grep -r '"ai"\|"@ai-sdk/openai"' apps/native-rd/package.json` should return empty. Confirmed: `package.json` has neither. Neither appears in the workspace lockfile as a direct dep.
- [ ] **Test harness inherited from #156**: `scripts/i18n/__tests__/` exists and contains `placeholderGuard.test.ts` + `responseParser.test.ts`. Jest `testMatch` already covers `**/scripts/**/__tests__/**/*.test.ts`. No jest config changes needed.
- [ ] **TypeScript configs already split**: `tsconfig.scripts.json` (bun types, non-test scripts) and `tsconfig.scripts-test.json` (jest types, `__tests__/` files) both exist. `type-check` script already invokes both. No tsconfig changes needed.
- [ ] **Lint config tolerance for new file**: `expo lint` (ESLint v9 + `eslint-config-expo`) — verify no rule blocks import of `process.env` in `scripts/`. Since existing scripts (`verify-badge.ts`, `release-notes-generate.ts`) already read `process.env`, the lint config is confirmed tolerant.
- [ ] **`@ai-sdk/openai` OpenRouter compatibility**: The Vercel AI SDK `@ai-sdk/openai` package supports a `baseURL` override on the provider constructor, making it compatible with OpenRouter's OpenAI-compatible endpoint (`https://openrouter.ai/api/v1`). This is documented in Vercel AI SDK docs and is the recommended integration pattern (not a workaround).
- [ ] **Wrapper file name**: use `llmGateway.ts` (not `gateway.ts` or `openrouterClient.ts`) to match the plan doc's implied naming (`gateway` appears in the issue title) and remain consistent with the naming convention used by the other modules (`camelCase, noun-focused`).

## Implementation Plan

### Step 1: Add devDependencies

**Files**: `apps/native-rd/package.json`
**Commit**: `chore(native-rd/i18n): add Vercel AI SDK + OpenRouter provider deps`
**LOC**: ~2 lines (two new devDep entries)

**Changes**:

- [ ] Add `"ai": "^6.0.191"` to `devDependencies` in `apps/native-rd/package.json`
- [ ] Add `"@ai-sdk/openai": "^3.0.65"` to `devDependencies`
- [ ] Run `bun install` from repo root to update `bun.lock`
- [ ] Confirm `bun run type-check` still passes (no new types clash)

This commit is atomic on its own — it changes nothing functional, only unlocks the imports in Steps 2 and 3.

---

### Step 2: `models.ts` — typed model registry

**Files**: `apps/native-rd/scripts/i18n/models.ts`
**Commit**: `feat(native-rd/i18n): models registry — typed OpenRouter model entries`
**LOC**: ~60 LOC

**Changes**:

- [ ] Define `ModelEntry` type: `{ modelId: string; temperature: number; maxTokens?: number; note?: string }`. `temperature` is not optional — every entry must declare it explicitly so the registry table is readable and auditable.
- [ ] Define `MODELS` as `Record<string, ModelEntry>` containing all 8 bake-off candidates with `temperature: 0.0`:
  - `"gpt-4o-mini"` → `openai/gpt-4o-mini`
  - `"gpt-4o"` → `openai/gpt-4o`
  - `"gpt-5-mini"` → `openai/gpt-5-mini`
  - `"claude-haiku-4-5"` → `anthropic/claude-haiku-4-5`
  - `"claude-sonnet-4-6"` → `anthropic/claude-sonnet-4-6`
  - `"gemini-2.5-flash"` → `google/gemini-2.5-flash`
  - `"deepseek-chat"` → `deepseek/deepseek-chat`
  - `"gpt-oss-120b"` → `openai/gpt-oss-120b` with `note: "via Groq"`
- [ ] Implement `getModel(name: string): ModelEntry` — looks up in `MODELS`, throws `Error` with clear message if name is unknown (include the unknown name and a list of valid names in the message).
- [ ] Export `MODELS`, `ModelEntry`, `getModel`
- [ ] No I/O, no imports from SDK — this file is pure data + one lookup helper.

---

### Step 3: `llmGateway.ts` + `models.test.ts`

**Files**:

- `apps/native-rd/scripts/i18n/llmGateway.ts`
- `apps/native-rd/scripts/i18n/__tests__/models.test.ts`

**Commit**: `feat(native-rd/i18n): llmGateway + models tests — OpenRouter wrapper via Vercel AI SDK`
**LOC**: ~50 LOC (gateway) + ~80 LOC (tests) = ~130 LOC

The gateway and its tests land in one commit because the tests directly exercise the gateway contract and the two are not independently reviewable.

**Gateway changes**:

- [ ] Import `createOpenAI` from `@ai-sdk/openai` and `generateText` from `ai`
- [ ] Construct the OpenRouter provider once (module scope) pointing at `baseURL: "https://openrouter.ai/api/v1"`; the API key is read from `process.env.OPENROUTER_API_KEY` at construction time
- [ ] Implement `callModel(name: string, systemPrompt: string, userContent: string): Promise<string>` (signature locked per D10 — translator PR #5 needs system + user split):
  - Read `process.env.OPENROUTER_API_KEY` at the top of the function body; if falsy, throw synchronously with a clear message (`"OPENROUTER_API_KEY is not set"`)
  - Call `getModel(name)` to resolve the entry (re-throws on unknown name — propagates verbatim, per D5)
  - Call `generateText({ model: provider(entry.modelId), system: systemPrompt, prompt: userContent, temperature: entry.temperature, maxTokens: entry.maxTokens })` — no try/catch, errors surface verbatim
  - Return `result.text`
- [ ] **No** OpenRouter attribution headers — provider constructor passes only `baseURL` and `apiKey`. Per D11, omit `HTTP-Referer` and `X-Title` entirely.
- [ ] Export `callModel`
- [ ] The provider instance construction is module-level but the API key read is deferred to call time — this keeps the module importable in tests without a real key in the environment

**Test changes** (`scripts/i18n/__tests__/models.test.ts`):

- [ ] **Registry shape tests** (pure, no mocks):
  - [ ] `MODELS` contains all 8 expected entry names
  - [ ] Every entry has `temperature === 0.0`
  - [ ] `getModel("gpt-4o-mini")` returns the correct `modelId`
  - [ ] `getModel("unknown-name")` throws (message contains the unknown name)
  - [ ] `getModel("unknown-name")` error message lists at least one valid key (so the developer can fix the call)
- [ ] **Gateway fail-fast test** (mock `process.env`):
  - [ ] Calling `callModel("gpt-4o-mini", "sys", "user")` with `OPENROUTER_API_KEY` unset throws synchronously before any network call — test asserts the throw without needing to mock the SDK
- [ ] **Gateway upstream-error surfacing test** (mock `generateText`):
  - [ ] Mock `generateText` to throw a simulated upstream error; call `callModel("gpt-4o-mini", "sys", "user")`; assert the original error is not wrapped or remapped (the caught error is the same object or carries the same message)
- [ ] **Gateway passes system + user separately** (mock `generateText`):
  - [ ] Mock `generateText` to capture its arguments; call `callModel("gpt-4o-mini", "you are a translator", "hello")`; assert `generateText` was called with `system: "you are a translator"` and `prompt: "hello"` (not concatenated)
- [ ] Use `test.each` for the registry entry spot-checks (temperature and modelId per entry)
- [ ] No live network calls — the upstream-error test uses `jest.mock("ai", ...)`

---

### Step 4: ADR-0007 + index update

**Files**:

- `apps/native-rd/docs/decisions/ADR-0007-i18n-gateway.md`
- `apps/native-rd/docs/decisions/index.md`

**Commit**: `docs(native-rd): ADR-0007 — i18n gateway choice (OpenRouter + Vercel AI SDK)`
**LOC**: ~60 lines markdown (ADR) + 1 line (index table row)

**Changes**:

- [ ] Create `ADR-0007-i18n-gateway.md` following the established format (matching ADR-0002 through ADR-0006 header structure: **Date**, **Status**, **Owner**, then Context / Decision / Rationale / Consequences sections)
- [ ] ADR content must cover:
  - **Context**: native-rd needs LLM calls for i18n sync; options are per-vendor SDKs, a self-hosted proxy, or a unified gateway
  - **Decision**: OpenRouter as gateway (single API endpoint, ~300 models, pay-per-call), Vercel AI SDK as the TS client (provider-swap is one line, Zod-validated response shape)
  - **Rationale**: model swap requires only changing a string in `models.ts`; no proxy infrastructure to host; pairs naturally with promptfoo for bake-offs; see `docs/plans/i18n-llm-sync.md` for full candidate model list and locked decision rationale
  - **Swap-out path**: if OpenRouter becomes inadequate, swap `createOpenAI` in `llmGateway.ts` to another Vercel AI SDK provider — the registry and wrapper interface are unchanged; no callers need to change
  - **Consequences**: devDep coupling to `ai` + `@ai-sdk/openai` (not in app bundle); pay-per-call cost model; model availability subject to OpenRouter's router; no offline fallback (sync is a CI job, expected to be online); **prompt shape committed to (system, user) split** — translator PR #5 inherits this contract from `callModel`'s 3-arg signature, not a single-blob signature
  - **Attribution headers — deliberately omitted**: the wrapper sends no `HTTP-Referer` or `X-Title` to OpenRouter. This is intentional, not an oversight. Sending those headers opts the project into OpenRouter's public leaderboard at `openrouter.ai/rankings`, which we do not want. If spend separation between callers (i18n sync, future graph-flow/badge-engine uses) ever becomes needed, the path is **mint a second API key**, not add attribution headers. A future contributor reading this ADR should not "fix" the missing headers as a best-practices cleanup.
  - **Supersession note**: explicit statement that changes to this decision require a new ADR per the pattern established in ADR-0006 (2026-05-23), not in-place amendment
- [ ] Add ADR-0007 row to `docs/decisions/index.md`

---

### Step 5: Type-check + lint gate

**Files**: none (verification only — no new changes expected)
**Commit**: none (this is a pre-push gate, not a separate commit)

**Checks**:

- [ ] `bun run type-check` — passes all four tsconfigs
- [ ] `bun run lint` — no new warnings or errors
- [ ] `bun run test` — `models.test.ts` picked up, all assertions green

## Testing Strategy

- [ ] Jest 30, Node environment (no React Native globals needed — `scripts/i18n/__tests__/` inherits from the existing test harness added in #156)
- [ ] Test file at `scripts/i18n/__tests__/models.test.ts` — covers both `models.ts` and `llmGateway.ts`
- [ ] Use `test.each` for the per-entry registry spot-checks (8 models × temperature + modelId = 16 assertions in a table)
- [ ] Gateway fail-fast test: manipulate `process.env.OPENROUTER_API_KEY` in `beforeEach`/`afterEach`, assert synchronous throw
- [ ] Gateway upstream-error test: `jest.mock("ai")` to control `generateText`; assert error propagates without remapping
- [ ] No live network calls in any test
- [ ] Manual smoke after Step 3: `bun test --testPathPatterns scripts/i18n`

## Not in Scope

Items explicitly deferred from this issue.

| Item                                         | Reason                                                                                          | Follow-up               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| Retry / concurrency / batching logic         | Plan explicitly defers to `translator.ts` (PR #5)                                               | #160                    |
| promptfoo config + fixture strings           | That is PR #4 in the sequence                                                                   | Separate issue          |
| `maxTokens` per-model tuning                 | No data yet; defaults to SDK default (none set) for the first pass                              | Post-bake-off           |
| `fr` locale entry in registry                | v1 scope is `de` only; `fr` is a "near-trivial add later" per the plan                          | Post-v1                 |
| Type-safe model name (branded string / enum) | String registry key is sufficient for now; can be tightened if type-safety becomes a pain point | Optional future cleanup |

## Open Questions

All resolved 2026-05-24. See Decisions D6 (Q1), D8 (Q2), D9 (Q3), D10 (Q4), D11 (Q5).

## Discovery Log

Runtime discoveries made during research. Starts empty — populated by the implement skill as work progresses.

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-05-24] **AI SDK v6 renamed `maxTokens` → `maxOutputTokens`.** Plan referenced the older name. Registry field stays `maxTokens` (cross-provider convention) and the gateway maps to `maxOutputTokens` in the `generateText` call. Registry remains SDK-agnostic.
- [2026-05-24] **`tsconfig.scripts-test.json` needed `"bun"` added to types array.** Existing tests didn't reference `process`, so the `["jest"]`-only types worked. New `models.test.ts` manipulates `process.env.OPENROUTER_API_KEY` for the fail-fast test; without `"bun"` in types, `process` was undeclared. Added `"bun"` to mirror the non-test scripts config. Jest still runs under Node at runtime — pure declarative fix.
