---
name: implement
description: Implements code changes following a development plan with atomic commits. Each commit is self-contained and the PR focuses on a single change. Use after issue-researcher creates a plan.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Skill
---

# Implement Skill

## Contract

### Input

| Field          | Type   | Required | Description               |
| -------------- | ------ | -------- | ------------------------- |
| `issue_number` | number | Yes      | GitHub issue number       |
| `plan_path`    | string | Yes      | Exact dev plan path       |
| `start_step`   | number | No       | Resume from specific step |

### Output

| Field                   | Type     | Description       |
| ----------------------- | -------- | ----------------- |
| `commits`               | array    | Commits made      |
| `commits[].sha`         | string   | Commit SHA        |
| `commits[].message`     | string   | Commit message    |
| `commits[].files`       | string[] | Files changed     |
| `validation.type_check` | boolean  | Type-check passed |
| `validation.lint`       | boolean  | Lint passed       |
| `validation.tests`      | boolean  | Tests passed      |
| `validation.build`      | boolean  | Build passed      |

### Side Effects

- Creates/modifies files per plan
- Makes git commits

---

## Purpose

Implement changes per dev plan via atomic commits. Trunk-based, small focused changes.

## Core Principles

### MINIMAL Implementation

**CRITICAL: Only the bare minimum to fulfill requirements.**

1. **No "nice to have"** — not required, don't build
2. **No premature abstraction** — no helpers for one-time ops
3. **No extra options/parameters** — config only when needed
4. **No defensive coding for impossible cases** — trust internal code

**Before writing code, ask:**

- Explicitly required by issue?
- Works without this?
- Adding "just in case"?

### Minimal Tests

**Only test what matters:**

1. **Happy path** — works with valid input
2. **Key error cases** — obviously wrong input
3. **Edge cases only if likely** — skip impossible scenarios

**Test count guideline:**

- Simple function: 2-4 tests
- Complex function: 5-8 tests
- Full service: 8-15 tests

### Atomic Commits

Each commit:

1. **Self-contained** — works on its own
2. **Single purpose** — one logical change
3. **Buildable** — compiles/type-checks
4. **Testable** — related tests included (when applicable)

#### Good vs Bad Atomic Commits

**GOOD** (single purpose):

```
feat(themes): add highContrast variant tokens
feat(themes): wire highContrast into theme compose
test(themes): add contrast assertions for highContrast
```

**BAD** (mixed concerns):

```
feat(themes): add variant, wire it, add tests
feat: various improvements to theming
wip: work in progress
```

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`

### Small PRs

- Target ~500 lines max (excluding tests)
- One issue = one PR
- One PR = one thing changed

## Workflow

### Phase 1: Prepare Environment

1. **Verify clean state:**

   ```bash
   git status
   ```

2. **Load dev plan** from caller's `plan_path` input.

### Phase 2: Execute Plan Step by Step

For each step:

1. **Announce:** "Step 1: <description>" + expected commit message

2. **Make changes** — create/modify files, follow existing patterns, inline comments where helpful

3. **Validate:**

   ```bash
   bun run type-check
   ```

   ```bash
   bun run lint
   ```

4. **Run relevant tests:**

   ```bash
   bun test --testPathPatterns <pattern>
   ```

   (Plural `--testPathPatterns` per native-rd convention — see `apps/native-rd/CLAUDE.md`.)

5. **Format changed files:**

   ```bash
   bunx prettier --write <file-list>
   ```

6. **Stage and commit:**

   ```bash
   git add <specific-files>
   git commit -m "<type>(<scope>): <message>"
   ```

   **DCO mandatory.** Husky `prepare-commit-msg` adds `Signed-off-by` automatically. **Never** pass `--no-verify`. Never amend in a way that strips the trailer.

7. **Report:** commit confirmed, files changed, deviations noted

8. **Update dev plan (live plan maintenance):**
   - Check off completed items in Implementation Plan (`- [ ]` → `- [x]`)
   - **On deviation:** timestamped Discovery Log entry:
     ```markdown
     - [YYYY-MM-DD HH:MM] <what changed and why>
     ```
   - **On new decision:** add row to Decisions table (ID, decision, alternatives, rationale)
   - **On explicit deferral:** add to Not in Scope table (item, reason, follow-up issue)

### Phase 3: Handle Deviations

1. **Minor:** make change, log in Discovery Log, continue
2. **Significant:** stop, report, propose updated approach
   - Autonomous (auto-issue): pick reasonable path, log decision
   - Gated: wait for approval
3. **Blockers:** stop immediately, describe blocker, suggest resolution

### Phase 4: Final Validation

1. **Full validation (each command separately):**

   ```bash
   bun run type-check
   ```

   ```bash
   bun run lint
   ```

   ```bash
   bun test
   ```

   ```bash
   bun run build
   ```

   **Note:** `bun run build` is safe — native-rd's `build` script is `echo 'Expo app — no build step'`. No prebuild, no native compile. If this changes, drop the build step rather than running native builds.

2. **Review commit history:**

   ```bash
   git log --oneline -n <number-of-commits>
   ```

3. **Check diff stats:**

   ```bash
   git diff main --stat
   ```

4. **Verify scope:** under ~500 lines? each commit stands alone? branch focused?

5. **Verify Intent (plan-aware check):**
   - Read plan's Intent Verification section
   - Verify each criterion met by implementation
   - Check off met criteria (`- [ ]` → `- [x]`)
   - Unmet → report which failed and why. Autonomous (auto-issue): log gap, proceed.

### Phase 5: Report Completion

1. **Summary:** commit count, files changed, lines added/removed, tests added/passing
2. **Ready for review:** branch, base branch, suggested PR title
3. **Next:** "Ready for review phase"

## Error Handling

### Build/Type Errors

1. **Analyze** — read error, identify root cause, plan fix
2. **Fix in new commit (preferred)** — create fix commit, note deviation

   Prefer NEW commits over `git commit --amend` — amending past husky can drop DCO trailer.

### Test Failures

1. **Expected:** update test expectations, include in same commit
2. **Unexpected:** stop, analyze, report, fix before continuing

### Merge Conflicts

1. Stop immediately
2. Report conflict details
3. Wait for user guidance
4. Do not auto-resolve

## Output Format

After each commit:

```
Commit #<n>: <type>(<scope>): <message>
Files: <file-list>
Status: <passing|failing>
```

After completion:

```
## Implementation Complete

**Branch**: <branch-name>
**Commits**: <n>
**Files Changed**: <n>
**Lines**: +<added> / -<removed>

### Commit History
1. <commit-message>
2. <commit-message>
...

### Validation
- Type-check: PASS
- Lint: PASS
- Tests: PASS (<n>/<n>)
- Build: PASS (no-op for native-rd)

### Next Step
Ready for review phase.
```

## Success Criteria

- All planned commits made
- Each commit atomic, buildable
- All validations pass
- Branch ready for review
- Follows project conventions
- Every commit has `Signed-off-by` trailer (DCO)
