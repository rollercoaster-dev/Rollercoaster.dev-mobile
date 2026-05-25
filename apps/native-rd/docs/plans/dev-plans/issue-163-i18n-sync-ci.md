# Development Plan: Issue #163

## Issue Summary

**Title**: i18n sync: CI workflow + bot identity for diff-aware de/ commit-back
**Type**: feature (CI infrastructure)
**Complexity**: SMALL
**Estimated Lines**: ~110 LOC hand-written YAML across 2 files

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a
user/system perspective — not generic checklists.

- [ ] Opening a PR that modifies any file under `apps/native-rd/src/i18n/resources/en/**`
      triggers the `i18n-sync` workflow; a PR that does not touch that path does not trigger it.
- [ ] When triggered from a fork PR the sync job is skipped entirely — no LLM call, no secret
      exposure.
- [ ] When `en/` files changed and de/ gaps exist, the workflow runs `bun run i18n:sync`,
      commits any resulting `de/` diff back to the PR branch, and the PR diff shows both `en/` and
      `de/` changes.
- [ ] When `en/` files changed but the sync produces no de/ diff (all gaps already filled),
      the workflow completes with no commit — no empty commit appears in the PR history.
- [ ] Bot commits carry `Signed-off-by: <bot-name> <<bot-email>>` and the DCO check passes
      without requiring a human to amend.
- [ ] `OPENROUTER_API_KEY` is referenced only via `${{ secrets.OPENROUTER_API_KEY }}`; it
      does not appear in any log line.
- [ ] A `workflow_dispatch` manual trigger runs the full-corpus sync (all 15 namespaces) and
      opens a PR from a `bot/i18n-sync-*` branch against the dispatching branch with the
      resulting `de/` diff (D5).
- [ ] Running the workflow a second time with no `en/` changes since the last sync is a no-op
      (idempotency from `syncCore.ts` propagates through to CI: zero commits).
- [ ] The `i18n-llm-sync.md` plan doc's open-decisions table shows decision #3 marked
      **Resolved** with the chosen bot identity and rationale.

## Dependencies

| Issue | Title                                                                | Status          | Type    |
| ----- | -------------------------------------------------------------------- | --------------- | ------- |
| #161  | i18n sync: sync.ts CLI + integration test                            | ✅ Met (CLOSED) | Blocker |
| #162  | voice system prompt + per-namespace registers + sidecar loader + ADR | ✅ Met (CLOSED) | Blocker |

**Status**: All dependencies met. No blockers.

## Objective

Ship `.github/workflows/i18n-sync.yml` — the diff-aware CI workflow that closes the en→de loop —
and update `apps/native-rd/docs/plans/i18n-llm-sync.md` to record the resolved bot-identity
decision (#3). A `workflow_dispatch` path provides the full-corpus run that seeds `de/*.json`
on `main` for the first time.

## Decisions

| ID  | Decision                                                                                                                                               | Alternatives Considered                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use `github-actions[bot]` (default `GITHUB_TOKEN`) as the commit author, not a dedicated `rd-i18n-bot` account                                         | Create `rd-i18n-bot` with SSH key (clearer audit trail, more setup)           | Zero setup cost. The DCO workflow's `bot_re` exemption already covers `*[bot]@users.noreply.github.com`, so bot commits pass DCO as-is. The workflow's audit trail is clear enough for v1: commits show `i18n-sync` as the workflow source in the GitHub UI. **Resolved 2026-05-25 (HITL decision #3): `github-actions[bot]`.**                                                                                                                                                                                                                                             |
| D2  | Fork-PR safety via `if: github.event.pull_request.head.repo.full_name == github.repository`                                                            | Secrets-level guard via `if: github.event_name == 'push'` only                | The `pull_request` trigger is needed for the PR diff use case; fork check is the standard pattern to prevent secret exposure without disabling the trigger entirely.                                                                                                                                                                                                                                                                                                                                                                                                        |
| D3  | Loop prevention via committer-identity check on trigger, not `[skip ci]`                                                                               | Append `[skip ci]` to bot commit message; use `push` trigger on de/ path only | `[skip ci]` would skip the entire CI suite (including `ci-native-rd`) on the bot commit. Committer-identity guard (`if: github.actor != 'github-actions[bot]'`) re-skips only the sync job while letting other checks run. If using a PAT/app instead of GITHUB_TOKEN, use the bot account's login for the actor check instead.                                                                                                                                                                                                                                             |
| D4  | Use `actions/checkout@v6` with `persist-credentials: true` (the default) and `token: ${{ secrets.GITHUB_TOKEN }}` for push                             | Use a PAT stored as `SYNC_PAT`; use a GitHub App token                        | `GITHUB_TOKEN` can push to the PR branch on non-fork PRs. A PAT would be needed only if we want the commit-back to trigger downstream workflows (GITHUB_TOKEN-pushed commits intentionally do not re-trigger workflows — this is a GitHub safety mechanism, and for i18n sync it is the desired behavior). **Resolved 2026-05-25: GITHUB_TOKEN; accept that `ci-native-rd` does not re-run on the bot commit (de/ is generated output and does not affect type-check/lint/test outcomes).**                                                                                 |
| D5  | `workflow_dispatch` opens a new PR (`bot/i18n-sync-YYYYMMDD-HHMMSS` branch + `gh pr create`) rather than committing directly to the dispatching branch | `workflow_dispatch` commits directly to `github.ref` (simpler)                | **Resolved 2026-05-25:** manual runs go through review. The first corpus seed (PR #10 — 15 brand-new German namespaces) deserves human eyes before landing on `main`. Direct-commit would bypass branch protection. Cost: ~15 extra YAML lines for the PR-creation step.                                                                                                                                                                                                                                                                                                    |
| D6  | DCO trailer injected inline via `git -c user.name=... -c user.email=... commit -s`                                                                     | Append trailer with `git interpret-trailers`; use `git commit --trailer`      | `-s` (`--signoff`) appends `Signed-off-by: <configured identity>` automatically. Combined with `-c user.name/email` overrides, it is a single idiomatic command. `git interpret-trailers` is more explicit but requires a second pipe step.                                                                                                                                                                                                                                                                                                                                 |
| D7  | Skip draft PRs via `if: !github.event.pull_request.draft` on the job                                                                                   | Run sync on every draft push too (simpler workflow)                           | **Resolved 2026-05-25:** avoids burning LLM calls on every force-push of a WIP draft. Once the author flips the PR to ready-for-review, the `ready_for_review` event fires and the sync runs once.                                                                                                                                                                                                                                                                                                                                                                          |
| D8  | Fail the sync job if a PR changes any file outside `apps/native-rd/src/i18n/resources/en/**`                                                           | Trust path filter alone; switch to `pull_request_target` + selective overlay  | **Resolved 2026-05-25 (Copilot review):** the `pull_request` trigger executes PR-checked-out code with `OPENROUTER_API_KEY` in env, so any PR that also touches `scripts/i18n/**`, `package.json`, `bun.lock`, or the workflow itself could exfiltrate the secret. A pre-`bun install` guard step diffs `base.sha..head.sha` and fails if any disallowed path is present. Trade-off: PRs that legitimately mix `en/` content and sync-script changes must be split into two PRs. Acceptable because en/ content and sync-script work are different workstreams in practice. |

## Affected Areas

- `.github/workflows/i18n-sync.yml` — **new** — the full sync workflow (~90 LOC YAML)
- `apps/native-rd/docs/plans/i18n-llm-sync.md` — **modify** — mark decision #3 resolved,
  add changelog entry (~20 LOC change)

## Implementation Plan

### Step 1: CI workflow — `i18n-sync.yml`

**Files**: `.github/workflows/i18n-sync.yml`
**Commit**: `ci(native-rd/i18n): add diff-aware i18n-sync workflow with bot commit-back`
**Changes**:

- [x] Declare triggers:
  - `pull_request` with `paths: ["apps/native-rd/src/i18n/resources/en/**"]` and `types: [opened, synchronize, reopened, ready_for_review]` (the `ready_for_review` type fires once when a draft flips to ready, which is the moment we want a draft-skipped sync to catch up).
  - `workflow_dispatch` (no extra inputs needed for v1; defaults to all namespaces).
- [x] Set top-level permissions: `contents: write` (needed for git push and branch creation), `pull-requests: write` (needed for `gh pr create` on `workflow_dispatch`). All other permissions default to `none`.
- [x] One job `sync` with:
  - Fork-PR guard: `if: github.event_name == 'workflow_dispatch' || github.event.pull_request.head.repo.full_name == github.repository`
  - Draft guard (D7): combine into the same `if:` — `&& (github.event_name == 'workflow_dispatch' || !github.event.pull_request.draft)`
  - Loop-prevention guard on the job (or on the git-commit step):
    `if: github.actor != 'github-actions[bot]'` — prevents the workflow from retriggering on its own commit-back
- [x] Steps inside `sync` job:
  1. `actions/checkout@v6` with `token: ${{ secrets.GITHUB_TOKEN }}` and `fetch-depth: 0`
     (full history lets git push work correctly on the PR branch). For `pull_request` events,
     also set `ref: ${{ github.event.pull_request.head.ref }}` so the checkout lands on the
     PR branch, not the merge commit.
  2. **Verify PR only changes allowed paths (D8)** — runs on `pull_request` events only,
     before `bun install` (and therefore before any PR-controlled lifecycle script can execute
     or any step exposes `OPENROUTER_API_KEY`). Diffs `github.event.pull_request.base.sha` vs
     `head.sha`, greps out `apps/native-rd/src/i18n/resources/en/`, and `exit 1`s with a
     `::error::` annotation if anything remains.
  3. `oven-sh/setup-bun@v2` with `bun-version-file: "package.json"` (matches CI contract).
  4. `actions/setup-node@v6` with `node-version-file: "apps/native-rd/.nvmrc"` (matches CI contract).
  5. Cache `~/.bun/install/cache` keyed on `bun.lock` (matches CI contract pattern).
  6. `bun install --frozen-lockfile`
  7. Run sync:
     ```yaml
     - name: Run i18n sync
       env:
         OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
       run: bun run i18n:sync
     ```
  8. Detect de/ changes:
     ```yaml
     - name: Check for de/ diff
       id: diff
       run: |
         git add apps/native-rd/src/i18n/resources/de/
         if git diff --cached --quiet; then
           echo "changed=false" >> "$GITHUB_OUTPUT"
         else
           echo "changed=true" >> "$GITHUB_OUTPUT"
         fi
     ```
  9. Commit and push / open PR if changed — branches on event type (D5):

     ```yaml
     - name: Commit de/ translations to PR branch
       if: steps.diff.outputs.changed == 'true' && github.event_name == 'pull_request'
       run: |
         git -c user.name="github-actions[bot]" \
             -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
             commit -s -m "chore(native-rd/i18n): sync de/ translations"
         git push

     - name: Open PR with de/ translations (manual run)
       if: steps.diff.outputs.changed == 'true' && github.event_name == 'workflow_dispatch'
       env:
         GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       run: |
         BRANCH="bot/i18n-sync-$(date -u +%Y%m%d-%H%M%S)"
         git checkout -b "$BRANCH"
         git -c user.name="github-actions[bot]" \
             -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
             commit -s -m "chore(native-rd/i18n): full-corpus sync de/ translations"
         git push --set-upstream origin "$BRANCH"
         gh pr create \
           --base "${{ github.ref_name }}" \
           --head "$BRANCH" \
           --title "chore(native-rd/i18n): full-corpus de/ sync" \
           --body "Automated full-corpus sync triggered manually via \`workflow_dispatch\` on \`${{ github.ref_name }}\`. Review the diff and merge if the translations look right."
     ```

     Note on loop prevention: do **not** add `[skip ci]` to the bot commit message. GitHub Actions' skip tokens (`[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]`, `[actions skip]`) skip **all** workflows for that commit — there is no per-workflow scope, which directly contradicts D3. Loop prevention is already covered by two independent mechanisms: (a) commits pushed with the default `GITHUB_TOKEN` do not re-trigger workflows by design (a GitHub safety mechanism, see D4), and (b) the `github.actor != 'github-actions[bot]'` job-level guard re-skips only this sync job if a token strategy change ever makes (a) stop holding. That's belt-and-suspenders enough; `[skip ci]` would add a third "belt" that also cuts off your trousers.

- [x] `concurrency` group on `pull_request.number || github.ref` with `cancel-in-progress: true`. **Revised 2026-05-25** during `/self-review`: original punt covered cross-PR independence only; both `code-reviewer` and CodeRabbit flagged the same-PR rapid-push and draft→ready race against an in-flight sync. Cancelling in-progress runs avoids two concurrent `git push` attempts on the same PR head.
- [x] No caching of `.turbo` — sync script does not use Turbo.

**Important implementation note on D4 / token choice:** `GITHUB_TOKEN` cannot push to a fork's
branch. For non-fork PRs it can push, but the resulting commit does NOT re-trigger other
GitHub Actions workflows (this is a GitHub platform safety mechanism). If downstream workflows
need to see the de/ commit (e.g. `ci-native-rd` re-running on the new de/ files), a PAT or
GitHub App token is required. For v1 this is acceptable — see Open Questions.

### Step 2: Update plan doc — resolve decision #3

**Files**: `apps/native-rd/docs/plans/i18n-llm-sync.md`
**Commit**: `docs(native-rd/i18n): resolve open decision #3 — bot identity`
**Changes**:

- [x] In the open-decisions table, update decision #3 row:
  - Status column: `Resolved 2026-05-25 — github-actions[bot] via GITHUB_TOKEN. See dev plan for #163.`
- [x] Add a changelog entry at the bottom of the Changelog table.

## Testing Strategy

There is no unit or integration test for a GitHub Actions workflow file. Verification is
end-to-end only.

- [ ] **Smoke test — fork guard**: open a PR from a fork (or simulate via a branch with no
      `OPENROUTER_API_KEY` in secrets context) and confirm the sync job is skipped.
- [ ] **Smoke test — no-change path**: open a PR that does NOT touch `en/**` and confirm
      the workflow does not trigger at all (path filter works).
- [ ] **Smoke test — commit-back**: open a test PR that adds a single new key to one `en/`
      JSON file. Confirm:
  - Workflow triggers.
  - `bun run i18n:sync` runs successfully (exit 0).
  - A `de/` commit appears on the PR branch authored by `github-actions[bot]`.
  - The DCO check passes on the PR (bot commit is exempted by `bot_re`).
  - The commit message contains `Signed-off-by: github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`.
  - The workflow does NOT re-trigger on the bot's own commit.
- [ ] **Smoke test — idempotency**: run the workflow again with no new `en/` changes. Confirm
      no new commit appears.
- [ ] **First corpus run** (`workflow_dispatch` on `main` after merge): confirm all 15 `de/`
      namespaces are populated and committed. This is the PR #10 output referenced in the plan.
- [ ] **`OPENROUTER_API_KEY` is not logged**: check the raw workflow log; the key must not
      appear in any step output.

## Not in Scope

| Item                                                      | Reason                                                                                                                                | Follow-up         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `--target fr` support                                     | Locked to `de` only for v1                                                                                                            | Post-v1           |
| Concurrent namespace batching                             | Single-threaded for v1; locked decision #5 in plan                                                                                    | Post-v1           |
| Downstream workflow re-trigger on de/ commit              | GITHUB_TOKEN push does not re-trigger; **accepted for v1** (de/ files are generated output, not source that drives other CI). See D4. | Post-v1 if needed |
| Draft PR handling                                         | **Resolved (D7): drafts excluded** via `if: !github.event.pull_request.draft`; sync runs once on `ready_for_review`.                  | None              |
| Closed PR handling                                        | Workflow only triggers on open PRs (GitHub's default for `pull_request` without `types:` filter)                                      | None              |
| Status check registration (`i18n-sync` as required check) | Whether to add `i18n-sync` to branch protection required checks is a repo-settings decision, not in this PR                           | Post-merge        |

## Resolved Decisions (2026-05-25 via `/start-issue 163`)

All four open HITL/design questions answered by Joe before implementation begins.

| #   | Question                                                              | Answer                                             | Plan impact                                                                                                                                                            |
| --- | --------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Bot identity                                                          | **`github-actions[bot]` (default `GITHUB_TOKEN`)** | D1 confirmed. No new secrets, DCO exemption already covers it.                                                                                                         |
| Q2  | Acceptable that `ci-native-rd` does not re-run after bot commit-back? | **Yes — accept**                                   | D4 confirmed (`GITHUB_TOKEN`). No PAT or GitHub App token needed. de/ is generated output and does not affect type-check/lint/test.                                    |
| Q3  | `workflow_dispatch` target                                            | **Open a PR, not direct commit**                   | D5 flipped from "direct commit to dispatching branch" to "open `bot/i18n-sync-YYYYMMDD-HHMMSS` PR via `gh pr create`". First corpus seed (PR #10) goes through review. |
| Q4  | Draft PR behavior                                                     | **Skip drafts**                                    | New D7: combine fork guard with `&& !github.event.pull_request.draft`. Add `ready_for_review` to `types:` so the sync still catches up once the draft flips to ready.  |

## Edge case (no action needed for v1)

**Force-push during sync.**

If the PR author force-pushes while a sync is already running, the bot's eventual `git push`
will be rejected (non-fast-forward). The workflow step will fail with a non-zero exit. The
sync itself already completed successfully; only the push fails. This leaves de/ partially
updated on the runner but not on the branch.

For v1, a failed push means the developer's next `en/` push re-triggers the workflow and
completes cleanly (idempotency means the same translations are re-written). This is acceptable
for v1 but could surprise a developer who sees a "failed" workflow run without understanding why.

No action proposed for v1 — calling it out so the behavior is documented, not silent.

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
