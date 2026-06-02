# Claude/Agent Docs & Rules Reevaluation

**Date:** 2026-05-15
**Scope:** Repo-wide
**Status:** Design approved, plan pending
**Owner:** Joe (solo)

## Problem

`Rollercoaster.dev-mobile` was filtered out of `openbadges-monorepo` on 2026-05-14. The Claude/agent docs, GitHub workflows, and `.claude/` tree came along unchanged. The result is a configuration shaped for a multi-app, multi-team monorepo that no longer matches reality:

- Root `CLAUDE.md` and root `AGENTS.md` drift: each says different things, neither is canonical.
- App `CLAUDE.md` and app `AGENTS.md` overlap and contradict: agents don't know which is authoritative.
- App `CLAUDE.md` heavily references `graph-flow` MCP tools and ~12 slash commands, but graph-flow MCP is **not configured** for this project (session-start hook confirms).
- `.claude/agents/vue-hono-expert.md` exists in a repo with no Vue or Hono code.
- Three overlapping AI review channels (`claude.yml`, `claude-code-review.yml`, CodeRabbit) plus local `/self-review` — too much overlap, and CodeRabbit is rate-limited too often to be a hard dependency.
- Docs split between root `docs/` and `apps/native-rd/docs/` with no clear boundary articulated.

**Goals**

1. Ease of use for a solo dev — kill drift, kill aspirational config that doesn't run.
2. Solid guidance for agents — one canonical doc per scope, accurate skill/agent inventory, accurate command tables.

## Design

### 1. Doc convention — AGENTS canonical, CLAUDE thin pointer

Every scope has both files. `AGENTS.md` is the canonical doc. `CLAUDE.md` is a 4-6 line pointer to it.

**Scopes:**

- Repo root
- `apps/native-rd/`
- `packages/openbadges-core/`
- `packages/design-tokens/`

**`CLAUDE.md` template (identical at every scope):**

```md
# Claude Code

Canonical instructions for this scope live in **[AGENTS.md](./AGENTS.md)**.
Read that first. Quick links:

- Hard rules: AGENTS.md → "Hard Rules"
- Commands: AGENTS.md → "Commands"
- Workflow: AGENTS.md → "Workflow"
```

**`AGENTS.md` sections (scaled to what applies at each scope):**

1. What this scope is (1-2 sentences)
2. Hard Rules
3. Commands
4. Tech / Architecture
5. Workflow + skills available
6. Where to look (cross-links)

**Migration mechanics:**

- **Root:** consolidate substantive content from current root `CLAUDE.md` into root `AGENTS.md`. Replace root `CLAUDE.md` with the pointer template.
- **`apps/native-rd/`:** merge current `CLAUDE.md` and `AGENTS.md` into a single `AGENTS.md`. Hard rules, commands, design system, ND a11y, OpenBadges core notes, workflow, after-changes checklist all live here. Replace `CLAUDE.md` with the pointer.
- **`packages/openbadges-core/`:** rename existing `CLAUDE.md` → `AGENTS.md`, add the `CLAUDE.md` pointer.
- **`packages/design-tokens/`:** same as above.

### 2. graph-flow wiring

- Run `/graph-flow:init` to install MCP config. Restart Claude Code.
- Keep the slash-command table in app `AGENTS.md`. Each command gets a 1-line "when to use it."
- Audit `apps/native-rd/.claude/dev-plans/issue-{26,53,81,99}.md`:
  - If the referenced GH issue is open → keep.
  - If merged/closed → move to `apps/native-rd/docs/plans/completed/`.

### 3. Review automation

**Keep:**

- `.github/workflows/claude-code-review.yml` — auto Claude review on every PR
- Local `/self-review` skill — pre-PR gate

**Remove:**

- `.github/workflows/claude.yml` — @claude mention bot; overlapping cost, low value for solo dev

**Downgrade:**

- CodeRabbit references — make best-effort, not blocking. `/self-review` skill: run CodeRabbit; if rate-limited or unavailable, log and continue.
- PR template: drop any wording that implies CodeRabbit is a required check.
- App `AGENTS.md` workflow section: explicit note "CodeRabbit is best-effort; do not block on it."
- Keep `coderabbit:*` plugin skills installed locally — cheap, occasionally useful.

### 4. `docs/` layout — two-tier, sharper split

**Root `docs/`** — repo-wide infra & process only:

- `architecture/` — `ci-contract.md` and future repo-level architecture
- `plans/active/`, `plans/completed/` — cross-cutting infra plans (CI, mac-mini runner, USB-E2E pivot, this spec)
- New `index.md` — names what lives here vs. the app

**`apps/native-rd/docs/`** — product/design/architecture/ADRs/app-specific plans (already structured; affirm in app `AGENTS.md`).

**Package docs** — package `README.md` + package `AGENTS.md`. No `docs/` tree per package.

Cross-links: root `AGENTS.md` "Where to go" table points to each scope's `AGENTS.md` and the relevant `docs/` tree.

### 5. Agents & skills inventory

**Delete:**

- `apps/native-rd/.claude/agents/vue-hono-expert.md` — no Vue or Hono in repo.

**Keep + document with 1-liner in app `AGENTS.md` "Skills & Agents" section:**

Agents:

- `openbadges-compliance-reviewer`
- `openbadges-expert`

Local skills:

- `native-rd-build`
- `simulator-screenshot`
- `self-review`
- `acceptance-validator`
- `review-to-task`
- `quality-scorer`
- `cleanup-agent`
- `doc-gardener`

Symlinked skills (from `apps/native-rd/.agents/skills/`):

- `neo-brutalist-design`
- `vercel-react-native-skills`
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `web-design-guidelines`

Each 1-liner names the trigger ("invoke when …") so an agent picks the right one.

### 6. `.github/` hygiene

**Workflows:**

- Delete: `claude.yml`
- Keep: `claude-code-review.yml`, `codeql.yml`, `dco.yml`, `ci-docs.yml`, `ci-native-rd.yml`, `ci-packages.yml`

**PR template:**

- Verify `bun run format:check` exists at root; replace with what does if not.
- Verify `cd apps/native-rd && bun run test:a11y` works; fix path or remove `cd` if root script wraps it.
- Drop wording that implies CodeRabbit is a required check.

**Keep as-is:**

- `dependabot.yml`
- DCO workflow + husky `prepare-commit-msg` hook (just landed in #31).

**Not adding:** `CODEOWNERS` (solo dev), `SECURITY.md` already exists at root, `CONTRIBUTING.md` already exists at root — re-read both for any monorepo-leftover references and patch as needed.

## Out of scope / explicit non-goals

- Flattening `apps/native-rd/*` up to repo root. Keeping the workspace shape — `packages/` are real shared libraries.
- Moving source code. This work touches docs, workflows, `.claude/` tree only.
- New skills or agents. Inventory pass only.
- Rewriting ADRs, vision docs, design language docs. They're fine; we only re-link them.

## Success criteria

- Every scope has matching `AGENTS.md` + thin `CLAUDE.md`. No content drift.
- `/graph-flow:init` has run; restart confirmed.
- A fresh agent reading root `AGENTS.md` can navigate to the right scope without reading anything that was removed in this pass.
- `claude.yml` and `vue-hono-expert.md` are gone.
- CodeRabbit is no longer a hard dependency in any workflow, skill, or template.
- PR template commands all work as written.
- This spec's referenced files all exist (no broken links).

## Follow-ups (out of scope here, file as GH issues if relevant)

- `cleanup-agent` and `doc-gardener` cadence — if you want these running on a schedule, file an issue for that.
- Re-evaluate CodeRabbit when their rate limits change.
