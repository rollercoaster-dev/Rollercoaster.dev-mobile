# Development Plan: Issue #183

## Issue Summary

**Title**: i18n/promptBuilder — dedup only covers banned exits, not every banned phrase named in VOICE_PREAMBLE
**Type**: tech-debt / bug
**Complexity**: TRIVIAL
**Estimated Lines**: ~60 LOC (2 files: promptBuilder.ts + promptBuilder.test.ts)

## Intent Verification

Observable criteria a reviewer can verify by running the code or reading the diff.

- [ ] When a register YAML lists `"leidet an"`, `"anders begabt"`, or `"besondere Bedürfnisse"` in `banned_phrasings`, those phrases do NOT appear as register bullet points in the assembled prompt — they are deduplicated away as preamble defaults.
- [ ] When a register YAML lists `"besonders"`, `"einzigartig"`, `"Du schaffst das!"`, or `"Großartig!"` in `banned_phrasings`, those phrases do NOT appear as register bullet points — deduplicated away.
- [ ] When a register's `banned_phrasings` contains only phrases already covered by `PREAMBLE_BANNED_ALL` (exits + ND vocab + toxic-positive), the register section renders `(none beyond preamble defaults)`.
- [ ] Dedup is case- and whitespace-insensitive for all three phrase groups (same normalization as the existing exit dedup).
- [ ] The module docstring correctly says dedup is against `PREAMBLE_BANNED_ALL` (or equivalent), not just `PREAMBLE_BANNED_EXITS`.
- [ ] `bun run type-check` and `bun run lint` pass clean.
- [ ] All existing `promptBuilder.test.ts` tests continue to pass without modification.

## Dependencies

No blockers. Issue #182 (PR closed, deferred this fix) and PR #189 (re-key sidecar, now merged) are the prior-art commits — both are on `main`.

| Issue | Title                                                          | Status           | Type      |
| ----- | -------------------------------------------------------------- | ---------------- | --------- |
| #182  | voice system prompt + per-namespace registers + sidecar loader | Merged (PR #182) | Prior-art |
| #189  | re-key intent sidecar onto synthetic dict keys                 | Merged (PR #189) | Prior-art |

**Status**: All dependencies met.

## Objective

Expand the preamble dedup set from 5 dismissive-exit phrases to all banned phrases named inline in `VOICE_PREAMBLE`. Concretely: add `PREAMBLE_BANNED_ND_VOCAB` and `PREAMBLE_BANNED_TOXIC_POSITIVE` constant arrays, build a combined `PREAMBLE_BANNED_ALL` set from all three, and dedup `register.banned_phrasings` against the combined set. The preamble prose itself is unchanged — only the dedup set widens.

This closes the drift between the module docstring claim ("same phrase never appears twice") and runtime behaviour on all 15 current register YAMLs (every one lists at least one overlap phrase).

## Decisions

| ID  | Decision                                                                                                                                                                                                                     | Alternatives Considered                                                    | Rationale                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Option A: grouped constants + combined set, preamble prose unchanged                                                                                                                                                         | Option B: collapse to single source-of-truth and render preamble from data | Option B restructures the U1-gated voice preamble shape and requires Joe review. Option A is a pure expansion of the dedup set — zero change to the rendered preamble string, zero risk to the voice content, self-contained in ~20 LOC.           |
| D2  | Export the three phrase arrays (`PREAMBLE_BANNED_ND_VOCAB`, `PREAMBLE_BANNED_TOXIC_POSITIVE`, `PREAMBLE_BANNED_EXITS`) as named exports so tests can assert against the canonical lists without hardcoding the phrases twice | Keep them module-private                                                   | The test for "falls back to '(none beyond preamble defaults)'" needs to supply the exact preamble phrases as input. Exporting avoids duplicating the lists in tests and makes future additions to a group automatically covered by existing tests. |

## Affected Areas

- `apps/native-rd/scripts/i18n/promptBuilder.ts`: add two phrase-group constants and their inline set; combine into `PREAMBLE_BANNED_ALL`; update `dedupedRegisterBans` to reference `PREAMBLE_BANNED_ALL`; update the module docstring one-liner; export all three phrase arrays.
- `apps/native-rd/scripts/i18n/__tests__/promptBuilder.test.ts`: add three new test cases covering ND-vocab dedup, toxic-positive dedup, and the `(none beyond preamble defaults)` fallback when only preamble-covered phrases are listed.

## Implementation Plan

### Step 1: Expand dedup constants and wire into `dedupedRegisterBans`

**Files**: `apps/native-rd/scripts/i18n/promptBuilder.ts`

**Commit**: `fix(i18n/promptBuilder): expand preamble dedup set to ND vocab and toxic-positive phrases`

**Changes**:

- [ ] After the existing `PREAMBLE_BANNED_EXITS` block (line 44–50), add:

  ```ts
  export const PREAMBLE_BANNED_ND_VOCAB: readonly string[] = [
    "leidet an",
    "anders begabt",
    "besondere Bedürfnisse",
  ];

  export const PREAMBLE_BANNED_TOXIC_POSITIVE: readonly string[] = [
    "besonders",
    "einzigartig",
    "Du schaffst das!",
    "Großartig!",
  ];
  ```

- [ ] Change `PREAMBLE_BANNED_EXITS` to `export const PREAMBLE_BANNED_EXITS` (so tests can reference it without hardcoding).
- [ ] Replace the `PREAMBLE_BANNED_EXIT_SET` const with a combined set:
  ```ts
  const PREAMBLE_BANNED_ALL: ReadonlySet<string> = new Set(
    [
      ...PREAMBLE_BANNED_EXITS,
      ...PREAMBLE_BANNED_ND_VOCAB,
      ...PREAMBLE_BANNED_TOXIC_POSITIVE,
    ].map(normalizeBan),
  );
  ```
- [ ] In `dedupedRegisterBans`, replace `PREAMBLE_BANNED_EXIT_SET` with `PREAMBLE_BANNED_ALL`.
- [ ] Update the module docstring (line 13) from "deduped against `PREAMBLE_BANNED_EXITS`" to "deduped against `PREAMBLE_BANNED_ALL` (exits + ND vocab + toxic-positive phrases)".
- [ ] Remove the now-unused `PREAMBLE_BANNED_EXIT_SET` const declaration (the combined set replaces it).

### Step 2: Add tests covering the widened dedup set

**Files**: `apps/native-rd/scripts/i18n/__tests__/promptBuilder.test.ts`

**Commit**: `test(i18n/promptBuilder): cover ND-vocab and toxic-positive preamble dedup`

**Changes**:

- [ ] Import `PREAMBLE_BANNED_ND_VOCAB`, `PREAMBLE_BANNED_TOXIC_POSITIVE`, `PREAMBLE_BANNED_EXITS` from `../promptBuilder`.
- [ ] Add test: `"register banned_phrasings are deduped against preamble ND vocab phrases"` — supply each phrase from `PREAMBLE_BANNED_ND_VOCAB` plus one novel phrase; assert the ND-vocab items do not appear as register bullets, the novel phrase does.
- [ ] Add test: `"register banned_phrasings are deduped against preamble toxic-positive phrases"` — same pattern for `PREAMBLE_BANNED_TOXIC_POSITIVE`.
- [ ] Add test: `"register section falls back to '(none beyond preamble defaults)' when all listed phrasings are preamble-covered (exits + ND + toxic)"` — supply a mix of one exit, one ND vocab, one toxic-positive; assert the fallback string is rendered.

## Testing Strategy

- [ ] Run `bun test --testPathPatterns promptBuilder` after Step 1 (all existing tests must pass before Step 2 adds new ones).
- [ ] Run `bun test --testPathPatterns promptBuilder` after Step 2 (all tests including new ones must pass).
- [ ] Run `bun run type-check` and `bun run lint` after Step 1.
- [ ] No manual testing required — `promptBuilder` is a pure function with full unit coverage.

## Not in Scope

| Item                                                        | Reason                                                                                                                                                                     | Follow-up                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Option B (render VOICE_PREAMBLE from data)                  | Restructures the U1-gated preamble shape; requires Joe review before touching                                                                                              | none filed yet — can be raised as a follow-up if Joe wants full single-source-of-truth |
| Removing the overlapping phrases from the 15 register YAMLs | The YAMLs are YAML source of truth for register-level voice intent; dedup in promptBuilder is the right fix layer. The redundant YAML entries are now harmlessly filtered. | none needed — filtering at assembly time is the contract                               |
| Updating ADR-0009                                           | ADR-0009 §Composition already says "deduped against the preamble" without naming the specific constant. The fix is consistent with that language — no amendment needed.    | none                                                                                   |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
