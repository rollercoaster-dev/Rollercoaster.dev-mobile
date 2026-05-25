# Development Plan: Issue #160

## Issue Summary

**Title**: i18n sync: translator + promptBuilder — batch orchestration
**Type**: enhancement
**Complexity**: LARGE
**Estimated Lines**: ~450 hand-written (two modules + two test files). Tests count toward budget.

## Intent Verification

Observable criteria derived from the issue. A reviewer can verify these by running the code or reading tests.

- [ ] `promptBuilder.buildSystemPrompt(register, intents, glossary)` is a pure function that returns a deterministic string given the same inputs. Same inputs in → same string out, no clock/random/I/O.
- [ ] `translator.translateNamespace(enTree, deTree, ns, modelName)` returns a `de/` tree with only missing keys filled; existing `de/` values are untouched. Re-running on a fully-translated tree makes zero LLM calls and returns the same tree.
- [ ] A placeholder mismatch (any single `{{name}}` dropped, added, or renamed in the LLM response) causes `translateNamespace` to throw. The error message identifies the offending anonymous key and the mismatch details.
- [ ] A parse failure (LLM response not valid JSON, wrong key set, non-string values) causes `translateNamespace` to throw. The error message identifies the namespace and the parse-error reason.
- [ ] When `translatableSubtree` returns an empty dict (namespace has no gaps), `translateNamespace` returns the target tree unchanged and makes zero LLM calls.
- [ ] `callModel` is always invoked with `temperature: 0.0` (invariant #6). The test suite verifies this by asserting on mock call args, not just on the returned value.
- [ ] The plan doc's open-decisions table row #2 (register file location) is updated to "Resolved" with the chosen path.
- [ ] `bun run type-check` and `bun run lint` pass with no errors.

## Dependencies

| Issue | Title                                                                   | Status                                 | Type    |
| ----- | ----------------------------------------------------------------------- | -------------------------------------- | ------- |
| #155  | i18n sync: jsonTreeUtils — pure tree ops for gap-only translation       | Closed, merged as PR #164 (2026-05-24) | Blocker |
| #156  | i18n sync: placeholderGuard + responseParser (Zod) hard-fail validation | Closed, merged as PR #165 (2026-05-24) | Blocker |
| #157  | i18n sync: models registry + Vercel AI SDK + OpenRouter wrapper + ADR   | Closed, merged as PR #170 (2026-05-24) | Blocker |

**Status:** All dependencies met. `jsonTreeUtils.ts`, `placeholderGuard.ts`, `responseParser.ts`, `models.ts`, and `llmGateway.ts` are all in the codebase on `main`.

## Objective

Implement the two integration-layer modules that compose the wave-1 primitives into a working per-namespace translation pipeline: `promptBuilder.ts` (pure system-prompt assembly) and `translator.ts` (full pipeline orchestration). Together they form PR #5 in the i18n LLM sync plan — the integration point where every previously independent module is wired together and exercised end-to-end.

## Resolved Decisions (2026-05-25 interactive review)

1. **Register file location** — Option A: `apps/native-rd/src/i18n/resources/_register/<ns>.yml`. Sits next to locale files for author affordance. Sync-tooling YAML in the runtime resource tree is accepted (i18next does not load `.yml`). PR #8 inherits this path.
2. **YAML library** — `js-yaml` + `@types/js-yaml`. Industry default, well-typed, schema is simple (scalars + lists of scalars). Swap-out behind a single `loadRegister()` helper is ~10 LOC if we ever outgrow it.
3. **`promptBuilder` template scope** — skeleton template only in this PR. Lock the **signature** (`PromptBuilderInput` in, `string` out). PR #8 owns final wording. Tests assert presence of sections, not exact wording.
4. **Model-name default** — `translator.ts` is **model-agnostic**. `modelName` is a required parameter, no default. The CLI default (e.g. `gpt-4o-mini`) lives in `sync.ts` (PR #6) where the `--model` flag is also parsed.
5. **`RegisterData` minimum shape** — four required fields per parent plan + one optional escape hatch:
   ```ts
   type RegisterData = {
     speaker: string;
     audience: string;
     formality: string;
     banned_phrasings: string[];
     notes?: string[]; // PR #8 escape hatch for one-off constraints
   };
   ```
   Adding more fields later is non-breaking as long as they're optional.

## Decisions

| ID  | Decision                                                                                                                                                                                                              | Alternatives Considered                                                  | Rationale                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `promptBuilder` takes a pre-loaded register string (YAML text), not a path. Register loading is the caller's responsibility.                                                                                          | Have `promptBuilder` accept a path and do the `readFileSync` internally. | Keeps `promptBuilder.ts` a pure function — no I/O, no file system dependency. Testable with no mocking. Pattern established by `placeholderGuard.ts` and `responseParser.ts`.                                                                                               |
| D2  | `translator.ts` handles register loading and passes string to `promptBuilder`.                                                                                                                                        | Separate `registerLoader.ts` module.                                     | Avoids premature extraction. If loader logic grows (YAML parse errors, caching), extract then. At ~450 LOC budget, every new file costs.                                                                                                                                    |
| D3  | Sequential per-namespace, no concurrency for v1.                                                                                                                                                                      | `Promise.all` across namespaces.                                         | Locked decision #5 in `i18n-llm-sync.md`. Revisit only if sync time exceeds CI budget (PR #9).                                                                                                                                                                              |
| D4  | `promptBuilder` accepts optional `intents` and optional `glossary` (both nullable/undefined).                                                                                                                         | Require all three.                                                       | The issue explicitly calls for "namespace with a register but no intent sidecar" as a test case, confirming optionality is real. 80% of namespaces won't have sidecars.                                                                                                     |
| D5  | Temperature is controlled at the `llmGateway.callModel` layer via the `ModelEntry` registry. `translator.ts` does not pass temperature as a parameter — it relies on the registry entry's `temperature: 0.0` default. | Have `translator.ts` pass temperature explicitly.                        | Invariant #6 says 0.0 is the policy. The registry already enforces this. `translator.ts` asserting a concrete temperature value would duplicate the invariant and create a maintenance surface. The test pins it by asserting on mock call args against the registry value. |

## Bake-off Relationship

The promptfoo bake-off (PR #4, issue #159, merged as part of PRs #171/#175/#176) used a **minimal inline system prompt** — intentionally simple to isolate model voice quality from prompt engineering. The bake-off prompt and `promptBuilder.ts` serve different purposes:

- **Bake-off prompt** (in `promptfooconfig.yaml`): one-line system instruction — exists only in the promptfoo YAML, never imported by `promptBuilder.ts`.
- **`promptBuilder.ts`** (this PR): assembles the full production system prompt from three inputs: per-namespace register YAML, optional per-string intent sidecar, and thin glossary. Richer than the bake-off prompt.
- **Relationship**: `promptBuilder.ts` does not import from or depend on the bake-off config. They are independent. The bake-off's winner recommendation (`gpt-4o-mini` as default, per `eval-note-2026-05-25.md`) informs which model name `translator.ts` will use by default — that's the only connection.

The production system prompt shape (register + intents + glossary) is not yet defined by PR #8 (voice system prompt). This PR creates `promptBuilder.ts` with a reasonable output structure. PR #8 will flesh out the actual register YAML content and may refine the prompt template. The contract between PR #5 and PR #8 is:

1. `promptBuilder` takes `{ register: string, intents?: Record<string, unknown>, glossary?: string }` (or similar typed inputs).
2. It returns a `string` — the assembled system prompt.
3. PR #8 populates register YAMLs and refines the template. The function signature should not need to change.

## Affected Areas

- `apps/native-rd/scripts/i18n/promptBuilder.ts`: new file — pure function, assembles system prompt from register + intents + glossary
- `apps/native-rd/scripts/i18n/translator.ts`: new file — full per-namespace pipeline: gap extraction → prompt assembly → LLM call → parse → placeholder check → merge
- `apps/native-rd/scripts/i18n/__tests__/promptBuilder.test.ts`: new test file
- `apps/native-rd/scripts/i18n/__tests__/translator.test.ts`: new test file
- `apps/native-rd/docs/plans/i18n-llm-sync.md`: update open-decisions table row #2 to resolved

Optional (if extracted, reduces translator.ts line count):

- `apps/native-rd/scripts/i18n/registerLoader.ts`: new file — load + parse register YAML from disk (only if the loading logic is non-trivial enough to warrant extraction)

## Implementation Plan

### Step 1: Resolve register location + create placeholder register stubs

**Files**:

- `apps/native-rd/docs/plans/i18n-llm-sync.md` (update row #2)
- `apps/native-rd/src/i18n/resources/_register/common.yml` (new stub)

**Commit**: `chore(native-rd/i18n): resolve register location, stub _register/common.yml`

**Changes**:

- [ ] Create `apps/native-rd/src/i18n/resources/_register/` with `common.yml` containing the four required fields (empty/minimal values, plus an empty `notes:` list) so `promptBuilder` has a schema to target.
- [ ] Update `i18n-llm-sync.md` open-decisions table row #2: status from "Open" to "Resolved 2026-05-25 — Option A (`apps/native-rd/src/i18n/resources/_register/`)".
- [ ] Update the module layout table in `i18n-llm-sync.md` to replace `<register-dir>/<ns>.yml` with the concrete Option A path.

**Note**: this is not wasted work even if PR #8 later fills in real register content. The stub establishes the YAML schema that `promptBuilder.ts` targets.

---

### Step 2: `promptBuilder.ts`

**Files**: `apps/native-rd/scripts/i18n/promptBuilder.ts`

**Commit**: `feat(native-rd/i18n): promptBuilder — pure system prompt assembly`

**Changes**:

- [ ] Define `RegisterData` type per Resolved Decision #5: four required fields (`speaker`, `audience`, `formality`, `banned_phrasings`) plus optional `notes?: string[]`. No additional speculative fields — PR #8 evolves the type additively if needed.
- [ ] Define `IntentEntry` type: `{ intent: string; audience?: string; register?: string }` — mirrors the sidecar shape from the plan.
- [ ] Define `PromptBuilderInput` type: `{ register: RegisterData; intents?: Record<string, IntentEntry>; glossary?: string }`.
- [ ] Implement `buildSystemPrompt(input: PromptBuilderInput): string` — assembles the system prompt as a **skeleton template** (Resolved Decision #3):
  - Always includes: voice register (speaker/audience/formality/banned_phrasings, plus `notes` if present and non-empty).
  - Conditionally includes: per-string intent overrides (if `intents` provided and non-empty).
  - Conditionally includes: glossary section (if `glossary` provided).
  - Wording is minimal-but-structural — PR #8 owns the polished voice copy. Tests assert section presence/absence, not exact wording.
  - The prompt format is a plain-text block appropriate for use as the `system` parameter in `callModel`. No JSON, no role-wrapping — the system/user split is `callModel`'s concern.
- [ ] No I/O anywhere in this file. No `readFileSync`, no `import.meta`, no Bun APIs. Pure function only.

---

### Step 3: `promptBuilder.test.ts`

**Files**: `apps/native-rd/scripts/i18n/__tests__/promptBuilder.test.ts`

**Commit**: `test(native-rd/i18n): promptBuilder — pure-function test suite`

**Changes**:

- [ ] Happy path: register + no intents + no glossary → produces a non-empty string containing voice register content.
- [ ] Happy path: register + intents + glossary → output contains glossary and intent sections; same inputs → identical output (determinism).
- [ ] Namespace with register but no intent sidecar: `intents` undefined → produces valid prompt without intent section (no exception).
- [ ] Namespace with both register and intent sidecar → output contains both sections.
- [ ] Glossary omitted (undefined) → output does not contain glossary section.
- [ ] Output is a string (not null, not undefined, not empty). Covers the "at minimum does something" contract.
- [ ] No I/O mocking required — purely import the module and call the function.

**Test file location**: `apps/native-rd/scripts/i18n/__tests__/promptBuilder.test.ts`
**No `.cli.ts` split needed**: `promptBuilder.ts` has no `import.meta` — it's pure. No Bun-specific APIs. Jest can import it directly.

---

### Step 4: `translator.ts`

**Files**: `apps/native-rd/scripts/i18n/translator.ts`

**Commit**: `feat(native-rd/i18n): translator — batch pipeline orchestration`

**Changes**:

- [ ] Add `js-yaml` and `@types/js-yaml` to `apps/native-rd/package.json` (Resolved Decision #2). Run `bun install` to update the lockfile.
- [ ] Define `TranslateNamespaceOptions` type: `{ enTree: JsonTree; deTree: unknown; ns: string; modelName: string; registerText: string; intents?: Record<string, IntentEntry>; glossary?: string }`. `modelName` is **required** — `translator.ts` stays model-agnostic per Resolved Decision #4; `sync.ts` (PR #6) owns the default.
- [ ] Implement `translateNamespace(opts: TranslateNamespaceOptions): Promise<FilledJsonTree>`:
  1. Call `translatableSubtree(enTree, deTree)` to get `{ dict, pathMap }`.
  2. If `dict` is empty (no gaps), return `deepFillMissingStrings(enTree, deTree)` immediately — no LLM call.
  3. Parse register text via `js-yaml`'s `load()` — assert the result matches `RegisterData` (cast or validate). Build `PromptBuilderInput`.
  4. Call `buildSystemPrompt(input)` to get the system prompt string.
  5. Serialize `dict` to JSON string as the user content (`JSON.stringify(dict)`).
  6. Call `callModel(modelName, systemPrompt, userContent)` — this inherits `temperature: 0.0` from the registry.
  7. Call `parseAndValidate(rawResponse, pathMap.keys)` — throw on `ok: false` with a message identifying the namespace and parse-error reason.
  8. For each key in `pathMap.keys`, call `checkPlaceholders(dict[key], parsed[key], key)` — throw on `ok: false` with a message identifying the namespace and mismatch details.
  9. Call `mergeTranslations(deTree, parsed, pathMap)` and return the result.
- [ ] Imports: `translatableSubtree`, `deepFillMissingStrings`, `mergeTranslations` from `./jsonTreeUtils`; `parseAndValidate` from `./responseParser`; `checkPlaceholders` from `./placeholderGuard`; `buildSystemPrompt` from `./promptBuilder`; `callModel` from `./llmGateway`; `load` from `js-yaml`.
- [ ] No file-system I/O for reading register/intents in `translateNamespace` — callers pass pre-loaded text. This keeps the module testable without real files.
- [ ] Register YAML parsing happens inside `translator.ts` before passing `RegisterData` to `promptBuilder`. If the YAML parse throws, surface it with namespace context (wrap and re-throw with `ns` in the message).
- [ ] Export `translateNamespace` as the primary API. No default export.

---

### Step 5: `translator.test.ts`

**Files**: `apps/native-rd/scripts/i18n/__tests__/translator.test.ts`

**Commit**: `test(native-rd/i18n): translator — pipeline orchestration test suite`

**Changes**:

All tests mock `llmGateway.callModel` — no real API calls. Mock pattern follows `models.test.ts` pattern: `jest.mock('../llmGateway')`.

- [ ] **Happy path — translation occurs**: `enTree` has gaps, `deTree` is empty. Mock `callModel` returns valid JSON with correct key set and matching placeholders. Assert returned tree has all keys filled and `callModel` was called exactly once.
- [ ] **Happy path — correct args to callModel**: assert `callModel` receives the correct `modelName` (registry lookup), a non-empty system prompt string, and the serialized dict as user content. Assert `temperature: 0.0` is NOT passed directly (it comes from the registry) — or if the mock captures the `generateText` args, assert `temperature` is 0.
- [ ] **Idempotency — no gaps**: `enTree` and `deTree` are identical (fully translated). Assert `callModel` is never called. Assert returned tree equals the de-tree.
- [ ] **Placeholder mismatch abort**: Mock `callModel` returns a response where one translated value has a dropped `{{placeholder}}`. Assert `translateNamespace` throws. Assert the error message includes the offending key name and mismatch details.
- [ ] **Parse failure abort**: Mock `callModel` returns malformed JSON. Assert `translateNamespace` throws. Assert error message identifies the namespace.
- [ ] **Parse failure — wrong key set**: Mock `callModel` returns valid JSON but with wrong keys. Assert `translateNamespace` throws with reason `missing-keys` or `extra-keys` in message.
- [ ] **Namespace with register but no intent sidecar**: `intents` omitted. Assert no exception, translation proceeds.
- [ ] **Namespace with both register and intent sidecar**: `intents` provided. Assert no exception, translation proceeds. Does not assert on prompt content (that's `promptBuilder.test.ts`'s job).
- [ ] **Error context**: thrown errors include the `ns` name so the caller can surface "namespace: common — parse failure: ..." messages.

**Mock setup**:

```typescript
jest.mock("../llmGateway", () => ({
  callModel: jest.fn(),
}));
```

Mock returns `JSON.stringify({ k0: 'Hallo', k1: 'Welt' })` etc. for happy-path cases.

**No `.cli.ts` split needed**: `translator.ts` will use `import` (not `import.meta`) for its module imports. If `registerLoader.ts` is extracted and uses `import.meta.dir`, only that file gets the `.cli.ts` treatment. `translator.ts` itself should not use `import.meta`.

---

## Testing Strategy

| Test file               | What it tests                                                     | Mocking                      |
| ----------------------- | ----------------------------------------------------------------- | ---------------------------- |
| `promptBuilder.test.ts` | Pure function: output shape, sections present/absent, determinism | None — pure function         |
| `translator.test.ts`    | Pipeline wiring: happy path, error abort, no-gap shortcut         | `jest.mock('../llmGateway')` |

**Fixture shape for translator tests**: inline fixtures (small TypeScript literals), not files on disk. The YAML register text is a minimal inline string matching the stub YAML schema. Example:

```typescript
const STUB_REGISTER = `
speaker: app
audience: neurodivergent-adults
formality: informal
banned_phrasings: []
`.trim();
```

**LLM stub pattern**: `callModel` is mocked at the module level via `jest.mock`. Individual tests use `(callModel as jest.Mock).mockResolvedValueOnce(...)`. This matches the `models.test.ts` established pattern in this codebase.

**Test location**: `apps/native-rd/scripts/i18n/__tests__/` — matches the pattern for all other scripts tests (`placeholderGuard.test.ts`, `responseParser.test.ts`, `models.test.ts`, `lintSource.test.ts`).

**tsconfig coverage**: `tsconfig.scripts-test.json` already includes `"bun"` types and covers `scripts/**/__tests__/**/*.ts`. No changes needed there.

## Risk Surface and Split Guidance

This is the largest single PR in the sequence (~450 hand-written LOC). Risk areas:

**YAML parsing** (resolved — `js-yaml`): bringing in `js-yaml` + `@types/js-yaml` is the only new external dependency. Both are mature and ESM/CJS-compatible. If type declarations or `load()` return-shape narrowing eats more LOC than expected, the fallback is to extract `loadRegister()` into a helper so the cast happens in one place.

**Register YAML schema**: `promptBuilder.ts` targets the four-required-plus-optional-`notes` schema (Resolved Decision #5). If PR #8 needs to add fields, they go in as optional — non-breaking. If PR #8 ever needs to change one of the four required fields, that becomes a separate decision and likely a coordinated PR.

**LOC budget**: 450 LOC across 4 files. If the YAML parser types, error handling scaffolding, or test cases grow past budget, the natural split is:

| Subunit                        | Split PR                                        |
| ------------------------------ | ----------------------------------------------- |
| `promptBuilder.ts` + its tests | PR A — pure module, no async, no mocking needed |
| `translator.ts` + its tests    | PR B — pipeline wiring, depends on PR A         |

PR A is small (pure function, ~100 LOC module + ~80 LOC tests). PR B is the heavier integration piece (~150 LOC module + ~120 LOC tests). This split keeps both under 300 LOC and is clean on the dependency edge. If the total comes in under 450, ship as one PR as originally planned.

## Not in Scope

| Item                                             | Reason                                                                      | Follow-up                       |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------- |
| `sync.ts` CLI entry point                        | PR #6 / issue #6 in the sequence                                            | #6                              |
| Full register YAML content for all 15 namespaces | PR #8 (voice system prompt)                                                 | #8                              |
| Intent sidecar loader from disk                  | PR #8 scope — `translator.ts` receives pre-loaded intents from caller       | #8                              |
| Concurrent namespace batching                    | Locked decision #5 — single-threaded for v1                                 | Post-v1                         |
| Retry / circuit-breaker on LLM failures          | `llmGateway.ts` surfaces upstream errors verbatim; retry is a later concern | Post-v1                         |
| `registerLoader.ts` as a standalone module       | Only extract if loading logic warrants it; not scheduled                    | Inline in translator.ts for now |
| CI workflow / bot commit-back                    | PR #9                                                                       | #9                              |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-05-25] All three blockers (#155, #156, #157) are confirmed closed and merged. `jsonTreeUtils.ts`, `placeholderGuard.ts`, `responseParser.ts`, `models.ts`, `llmGateway.ts` are all present in `apps/native-rd/scripts/i18n/`. No import path adjustments needed.
- [2026-05-25] The bake-off promptfoo config (PRs #171/#175/#176) uses a minimal inline prompt that is independent of `promptBuilder.ts`. `promptBuilder.ts` does not need to be backward-compatible with or import from the bake-off config.
- [2026-05-25] `callModel` signature is `(name: string, systemPrompt: string, userContent: string): Promise<string>`. `translator.ts` passes the serialized `dict` JSON as `userContent`. The system/user split matches the 3-arg shape already locked in `llmGateway.ts`.
- [2026-05-25] `lintSource.cli.ts` establishes the `import.meta` split pattern: logic in `.ts`, CLI bootstrap in `.cli.ts`. `promptBuilder.ts` and `translator.ts` should contain no `import.meta` — they are library modules, not CLI entry points. The CLI entry point (`sync.ts`) is PR #6.
- [2026-05-25] No YAML library is currently imported in `scripts/i18n/`. `translator.ts` will be the first user. Resolved to `js-yaml` + `@types/js-yaml` in interactive review.
- [2026-05-25] Interactive review with Joe resolved all 5 open questions: (1) register at `src/i18n/resources/_register/`, (2) `js-yaml`, (3) skeleton template now, polish in PR #8, (4) `translator.ts` model-agnostic, default lives in `sync.ts`, (5) `RegisterData` = 4 required + optional `notes`.
