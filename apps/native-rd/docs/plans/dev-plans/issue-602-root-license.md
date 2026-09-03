# Development Plan: Issue #602

## Issue Summary

**Title**: Add a root LICENSE and fix the three license contradictions
**Type**: documentation
**Complexity**: TRIVIAL
**Estimated Lines**: ~680 lines (mostly the copied AGPL license text; hand-authored diff is ~15 lines)

## Intent Verification

- [x] `/LICENSE` exists at repo root, containing the full AGPL-3.0-only text (verbatim copy of `apps/native-rd/LICENSE`) with a one-line preamble above it
- [ ] After merge, `gh repo view --json licenseInfo` returns a non-null AGPL-3.0 result and the GitHub About sidebar shows a license chip
- [x] `packages/openbadges-core/README.md` License section reads `Apache-2.0 — see [LICENSE](./LICENSE).` and matches `package.json:61` (`"license": "Apache-2.0"`)
- [x] Root `package.json` `license` field has no leading `./` (either `SEE LICENSE IN LICENSING.md` or `AGPL-3.0-only`)
- [x] `LICENSING.md`'s "no per-se license" sentence is reworded to match the new root LICENSE's existence
- [x] `LICENSING.md`'s SPDX section no longer claims headers "will be backfilled progressively" as a commitment; it states they are optional and the package LICENSE file is authoritative
- [x] `grep -rniE '^(MIT|Apache|AGPL)' --include='*.md' . --exclude-dir=node_modules` returns no result that contradicts its package's `package.json` license

## Dependencies

| Issue | Title                                   | Status  | Type                          |
| ----- | --------------------------------------- | ------- | ----------------------------- |
| #601  | Epic: Prototype Fund readiness (parent) | 🟡 Open | Parent tracker, not a blocker |

**Status**: ✅ All dependencies met. #601 is referenced with "Part of #601" (parent epic), not "Blocked by"/"Depends on"/"After" — no hard or soft dependency marker. #602 is independently mergeable.

## Objective

Add a root `/LICENSE` file (AGPL-3.0-only text, matching `apps/native-rd/LICENSE`, the dominant product license) so GitHub's licensee detector populates `licenseInfo` and the About-sidebar license chip. Fix the three license self-contradictions the issue identifies: the MIT/Apache-2.0 mismatch in `packages/openbadges-core/README.md`, the `./`-prefixed root `package.json` license field that licensee ignores, and the stale/aspirational SPDX-backfill and "no per-se license" language in `LICENSING.md`.

## Decisions

| ID  | Decision                                                                                                                                                                                       | Alternatives Considered                                                                                         | Rationale                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Root `/LICENSE` = verbatim copy of `apps/native-rd/LICENSE` (AGPL-3.0-only) with a one-line preamble pointing to `LICENSING.md`                                                                | (a) `SEE LICENSE IN LICENSING.md` stub with no license text at root; (b) a custom multi-license disclaimer file | Issue explicitly directs this. Licensee only scans root `LICENSE`; a stub or custom text either fails detection or detects the wrong license. A single short preamble line does not break licensee's fuzzy match (see Verification).                                                                                                     |
| D2  | Root `package.json` license field: change `SEE LICENSE IN ./LICENSING.md` → `SEE LICENSE IN LICENSING.md` (drop `./`), not `AGPL-3.0-only`                                                     | Setting it to `AGPL-3.0-only`                                                                                   | The root package is a private, unpublished multi-license workspace meta-package (per `LICENSING.md`); claiming a single SPDX license on it would itself be a new contradiction. The issue offers this as the primary option; dropping `./` is the minimal fix and is what npm/SPDX tooling expects for the `SEE LICENSE IN <file>` form. |
| D3  | `LICENSING.md` "no per-se license" sentence (line 13) rewritten to state the root package.json license field points to this file, now that a root LICENSE exists for GitHub detection purposes | Delete the sentence entirely                                                                                    | The underlying fact (root workspace package has no single SPDX license) is still true and worth keeping; only the "no per-se license" framing needs updating now that a root `LICENSE` file exists (for licensee) even though no single SPDX id applies to the workspace root package.                                                   |

## Affected Areas

- `LICENSE` (new): root LICENSE file, AGPL-3.0-only text + one-line preamble
- `packages/openbadges-core/README.md`: fix License section (MIT → Apache-2.0)
- `package.json`: fix `license` field (drop `./`)
- `LICENSING.md`: reword "no per-se license" sentence; soften SPDX-backfill claim

## Implementation Plan

### Step 1: Add root LICENSE

**Files**: `LICENSE` (new)
**Commit**: `docs: add root LICENSE (AGPL-3.0-only) for GitHub license detection`
**Changes**:

- [x] Create `/LICENSE` at repo root
- [x] First line: `This repository is multi-licensed; see LICENSING.md for the per-package map.` followed by a blank line
- [x] Below that, the full, unmodified AGPL-3.0-only text from `apps/native-rd/LICENSE` (661 lines) — copy verbatim, do not touch copyright/FSF boilerplate
- [x] Do not remove or alter `apps/native-rd/LICENSE`, `packages/openbadges-core/LICENSE`, or `packages/design-tokens/LICENSE` — all three per-package files stay as-is

### Step 2: Fix openbadges-core README license contradiction

**Files**: `packages/openbadges-core/README.md`
**Commit**: `docs(openbadges-core): fix README License section to match Apache-2.0 package.json`
**Changes**:

- [x] Line 203: replace bare `MIT` under the `## License` heading with `Apache-2.0 — see [LICENSE](./LICENSE).`

### Step 3: Fix root package.json license field

**Files**: `package.json`
**Commit**: `fix: drop leading ./ from root package.json license field`
**Changes**:

- [x] Line 7: `"license": "SEE LICENSE IN ./LICENSING.md"` → `"license": "SEE LICENSE IN LICENSING.md"`

### Step 4: Reword LICENSING.md stale/aspirational claims

**Files**: `LICENSING.md`
**Commit**: `docs: reword LICENSING.md no-per-se-license and SPDX-backfill claims`
**Changes**:

- [x] Line 13 ("The root `package.json` is a private workspace meta-package — it is not published and has no per-se license; see this file.") — reword to something like: "The root `package.json` is a private, unpublished workspace meta-package; its `license` field points here rather than naming a single SPDX id, since the repo is multi-licensed per package (below). The root `LICENSE` file (AGPL-3.0-only, the dominant product license) exists solely so GitHub's license detector can populate the repository's license metadata."
- [x] Line 50 ("Existing files will be backfilled progressively; lack of an SPDX header in an older file does not change which license applies (the package's LICENSE file is authoritative).") — reword to drop the "will be backfilled progressively" commitment, e.g.: "SPDX headers are optional, not required — the package's LICENSE file is authoritative regardless of whether a given source file carries a header." (Also adjust line 43's "New source files should include" if it reads as a hard requirement; soften to "may include".)

### Step 5: Sweep fixes (contingency — none found in current sweep)

**Files**: none expected
**Commit**: `docs: fix remaining stale license claims found in sweep` (only if sweep turns up new hits)
**Changes**:

- [x] Re-run `grep -rniE '^(MIT|Apache|AGPL)' --include='*.md' . --exclude-dir=node_modules` and `grep -rln -i '## license' --include='*.md' . --exclude-dir=node_modules` at implementation time (docs may have changed since research) and fix any stale hit found beyond the one in Step 2
- [x] This step is a no-op / skip if the sweep is clean, which it was as of research (see Discovery Log)

## Testing Strategy

- [ ] Not applicable — documentation/metadata-only change, no runtime code touched
- [ ] Manual verification: `cat LICENSE` shows preamble + full AGPL-3.0-only text; `git diff` for each commit touches only the file(s) named in that step
- [ ] Manual verification: `node -e "console.log(require('./package.json').license)"` prints `SEE LICENSE IN LICENSING.md`
- [ ] Manual verification: `grep -A2 '## License' packages/openbadges-core/README.md` shows `Apache-2.0`
- [ ] Post-merge verification: `gh repo view --json licenseInfo` on `main` returns AGPL-3.0 (GitHub's licensee scan runs server-side after the LICENSE file lands on the default branch; there is no local licensee gem in this repo/CI to run it pre-merge — note as a known gap, not a blocker)

## Not in Scope

| Item                                                              | Reason                                                                | Follow-up                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| Backfilling SPDX headers across `apps/native-rd/src` (0/729)      | Issue explicitly defers this ("not this month's work")                | none                                          |
| Changing any package's actual license (AGPL/Apache/MIT)           | Issue confirms AGPL-3.0-only qualifies for PTF; no relicensing needed | none                                          |
| Adding CI/lint to enforce license-field consistency going forward | Not requested by issue; would be a separate scoped change             | possible future issue if contradictions recur |

_All other items: no items deferred beyond the above._

## Discovery Log

- [2026-09-03 impl] Sweep at implementation time found one extra stale claim beyond the plan: `apps/native-rd/docs/decisions/ADR-0005-licensing-and-trademark.md:119` still listed the `./`-prefixed license field and predated the root LICENSE. Fixed in a fifth commit. The `license: MIT` hits in `apps/native-rd/.agents/skills/vercel-*/SKILL.md` and the relay mention in `docs/architecture/local-first-sync.md` describe third-party software, not this repo's packages — left alone.

- [2026-09-03] Full-repo sweep (`grep -rniE '^(MIT|Apache|AGPL)' --include='*.md' . --exclude-dir=node_modules`) found exactly one contradiction: `packages/openbadges-core/README.md:203` (`MIT`, should be `Apache-2.0`). The five other grep hits (`apps/native-rd/docs/research/web-privacy-local-first.md`, matching "Mitigation(s)") are false positives from the case-insensitive `^AGPL` alternation catching "Mit..." at line start — not license claims.
- [2026-09-03] `grep -rln -i '## license' --include='*.md' . --exclude-dir=node_modules` found only one file with a `## License` heading in the whole repo: `packages/openbadges-core/README.md`. `packages/design-tokens/README.md`, `apps/native-rd/README.md`, and the root `README.md` either don't exist or have no License section — nothing to reconcile there.
- [2026-09-03] `apps/native-rd/package.json:5` already correctly reads `"license": "AGPL-3.0-only"` — no change needed. `packages/design-tokens/package.json` already correctly reads `"license": "MIT"` — no change needed. Only the root `package.json` (line 7) and `openbadges-core/README.md` (line 203) needed fixes, confirming the issue's own three-contradiction count (README, root package.json `./`, LICENSING.md wording) exactly.
- [2026-09-03] No CI workflow in `.github/workflows/` validates `package.json` license fields or lints markdown License sections — confirmed by scanning all 14 workflow files for "license" references (none found) and for markdown-lint-named workflows (none found). This PR's correctness rests on manual grep verification, not an automated gate.
- [2026-09-03] Licensee (GitHub's detection library) uses Dice-Sørensen fuzzy text matching against canonical SPDX license texts, with a confidence threshold around 98%. A single short preamble line ("This repository is multi-licensed; see LICENSING.md...") prepended above ~661 lines of otherwise-verbatim AGPL-3.0 text changes the similarity by a fraction of a percent — well within the fuzzy-match tolerance licensee is designed for (it already tolerates copyright-line substitutions, trailing whitespace, etc.). No local licensee gem is installed in this repo to empirically confirm; this is based on documented licensee matching behavior, and the real confirmation is the post-merge `gh repo view --json licenseInfo` check in Testing Strategy.
- [2026-09-03] No open "Blocked by"/"Depends on"/"After" marker found in the issue body. "Part of #601" is a parent-epic reference only; #601 (open) does not block this issue's independent mergeability.
