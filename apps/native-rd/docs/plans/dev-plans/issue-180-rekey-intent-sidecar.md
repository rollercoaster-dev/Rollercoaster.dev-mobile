# Development Plan: Issue #180

## Issue Summary

**Title**: i18n sync: re-key intent sidecar onto dict keys (or switch dict to source paths)
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~80 LOC hand-written (implementation + test additions/amendments)

## Intent Verification

Observable criteria derived from the issue acceptance criteria. A reviewer can verify each item by running the tests or reading the prompt string under inspection.

- [x] When `translatableSubtree` maps source path `"save.confirm"` to synthetic key `k0`, calling `translateNamespace` with an intent sidecar `{ "save.confirm": { intent: "matter-of-fact ack" } }` results in a system prompt where the Per-string intents section lists `k0`, not `save.confirm`. — `translator.test.ts` "re-keys nested-path intent to synthetic key".
- [x] Intent entries whose source path is not in `pathMap` (the target tree already has a translation for that key) are silently dropped — they do not appear in the system prompt. — `translator.test.ts` "drops intent whose source path is already translated".
- [x] Intent entries whose source path IS in `pathMap` appear in the system prompt keyed by the synthetic `k{n}` key the LLM will actually see in user content. — `translator.test.ts` "re-keys source-path intent to synthetic key" + `syncCore.intents.test.ts` "passes loaded intents into the LLM system prompt".
- [x] When no intents survive the re-keying (either sidecar is empty or all intent keys are already translated), the Per-string intents section is absent from the system prompt. — covered by `pathMap.keys.length === 0` early-return in `translateNamespace` + "skips LLM when all intent keys are already translated (idempotent)" test.
- [x] The author-facing sidecar format is unchanged — `.intents.json` files continue to be authored with source-path keys (e.g. `"save.confirm"`). The re-keying is an internal transformation at prompt-build time.
- [x] `bun run type-check` and `bun run lint` pass with no new errors.

## Dependencies

| Issue | Title                                                                 | Status      | Type |
| ----- | --------------------------------------------------------------------- | ----------- | ---- |
| #154  | Epic: i18n LLM sync — en → de pipeline                                | Open        | Soft |
| #162  | i18n sync: voice system prompt + registers + sidecar loader (PR #182) | Closed, met | Soft |

**Status**: All blocking dependencies met. The sidecar loader (`intentLoader.ts`) and the pipeline wiring in `syncCore.ts`/`translator.ts` landed in PR #182 (commit `dd5d4e7`). The known-limitation comment at `translator.ts:126-133` explicitly names this issue and the fix approach.

## Objective

The per-string intent override layer from ADR-0009 is currently wired but inert: the LLM receives intent metadata keyed by source paths (`"save.confirm"`), but its user-content dict is keyed by synthetic identifiers (`k0`, `k1`, …). The LLM cannot bind the two.

This PR implements Option A from the issue: re-key the intent record at prompt-build time. After `translatableSubtree` produces `pathMap.paths` (synthetic key → `PathSegment[]` path array), invert that mapping to build a source-path-to-synthetic-key lookup, then translate the intent record through it before passing to `buildSystemPrompt`. Intents whose source path maps to no missing key (already translated) are silently dropped.

The author-facing contract (`.intents.json` authored with source-path keys) is unchanged, consistent with the issue's explicit "not in scope" note.

## Decisions

| ID  | Decision                                                                                                                                                                                                                           | Alternatives Considered                                                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Option A: re-key intents at prompt-build time in `translator.ts`, immediately before `buildSystemPrompt`.                                                                                                                          | Option B: drop synthetic keys entirely, send source-path keys to the LLM.                                     | Option B touches `collectMissing` in `jsonTreeUtils.ts`, `parseAndValidate` in `responseParser.ts`, `checkPlaceholders` in `placeholderGuard.ts`, and all their tests. Option A is a single-site change with a blast radius of one function call. The issue explicitly labels A "smaller blast radius, recommended."                                                                                       |
| D2  | Implement the re-keying as a private helper `rekeyIntents` in `translator.ts`.                                                                                                                                                     | Add the re-keying logic inline in `translateNamespace`; add it in `promptBuilder.ts` as a separate prep step. | `translator.ts` is the only site that has both `pathMap` and `intents` simultaneously. `promptBuilder.ts` is pure and receives only the assembled inputs — giving it `pathMap` would break its isolation. A named helper keeps the responsibility visible and separately testable without adding a new file.                                                                                               |
| D3  | `rekeyIntents` maps source paths to synthetic keys by inverting `pathMap.paths`. The inverse is built by joining `PathSegment[]` arrays with `"."` to produce dotted source paths, then looking up against the intent record keys. | Build the inverse differently (e.g. pass the pre-split path array into the sidecar format).                   | The sidecar keys are dotted strings authored by humans (e.g. `"save.confirm"`). The pathMap stores paths as `PathSegment[]` (e.g. `["save", "confirm"]`). Joining with `"."` reconstructs the canonical dotted form. Arrays of numbers (array indices) would join as e.g. `"items.0.label"` — not a case that exists in current sidecar authoring, but silently ignored by the "not in pathMap" drop rule. |
| D4  | Remove the known-limitation comment block at `translator.ts:126-133` once the fix lands.                                                                                                                                           | Leave the comment as historical context.                                                                      | The comment was authored as a forward reference to this issue. Once fixed, leaving it would be misleading to future readers who might think the limitation still exists.                                                                                                                                                                                                                                   |
| D5  | Update `syncCore.intents.test.ts` line 97 (`expect(systemPrompt).toContain("title")` → `expect(systemPrompt).toContain("k0")`).                                                                                                    | Leave the existing test and add a new one.                                                                    | The existing assertion was deliberately testing the broken pre-fix behavior (that `title` appears in the prompt). After Option A, `title` must NOT appear — the prompt must contain `k0`. The test must change its expectation to assert the correct behavior; a second passing test alongside a now-incorrect one would be misleading.                                                                    |

## Affected Areas

- `apps/native-rd/scripts/i18n/translator.ts` (lines 119-134): add `rekeyIntents` helper; apply it between `translatableSubtree` and `buildSystemPrompt`; remove the known-limitation comment block.
- `apps/native-rd/scripts/i18n/__tests__/translator.test.ts` (lines 204-222): amend the "includes intent + glossary sections when provided" test to also assert the re-keyed key (`k0`) appears in the prompt, not the source path (`greeting`). Add new test cases for re-keying behavior (source-path → synthetic key, source-path already translated → dropped).
- `apps/native-rd/scripts/i18n/__tests__/syncCore.intents.test.ts` (line 97): update assertion from `toContain("title")` to `toContain("k0")` to match post-fix behavior.

## Implementation Plan

### Step 1: `rekeyIntents` helper + `translateNamespace` fix + remove limitation comment

**Files**: `apps/native-rd/scripts/i18n/translator.ts`

**Commit**: `fix(native-rd/i18n): re-key intent sidecar onto synthetic dict keys`

**Changes**:

- [x] Add a private helper above `translateNamespace`:

  ```ts
  function rekeyIntents(
    intents: Record<string, IntentEntry>,
    pathMap: TranslationPathMap,
  ): Record<string, IntentEntry> {
    // Build inverse: dotted source path → synthetic key.
    // pathMap.paths: { k0: ["save", "confirm"], k1: ["welcome", "title"] }
    // sourceToKey:   { "save.confirm": "k0", "welcome.title": "k1" }
    const sourceToKey: Record<string, string> = {};
    for (const [syntheticKey, segments] of Object.entries(pathMap.paths)) {
      const dotPath = segments.join(".");
      sourceToKey[dotPath] = syntheticKey;
    }

    const rekeyed: Record<string, IntentEntry> = {};
    for (const [sourcePath, entry] of Object.entries(intents)) {
      const syntheticKey = sourceToKey[sourcePath];
      if (syntheticKey !== undefined) {
        rekeyed[syntheticKey] = entry;
      }
      // sourcePath not in pathMap → already translated, silently skip.
    }
    return rekeyed;
  }
  ```

- [x] In `translateNamespace`, between `const { dict, pathMap }` and `buildSystemPrompt`, apply re-keying:

  ```ts
  const rekeyedIntents = intents ? rekeyIntents(intents, pathMap) : undefined;
  const systemPrompt = buildSystemPrompt({
    register,
    intents: rekeyedIntents,
    glossary,
  });
  ```

- [x] Remove the known-limitation comment block at the current lines 126-133 (`// Known limitation (see #180): ...`). Replaced with a docstring on `rekeyIntents` itself; inline at call site needs no comment.

- [x] No signature changes. No new exports.

---

### Step 2: Unit tests for `rekeyIntents` and `translateNamespace` intent path

**Files**: `apps/native-rd/scripts/i18n/__tests__/translator.test.ts`

**Commit**: `test(native-rd/i18n): translator — re-keyed intent sidecar unit tests`

**Changes**:

- [x] Amend the existing test "includes intent + glossary sections when provided" (currently passing `intents: { greeting: { intent: "warm welcome" } }` and asserting `systemPrompt.toContain("Per-string intents")`). Add assertion that the prompt contains `"k0"` and does NOT contain `"greeting"` in the intents section. This confirms re-keying fires during the real pipeline run.

- [x] Add test: `"re-keys source-path intent to synthetic key"` — source `{ greeting: "Hello" }`, target `{}`, so `greeting` → `k0`. Intents `{ "greeting": { intent: "warm welcome" } }`. Assert prompt contains `k0: intent="warm welcome"` (or equivalent `toContain("k0")` + `toContain("warm welcome")`), and does not contain `"- greeting:"`.

- [x] Add test: `"drops intent whose source path is already translated"` — source `{ greeting: "Hello", farewell: "Goodbye" }`, target `{ farewell: "Auf Wiedersehen" }`, so only `greeting` → `k0` is missing. Intents `{ "greeting": { intent: "warm welcome" }, "farewell": { intent: "closing" } }`. Assert prompt contains `k0` intent but does NOT contain `farewell` intent (it was already translated, not in dict).

- [x] Add test: `"omits Per-string intents when all intent keys are already translated"` — source `{ greeting: "Hello" }`, target `{ greeting: "Hallo" }` (no gaps). This hits the early-return path (`pathMap.keys.length === 0`), so LLM is not called at all — no prompt to assert on. Test asserts `callModel` is NOT called. (This confirms idempotency still works when intents are present.)

- [x] Use `test.each` if the re-keying and drop tests share the same assertion shape — judge at write time. Decision: kept as separate tests; assertion shapes diverge (flat vs nested vs drop vs idempotent), `test.each` would lose readability.

---

### Step 3: Update `syncCore.intents.test.ts` integration assertion

**Files**: `apps/native-rd/scripts/i18n/__tests__/syncCore.intents.test.ts`

**Commit**: `test(native-rd/i18n): syncCore.intents — assert synthetic key in prompt, not source path`

**Changes**:

- [x] Line 97: changed `expect(systemPrompt).toContain("title")` to `expect(systemPrompt).toContain("- k0:")`. The sidecar has `{ "title": { intent: "warm recognition, never expansive" } }` and the namespace source is `{ "title": "still here?" }` with an empty target, so `"title"` → `k0`. After the fix, the prompt contains `k0`, not `title`.

- [x] Added negative assertion on the same test: `expect(systemPrompt).not.toContain("- title:")` to make the inversion explicit and guard against regression.

- [x] No other changes to this file. The corrupt-sidecar and no-sidecar tests are unaffected.

## Testing Strategy

- [x] Unit tests for `rekeyIntents` logic via `translator.test.ts` additions (Step 2). Jest 30, `callModel` mocked via `jest.mock`. No I/O.
- [x] Integration path through `translateNamespace` covered by amended existing test + new re-keying test.
- [x] Integration path through `syncOneNamespace` covered by amended `syncCore.intents.test.ts` (Step 3). Uses `node:fs` + `os.tmpdir()` for fixture files.
- [x] Test file paths: `apps/native-rd/scripts/i18n/__tests__/` — established pattern.
- [x] `tsconfig.scripts-test.json` already has `"bun"` types; no changes needed.
- [x] No `import.meta` in `translator.ts` — no `.cli.ts` split needed.
- [x] Manual gate: `bun run type-check`, `bun run lint`, `bun run test --testPathPatterns translator syncCore.intents` before pushing.

## Not in Scope

| Item                                                        | Reason                                                                                                                                            | Follow-up  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Option B (drop synthetic-key scheme entirely)               | Wider blast radius — touches `collectMissing`, `responseParser`, `placeholderGuard`, and all their tests. Not the recommended path per the issue. | None filed |
| Authoring intent sidecar entries for production namespaces  | Content task, orthogonal to the fix. The mechanism works once this PR lands.                                                                      | Post-v1    |
| Zod validation of sidecar keys against the source namespace | Not requested by this issue; `intentLoader.ts` validates entry shape, not key membership.                                                         | Post-v1    |
| Glossary wiring                                             | Already deferred to #179.                                                                                                                         | #179       |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-05-25] `pathMap.paths` is keyed by synthetic key (`k0`, `k1`, …) → `PathSegment[]`. The inverse needed for Option A is not currently built anywhere. Must be constructed at call site in `translator.ts`.
- [2026-05-25] `PathSegment` is `string | number`. Current sidecar keys are all dotted strings authored against object trees (no array-indexed paths). Joining with `"."` is safe for the current corpus; array-index intents would produce `"items.0.label"` style keys that would simply not match any sidecar entry and be silently dropped — acceptable.
- [2026-05-25] `syncCore.intents.test.ts` line 97 already asserts `toContain("title")` (the source-path key). This assertion will FAIL after Option A lands, because `title` will no longer appear in the Per-string intents section — `k0` will. This test must be updated in Step 3, not just supplemented.
- [2026-05-25] `translator.ts` lines 204-222 (`"includes intent + glossary sections when provided"`) passes `intents: { greeting: { intent: "warm welcome" } }`. After the fix, the prompt will contain `k0` (not `greeting`). The existing test assertion (`toContain("Per-string intents")`) still passes but a false sense of correctness remains unless the negative assertion is added. Step 2 addresses this.
- [2026-05-25] The known-limitation comment at `translator.ts:126-133` was authored as a forward reference to this issue — explicit instruction to remove it when the fix lands (D4).
- [2026-05-25] `rekeyIntents` has no I/O, no randomness, no clock — pure function. Can be unit-tested directly if needed, but its behavior is fully covered through `translateNamespace` integration tests with a mocked LLM.
- [2026-05-25] No new files. No new exports. No type signature changes. Blast radius is three files (one implementation, two test files).
