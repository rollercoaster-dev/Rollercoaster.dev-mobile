# Development Plan: Issue #158

## Issue Summary

**Title**: i18n sync: lintSource warn-only + three-clause strict-promotion criterion
**Type**: enhancement (tooling / code-quality)
**Complexity**: SMALL
**Estimated Lines**: ~350 hand-written across 2 files (linter + tests). No generated content.

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] Running `bun run i18n:lint-source` from `apps/native-rd/` exits with code 0 when findings exist — findings are warnings, not failures.
- [ ] When a string leaf in a generic-register namespace has no matching entry in its `*.intents.json` sidecar (or the sidecar doesn't exist), the output line identifies the file path, dot-notation key path, and the category `[bare-string]`.
- [ ] When two string leaves in the same namespace file share a `{{name}}` placeholder but the placeholder carries materially different semantic loads across those keys (e.g. `{{title}}` used for a goal title vs. a UI heading), the output line identifies the file path, placeholder name, both key paths, and the category `[placeholder-conflict]`.
- [ ] When any string leaf in any namespace contains a banned phrasing sourced from `landing/docs/BRAND_LANGUAGE.md`, the output line identifies the file path, key path, matched phrase, and the category `[banned-phrasing]`.
- [ ] Output is machine-navigable: each line contains an absolute or repo-relative file path so authors can jump directly to the source.
- [ ] `bun run type-check` passes.
- [ ] `bun run test --testPathPatterns scripts/i18n` passes — each check category has at least one positive case (finding emitted) and one negative case (no finding).

## Dependencies

| Issue | Title | Status | Type |
| ----- | ----- | ------ | ---- |
| None  | —     | —      | —    |

**Status**: Independent — no blockers. The plan notes this is parallel to PRs #1–#6, #8, #9 per `i18n-llm-sync.md`.

## Objective

Ship `apps/native-rd/scripts/i18n/lintSource.ts` as a warn-only source-side linter that scans all 15 `en/` namespaces for three categories of sync-quality risk. Add the `bun run i18n:lint-source` script entry. Include tests covering each check. Document the three-clause strict-promotion criterion in the plan's Locked Decisions section (and as a PR-description blurb) without writing any enforcement code.

## Locked Decisions

### Warn-only in v1; no auto-promotion code

`lintSource.ts` exits 0 in all cases. No `--strict` flag, no CI failure gate, no config option. The only code that exists is the scan + warn.

Promotion to strict (exit non-zero) is a future PR gated on all three of the following being true for one calendar week:

1. Zero `eslint-disable-next-line i18n/no-bare-string` under `apps/native-rd/src/i18n/resources/en/`.
2. Zero warn-level findings on most recent `bun run lint` against `main`.
3. At least one end-to-end sync has run on `main` (the bot has committed `de/` back at least once — PR #9 has fired).

Clause 3 ensures the linter has been exercised against real sync output before becoming load-bearing. This criterion is documented here and repeated in the PR description. No code changes are needed to implement it — it is a policy, not a gate.

### Output format: one line per finding, structured fields

Each finding is printed as:

```
[category] <file-path> <key.path> <detail>
```

where:

- `[category]` is one of `[bare-string]`, `[placeholder-conflict]`, `[banned-phrasing]`
- `<file-path>` is the path to the namespace JSON (relative to the repo root or absolute — see D3)
- `<key.path>` is the dot-notation path to the offending leaf
- `<detail>` is a short human-readable note

This format is stable enough to grep/pipe without being a contract. It can change in a later PR if CI integration (PR #9) demands it.

### No runtime dep additions

`lintSource.ts` uses only `node:fs`, `node:path`, and `node:process`. Zod is already a dep (added in #156); it may be used for input parsing if needed, but the linter itself does not require it. No new entries in `apps/native-rd/package.json`.

### Register concept: "generic" means no `*.intents.json` sidecar exists or is empty

The per-namespace register YAML files (open decision #2 in `i18n-llm-sync.md`) are not yet written — they land in PR #8. For the bare-string check, "generic register" is operationalized as: the namespace has no `*.intents.json` sidecar, or the sidecar exists but the target key has no entry. This is the correct v1 behavior — the check surfaces strings that would benefit from intent overrides, regardless of whether the register YAML describes them.

Concretely:

- `common.json` is the archetype of a generic register (breadth of UI contexts, no unified voice register).
- `welcome.json` has a strong voice register implied by its content, but it also has no sidecar yet — so it will generate findings. That is correct: the linter is telling authors "these strings would benefit from intent documentation."
- The implementer should treat ALL namespaces without a sidecar as "generic register" for v1. If the sidecar exists (even partially), keys WITH an entry in the sidecar are exempt; keys WITHOUT one are flagged.

### Placeholder-conflict detection: semantic load, not just shared name

`{{title}}` appears in both `goals.confirmDelete.message` ("goal title being deleted") and `common.goalCard.a11y.badgePreview` ("badge title"). These are different semantic loads for the same placeholder name. The check flags cases where:

- The same placeholder name appears in two or more string leaves within the **same namespace file**.
- The strings in question carry visibly different semantic loads based on their key path context.

The implementation heuristic: if the same placeholder name appears in two leaves whose key-path prefixes differ at the top level (e.g. `confirmDelete.*` vs. `card.*`), flag it as a potential conflict and let the author decide. False positives are acceptable — this is warn-only.

The cross-namespace case (same name, different files) is explicitly out of scope for v1. See Not in Scope.

## Decisions

| ID  | Decision                                                                                                       | Alternatives Considered                                          | Rationale                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | All three checks implemented in a single `lintSource.ts` file                                                  | One file per check; orchestrator + separate check modules        | ~350 LOC total fits one file without readability pain. The three checks share the same JSON walk infrastructure. Splitting premature at this size. If the file grows with a fourth check, extract then.                                                                                                                                                                |
| D2  | Banned-phrasing list is inlined as a constant in `lintSource.ts`, not read from `BRAND_LANGUAGE.md` at runtime | Read the markdown file and parse it dynamically                  | Markdown parsing is fragile — the doc structure could change, and the banned phrases would need a stable extraction heuristic. Inlining extracts the stable/clear set at plan time and makes the linter hermetic (no cross-repo FS dep). The list is small (10–15 phrases). When `BRAND_LANGUAGE.md` changes, a human updates the list — this is appropriate friction. |
| D3  | File paths in output are relative to the repo root (prefixed with `apps/native-rd/`)                           | Absolute paths; paths relative to `apps/native-rd/`              | Repo-relative paths are the same format used by `tsc` and `eslint` output — editors and terminal jump-to-line work reliably with them.                                                                                                                                                                                                                                 |
| D4  | Tests use inline fixture objects (not real en/ files) for isolation                                            | Import real en/ files in tests; write fixture JSON files on disk | Real files create coupling — adding a new key to a namespace JSON would silently change test behavior. Inline fixtures are explicit about what the test is asserting and require no filesystem access at test time.                                                                                                                                                    |
| D5  | `i18n:lint-source` script invoked with `bun run scripts/i18n/lintSource.ts`                                    | Compile to JS first; use a Bun entrypoint; use `tsx`             | `bun run <ts-file>` is the established pattern in this repo (see `gen:pseudo`, `verify:badge`, `release-notes:*` in `package.json`). No compilation step needed.                                                                                                                                                                                                       |

## Affected Areas

- `apps/native-rd/scripts/i18n/lintSource.ts`: new file — the linter
- `apps/native-rd/scripts/i18n/__tests__/lintSource.test.ts`: new file — tests for all three checks
- `apps/native-rd/package.json`: add `"i18n:lint-source": "bun run scripts/i18n/lintSource.ts"` to `scripts`

No other files change. The test infra (jest.config.js, tsconfig.scripts-test.json, type-check command) is already wired from PR #156 — no additions needed.

## Implementation Plan

### Step 1: Script entry + linter skeleton + types

**Files**:

- `apps/native-rd/package.json`
- `apps/native-rd/scripts/i18n/lintSource.ts`

**Commit**: `chore(native-rd/i18n): i18n:lint-source script entry + lintSource skeleton`

**Changes**:

- [ ] Add to `scripts` in `apps/native-rd/package.json`:
  ```json
  "i18n:lint-source": "bun run scripts/i18n/lintSource.ts"
  ```
- [ ] Create `apps/native-rd/scripts/i18n/lintSource.ts` with:
  - Top-of-file JSDoc block explaining purpose, warn-only contract, three checks, and strict-promotion criterion (all three clauses verbatim)
  - `Finding` type: `{ category: "bare-string" | "placeholder-conflict" | "banned-phrasing"; file: string; keyPath: string; detail: string }`
  - `formatFinding(f: Finding): string` — formats to `[category] <file> <keyPath> <detail>`
  - `walkLeaves(obj: unknown, prefix: string, cb: (keyPath: string, value: string) => void): void` — recursive JSON walk that calls `cb` for every string leaf
  - `loadNamespace(filePath: string): unknown` — reads + JSON-parses a namespace file, throws on parse error
  - `loadSidecar(nsPath: string): Record<string, unknown> | null` — reads `<ns>.intents.json` alongside the namespace file, returns null if absent
  - `main()` stub that reads `src/i18n/resources/en/*.json`, calls the three check functions (stubbed as `return []`), collects findings, prints them, exits 0
  - Wire `main()` call at bottom: `void main()`

This commit compiles and runs (zero findings on first run — all checks are stubs).

---

### Step 2: Check 1 — bare-string detection

**Files**: `apps/native-rd/scripts/i18n/lintSource.ts`

**Commit**: `feat(native-rd/i18n): lintSource check 1 — bare strings without intent sidecar`

**Changes**:

- [ ] Implement `checkBareStrings(nsPath: string, tree: unknown, sidecar: Record<string, unknown> | null): Finding[]`:
  - Walk all string leaves with `walkLeaves`
  - For each leaf: if `sidecar` is null OR the key path has no entry in the sidecar, emit a `bare-string` finding
  - Detail string: `"no intent sidecar entry — add to <ns>.intents.json to guide translation register"`
- [ ] Wire into `main()`: call `checkBareStrings` for each namespace, collect findings
- [ ] **Ambiguity resolved in D5 (register definition):** ALL namespaces without a sidecar file are checked. When a sidecar exists, only keys absent from it are flagged.

---

### Step 3: Tests for check 1

**Files**: `apps/native-rd/scripts/i18n/__tests__/lintSource.test.ts`

**Commit**: `test(native-rd/i18n): lintSource — bare-string check tests`

**Changes**:

- [ ] Create test file with `describe("checkBareStrings")` block
- [ ] Positive case (finding emitted):
  ```ts
  // namespace with two leaves, no sidecar → two bare-string findings
  const tree = { hero: { title: "Hello" }, cta: { label: "Go" } };
  const findings = checkBareStrings("en/welcome.json", tree, null);
  expect(findings).toHaveLength(2);
  expect(findings[0].category).toBe("bare-string");
  expect(findings[0].keyPath).toBe("hero.title");
  ```
- [ ] Negative case — partial sidecar covers one key:
  ```ts
  const tree = { hero: { title: "Hello" }, cta: { label: "Go" } };
  const sidecar = { hero: { title: { intent: "warm greeting" } } };
  const findings = checkBareStrings("en/welcome.json", tree, sidecar);
  expect(findings).toHaveLength(1);
  expect(findings[0].keyPath).toBe("cta.label");
  ```
- [ ] Negative case — full sidecar → no findings
- [ ] Edge case — empty namespace (`{}`) → no findings
- [ ] Edge case — nested objects, no string leaves → no findings (arrays, if any, skipped)

---

### Step 4: Check 2 — placeholder consistency

**Files**: `apps/native-rd/scripts/i18n/lintSource.ts`

**Commit**: `feat(native-rd/i18n): lintSource check 2 — placeholder consistency within namespace`

**Changes**:

- [ ] Implement `checkPlaceholderConsistency(nsPath: string, tree: unknown): Finding[]`:
  - Walk all string leaves; for each, extract placeholder names via the same regex as `placeholderGuard.extractPlaceholders` (i.e. `/\{\{([^}]+)\}\}/g`, trimmed)
  - Build a map: `placeholder name → [{ keyPath, value }]` — accumulate all occurrences across the namespace
  - For each placeholder name that appears in 2+ leaves: compare the key-path top-level prefix of each occurrence
    - If all occurrences share the same top-level key (e.g. all under `card.*`), no finding — same semantic context
    - If occurrences span different top-level keys (e.g. `confirmDelete.*` and `card.*`), emit one `placeholder-conflict` finding per placeholder
  - Detail: `"{{<name>}} appears in <keyA> and <keyB> — verify same semantic load"`
  - Only the first two conflicting occurrences are reported per placeholder name (avoids flooding output)
- [ ] Wire into `main()`

**Implementation note on `extractPlaceholders` re-use**: `lintSource.ts` should NOT import from `placeholderGuard.ts` — the guard is a sync-pipeline module (hard-fail, called during LLM translation); the linter is a source-side tool. Copy the one-line regex constant directly into `lintSource.ts` to keep the modules independent. A comment noting the shared origin is sufficient.

---

### Step 5: Tests for check 2

**Files**: `apps/native-rd/scripts/i18n/__tests__/lintSource.test.ts`

**Commit**: `test(native-rd/i18n): lintSource — placeholder consistency check tests`

**Changes**:

- [ ] Add `describe("checkPlaceholderConsistency")` block to existing test file
- [ ] Positive case — same placeholder name under different top-level keys:
  ```ts
  const tree = {
    confirmDelete: { message: 'Delete "{{title}}" permanently?' },
    card: { a11y: { label: "{{title}}, {{stepsCompleted}} steps" } },
  };
  const findings = checkPlaceholderConsistency("en/goals.json", tree);
  expect(findings).toHaveLength(1);
  expect(findings[0].category).toBe("placeholder-conflict");
  expect(findings[0].detail).toMatch("{{title}}");
  ```
- [ ] Negative case — same placeholder name under same top-level key (no conflict):
  ```ts
  const tree = {
    card: {
      label: "{{title}}, active",
      hint: "Double-tap {{title}}",
    },
  };
  expect(checkPlaceholderConsistency("en/goals.json", tree)).toHaveLength(0);
  ```
- [ ] Negative case — no placeholders → no findings
- [ ] Edge case — placeholder appears in 3+ leaves across 2 top-level keys → only one finding (not one per pair)
- [ ] `test.each` for the conflict/no-conflict cases

---

### Step 6: Check 3 — banned phrasings

**Files**: `apps/native-rd/scripts/i18n/lintSource.ts`

**Commit**: `feat(native-rd/i18n): lintSource check 3 — banned phrasings from brand voice doc`

**Changes**:

- [ ] Define `BANNED_PHRASES` constant at top of file — derive from `landing/docs/BRAND_LANGUAGE.md`. The canonical set for v1:
  ```ts
  const BANNED_PHRASES: ReadonlyArray<{ phrase: string; reason: string }> = [
    // Dismissive voice / exit-asides (Anti-Patterns section)
    { phrase: "or don't", reason: "exit-aside — dismissive" },
    { phrase: "close the tab", reason: "exit-aside — dismissive" },
    { phrase: "we'll be here", reason: "exit-aside — dismissive" },
    { phrase: "drop out anytime", reason: "exit-aside — dismissive" },
    {
      phrase: "you'll know if it's for you",
      reason: "exit-aside — dismissive",
    },
    // Toxic positivity (Anti-Patterns section)
    {
      phrase: "you got this",
      reason: "toxic positivity — empty encouragement",
    },
    { phrase: "every day is a fresh start", reason: "toxic positivity" },
    { phrase: "just believe in yourself", reason: "toxic positivity" },
    // Condescension
    { phrase: "even you can", reason: "condescension" },
    { phrase: "it's so easy", reason: "condescension" },
    // Marketing punctuation / overpromise signals
    {
      phrase: "revolutionizing",
      reason: "overpromise — forbidden in product copy",
    },
    { phrase: "disrupting", reason: "overpromise — forbidden in product copy" },
    {
      phrase: "reimagining",
      reason: "overpromise — forbidden in product copy",
    },
    {
      phrase: "transforming",
      reason: "overpromise — forbidden in product copy",
    },
    // ND-othering language
    { phrase: "special needs", reason: "othering — use 'neurodivergent'" },
    {
      phrase: "differently abled",
      reason: "euphemistic — use direct ND language",
    },
    { phrase: "suffers from", reason: "deficit framing — omit 'suffers'" },
    {
      phrase: "high functioning",
      reason: "reductive — avoid functioning labels",
    },
    {
      phrase: "low functioning",
      reason: "reductive — avoid functioning labels",
    },
  ];
  ```
  Matching is case-insensitive substring match. One finding per (key, phrase) pair.
- [ ] Implement `checkBannedPhrasings(nsPath: string, tree: unknown): Finding[]`:
  - Walk all string leaves
  - For each leaf value, test against every `BANNED_PHRASES` entry (`.toLowerCase().includes(phrase)`)
  - Emit one `banned-phrasing` finding per match
  - Detail: `"matched banned phrase \"<phrase>\" (<reason>) — rephrase per BRAND_LANGUAGE.md"`
- [ ] Wire into `main()`

**Note for implementer:** The `BRAND_LANGUAGE.md` anti-patterns section and the "We ARE NOT" list are the authoritative sources. The list above reflects the doc as of 2026-05-24 (v1.2). When `BRAND_LANGUAGE.md` is updated, a follow-up PR updates this constant.

---

### Step 7: Tests for check 3

**Files**: `apps/native-rd/scripts/i18n/__tests__/lintSource.test.ts`

**Commit**: `test(native-rd/i18n): lintSource — banned phrasings check tests`

**Changes**:

- [ ] Add `describe("checkBannedPhrasings")` block
- [ ] Positive case — string contains a banned phrase:
  ```ts
  const tree = { cta: { label: "Or don't — we'll be here" } };
  const findings = checkBannedPhrasings("en/welcome.json", tree);
  expect(findings.length).toBeGreaterThanOrEqual(1);
  expect(findings[0].category).toBe("banned-phrasing");
  expect(findings[0].keyPath).toBe("cta.label");
  ```
- [ ] Positive case — matching is case-insensitive:
  ```ts
  const tree = { error: { body: "Special Needs users should..." } };
  const findings = checkBannedPhrasings("en/common.json", tree);
  expect(findings).toHaveLength(1);
  expect(findings[0].detail).toMatch("special needs");
  ```
- [ ] Negative case — clean string, no banned phrases → empty findings
- [ ] `test.each` over a representative sample of banned phrases (5–6 entries) to avoid exhaustive list
- [ ] Edge case — one leaf matches multiple banned phrases → one finding per phrase

---

### Step 8: `formatFinding` + `main()` integration + output validation test

**Files**:

- `apps/native-rd/scripts/i18n/lintSource.ts`
- `apps/native-rd/scripts/i18n/__tests__/lintSource.test.ts`

**Commit**: `feat(native-rd/i18n): lintSource main() integration + formatFinding tests`

**Changes**:

- [ ] Finalize `main()`: reads all `*.json` files from `src/i18n/resources/en/`, loads sidecar for each, runs all three checks, collects all findings into one array, prints each with `formatFinding`, prints a summary line (`X findings across Y namespaces`) if count > 0, exits 0 unconditionally
- [ ] Add `describe("formatFinding")` test block:
  ```ts
  const f: Finding = {
    category: "bare-string",
    file: "apps/native-rd/src/i18n/resources/en/welcome.json",
    keyPath: "hero.title",
    detail: "no intent sidecar entry",
  };
  expect(formatFinding(f)).toBe(
    "[bare-string] apps/native-rd/src/i18n/resources/en/welcome.json hero.title no intent sidecar entry",
  );
  ```
- [ ] Confirm all check functions are exported (so tests can import them directly without invoking `main()`)

---

## Testing Strategy

- Jest 30, Node environment (no RN globals needed — lintSource is pure TS/Node)
- Test file at `apps/native-rd/scripts/i18n/__tests__/lintSource.test.ts` — picked up by existing `testMatch: ["**/scripts/**/__tests__/**/*.test.ts"]` in `jest.config.js`
- Type-checked by existing `tsconfig.scripts-test.json` — no new tsconfig entries needed
- All check functions exported so tests import and call them directly with inline fixture objects (no filesystem access in tests)
- `test.each` for variant tables in each describe block
- No mocks needed — lintSource functions are pure (they take parsed objects as arguments, not file paths, for testability — only `main()` does the file I/O)
- Manual smoke after each commit: `bun test --testPathPatterns scripts/i18n`
- Full run: `bun run type-check && bun run test`

## Not in Scope

| Item                                                      | Reason                                                                                                                               | Follow-up                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Strict-mode promotion (exit non-zero)                     | Locked decision — policy only in v1. Three-clause criterion documented above.                                                        | Future PR after all three clauses are met     |
| Cross-namespace placeholder consistency                   | `{{title}}` meaning "goal title" vs. "UI heading" in different files is expected and correct — only intra-file conflicts are flagged | Possibly PR #8 or later                       |
| Parsing `BRAND_LANGUAGE.md` at runtime for banned phrases | Fragile; see D2. Static list updated manually when doc changes.                                                                      | None                                          |
| Register YAML integration                                 | Register YAMLs don't exist yet (PR #8). Linter uses sidecar presence as proxy for "intent documented."                               | PR #8 may revisit bare-string check heuristic |
| Auto-fix / `--fix` mode                                   | Warn-only tool; fixing is author's job. Auto-fix risks overwriting intentional copy.                                                 | None                                          |
| CI integration (run on PR diff)                           | CI workflow is PR #9. The linter just needs to exist and exit 0.                                                                     | PR #9                                         |
| Reporting to `stdout` vs. structured JSON output          | Human-readable lines are sufficient for v1. JSON output can be added if PR #9's CI integration needs it.                             | PR #9                                         |

_No items deferred that block the implementation of this PR._

## Ambiguities for Implementer

These are the open questions that arose during research. The decisions above resolve most of them — but one remains genuinely open:

**1. What counts as a "different semantic load" for placeholder conflicts?**

The heuristic in Step 4 (different top-level key prefix → potential conflict) is intentional false-positive-tolerant. If the en/ files as they stand produce many false-positive `[placeholder-conflict]` findings (e.g. `{{label}}` appears across many `a11y` sub-keys within the same top-level namespace but with consistent meaning), the implementer should raise this before shipping. Two options:

- Tighten the heuristic: require the top-level prefix AND second-level prefix to differ (e.g. `confirmDelete.message` vs. `card.label` — the second segment must also differ)
- Loosen the definition of "same semantic context" to second-level prefix matching

The current codebase has `{{label}}` appearing in `common.a11y.*` and `common.stepCard.blocker.*` and `common.stepCard.quickAction.*` and `common.goalCard.a11y.*` — all within `common.json`. These are plausibly different semantic loads for `{{label}}`. Run the linter against the real `en/` files early in implementation and observe whether the signal-to-noise ratio is acceptable.

**2. Sidecar shape validation**

The sidecar file (`<ns>.intents.json`) is described as mirroring the namespace JSON shape with `{ intent, audience?, register? }` objects at the leaves. No sidecar files exist yet. The bare-string check only needs to know if a key path HAS an entry — it does not need to validate the sidecar shape. The implementer should treat any non-null value at the key path as "covered" (i.e. `sidecar?.["hero"]?.["title"] != null` is sufficient). Full sidecar shape validation belongs in PR #8 (voice system + register).

## Discovery Log

- [2026-05-24] `lintSource.ts` originally placed `main()` with `import.meta.dir` / `import.meta.main` (matching `generate-pseudo-locale.ts`'s convention). When the test file was added, jest's babel pipeline (babel-preset-expo targeting Hermes) refused to parse `import.meta` because `unstable_transformImportMeta` isn't enabled. **Resolution:** the CLI bootstrap moved into `lintSource.cli.ts`; `lintSource.ts` is pure and exports `lintEnDir(absEnDir)` + helpers. Updated `package.json` script to the `.cli.ts` entry. Also added `"bun"` to `tsconfig.scripts-test.json`'s `types` so the test config could resolve `node:fs`/`node:path` transitively imported via `lintSource.ts`. Commit `db069eb`.
- [2026-05-24] Real-world signal check on the placeholder-conflict heuristic (Ambiguity #1): 3 findings total against the 15 en/ files — `{{label}}`, `{{count}}`, `{{title}}` each flagged once. No flood; heuristic does not need tightening for v1.
- [2026-05-24] Banned-phrasing check produces 0 findings against current en/ files — existing copy is consistent with `BRAND_LANGUAGE.md`, sanity-checks that the check isn't producing false positives.
- [2026-05-24] Bare-string check produces 264 findings (every leaf flagged, since no `*.intents.json` sidecars exist yet). This is the intended v1 signal per the locked decision — surfaces every string that would benefit from intent overrides.
