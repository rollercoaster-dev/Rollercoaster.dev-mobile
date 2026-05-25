# Development Plan: Issue #162

## Issue Summary

**Title**: i18n sync: voice system prompt + per-namespace registers + sidecar loader + ADR (voice shape)
**Type**: enhancement
**Complexity**: MEDIUM
**Estimated Lines**: ~250 hand-written (2–3 code files + ADR) + ~150 YAML content (15 register files). Tests count toward the hand-written budget.

## Intent Verification

Observable criteria derived from the issue acceptance criteria.

- [ ] `buildSystemPrompt` produces a deterministic, non-empty string containing the full brand voice instructions when given a real register — not just skeleton placeholder text. Re-running with identical inputs returns byte-identical output.
- [ ] All 15 register YAMLs load without error via `js-yaml` + `registerSchema` (the Zod schema already in `translator.ts`). Every field traces to a specific rule in `landing/docs/BRAND_LANGUAGE.md` — no fabricated voice rules.
- [ ] When a register YAML exists but is empty (`{}` or `~` or blank), `translator.ts`'s `parseRegister` throws with the namespace name in the error message and does not fall back to a silent default.
- [ ] When a register YAML is present but structurally invalid (missing required fields, wrong types), same hard-fail behavior as above.
- [ ] The sidecar intent loader returns an empty record when the `.intents.json` file is absent. It returns a partial record when the file is present but some keys are missing. It hard-fails when the file exists but is not valid JSON.
- [ ] `syncCore.syncOneNamespace` passes the loaded `intents` (or `undefined`) to `translateNamespace` — the sidecar wiring is live, not just a loader that nothing calls.
- [ ] The three-layer composition (register → intent override → glossary) is tested end-to-end in a unit test: a namespace register with a banned phrasing, an intent sidecar that overrides audience for one key, and a glossary entry all appear correctly in the assembled system prompt.
- [ ] ADR-0009 is added to `apps/native-rd/docs/decisions/`, appears in `index.md`, and explicitly names ICU MessageFormat, Lingui, and Fluent as rejected alternatives with rationale.
- [ ] `bun run type-check` and `bun run lint` pass with no new errors.

## Dependencies

| Issue | Title                                                  | Status                                                   | Type    |
| ----- | ------------------------------------------------------ | -------------------------------------------------------- | ------- |
| #160  | i18n sync: translator + promptBuilder — batch pipeline | Closed, merged as commit 8523718 (PR #177) on 2026-05-25 | Blocker |

**Status**: All dependencies met. `translator.ts`, `promptBuilder.ts`, `syncCore.ts`, and `sync.cli.ts` are all on `main`. The `_register/common.yml` stub is already in place at `apps/native-rd/src/i18n/resources/_register/common.yml`.

## Objective

Add the voice-enforcement layer that makes the LLM translate into native-rd's actual voice rather than generic German: (1) replace the skeleton `buildSystemPrompt` with real brand-voice copy sourced from `BRAND_LANGUAGE.md`; (2) author 15 per-namespace register YAMLs; (3) add a sidecar intent loader and wire it into `syncCore.ts`; (4) write ADR-0009 formalising the three-layer design and rejecting ICU/Lingui/Fluent.

## Decisions

| ID  | Decision                                                                                                                                                                                                                        | Alternatives Considered                             | Rationale                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Expand `promptBuilder.ts` in-place — add the brand-voice static text directly to the `buildSystemPrompt` sections rather than a separate template file.                                                                         | Separate `voiceTemplate.ts` or a `.txt` asset file. | `promptBuilder.ts` is already pure and well-tested. Adding static string constants to the existing sections keeps one import boundary. A separate template file adds indirection with no structural benefit at this scope.                                                                  |
| D2  | Sidecar loader lives in a new `intentLoader.ts` (not inlined into `syncCore.ts`).                                                                                                                                               | Inline the loader logic in `syncCore.ts`.           | `syncCore.ts` already does path resolution, register loading, and orchestration. Inlining a third loader further bloats a module that should stay thin. `intentLoader.ts` keeps the loading logic independently testable. The pattern mirrors `translator.ts`'s `parseRegister` extraction. |
| D3  | Sidecar loader hard-fails on a present-but-invalid JSON file; treats missing file as empty record.                                                                                                                              | Treat invalid JSON as empty record (silent).        | The issue explicitly requires: "missing-file: graceful; present-but-empty: graceful; present-but-invalid: hard-fail." Silently ignoring a corrupt sidecar would let a content-authoring mistake produce a wrong prompt with no signal.                                                      |
| D4  | `syncCore.ts` loads the sidecar via `intentLoader.loadIntentSidecar(enDir, ns)` and passes the result to `translateNamespace` as `intents`. The Zod validation for sidecar shape happens inside `intentLoader.ts` at load time. | Validate sidecar shape inside `translator.ts`.      | `translator.ts`'s comment (line 53–56) explicitly deferred sidecar validation to "PR #8 wires the sidecar loader — add zod schemas + hard-fail at that boundary then." That comment is an implementation instruction for this PR.                                                           |
| D5  | ADR number is 0009 (next in sequence).                                                                                                                                                                                          | —                                                   | `index.md` currently ends at ADR-0008.                                                                                                                                                                                                                                                      |
| D6  | `promptBuilder.ts` static brand-voice copy is added as string constants at the module level, not exported — they are implementation details of `buildSystemPrompt`.                                                             | Export them for direct test access.                 | Tests should assert on the assembled output, not on the internal strings. Testing the constants directly would couple tests to exact wording, making future voice copy edits break tests for the wrong reason.                                                                              |

## User Decisions (/start-issue resolution, 2026-05-25)

These are answers Joe gave during the `/start-issue` Q&A pass. Where they conflict with the plan above, these win.

| ID  | Question                                                                    | Decision                                                                                                                                                                                                                                      | Implication                                                                                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | Voice preamble wording review point                                         | **Draft → review → commit.** Implementer drafts `VOICE_PREAMBLE`, posts it to chat for Joe's review, waits for sign-off, then commits Step 1.                                                                                                 | Step 1 has a human gate inserted between "draft preamble" and "commit". No autopilot through Step 1.                                                                                                                                                                                                                                                    |
| U2  | `banned_phrasings` for namespaces with no brand-doc-specific guidance       | **Brand-wide defaults, deduped at prompt-assembly.** Each register carries the full brand-wide banned list. `promptBuilder.ts` dedupes register bans against the system-prompt-level bans so they don't appear twice in the assembled prompt. | (a) Step 2 authoring uses brand-wide defaults for all 15 registers. (b) Step 1 adds a dedup pass — likely a `Set`-based subtract inside `formatRegister` or just before its output. Adds ~10 LOC to Step 1 and a new unit test in `promptBuilder.test.ts` asserting the dedup is in effect.                                                             |
| U3  | Glossary loader in scope?                                                   | **Defer.** Follow-up filed as **#179** (sub-issue of epic #154, blocked by #162, label `dep:blocked`).                                                                                                                                        | "Not in Scope" table's "German glossary content" row updated to point at #179. No glossary loader in this PR. `syncCore.ts` continues to pass `glossary: undefined`.                                                                                                                                                                                    |
| U4  | Sidecar wiring smoke-test location                                          | **New `syncCore.intents.test.ts`.** Focused unit test, not extending `sync.test.ts`.                                                                                                                                                          | Testing Strategy entry for "syncCore integration" is replaced by a new test file at `apps/native-rd/scripts/i18n/__tests__/syncCore.intents.test.ts`. Test asserts that when an `.intents.json` exists alongside `<ns>.json` in the fixture enDir, the value reaches `callModel` (mock the LLM call, assert the prompt string contains intent markers). |
| U5  | ADR-0009 alternative-rejection depth                                        | **Terse bullets + one anchor paragraph.** Open the Alternatives section with a single paragraph framing why this is a closed decision (resist relitigation), then 3–5 terse bullets per rejected alternative.                                 | ADR-0009 target size ~80 LOC (between the original "terse" 60 and "long" 120 estimates). Anchor paragraph names the relitigation risk explicitly.                                                                                                                                                                                                       |
| U6  | Empty namespaces (`badges`, `badgeDesigner` = `{}`) — author registers now? | **Author now.** Best-effort registers for both. Pipeline never hard-fails on missing register file.                                                                                                                                           | Step 2 authors all 15 registers. Already matched plan default — no change to plan.                                                                                                                                                                                                                                                                      |

## Affected Areas

- `apps/native-rd/scripts/i18n/promptBuilder.ts`: replace skeleton system prompt preamble with full brand-voice instructions sourced from `BRAND_LANGUAGE.md`
- `apps/native-rd/scripts/i18n/intentLoader.ts`: new file — reads `en/<ns>.intents.json` if present, validates shape, returns `Record<string, IntentEntry>` or throws on corrupt file
- `apps/native-rd/scripts/i18n/__tests__/intentLoader.test.ts`: new test file
- `apps/native-rd/scripts/i18n/syncCore.ts`: wire `intentLoader.loadIntentSidecar` into `syncOneNamespace` — pass loaded intents to `translateNamespace`
- `apps/native-rd/src/i18n/resources/_register/common.yml`: fill in real brand-voice content (currently a stub with empty fields)
- `apps/native-rd/src/i18n/resources/_register/<ns>.yml` (×14 new files): one per remaining namespace — `badgeDesigner`, `badges`, `captureFile`, `captureLink`, `capturePhoto`, `captureText`, `captureVideo`, `captureVoice`, `focusMode`, `goals`, `newGoal`, `permissions`, `settings`, `welcome`
- `apps/native-rd/docs/decisions/ADR-0009-i18n-voice-enforcement.md`: new ADR
- `apps/native-rd/docs/decisions/index.md`: add ADR-0009 row
- `apps/native-rd/docs/plans/i18n-llm-sync.md`: update plan doc to confirm decision #2 final state is reflected (already resolved — verify the module layout table is current)

## Implementation Plan

### Step 1: Fill `promptBuilder.ts` with real brand-voice copy

**Files**: `apps/native-rd/scripts/i18n/promptBuilder.ts`

**Commit**: `feat(native-rd/i18n): promptBuilder — brand-voice system prompt copy`

**Changes**:

- [ ] Replace the minimal inline preamble (`"You translate UI strings from English to German..."`) with a richer static block that captures, from `BRAND_LANGUAGE.md`:
  - The named-maker stance rule (voice comes from inside the audience; no faceless-we German)
  - Identity-first ND vocabulary requirements (autistisch, ADHS, bipolar — identity-first, not deficit-first)
  - Refusal-as-feature / brevity stance (preserve the directness; no corporate filler in German)
  - Parenthetical-aside preservation (`(noch da? gut.)` pattern — retain register, never expand)
  - Banned dismissive verbs / exits (the `oder nicht`, `oder lass es` class that the promptfoo banned-phrase list already seeds)
  - Placeholder preservation instruction (already present — keep it)
  - Anonymised-dict input/output contract (already present — keep it)
  - Slot markers for per-batch register + intents + glossary sections (already present via `formatRegister`/`formatIntents`/`formatGlossary`)
- [ ] The preamble is a module-level `const VOICE_PREAMBLE: string` (unexported). `buildSystemPrompt` prepends it before the `formatRegister` output.
- [ ] Tests continue to assert section presence (not exact wording) — existing tests remain green. Add one new test asserting the preamble contains the identity-first ND vocab instruction and the placeholder contract.
- [ ] No new exports. No I/O. Function signature unchanged.

---

### Step 2: 15 register YAMLs — content authoring

**Files**: `apps/native-rd/src/i18n/resources/_register/*.yml` (1 fill + 14 new)

**Commit**: `content(native-rd/i18n): 15 per-namespace voice register YAMLs`

**Changes**:

All content is sourced exclusively from `landing/docs/BRAND_LANGUAGE.md`. Field values are real — no placeholders.

The 15 namespaces and their register character:

| Namespace            | Speaker posture                               | Audience                    | Formality        | Notable banned phrasings                     |
| -------------------- | --------------------------------------------- | --------------------------- | ---------------- | -------------------------------------------- |
| `common` (fill stub) | app (system actions, nav labels)              | neurodivergent adults       | informal         | exclamation filler, corporate action verbs   |
| `welcome`            | app, first-person warmth (named-maker energy) | first-run user, ND adult    | informal         | exit-asides, "special", "unique"             |
| `goals`              | app                                           | ND adult returning to goals | informal         | streak language, "you haven't yet", pressure |
| `newGoal`            | app prompting                                 | ND adult creating           | informal         | "amazing", "great job", FOMO pressure        |
| `badges`             | app                                           | ND adult                    | informal         | achievement-porn filler                      |
| `badgeDesigner`      | app                                           | ND adult                    | informal         | corporate design filler                      |
| `focusMode`          | app, quiet                                    | ND adult in focus           | informal         | exclamation, urgency                         |
| `settings`           | app, neutral                                  | ND adult configuring        | informal-neutral | corporate UI jargon                          |
| `permissions`        | app, matter-of-fact                           | ND adult                    | informal         | "we need", "please allow", begging register  |
| `captureText`        | app prompting                                 | ND adult                    | informal         | pressure to elaborate, "amazing note"        |
| `capturePhoto`       | app                                           | ND adult                    | informal         | exclamation on save                          |
| `captureVideo`       | app                                           | ND adult                    | informal         | exclamation, pressure                        |
| `captureVoice`       | app                                           | ND adult                    | informal         | exclamation, corporate                       |
| `captureLink`        | app                                           | ND adult                    | informal         | exclamation                                  |
| `captureFile`        | app                                           | ND adult                    | informal         | exclamation                                  |

Each YAML has at minimum: `speaker`, `audience`, `formality`, `banned_phrasings` (drawn from BRAND_LANGUAGE.md anti-patterns), and `notes` (empty list unless namespace-specific guidance applies — e.g. `welcome` gets a note about identity-first ND vocab and named-maker energy).

`badges.json` and `badgeDesigner.json` are currently empty objects (`{}`). Their registers are authored anyway so the sync pipeline has them ready when content is added.

---

### Step 3: `intentLoader.ts` + tests

**Files**:

- `apps/native-rd/scripts/i18n/intentLoader.ts`
- `apps/native-rd/scripts/i18n/__tests__/intentLoader.test.ts`

**Commit**: `feat(native-rd/i18n): intentLoader — sidecar intent file loader`

**Changes**:

`intentLoader.ts`:

- [ ] Export `loadIntentSidecar(enDir: string, ns: string): Record<string, IntentEntry>` — synchronous, no async.
- [ ] If `<enDir>/<ns>.intents.json` does not exist: return `{}` (no error — most namespaces won't have a sidecar).
- [ ] If file exists and is empty (`""`) or is `{}`: return `{}`.
- [ ] If file exists and contains JSON but has non-object root: throw `Error("namespace ${ns}: intent sidecar has unexpected root type")`.
- [ ] If file exists and is not valid JSON: throw `Error("namespace ${ns}: intent sidecar is not valid JSON — ${detail}")`.
- [ ] Validate leaf entries against `IntentEntry` shape (import `IntentEntry` from `promptBuilder.ts`). Entries that are strings (wrong shape) throw with a clear message rather than silently dropping. Use a Zod schema mirroring `IntentEntry`: `{ intent: z.string(), audience: z.string().optional(), register: z.string().optional() }`.
- [ ] No `import.meta`. Pure file I/O via `node:fs`. No Bun-specific APIs. Jest-importable directly.

`intentLoader.test.ts`:

- [ ] Missing file → returns `{}`, no throw.
- [ ] Present, empty file (`""`) → returns `{}`, no throw.
- [ ] Present, `{}` content → returns `{}`, no throw.
- [ ] Present, valid partial content (3 of 10 keys have intent entries) → returns the 3-entry record.
- [ ] Present, non-JSON content → throws with namespace + "not valid JSON".
- [ ] Present, non-object root (e.g. `[]`) → throws with namespace + "unexpected root type".
- [ ] Present, entry with missing `intent` field → throws with Zod validation detail.
- [ ] Use `test.each` for the graceful-missing and graceful-empty cases.
- [ ] Tests use `node:fs` + `os.tmpdir()` to write fixture files — no mocking needed for I/O.

---

### Step 4: Wire sidecar loader into `syncCore.ts`

**Files**: `apps/native-rd/scripts/i18n/syncCore.ts`

**Commit**: `feat(native-rd/i18n): syncCore — wire intent sidecar into sync pipeline`

**Changes**:

- [ ] Import `loadIntentSidecar` from `./intentLoader`.
- [ ] In `syncOneNamespace`, after `readRegisterText` and before `translateNamespace`, call `loadIntentSidecar(paths.enDir, ns)`. Assign result to `intents`.
- [ ] Pass `intents` to `translateNamespace({ ..., intents })`. When `intents` is `{}` (empty record), `buildSystemPrompt` already handles this correctly (omits the intents section) — no special-casing needed.
- [ ] If `loadIntentSidecar` throws (corrupt file), let the error propagate to the surrounding `try/catch` in `syncOneNamespace` — it will surface as `{ kind: "failed", message }` with the error text, consistent with how register and LLM failures are reported.
- [ ] No changes to `SyncPaths`, `CliArgs`, or any exported types — this is internal wiring only.

---

### Step 5: ADR-0009 + index update

**Files**:

- `apps/native-rd/docs/decisions/ADR-0009-i18n-voice-enforcement.md`
- `apps/native-rd/docs/decisions/index.md`

**Commit**: `docs(native-rd/i18n): ADR-0009 — voice enforcement shape (register + sidecar + glossary)`

**Changes**:

ADR-0009 structure:

- **Context**: native-rd needs LLM translations that preserve its brand voice (named-maker, identity-first ND, refusal-as-feature, parenthetical asides, banned dismissive patterns). Flat glossary alone would not be enough — a German lexicon of banned words cannot capture _stance_.
- **Alternatives rejected (locked)**:
  - _ICU MessageFormat_: adds runtime parsing complexity, requires a different i18n library (or dual-library setup), and is overkill for the current string corpus. The voice problem is prompt-engineering, not format parsing.
  - _Lingui_: compile-time message extraction is a valuable pattern, but requires a full migration of all string literals and a Babel/swc transform in the Expo build. The i18n-llm-sync pipeline is a sync-time tool, not a runtime concern; migrating the source format to Lingui solves a different problem.
  - _Fluent (Project Fluent)_: expressive for complex pluralization and attribute patterns, but adds a runtime parser and a second string format alongside i18next. The corpus does not yet have the pluralization complexity that would justify it.
- **Decision**: three-layer voice enforcement as specified in `i18n-llm-sync.md` §Voice enforcement:
  1. Per-namespace register YAML (default voice for all strings in the namespace)
  2. Per-string intent sidecar (opt-in override for strings that need sharper framing)
  3. Thin glossary (canonical brand tokens — not the primary voice mechanism)
- **Layer ordering rationale**: decreasing strength. Register is always present (fail-fast if missing). Sidecar overrides register for the specific key. Glossary provides lookup, not instruction.
- **Authoring affordances**: registers are YAML files next to locale files (`_register/`), edited by hand. Sidecars are JSON files next to source locale files, authored only when a string needs sharper intent. Glossary is a plain string passed by the sync CLI.
- **Composition with promptfoo assertions**: the bake-off (PR #4/issue #159) evaluated inherent model voice quality with a minimal prompt. ADR-0009 formalises the production prompt shape. The two are independent — promptfoo tested whether a model _can_ follow register-style instructions; ADR-0009 defines the production instruction set.
- **Supersession clause** per ADR-0006 pattern.

`index.md`:

- [ ] Add `ADR-0009` row: "i18n voice enforcement shape — three-layer register + intent sidecar + glossary".

---

### Step 6: Update plan doc

**Files**: `apps/native-rd/docs/plans/i18n-llm-sync.md`

**Commit**: `docs(native-rd/i18n): plan doc — confirm PR #8 decisions, link ADR-0009`

**Changes**:

- [ ] Verify the module layout table already shows the concrete `_register/` path (it does as of PR #177 — confirm no stale text remains).
- [ ] Add `ADR-0009` reference under the PR #8 row in the PR sequence table.
- [ ] Add a changelog entry: `2026-05-25 — PR #8 landed: brand-voice prompt copy, 15 register YAMLs, intent sidecar loader wired.`

## Testing Strategy

- [ ] `promptBuilder.test.ts` — extend existing test suite with: (a) preamble contains identity-first ND vocab instruction; (b) preamble contains placeholder-preservation instruction; (c) three-layer composition test (register + sidecar intents + glossary all appear in assembled output). Jest 30, no mocking needed — pure function.
- [ ] `intentLoader.test.ts` — 8 cases covering all three file-state branches (missing, empty, valid, corrupt). Uses `node:fs` + `os.tmpdir()` for real file I/O. No mocking. `test.each` for the two graceful cases.
- [ ] `syncCore.intents.test.ts` (new file, per U4) — focused smoke-test for sidecar wiring. Mocks `callModel`, writes a fixture `<ns>.intents.json` alongside `<ns>.json` in a tmpdir, runs `syncOneNamespace`, asserts the prompt string passed to `callModel` contains the `Per-string intents` section with the fixture content. Not in `sync.test.ts` — kept focused.
- [ ] `promptBuilder.test.ts` also gets a new test for U2's dedup pass: when the register's `banned_phrasings` contains an item already present in the system-prompt-level banned list, the assembled output contains it once, not twice.
- [ ] Test file locations: `apps/native-rd/scripts/i18n/__tests__/` — matching the established pattern.
- [ ] Manual: `bun run type-check` + `bun run lint` + `bun run test:ci` before PR.

## Not in Scope

| Item                                                            | Reason                                                                                                                                         | Follow-up                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| CI workflow / bot commit-back                                   | PR #9 / issue to be filed                                                                                                                      | #9                                                                         |
| Authored intent sidecar entries for specific strings            | Sidecars are optional; authoring them is a content task that can happen incrementally as sync output reveals strings that need sharper framing | Post-v1                                                                    |
| Glossary loader + content                                       | Deferred per U3 — `syncCore.ts` keeps `glossary: undefined`. The slot remains typed in `PromptBuilderInput`.                                   | #179 (filed 2026-05-25, sub-issue of #154, blocked by #162, `dep:blocked`) |
| `badgeDesigner` and `badges` namespace content (currently `{}`) | These namespaces have no source strings yet — registers are authored but no sidecar needed                                                     | When source strings are added                                              |
| Concurrent namespace batching                                   | Locked decision #5                                                                                                                             | Post-v1                                                                    |
| Retry / circuit-breaker on LLM failures                         | Not in scope for this PR series until v1 is working end-to-end                                                                                 | Post-v1                                                                    |

_No items deferred from this PR's core scope — all acceptance criteria are addressed above._

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-05-25] Blocker #160 (PR #177) is confirmed merged — commit 8523718. `translator.ts`, `promptBuilder.ts`, `syncCore.ts` are all present. The `_register/common.yml` stub exists with empty `banned_phrasings: []` and `notes: []`.
- [2026-05-25] Decision #2 (register file location) is already resolved in `i18n-llm-sync.md` as of PR #177: `apps/native-rd/src/i18n/resources/_register/`. The `_register/` directory exists on `main`.
- [2026-05-25] `syncCore.ts` currently calls `translateNamespace` without `intents` or `glossary` (both undefined). Step 4 wires the sidecar — the glossary wire is out of scope here (no authored glossary content yet).
- [2026-05-25] `translator.ts` lines 53–56 contain an explicit comment: "PR #8 wires the sidecar loader — add zod schemas + hard-fail at that boundary then, mirroring registerSchema." This is an implementation instruction; `intentLoader.ts` in Step 3 fulfills it.
- [2026-05-25] `badges.json` and `badgeDesigner.json` are currently empty objects (`{}`). Their registers should be authored now (schema must be valid) but `banned_phrasings` can be the same brand-wide defaults. Sidecar files are not needed.
- [2026-05-25] The promptfoo `promptfooconfig.yaml` already seeds a German banned-phrase list: `oder nicht`, `oder lass es`. These should appear in the `VOICE_PREAMBLE` in `promptBuilder.ts` and/or in relevant register YAMLs — not just in the bake-off config.
- [2026-05-25] `BRAND_LANGUAGE.md` is at `landing/docs/BRAND_LANGUAGE.md` in the sibling `landing/` repo, not in the `issue-162-started` worktree. Access is via `/Users/joeczarnecki/Code/rollercoaster.dev/landing/docs/BRAND_LANGUAGE.md`. All register content must trace to this file.
- [2026-05-25] Namespace count confirmed: 15 (badgeDesigner, badges, captureFile, captureLink, capturePhoto, captureText, captureVideo, captureVoice, common, focusMode, goals, newGoal, permissions, settings, welcome).
- [2026-05-25] ADR sequence: next is 0009. ADR-0008 is the last entry in `index.md`.
