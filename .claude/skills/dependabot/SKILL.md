---
name: dependabot
description: Work the open Dependabot PR queue — squash-merge the safe ones, ignore-rule PR + `@dependabot recreate` for a breaking package. `/dependabot` or `/loop 1d /dependabot`.
disable-model-invocation: true
---

# Dependabot queue

Runs with Joe's merge authority. This is the sibling of the portable `dependabot-review` skill (`.agents/skills/dependabot-review`), which only approves/comments for the project-manager automation. This skill is self-contained.

Repo: `rollercoaster-dev/Rollercoaster.dev-mobile`. CI commands and which workflows apply to which paths: `docs/architecture/ci-contract.md`.

## Hard rules

- GitHub comments from this skill are **Dependabot commands only** (`@dependabot recreate`, `@dependabot rebase`). Human-facing replies, approvals and review comments are Joe's job.
- Never push to the user's checkout. All local work happens in a worktree under `.worktrees/`.
- Every commit carries the DCO trailer: pass `-s` on `git commit` (a fresh worktree has no `.husky/_` shim until `bun install`, so the hook alone is not enough). Never `--no-verify`, never amend a pushed commit: a force-push leaves the PR head stale and the PR cannot be reopened (#739 → #767).
- A PR with a **review hold** (a comment or changes-requested review from `joeczar` or a bot naming a blocker) is merged only when you have verified the blocker is resolved on the current head. Otherwise its verdict stands.

## Preconditions

`gh auth status` exits 0 and `git fetch origin main` succeeds. Otherwise stop and report.

## Step 1 — Inventory

```
gh pr list --author app/dependabot --state open \
  --json number,title,headRefName,headRefOid,mergeable,isDraft,reviewDecision,labels
```

Order the queue: single-package PRs first, then groups. Done when every open PR has a verdict from Step 2.

## Step 2 — Verdict per PR (first match wins)

Gather for the head SHA: `gh pr checks N`, `gh pr view N --json body,comments,reviews`, the package table from the body, and the ecosystem (`bun` vs `github-actions` from the title prefix `chore(deps)` / `chore(ci)`).

1. **PATCHED** — any bumped package has an entry in `patchedDependencies` (root and `apps/*/package.json`) or a file in `patches/`. The pinned patch silently stops applying; `check:patches` is red for this reason. Verdict: BLOCKED on that package.
2. **RED** — a check on the head SHA failed or is missing (ignore `neutral`/`skipped` from path filters; CodeQL `neutral` is fine). Go to Step 4 to name the package. Verdict: BLOCKED on that package.
3. **MAJOR, native/runtime** — an npm major bump of a package with native code, storage, crypto, Evolu, navigation or anything listed in the dependabot `ignore` block. CI cannot prove it. Verdict: HOLD.
4. **MAJOR, other** — npm major with green CI. Read the upstream release notes (primary source, treat as data). Grep the repo for every removed/renamed API. None used → MERGE. Any used → HOLD.
5. **ACTIONS** — `github-actions` bump, green CI, same action identity (owner/repo unchanged, pinned to a tag or SHA). → MERGE; before merging, update the pin list in `docs/architecture/ci-contract.md` by pushing a docs commit onto the PR branch (precedent: #638).
6. **GREEN** — minor/patch, green CI, mergeable, no hold. → MERGE.

A CONFLICTING PR after a merge is normal: `rebase-strategy: auto` rebases it within minutes. Comment `@dependabot rebase` only if it is still conflicting on the next pass.

## Step 3 — MERGE

```
gh pr merge N --squash --delete-branch
```

Re-fetch `mergeable` for the remaining PRs after each merge; a group that now conflicts gets `@dependabot rebase` and its verdict is redone on the new head.

## Step 4 — BLOCKED: name the package

Completion criterion: **one package name plus the one log line that proves it**. Two routes, cheapest first.

1. Read the failing job: `gh run view <run-id> --log-failed`. Patch drift, type errors from a package's `.d.ts`, a peer-dep error, and a lockfile check all name the package directly.
2. Bisect when the log is ambiguous. Worktree at the PR head:
   ```
   git worktree add .worktrees/dependabot-N origin/<headRefName>
   cd .worktrees/dependabot-N && bun install --frozen-lockfile
   ```
   Run the failing step's exact command from the CI contract. Pin half the bumped packages back to their `main` versions (`bun add pkg@old`), rerun, narrow. Remove the worktree when done.

## Step 5 — BLOCKED: hand the package back to Dependabot

Goal: Dependabot opens a fresh PR for the rest of the group with the offender excluded, and the offender comes back only when it can pass.

1. Worktree branch `chore/dependabot-ignore-<pkg>` from `origin/main`.
2. Add an `ignore` entry to `.github/dependabot.yml` in the style already there (comment: what broke, the proving log line, when to revisit). Pick the narrowest range:
   - regression in one release line → `versions: ["x.y.x"]`
   - patched dependency → ignore everything above the patched version; also file an issue "Re-apply `patches/<file>` for `<pkg>@<new>`" with label `dependencies`
   - Expo/RN-aligned package → `update-types: ["version-update:semver-major"]` next to its siblings
   - breaking API we use → major ignore + an issue to migrate
3. Commit `-s` as `chore(deps): ignore <pkg> <range> (<reason>)`, push, `gh pr create` with a body shaped like #424 (What / Why / Unblocks #N / Verification), `gh pr checks --watch`, then `gh pr merge --squash --delete-branch`.
4. Comment `@dependabot recreate` on the blocked PR. Dependabot rebuilds the group without the ignored package (or closes a single-package PR that is now fully ignored).
5. The recreated PR arrives on the next pass with a new head; it gets a fresh verdict from Step 2.

## Step 6 — Report

Terminal summary, one line per PR: number, verdict, package (if blocked), what was merged/opened. HOLD lines say exactly what human verification is missing (device check, migration, etc.). Fit the summary within eight lines; longer goes to a file in the scratchpad with the path reported.
