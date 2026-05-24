# Development Plan: Issue #155

## Intent Verification

- [x] Module exposed at `apps/native-rd/scripts/i18n/jsonTreeUtils.ts`, pure functions only: no I/O, no LLM calls, no logging side effects.
- [x] `deepFillMissingStrings` preserves every existing target string verbatim; rerunning against a fully translated tree returns an equivalent tree with no new gaps.
- [x] `translatableSubtree` exposes only anonymized keys (`k0..kN`) in the LLM-facing dict; real paths live only in the returned path map.
- [x] `mergeTranslations` round-trips via the path map without path drift; output source keys are emitted in source order.
- [x] Tests cover nested objects, empty target, fully populated target, mixed target, arrays of strings, and identical English strings at different paths.
- [x] `bun run type-check && bun run lint && bun run test` are clean.

## Implementation Plan

- [x] Create or reconcile `apps/native-rd/scripts/i18n/jsonTreeUtils.ts` with exported JSON/tree types, `deepFillMissingStrings`, `translatableSubtree`, and `mergeTranslations`; do not overwrite any existing untracked draft.
- [x] Model values as JSON-compatible translation trees: string leaves, arrays, and object records. Treat only strings as translatable leaves.
- [x] Define "missing" strictly as an absent key/index. Existing target strings, including `""`, count as present and must not be overwritten.
- [x] Make shape mismatches fail loudly with a thrown error instead of silently replacing target data. Examples: source branch vs target string, source string vs target object.
- [x] Implement traversal in source order. Preserve target-only keys by appending them after source keys so stale/manual target entries are not deleted.
- [x] Have `deepFillMissingStrings(source, target)` return a new target-shaped tree where missing source string leaves are filled with an internal translation-needed marker object.
- [x] Have `translatableSubtree(source, target)` return `{ dict, pathMap }`, where `dict` is insertion-ordered as `k0`, `k1`, ... and `pathMap` is an opaque internal structure containing real paths plus enough source-order shape metadata for re-merge.
- [x] Have `mergeTranslations(target, dict, pathMap)` return a new tree, write translated strings only into still-missing paths, preserve existing target strings, and throw if a dict key has no path-map entry or a path-map key has no translated string.
- [x] Add tests in `apps/native-rd/src/i18n/__tests__/jsonTreeUtils.test.ts` importing `../../../scripts/i18n/jsonTreeUtils`; this fits the current Jest `testMatch` without config churn.
- [x] Test immutability for all three exports: input source, target, dict, and path map are not mutated.
- [x] Run the focused test first with `bun run test --testPathPatterns src/i18n/__tests__/jsonTreeUtils.test.ts`, then run full `bun run type-check && bun run lint && bun run test`.

## Decisions

| ID  | Decision                                                                                | Rationale                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use absent key/index as the only missing signal.                                        | Preserves the idempotency guarantee; an empty string or English-looking target value may be intentional and must not be retranslated.                               |
| D2  | Throw on source/target shape conflicts.                                                 | Replacing a target string with an object, or vice versa, would violate "no overwrites"; silently skipping would hide broken locale data.                            |
| D3  | Keep the LLM-facing dict flat and key-anonymized; keep real paths only in the path map. | Matches invariant #3 from the parent i18n plan and prevents prompt context from leaking key names.                                                                  |
| D4  | Make the path map opaque and include source-order metadata, not just `k -> path`.       | `mergeTranslations(target, dict, pathMap)` does not receive `source`; source-order output is otherwise impossible to guarantee for already-populated target leaves. |
| D5  | Support arrays recursively, even though current `en` namespaces have no arrays.         | `TranslationTree` already allows arrays in `pseudoTransform.ts`, and the issue calls out arrays-of-strings as a coverage case if present.                           |
| D6  | Place tests under `src/i18n/__tests__` instead of `scripts/i18n`.                       | Current Jest config only discovers `**/src/**/__tests__/**/*.test.{ts,tsx}`; this avoids changing test infrastructure for a pure utility module.                    |
| D7  | Use an internal marker object for missing leaves instead of the raw source string.      | A raw English source string would be indistinguishable from an intentional existing target value and would weaken idempotency.                                      |

## Discovery Log

- Issue #155 is the first PR in the i18n LLM sync sequence and is scoped to pure tree operations only.
- Parent plan invariants relevant here: gap-only translation, key anonymization, single JSON pipeline, and runtime untouched by sync metadata.
- Current resources have 15 namespaces under `src/i18n/resources/en`, `de`, and `pseudo`.
- Current `de/*.json` files are all `{}` stubs, so empty-target behavior is the initial real-world path.
- Current `en/*.json` files contain 264 string leaves, max depth 4, and no arrays at the moment.
- Duplicate English strings exist at different paths (`"Discard"`, `"Open Settings"`, etc.), so merge identity must be path-based, never value-based.
- Existing pure tree precedent: `src/i18n/pseudoTransform.ts` exports a `TranslationTree` type and recursively handles objects and arrays without mutation.
- Existing Jest discovery excludes `scripts/**` tests; test files should either live under `src/**/__tests__` or require a Jest config change. This plan chooses the former.
- Local status showed untracked `apps/native-rd/scripts/i18n/jsonTreeUtils.ts` and `apps/native-rd/src/i18n/__tests__/jsonTreeUtils.test.ts` drafts during research; treat them as someone else's work unless ownership is confirmed.
- [2026-05-24 13:50] Implemented the missing marker as an internal object rather than the raw source string so the utilities can distinguish a gap from an intentional existing English target value.
- [2026-05-24 13:54] Final validation passed. `bun run lint` exits 0 with pre-existing warnings elsewhere in the app; `bun run test` passes 153 suites / 8277 tests with the existing worker open-handle warning. Raw `bun test` crashes in Bun before Jest runs, so validation uses the package script.
- [2026-05-24 13:58] Review fixes added exact translation-key validation, stale path-map failure, source-shape snapshotting, target-only value validation, sparse-array checks, and stronger source-order tests.
- [2026-05-24 14:00] Post-review validation passed: `bun run type-check`, `bun run lint` (0 errors, pre-existing warnings), `bun run test` (153 suites / 8281 tests), and `bun run build`.

## Not in Scope

- Reading or writing locale files.
- Calling an LLM or validating LLM output shape beyond the anonymized translation dict contract.
- Placeholder validation for `{{name}}`; that belongs to `placeholderGuard.ts`.
- Prompt building, register/intent sidecars, glossary logic, or model selection.
- CI workflow changes or bot commit-back behavior.
- Generating German translations.
