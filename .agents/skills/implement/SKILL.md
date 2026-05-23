---
name: implement
description: Implements code changes following a development plan with atomic commits. Each commit is self-contained and the PR focuses on a single change. Use after issue-researcher creates a plan.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Skill
---

# Implement Skill

## Contract

### Input

| Field          | Type   | Required | Description                             |
| -------------- | ------ | -------- | --------------------------------------- |
| `issue_number` | number | Yes      | GitHub issue number                     |
| `plan_path`    | string | Yes      | Exact path to the development plan file |
| `start_step`   | number | No       | Resume from specific step               |

### Output

| Field                   | Type     | Description          |
| ----------------------- | -------- | -------------------- |
| `commits`               | array    | List of commits made |
| `commits[].sha`         | string   | Commit SHA           |
| `commits[].message`     | string   | Commit message       |
| `commits[].files`       | string[] | Files changed        |
| `validation.type_check` | boolean  | Type-check passed    |
| `validation.lint`       | boolean  | Lint passed          |
| `validation.tests`      | boolean  | Tests passed         |
| `validation.build`      | boolean  | Build passed         |

### Side Effects

- Creates/modifies files per plan
- Makes git commits

---

## Purpose

Implements code changes following a development plan, making atomic commits that each represent a single logical change. Follows trunk-based development practices with small, focused changes.

## Core Principles

### MINIMAL Implementation

**CRITICAL: Only implement the bare minimum to fulfill requirements.**

1. **No "nice to have" features** - If it's not explicitly required, don't build it
2. **No premature abstraction** - Don't create helpers/utilities for one-time operations
3. **No extra options/parameters** - Add configuration only when explicitly needed
4. **No defensive coding for impossible cases** - Trust internal code

**Before writing ANY code, ask:**

- Is this explicitly required by the issue?
- Would the feature work without this?
- Am I adding this "just in case"?

### Minimal Tests

**Only test what matters:**

1. **Happy path** - Does it work with valid input?
2. **Key error cases** - What happens with obviously wrong input?
3. **Edge cases only if likely** - Don't test impossible scenarios

**Test count guideline:**

- Simple function: 2-4 tests
- Complex function: 5-8 tests
- Full service: 8-15 tests

### Atomic Commits

Each commit must be:

1. **Self-contained**: Works on its own
2. **Single purpose**: One logical change
3. **Buildable**: Code compiles/passes type-check
4. **Testable**: Related tests included (when applicable)

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

2. **Load development plan:**
   - Read from the path provided by the caller (`plan_path` input)

### Phase 2: Execute Plan Step by Step

For each step in the development plan:

1. **Announce step:**
   - "Step 1: <description>"
   - Show expected commit message

2. **Make changes:**
   - Create/modify files as planned
   - Follow existing code patterns
   - Include inline comments where helpful

3. **Validate changes:**

   ```bash
   bun run type-check  # TypeScript check
   ```

   ```bash
   bun run lint        # Linting
   ```

4. **Run relevant tests:**

   ```bash
   bun test --testPathPatterns <pattern>
   ```

   (Use `--testPathPatterns` plural per native-rd convention — see `apps/native-rd/CLAUDE.md`.)

5. **Format changed files:**

   ```bash
   bunx prettier --write <file-list>
   ```

6. **Stage and commit:**

   ```bash
   git add <specific-files>
   git commit -m "<type>(<scope>): <message>"
   ```

   **DCO is mandatory in this repo.** The husky `prepare-commit-msg` hook adds the `Signed-off-by` trailer automatically. **Never** pass `--no-verify` to git commit, and never amend commits in a way that strips the trailer.

7. **Report progress:**
   - Confirm commit made
   - Show files changed
   - Note any deviations from plan

8. **Update the dev plan (live plan maintenance):**
   - Check off completed items in the Implementation Plan section (change `- [ ]` to `- [x]`)
   - **On deviation:** Add a timestamped entry to the Discovery Log section:
     ```markdown
     - [YYYY-MM-DD HH:MM] <what changed and why>
     ```
   - **On new decision:** Add a row to the Decisions table with ID, decision, alternatives, rationale.
   - **On explicit deferral:** Add to the Not in Scope table with item, reason, and follow-up issue (if any)

### Phase 3: Handle Deviations

If the plan needs adjustment:

1. **Minor adjustments:**
   - Make the change
   - Note the deviation in the Discovery Log
   - Continue with plan

2. **Significant changes:**
   - Stop and report
   - Explain what's different
   - Propose updated approach
   - In autonomous mode (auto-issue): pick the most reasonable path and log the decision
   - In gated mode: wait for user approval

3. **Blockers:**
   - Stop immediately
   - Describe the blocker
   - Suggest resolution

### Phase 4: Final Validation

After all commits:

1. **Run full validation (each command separately):**

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

   **Note:** `bun run build` in this repo is safe — native-rd's `build` script is a no-op (`echo 'Expo app — no build step'`). It does NOT trigger an Expo prebuild or native compile. If a future change makes it non-trivial, drop the build step from this skill rather than running native builds.

2. **Review commit history:**

   ```bash
   git log --oneline -n <number-of-commits>
   ```

3. **Check diff stats:**

   ```bash
   git diff main --stat
   ```

4. **Verify scope:**
   - Is it under ~500 lines?
   - Does each commit stand alone?
   - Is the branch focused?

5. **Verify Intent (plan-aware check):**
   - Read the dev plan's Intent Verification section
   - For each criterion, verify it is met by the implementation
   - Check off met criteria in the plan (change `- [ ]` to `- [x]`)
   - If any criteria are NOT met, report which ones failed and why. In autonomous workflows (auto-issue), log the gap and proceed.

### Phase 5: Report Completion

1. **Summary:**
   - Number of commits made
   - Files changed
   - Lines added/removed
   - Tests added/passing

2. **Ready for review:**
   - Branch name
   - Base branch
   - Suggested PR title

3. **Next step:**
   - "Ready for review phase"

## Error Handling

### Build/Type Errors

1. **Analyze error:**
   - Read error message
   - Identify root cause
   - Plan fix

2. **Fix in new commit (preferred):**
   - Create a fix commit
   - Note deviation from plan

   Prefer NEW commits over `git commit --amend` — amending past the husky hook can drop the DCO trailer.

### Test Failures

1. **Expected failures:**
   - Update test expectations
   - Include in same commit

2. **Unexpected failures:**
   - Stop and analyze
   - Report to user
   - Fix before continuing

### Merge Conflicts

1. **Stop immediately**
2. **Report conflict details**
3. **Wait for user guidance**
4. **Do not auto-resolve**

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

This skill is successful when:

- All planned commits are made
- Each commit is atomic and buildable
- All validations pass
- Branch is ready for review
- Code follows project conventions
- Every commit has a `Signed-off-by` trailer (DCO)
