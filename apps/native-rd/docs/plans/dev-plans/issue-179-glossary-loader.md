# Development Plan: Issue #179

## Issue Summary

**Title**: i18n sync: glossary loader + initial glossary content
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~60 hand-written (loader + tests + syncCore wiring) + ~20 LOC `glossary.txt` content

## Background

ADR-0009 defined the three-layer voice enforcement stack: (1) per-namespace register YAML, (2) per-string intent sidecar JSON, (3) thin glossary string. Layers 1 and 2 shipped in #162/#182 and #180 respectively. Layer 3 — the glossary slot — has been plumbed through `PromptBuilderInput.glossary?: string` and `TranslateNamespaceOptions.glossary?: string` since #162, but `syncCore.ts` never loads anything into it; every call passes `glossary: undefined`. This PR wires the slot by adding `glossaryLoader.ts` (mirrors `intentLoader.ts` style), authoring `_register/glossary.txt` with initial brand terms, and updating `syncCore.syncOneNamespace` to load and pass the string.

**Type note:** `glossary` in `PromptBuilderInput` and `TranslateNamespaceOptions` is already typed as `string` (a pre-formatted, ready-to-render string), not `string[]`. The loader reads the `.txt` file into `string[]`, then `syncCore.ts` joins the lines into a single string before passing it down. This matches `formatGlossary` in `promptBuilder.ts`, which expects a string and renders it after a `## Glossary` header.

## Intent Verification

- [ ] `glossaryLoader.ts` returns `[]` when `glossary.txt` is absent; does not throw.
- [ ] `glossaryLoader.ts` returns `[]` when `glossary.txt` is present but all lines are blank or comments.
- [ ] `glossaryLoader.ts` strips `#`-prefixed comment lines and blank lines; returns only non-empty, non-comment lines as `string[]`.
- [ ] `syncCore.syncOneNamespace` passes a non-empty glossary string to `translateNamespace` when `glossary.txt` exists with content. The LLM system prompt contains the `## Glossary` header and the term text.
- [ ] `syncCore.syncOneNamespace` passes `undefined` for `glossary` when `glossary.txt` is absent or produces an empty array.
- [ ] `glossary.txt` is present with initial terms; every entry is traceable to `landing/docs/BRAND_LANGUAGE.md` or the native-rd product copy (`docs/launch/store-listing-copy.md`).

## Dependencies

| Issue | Title                                                                           | Status                                       | Type    |
| ----- | ------------------------------------------------------------------------------- | -------------------------------------------- | ------- |
| #162  | i18n sync: voice system prompt + per-namespace registers + sidecar loader + ADR | Merged (commit dd5d4e7, PR #182, 2026-05-25) | Blocker |
| #180  | fix(native-rd/i18n): re-key intent sidecar onto synthetic dict keys             | Merged (commit f3e62bc, PR #189, 2026-05-25) | Soft    |

**Status**: All dependencies met. `glossary?: string` slot exists in both `PromptBuilderInput` and `TranslateNamespaceOptions`. `buildSystemPrompt` already renders it under `## Glossary` when non-empty. `syncCore.ts` currently passes no glossary.

## Objective

Add `glossaryLoader.ts`, author `_register/glossary.txt` with brand-anchored initial terms, update `syncCore.syncOneNamespace` to load and forward the glossary, and add a focused test asserting the glossary content reaches the LLM system prompt.

## Decisions

| ID  | Decision                                                                                                | Alternatives Considered                                                | Rationale                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Loader returns `string[]`; `syncCore.ts` joins with `\n` before passing to `translateNamespace`.        | Loader returns a pre-joined `string`.                                  | Keeps the loader a pure data reader. The join is one line in syncCore and is easier to test. Matches the pattern where `readRegisterText` returns raw string, `parseRegister` structures it — loader is the equivalent of "read raw, caller decides shape."      |
| D2  | Glossary file is `_register/glossary.txt`, not namespaced per-namespace.                                | Per-namespace glossary file (e.g. `common.glossary.txt`).              | The glossary is brand-global, not namespace-specific. Rollercoaster.dev, Sam, Cal, ND are relevant to every namespace. One global file keeps authoring friction low for v1.                                                                                      |
| D3  | `syncCore.ts` reads `glossary.txt` from `paths.registerDir` (same dir as the register YAMLs).           | A separate `glossaryDir` field on `SyncPaths`.                         | `registerDir` already points to `_register/`, which is exactly where `glossary.txt` lives. Adding a new field to `SyncPaths` just to hold the same directory would bloat the type for no benefit.                                                                |
| D4  | Missing file → `[]` (graceful); present-but-empty → `[]` (graceful); no "malformed" concept for `.txt`. | Throw on missing file like `readRegisterText` does for register YAMLs. | The register YAMLs are required per-namespace (a missing register is always a content-authoring error). The glossary is optional brand content — missing is the common bootstrap case. Mirrors `loadIntentSidecar` semantics.                                    |
| D5  | Test lives in a new `syncCore.glossary.test.ts`, not appended to `syncCore.intents.test.ts`.            | Append to existing `syncCore.intents.test.ts`.                         | Following the pattern established by D4 in issue #162: focused unit tests stay in focused files. `syncCore.intents.test.ts` already exists and is stable; appending to it conflates two distinct wiring concerns.                                                |
| D6  | No `.cli.ts` split for `glossaryLoader.ts`.                                                             | Split into `glossaryLoader.ts` + `glossaryLoader.cli.ts`.              | The loader is a pure function using only `node:fs` with no `import.meta` usage — there is nothing to split. The `.cli.ts` pattern exists to isolate `import.meta.dir` from Jest's babel-jest pipeline. See project memory: "split `import.meta` into `.cli.ts`." |

## Affected Areas

- `apps/native-rd/scripts/i18n/glossaryLoader.ts`: new file — reads `_register/glossary.txt`, strips comments and blanks, returns `string[]`. Missing file → `[]`.
- `apps/native-rd/scripts/i18n/__tests__/glossaryLoader.test.ts`: new test file — covers missing file, empty/comment-only file, mixed file, whitespace stripping.
- `apps/native-rd/scripts/i18n/syncCore.ts`: add `loadGlossary` import, call it from `syncOneNamespace`, join non-empty result into a string and pass as `glossary` to `translateNamespace`.
- `apps/native-rd/scripts/i18n/__tests__/syncCore.glossary.test.ts`: new focused test — asserts glossary content appears in the assembled system prompt via mocked `callModel`.
- `apps/native-rd/src/i18n/resources/_register/glossary.txt`: new content file — initial brand terms.

## Implementation Plan

### Step 1: `glossaryLoader.ts` + unit tests

**Files**:

- `apps/native-rd/scripts/i18n/glossaryLoader.ts`
- `apps/native-rd/scripts/i18n/__tests__/glossaryLoader.test.ts`

**Commit**: `feat(native-rd/i18n): glossaryLoader — read _register/glossary.txt`

**Changes**:

- [ ] Create `glossaryLoader.ts` using only `node:fs` (`readFileSync`) and `node:path` (`join`). No Bun-specific APIs, no `import.meta`.
- [ ] Export `loadGlossary(registerDir: string): string[]`.
- [ ] Read `join(registerDir, "glossary.txt")`. On `ENOENT` return `[]`. On other errors wrap and rethrow with descriptive message.
- [ ] Filter lines: trim each line, drop empty strings and lines starting with `#`.
- [ ] Write `glossaryLoader.test.ts` covering:
  - Missing file → `[]`
  - File with only blank lines → `[]`
  - File with only `#` comment lines → `[]`
  - Mixed file: comments, blanks, and terms → returns only the term lines
  - Whitespace trimming on term lines
  - Non-ENOENT read error wraps and rethrows with message

### Step 2: Wire into `syncCore.ts` + integration test

**Files**:

- `apps/native-rd/scripts/i18n/syncCore.ts`
- `apps/native-rd/scripts/i18n/__tests__/syncCore.glossary.test.ts`

**Commit**: `feat(native-rd/i18n): syncCore — wire glossary into translateNamespace`

**Changes**:

- [ ] Add `import { loadGlossary } from "./glossaryLoader"` to `syncCore.ts`.
- [ ] In `syncOneNamespace`, after loading the register and intents, call `loadGlossary(paths.registerDir)`.
- [ ] Convert the result to `string | undefined`: join with `\n` if the array is non-empty, otherwise `undefined`. Pass as `glossary` to `translateNamespace`.
- [ ] Write `syncCore.glossary.test.ts` using the same fixture helper pattern as `syncCore.intents.test.ts` (tmpdir, mock `callModel`):
  - When `glossary.txt` exists with content, the assembled system prompt contains `## Glossary` and the term text.
  - When `glossary.txt` is absent, the assembled system prompt does not contain `## Glossary`.

### Step 3: Author `glossary.txt` initial content

**Files**:

- `apps/native-rd/src/i18n/resources/_register/glossary.txt`

**Commit**: `content(native-rd/i18n): _register/glossary.txt — initial brand terms`

**Changes**:

- [ ] Create `glossary.txt` with the following initial terms (format: one entry per line, descriptive hint after `→`):

```
# Brand name — never translate, always roman script
Rollercoaster.dev → Rollercoaster.dev (do not translate; keep punctuation and casing)

# App identifier (hyphenated slug form, appears in technical contexts)
native-rd → native-rd (do not translate)

# Persona names — these are fictional ND user personas used in the product
# Source: apps/native-rd/docs/launch/store-listing-copy.md; confirmed stable
Sam → Sam (persona name, do not translate)
Cal → Cal (persona name, do not translate)

# ND identity vocabulary — use identity-first forms
# Source: VOICE_PREAMBLE in promptBuilder.ts, landed in #162 from BRAND_LANGUAGE.md
ND → ND (abbreviation for neurodivergent; do not expand or translate)
neurodivergent → neurodivergent (identity-first noun; do not translate)

# OpenBadges standard — proper noun, do not translate
Open Badges → Open Badges (open standard name; do not translate)
```

**Provenance notes** (for reviewer):

- `Rollercoaster.dev`: product name, appears throughout `en/*.json` and store copy.
- `native-rd`: repo/app slug, used in technical copy and CI.
- `Sam`, `Cal`: user persona names, referenced in `AGENTS.md` (memory note: "Joe is in recovery since 2019 / lived-experience reviewer for Sam persona"); no persona-specific markdown file found in this worktree — `landing/docs/` is a sibling repo not present here. If `landing/docs/BRAND_LANGUAGE.md` names different personas or adds badge names, those should be added when that file is accessible.
- `ND`, `neurodivergent`: identity-first vocabulary established in `VOICE_PREAMBLE` (sourced from `BRAND_LANGUAGE.md` per `promptBuilder.ts` comment).
- `Open Badges`: proper noun from OB3 standard; referenced in store copy and architecture docs.

## Testing Strategy

- [ ] Unit tests in `glossaryLoader.test.ts` — pure fs I/O, no mocking needed beyond tmpdir fixture (same pattern as `intentLoader.test.ts`). Use `test.each` for the blank/comment/missing variants.
- [ ] Integration test in `syncCore.glossary.test.ts` — mock `callModel`, assert system prompt string contains glossary content. Mirrors `syncCore.intents.test.ts` structure.
- [ ] `tsconfig.scripts-test.json` already includes `"bun"` types and `scripts/**/__tests__/**/*.ts` — no config changes needed.
- [ ] No `.cli.ts` split — `glossaryLoader.ts` uses only `node:fs`, no `import.meta`.
- [ ] Run: `bun test --testPathPatterns glossaryLoader` and `bun test --testPathPatterns syncCore.glossary` to verify.

## Not in Scope

| Item                                                                                | Reason                                                                                           | Follow-up                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------ |
| Per-namespace glossary files                                                        | Brand terms are global; per-namespace splits deferred                                            | None planned                   |
| Badge-specific term entries (`Rollercoaster Badge`, etc.)                           | Landing/persona docs not present in this worktree; full badge name corpus needs authoring review | Follow-up after first sync run |
| `--glossary` CLI flag to override or disable the file                               | Unnecessary complexity for v1; load is always from `_register/glossary.txt`                      | None planned                   |
| German-language canonical forms (e.g. "Rollercoaster.dev bleibt Rollercoaster.dev") | Glossary format for v1 is do-not-translate only; German-form mapping is a future enhancement     | None planned                   |

## Open Questions

1. **Persona names `Sam` / `Cal`**: `landing/docs/BRAND_LANGUAGE.md` is not in this worktree (sibling repo). The persona names appear in `AGENTS.md` memory notes but no persona-specific markdown was found under `apps/native-rd/docs/`. If these names are not yet used in any `en/*.json` key values, they carry no translation risk yet and could be deferred. Recommend: include them in v1 glossary as a defensive measure; they are cheap to add and the format is self-documenting.

2. **Sam persona framing**: Memory note flags Sam content as needing recovery-context review from Joe. The glossary entry just says "do not translate" — there is no framing content here. No review gate required for this PR.

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
