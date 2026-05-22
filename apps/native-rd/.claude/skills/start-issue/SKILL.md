---
name: start-issue
description: Kick off a native-rd GitHub issue by fetching it, researching the codebase (and web only if the issue references external tech), asking clarifying questions, then writing, committing, and pushing a per-issue plan file on a conventionally-named branch. Use when the user says "start issue #N", "/start-issue N", "begin work on #N", "plan #N", or otherwise signals they're picking up an open issue that does not yet have a `docs/plans/issue-<N>-*.md` plan. Does NOT implement code or open a PR — this skill produces the plan and the branch it will live on.
metadata:
  author: rollercoaster.dev
  version: "1.0.0"
---

# start-issue

Produces the dev plan an implementer (you, another agent, or a future-you) consumes when writing the code. The plan is a contract: scope, decisions, evidence-of-acceptance, re-entry instructions. If you skip this stage and jump to code, the implementation drifts and the PR review surfaces decisions that should have been settled up-front.

---

## Workflow

Order matters. Each step gates the next.

### 1. Fetch the issue

```sh
gh issue view <N> --json number,title,body,labels,milestone,state
```

If state is `CLOSED`, stop — confirm with the user before proceeding. If the issue has `dep:blocked`, check whether the dependency actually still blocks (the milestone often outpaces label maintenance).

Also fetch the milestone plan if one exists at `apps/native-rd/docs/plans/milestone-<N>-*.md` — it's the operational source of truth for sequencing and what's deferred. **The milestone plan beats the issue body** when they disagree (issue bodies often predate strategy pivots).

### 2. Check for prior plan

```sh
ls apps/native-rd/docs/plans/ | rg "^issue-<N>-"
```

If a plan file exists, read it and stop — this skill is for _creating_ plans, not rewriting them. Tell the user the path and offer to update it instead.

### 3. Verify branch

```sh
git branch --show-current
```

- On `main` → create `feat/issue-<N>-<slug>` (slug = lowercase kebab from the issue title's salient nouns; trim to ~5 words) and switch. Don't push yet — the branch goes upstream together with the plan commit in step 8.
- On `feat/issue-<N>-*` → continue.
- On any other branch → **stop and ask.** Don't risk overwriting in-progress work. Possible cause: user is still mid-flow on a prior ticket.

### 4. Research the codebase

Spawn an `Explore` subagent for any non-trivial issue (anything touching ≥2 files or referencing a system you haven't read this session). Use the main thread directly for small, surgical tickets where you already have the relevant files in context.

What to research:

- **Files the issue names or implies.** Read them fully, not in excerpts.
- **Surrounding patterns.** If the issue is "add X to Y," read how similar X's were added elsewhere; the codebase's local idiom matters more than general best practice.
- **Existing tests** for the area. Their shape constrains how new tests will look.
- **Prior plans for sibling tickets** (same milestone). Decisions there are likely binding here.
- **Recent commits** touching the affected paths. `git log --oneline -30 -- <path>` — recency reveals churn risk and reviewer expectations.

### 5. Research the web (only if needed)

Skip by default. Use `WebFetch` / `WebSearch` only when:

- The issue names an external lib version or RFC the codebase hasn't adopted yet.
- The issue references a vendor behavior (Expo, RN, iOS/Android API) whose current state you can't verify from the lockfile + code.
- The user explicitly asked.

Otherwise, the codebase is the source of truth. Don't pad the plan with generic library docs an implementer can read themselves.

### 6. Ask clarifying questions

Use `AskUserQuestion` to surface the actual decision points. Aim for 1–3 questions, never more than 4. Good question shapes:

- **Scope cuts.** "Issue mentions A, B, and C. C is materially larger — split into a follow-up?"
- **Convention picks** where the codebase has two patterns. "Existing code uses both X and Y for this — which here?"
- **Behavior on edge cases the issue doesn't specify.** "What should happen when Z?"

Bad question shapes (do not ask):

- Anything answerable by reading the code you just researched.
- "Is this plan good?" — that's what step 7 is for.
- Implementation detail the implementer can decide later.

Skip the step entirely if research surfaced no real decisions. A small ticket with one obvious approach gets no questions.

### 7. Write the plan

Path: `apps/native-rd/docs/plans/issue-<N>-<slug>.md`. Mirror the shape of `issue-67-i18n-welcome-newgoal-settings.md` — that's the canonical template — but **scale the detail to the issue**.

Required sections (every plan):

1. **Title** — `# Issue #N — <verbatim issue title>`
2. **Frontmatter block** — Milestone, parent epic if any, branch name.
3. **Why this is next / Why now** — sequencing context. One paragraph; references the milestone plan.
4. **Goal** — what user-visible (or developer-visible) outcome ships when this lands. Single paragraph.
5. **Readiness** — bullet list of preconditions, marked ✅ / ⚠️ / ❌. Forces honesty about what's actually unblocked.
6. **Scope** — what gets touched. For multi-file work, a line-level table per file. For single-file work, a paragraph.
7. **Tests touched** — every test file that changes, and how.
8. **Acceptance criteria → evidence** — table mapping each issue criterion to the concrete artifact in the PR that proves it.
9. **Out of scope (explicit)** — what _isn't_ in this PR. Prevents scope creep and review confusion.
10. **Re-entry instructions** — what a fresh agent should do if `/clear`-ed mid-flow.

Optional sections (use when warranted):

- **Correction against the issue body** — when the issue is stale (e.g. references a key shape that was refactored away). Cite the authoritative doc + line range.
- **Decision tree** — when convention picks were surfaced in step 6.
- **Risks** — known traps the implementer should not relearn.
- **Suggested commit shape** — when the PR naturally splits into multiple commits.

Length guide:

- Small ticket (1 file, 1 obvious approach) → ~50 lines.
- Medium (2–4 files, some decisions) → ~120 lines.
- Large (multi-screen, namespace work, shared component) → 200+ lines, with line-level tables.

The plan is for the implementer, not the reviewer. Optimize for "can a fresh agent read this and produce the PR." Cite line refs (`file.tsx:42-58`) when scope is line-bound.

### 8. Confirm, commit, push

Show the user the plan file path and a one-paragraph summary of what's in it. **Ask once for sign-off before committing.** Then commit and push the branch + plan together:

```sh
git add apps/native-rd/docs/plans/issue-<N>-<slug>.md
git commit -m "docs(native-rd): add implementation plan for issue #<N>

<one-line summary of the plan's scope>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

# First push of the feature branch sets upstream; subsequent commits use `git push`.
git push -u origin feat/issue-<N>-<slug>
```

The husky `prepare-commit-msg` hook appends the DCO `Signed-off-by:` trailer automatically. Don't bypass hooks. If `--no-verify` was used anywhere, add the trailer manually before push.

Pushing the plan commit lands the conventionally-named branch on the remote so PR review tooling has something to attach to and the issue can be linked to a real ref. Subsequent implementation commits push to the same branch.

---

## Re-entry

If `/clear` happened mid-flow:

1. `git branch --show-current` — confirms which issue you're on (`feat/issue-<N>-*`).
2. `ls apps/native-rd/docs/plans/ | rg "^issue-<N>-"` — plan file exists? If yes, you're past step 7; jump to step 8 or skip if already committed (`git log --oneline -5 | rg "issue #<N>"`).
3. Re-fetch the issue body if needed — issue bodies don't change often but milestone state does.

---

## What this skill explicitly does not do

- **Code changes.** The plan must be committable on a clean tree (no `M` files when the commit lands). Implementation is a separate step.
- **Branch creation when the user is on an unrelated feature branch.** Stop and ask — don't risk losing work.
- **PR creation.** Pushing the branch is part of this skill so the remote exists, but opening the PR comes later once implementation commits land.
- **Project board / issue status updates.** This skill writes code and pushes a branch; it does not touch the GitHub project board, assign labels, or mark the issue in-progress. Do that separately if needed.
- **Rewriting existing plans.** If `issue-<N>-*.md` exists, stop and surface it. Updates are a separate, intentional action.
