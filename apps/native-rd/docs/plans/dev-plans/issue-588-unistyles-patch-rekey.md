# Development Plan: Issue #588

## Issue Summary

**Title**: [Sentry NATIVE-RD-4 / NATIVE-RD-9] Unistyles shadow-tree double-free is back: the #271 patch stopped applying when #512 bumped unistyles to 3.3.0
**Type**: bug (regression) + CI hardening
**Complexity**: MEDIUM
**Estimated Lines**: ~150-180 lines (mostly a renamed patch file + a new guard script; app source is untouched)

## Intent Verification

- [x] `grep -r 'takeUpdates\|isActiveUnistylesFamily' apps/native-rd/node_modules/react-native-unistyles/cxx/` returns matches in `UnistylesRegistry.cpp`, `UnistylesRegistry.h`, `ShadowTrafficController.h`, and `ShadowTreeManager.cpp` after a clean `bun install` (currently returns nothing).
- [x] The `patchedDependencies` key in root `package.json` and the key inside `bun.lock`'s own `patchedDependencies` block both read `react-native-unistyles@3.3.0` (currently `bun.lock` has **no** entry for `react-native-unistyles` in `patchedDependencies` at all — bun silently dropped the stale `@3.2.5` key).
- [x] `bun run check:patches` exits 0 on the fixed tree and exits 1 (with a message naming the mismatched key and the fix command) when run against the current `main` state (key `@3.2.5` vs. resolved `3.3.0`).
- [x] `apps/native-rd/package.json` pins `react-native-unistyles` to an exact version (no `^`), and `.github/dependabot.yml` ignores it, so a future group bump cannot move the resolved version out from under the patch key without a human touching the patch too.
- [x] CI (`ci-native-rd.yml`) fails on a PR that reintroduces the mismatch (patch key vs. lockfile-resolved version) via the new `check:patches` step, before any native build is attempted.

_Native-crash absence ("no new ShadowTreeManager crashes in Sentry for 7 days") is an operational acceptance criterion for the issue as a whole, not something verifiable from a dev-plan PR — see "Not in Scope" and the manual-verification callouts below._

## Dependencies

| Issue | Title                                                         | Status | Type                                    |
| ----- | ------------------------------------------------------------- | ------ | --------------------------------------- |
| #270  | Original SIGSEGV report                                       | Closed | Prior art                               |
| #271  | Vendor unistyles PR #1191 patch (`@3.2.5`)                    | Closed | Prior art                               |
| #279  | C++ guard + JS in-flight guard follow-up                      | Closed | Prior art                               |
| #512  | Dependabot 23-package group bump, moved unistyles to `^3.3.0` | Closed | Root cause of regression, not a blocker |
| #54   | Original ShadowTreeManager SIGSEGV plan                       | Closed | Prior art                               |
| #56   | SIGABRT post-PR-271 plan                                      | Closed | Prior art                               |

**Status**: ✅ No unmet dependencies. `has_blockers = false`. #512 is cited as the historical cause, already merged — nothing to wait on.

## Objective

Restore the vendored unistyles shadow-tree fix (originally landed in #271/#279) so it actually applies against the currently-resolved `react-native-unistyles@3.3.0`, and add a repo-level guard so a `patchedDependencies` key silently falling out of sync with the lockfile fails CI instead of shipping unnoticed for three weeks.

## Decisions

| ID  | Decision                                                                                                                                                                                    | Alternatives Considered                                                                                                                              | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Re-key by renaming the existing patch file and updating the `patchedDependencies` key, rather than re-deriving the C++ changes from upstream PR #1191                                       | (a) Regenerate hunks manually assuming they've drifted, as the issue body speculates; (b) Vendor a fresh copy of PR #1191 against 3.3.0 from scratch | Verified via `git apply --check` and `git hash-object` that `cxx/core/UnistylesRegistry.{cpp,h}`, `cxx/shadowTree/ShadowTrafficController.h`, and `cxx/shadowTree/ShadowTreeManager.cpp` are **byte-identical** between 3.2.5 and 3.3.0 (blob hashes in the patch's pre-image headers match `git hash-object` of the installed 3.3.0 files exactly). The issue's premise that "the RN >= 0.81 `tagToProps` branch is new" does not hold for this repo's installed 3.3.0 — the patch applies verbatim with zero hunk rework. |
| D2  | Use `bun patch react-native-unistyles` / `bun patch --commit react-native-unistyles` to regenerate the patch (re-applying the identical edits) rather than a bare `mv` + hand-edited header | Bare rename of the `.patch` file plus manual `package.json`/`bun.lock` edits                                                                         | `bun patch --commit` is the canonical path: it writes the new `patches/<pkg>@<version>.patch`, updates `package.json`'s `patchedDependencies`, and updates `bun.lock`'s `patchedDependencies` block in one step, avoiding hand-maintained lockfile edits that `bun install --frozen-lockfile` could reject as inconsistent.                                                                                                                                                                                                 |
| D3  | Add the guard as a new standalone script `scripts/check-patches.ts`, not folded into `scripts/check-install.ts`                                                                             | Extend `check-install.ts` to also check patches                                                                                                      | `check-install.ts` checks _presence_ of `node_modules` entries; this checks _version-key alignment_ between `package.json` and `bun.lock`. Different failure modes, different fix instructions. Keeping them separate keeps each script's error output actionable.                                                                                                                                                                                                                                                          |
| D4  | Wire `check:patches` in as an explicit CI step (not only via the root `type-check`/`build` scripts)                                                                                         | Rely on `bun run type-check` alone                                                                                                                   | `ci-native-rd.yml`'s "Typecheck" step calls `bun run turbo type-check --filter=native-rd` directly — it does **not** go through the root aggregator script that runs `check:install`/`check:patches` first. An explicit "Verify patched dependencies" step after `bun install --frozen-lockfile` is the only way to guarantee it runs in CI.                                                                                                                                                                                |
| D5  | Pin `react-native-unistyles` to an exact version in `apps/native-rd/package.json` and add it to the Dependabot ignore list                                                                  | Leave `^3.3.0` and rely solely on the new CI guard                                                                                                   | The guard catches the regression at PR time, but an exact pin removes the failure mode entirely for solo patch bumps (non-grouped Dependabot PRs), matching the existing pattern already used for `react-native`/`react-native-reanimated`/etc. in `dependabot.yml`. Belt-and-suspenders, consistent with an existing repo convention.                                                                                                                                                                                      |

## Affected Areas

- `patches/react-native-unistyles@3.2.5.patch` → renamed to `patches/react-native-unistyles@3.3.0.patch` (content unchanged; regenerated via `bun patch --commit` for canonical diff headers against the 3.3.0 blob hashes).
- `package.json` (root): `patchedDependencies` key `react-native-unistyles@3.2.5` → `react-native-unistyles@3.3.0`; new `check:patches` script; `type-check`/`build` scripts gain the `check:patches` step (mirrors existing `check:install` wiring).
- `bun.lock`: `patchedDependencies` block gains the `react-native-unistyles@3.3.0` entry (currently absent — bun dropped the stale key silently).
- `apps/native-rd/package.json`: `"react-native-unistyles": "^3.3.0"` → `"react-native-unistyles": "3.3.0"` (exact pin).
- `.github/dependabot.yml`: add `react-native-unistyles` to the unconditional ignore list (same shape as the existing `react-native`/`react-native-reanimated` entries).
- `scripts/check-patches.ts` (new): reads root `package.json` `patchedDependencies`, cross-checks each `name@version` key against `bun.lock`'s resolved version for `name` and against `bun.lock`'s own `patchedDependencies` block; exits 1 with an actionable message on any mismatch or missing patch file.
- `.github/workflows/ci-native-rd.yml`: add `patches/**` to the trigger path filter; add a "Verify patched dependencies" step running `bun run check:patches` right after `bun install --frozen-lockfile`.
- `.github/workflows/ci-packages.yml`: same two additions, for symmetry — the guard is package-name-agnostic and also covers the existing `ajv-formats@3.0.1` patch.

## Implementation Plan

### Step 1: Add the CI guard script (fails against current `main`, demonstrating the bug)

**Files**: `scripts/check-patches.ts` (new), `package.json` (add `check:patches` script; wire into `type-check`/`build`)
**Commit**: `chore(ci): add check-patches guard for patchedDependencies/bun.lock drift`
**Changes**:

- [x] Create `scripts/check-patches.ts` (standalone `bun` script, same style/imports as `scripts/check-install.ts` — plain `node:fs`/`node:path`, no new deps):
  - Read root `package.json`, get `patchedDependencies` (`Record<string, string>`).
  - Read `bun.lock` as text; strip trailing commas before `}`/`]` with `text.replace(/,(\s*[}\]])/g, "$1")` (bun.lock is JSON-with-trailing-commas, not strict JSON — confirmed `JSON.parse` fails without this, succeeds after), then `JSON.parse`.
  - For each `patchedDependencies` key `name@version` (split on the **last** `@` to handle scoped packages like `@scope/name@1.2.3`):
    - Confirm the patch file referenced exists on disk.
    - Look up `lock.packages[name][0]` (e.g. `"react-native-unistyles@3.3.0"`), extract its version, and compare to the key's version. Mismatch → push an error naming the exact rename/`bun patch` fix command.
    - Confirm the same key exists in `lock.patchedDependencies` (bun silently drops keys that don't resolve — this is the actual failure mode that hid the regression for 3 weeks). Missing → push an error saying `bun install` needs to be re-run and `bun.lock` committed.
  - Print all errors and `process.exit(1)` if any; otherwise print a one-line success message with the count of patches verified.
- [x] Add `"check:patches": "bun scripts/check-patches.ts"` to root `package.json` scripts.
- [x] Update `"type-check"` to `"bun run check:install && bun run check:patches && bun run turbo type-check"` and `"build"` to `"bun run check:install && bun run check:patches && bun run turbo build"` (mirrors existing `check:install` wiring, keeps root-level invocations covered even though CI's per-workspace `turbo` calls need the explicit step below too).

**Verify**:

```bash
bun run check:patches
# Expected on current main (before Step 2): exit 1, error naming
# "react-native-unistyles@3.2.5" vs resolved "3.3.0", and noting it's
# missing from bun.lock's patchedDependencies block.
```

### Step 2: Re-key and regenerate the unistyles patch against 3.3.0

**Files**: `patches/react-native-unistyles@3.2.5.patch` (deleted), `patches/react-native-unistyles@3.3.0.patch` (new), `package.json`, `bun.lock`
**Commit**: `fix(native-rd): re-key unistyles shadow-tree patch to 3.3.0`
**Changes**:

- [x] `bun patch react-native-unistyles` — bun resolves the currently-installed version (3.3.0) and unlinks a writable copy into `node_modules/react-native-unistyles`.
- [x] Re-apply the existing patch's edits inside that writable copy: `patch -p1 < patches/react-native-unistyles@3.2.5.patch` (proven to apply cleanly — see D1) against `node_modules/react-native-unistyles`, or hand-apply the same 4 hunks (`UnistylesRegistry.cpp`, `UnistylesRegistry.h`, `ShadowTrafficController.h`, `ShadowTreeManager.cpp`) if `bun patch`'s working copy path differs from a plain `-p1` root.
- [x] `bun patch --commit react-native-unistyles` — writes `patches/react-native-unistyles@3.3.0.patch`, updates `package.json`'s `patchedDependencies` key, updates `bun.lock`'s `patchedDependencies` block.
- [x] `rm patches/react-native-unistyles@3.2.5.patch` if `bun patch --commit` didn't already remove the old file.
- [x] `git diff patches/react-native-unistyles@3.3.0.patch` against the old `@3.2.5.patch` content — expect no substantive diff (confirmed identical blob hashes in Step 0 research); if the diff is non-trivial, stop and investigate rather than assuming — that would mean the installed tree differs from what research found.

**Verify**:

```bash
bun install --frozen-lockfile
grep -r 'takeUpdates\|isActiveUnistylesFamily' apps/native-rd/node_modules/react-native-unistyles/cxx/
# Expected: 6 matches across UnistylesRegistry.{cpp,h}, ShadowTrafficController.h, ShadowTreeManager.cpp
bun run check:patches
# Expected: exit 0, "1 patch(es) verified" (or however many patchedDependencies exist)
```

### Step 3: Pin the version and add the Dependabot ignore

**Files**: `apps/native-rd/package.json`, `.github/dependabot.yml`
**Commit**: `chore(native-rd): pin react-native-unistyles exact version, ignore in dependabot`
**Changes**:

- [x] `apps/native-rd/package.json`: `"react-native-unistyles": "^3.3.0"` → `"react-native-unistyles": "3.3.0"`.
- [x] `.github/dependabot.yml`: add `- dependency-name: "react-native-unistyles"` to the unconditional-ignore block (same shape/no `update-types` filter as the existing `react-native`, `react-native-reanimated`, `react-native-worklets` entries) with a one-line comment explaining why (patched dependency, must be bumped in lockstep with re-generating the patch — refs #588).

**Verify**:

```bash
bun install --frozen-lockfile   # confirms exact pin + existing patch key still resolve together
bun run check:patches           # still exit 0
```

### Step 4: Wire the guard into CI

**Files**: `.github/workflows/ci-native-rd.yml`, `.github/workflows/ci-packages.yml`
**Commit**: `chore(ci): run check:patches in native-rd and packages validate jobs`
**Changes**:

- [x] `ci-native-rd.yml`: add `"patches/**"` to the `pull_request.paths` list (currently triggers on `bun.lock`/`package.json`/etc. but not the `patches/` dir itself — a patch-file-only edit wouldn't otherwise re-trigger this workflow).
- [x] `ci-native-rd.yml`: add a step `- name: Verify patched dependencies` / `run: bun run check:patches` immediately after the existing `Install dependencies` step and before `Typecheck` (fails fast, before spending time on typecheck/lint/test/storybook).
- [x] `ci-packages.yml`: same two additions (path filter + step after `Install dependencies`), since the guard also covers the `ajv-formats@3.0.1` patch relevant to `packages/*`.

**Verify**:

```bash
# No native tool can execute GitHub Actions locally in this environment.
# Manual verification: open the PR, confirm the "Verify patched dependencies"
# step appears and passes in both ci-native-rd and ci-packages workflow runs.
```

## Testing Strategy

- [x] `scripts/check-patches.ts` has no automated test harness, matching the existing convention for `scripts/check-install.ts` (no `__tests__` coverage, no root-level Jest/Vitest project targets `scripts/`). Verification is manual: run `bun run check:patches` against both the broken state (Step 1, before Step 2) and the fixed state (after Step 2), confirming exit codes 1 and 0 respectively. If a maintainer later wants automated coverage, mirroring `check-install.ts`'s style with a root-level test runner would be a separate, follow-up change — not blocking this PR.
- [x] Manual: `grep -r 'takeUpdates\|isActiveUnistylesFamily' apps/native-rd/node_modules/react-native-unistyles/cxx/` after a clean `bun install --frozen-lockfile` — must return the 6 marker matches.
- [x] Manual: `bun run type-check`, `bun run lint`, `bun run test` (root) all still pass — no application source changes in this PR, so no regression expected, but confirms the new `check:patches` step doesn't break the existing script chain.
- [ ] **Cannot be verified in this environment** (flagged per task instructions):
  - Native rebuild (`npx expo run:ios` / `npx expo run:android`) is required to actually compile the patched C++ into a binary — this sandbox has no Xcode/Android SDK/simulator/device access.
  - The "14-theme rapid-toggle smoke test" from the issue's checklist needs a running app on a simulator or device.
  - TestFlight/internal build + 7-day Sentry watch on `NATIVE-RD-4`/`NATIVE-RD-9` is an operational step after release, not something a dev-plan PR can satisfy.
  - Marking the Sentry issues resolved requires Sentry API/dashboard access not available here.

## Not in Scope

| Item                                                                                                          | Reason                                                                                                                                                      | Follow-up                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Re-deriving the C++ fix from upstream PR #1191 from scratch                                                   | Verified unnecessary — 3.2.5 and 3.3.0 are byte-identical in the 4 patched files (D1)                                                                       | none                                                                                                           |
| Upstreaming the fix to `jpudysz/react-native-unistyles` (PR #1191 is still closed-unmerged, #1179 still open) | Out of scope for an internal regression fix; would need a maintainer-reproducible repro, which prior plans (#54) already noted blocked #1191's merge        | Could file a comment linking our vendored patch, but not required for this issue                               |
| Automated test coverage for `scripts/check-patches.ts`                                                        | No existing root-level test harness covers `scripts/`; matches `check-install.ts` precedent                                                                 | Could add a lightweight root Jest/Vitest project for `scripts/` as a separate infra PR                         |
| Adding `check:patches` to `build-internal.yml`/`build-production.yml`/other release workflows                 | Those already run `bun install --frozen-lockfile`; the PR-gating `ci-native-rd`/`ci-packages` workflows are sufficient to catch the regression before merge | Revisit if a release-time bypass (e.g. direct push to `main` skipping PR CI) is ever identified as a real risk |
| Native rebuild, rapid-toggle smoke test, TestFlight rollout, 7-day Sentry watch                               | Requires physical device/simulator/Sentry dashboard access unavailable in this environment                                                                  | Manual QA pass by the assignee after this PR merges, per the issue's own checklist                             |

## Discovery Log

- [2026-08-20 implement] **Step order swapped (1 <-> 2).** Step 1 (guard script) could not be committed first: the husky `pre-commit` hook runs `bun run type-check`, which now chains `check:patches`, so the guard correctly failed its own commit against the still-broken tree. Landed the fix (plan Step 2) as commit 1 and the guard (plan Step 1) as commit 2. The guard's fail-then-pass behaviour was still verified in both directions before committing — exit 1 naming `react-native-unistyles@3.2.5` vs resolved `3.3.0`, exit 0 after the re-key.
- [2026-08-20 implement] Independently re-confirmed D1 with `git hash-object` on all four installed 3.3.0 files — every hash matches the patch's pre-image blob header, and `patch -p1 --dry-run` applied with zero fuzz. Additionally, the regenerated `@3.3.0.patch` has **identical `index` lines** (both pre- and post-image hashes) to the old `@3.2.5.patch`, proving the patched output is byte-for-byte what #271 shipped. Only bun's hunk boundaries and `@@` function-context labels differ.
- [2026-08-20 implement] `bun patch --commit` **added** the `@3.3.0` key but did **not** remove the stale `@3.2.5` key or its patch file — both had to be deleted manually, otherwise `check:patches` would have kept failing on the orphaned key. Worth knowing for the next re-key.
- [2026-08-20 implement] Added `scripts/**` (not just `patches/**`, as planned) to both workflows' path filters, since `scripts/check-patches.ts` is now a CI dependency and a guard-script-only edit would otherwise not re-trigger the workflow enforcing it.
- [2026-08-20 implement] Guard also detects the reverse drift (a key in `bun.lock` absent from `package.json`), which costs three lines and closes the other half of the desync.
- [2026-08-20 implement] Root `eslint.config.mjs` cannot execute — `@eslint/js` is not installed at the repo root. Pre-existing, unrelated to this change; `bun run lint` runs per-workspace configs via turbo and passes. `scripts/**` already has `no-console` disabled there, so the guard's output style is compliant.
- [2026-08-20] Verified via `git apply --check` and `git hash-object` that the 4 files touched by `patches/react-native-unistyles@3.2.5.patch` (`cxx/core/UnistylesRegistry.cpp`, `cxx/core/UnistylesRegistry.h`, `cxx/shadowTree/ShadowTrafficController.h`, `cxx/shadowTree/ShadowTreeManager.cpp`) are byte-identical between 3.2.5 and the installed 3.3.0 — the patch applies with zero hunk conflicts. This contradicts the issue body's stated assumption that "the old hunks will not apply verbatim" because of a new RN >= 0.81 `tagToProps` branch; that branch already existed, unchanged, in the pre-image context the patch was generated against.
- [2026-08-20] Confirmed the exact desync: root `package.json`'s `patchedDependencies` still has `react-native-unistyles@3.2.5`, but `bun.lock`'s own `patchedDependencies` block has **no entry at all** for `react-native-unistyles` — PR #512's `bun.lock` diff shows the line `"react-native-unistyles@3.2.5": "patches/..."` being deleted outright (not updated to `@3.3.0`) when the dependency bump landed, while the root `package.json` key was left stale. This is why the failure is silent: bun doesn't warn on an unresolvable `patchedDependencies` key, it just omits it from the lockfile.
- [2026-08-20] `bun.lock` is not strict JSON (trailing commas before closing `}`/`]`); `scripts/check-patches.ts` must strip them (`text.replace(/,(\s*[}\]])/g, "$1")`) before `JSON.parse`, confirmed via a `bun -e` scratch test.
- [2026-08-20] `ci-native-rd.yml`'s "Typecheck" step calls `bun run turbo type-check --filter=native-rd` directly, bypassing the root `type-check` script (which runs `check:install`/`check:patches` first) — the guard needs an explicit CI step, not just root-script wiring, or it will never actually run in CI.
