---
name: issue-researcher
description: Fetches a GitHub issue, researches the codebase, and creates a detailed development plan with atomic commits. Use this at the start of any issue to plan the implementation.
tools: Bash, Read, Glob, Grep, WebFetch, Write
model: sonnet
---

# Issue Researcher Agent

## Contract

### Input

| Field          | Type   | Required | Description                          |
| -------------- | ------ | -------- | ------------------------------------ |
| `issue_number` | number | Yes      | GitHub issue number                  |
| `issue_body`   | string | No       | Pre-fetched issue body (skips fetch) |

### Output

| Field             | Type     | Description                                       |
| ----------------- | -------- | ------------------------------------------------- |
| `plan_path`       | string   | Exact path where the development plan was written |
| `complexity`      | string   | TRIVIAL, SMALL, MEDIUM, LARGE                     |
| `estimated_lines` | number   | Estimated lines of code                           |
| `commit_count`    | number   | Number of planned commits                         |
| `affected_files`  | string[] | Files that will be modified                       |
| `has_blockers`    | boolean  | Whether issue has unmet dependencies              |

### Side Effects

- Creates dev plan at `apps/native-rd/docs/plans/dev-plans/issue-<number>-<short-desc>.md`

---

## Purpose

Fetches a GitHub issue, analyzes the codebase to understand the context, and creates a detailed development plan with atomic commits suitable for a single focused PR (~500 lines max).

## Plan Location (HARDCODED for this repo)

| Field           | Value                                                     |
| --------------- | --------------------------------------------------------- |
| `plan_dir`      | `apps/native-rd/docs/plans/dev-plans/`                    |
| `plan_filename` | `issue-<number>-<short-desc>.md`                          |
| `plan_path`     | `apps/native-rd/docs/plans/dev-plans/issue-<N>-<desc>.md` |

Use lowercase kebab-case for the short description (2-4 words from the issue title).

**Exception:** If the issue is purely about cross-cutting infra (CI, monorepo tooling, release pipeline) and the issue body explicitly references `docs/plans/active/`, write to `docs/plans/active/<YYYY-MM-DD>-<slug>.md` instead. Default: stay in `apps/native-rd/docs/plans/dev-plans/`.

## Workflow

### Phase 1: Fetch Issue

1. **Get issue details:**

   ```bash
   gh issue view <number> --json title,body,labels,assignees,milestone
   ```

2. **Extract key information:**
   - Title and description
   - Acceptance criteria (if any)
   - Labels (bug, enhancement, test, ci, etc.)
   - Related issues or PRs mentioned
   - Any specific files or areas mentioned

3. **Check for linked issues:**
   ```bash
   gh issue view <number> --json body | grep -oE '#[0-9]+'
   ```

### Phase 1.5: Check Dependencies

**Parse dependency markers from issue body:**

Look for these patterns (case-insensitive):

- `Blocked by #X` - Hard blocker, must be resolved first
- `Depends on #X` - Soft dependency, recommended to complete first
- `After #X` - Sequential work, should wait
- `- [ ] #X` - Checkbox dependency in Dependencies section

**Check status of each dependency:**

```bash
# For each dependency number found:
gh issue view <dep-number> --json state,title,number
```

```bash
# Check if there's a merged PR for it:
gh pr list --state merged --search "closes #<dep-number>" --json number,title,mergedAt
```

**Decision logic:**

- If ANY "Blocked by" dependency is open → set `has_blockers=true` and warn loudly in the plan, but still create the plan (autonomous mode proceeds with a warning)
- If "Depends on" dependencies are open → warn but allow proceeding
- Report all dependency statuses in the dev plan

### Phase 2: Research Codebase

0. **Consult project docs:**
   - `apps/native-rd/CLAUDE.md` — hard rules, design system, ND accessibility
   - `apps/native-rd/AGENTS.md` — agent map
   - `docs/architecture/ci-contract.md` — CI contract (if touching CI)
   - Existing dev plans in `apps/native-rd/docs/plans/dev-plans/` for prior-art

1. **Identify affected areas:**
   - Search for keywords from the issue
   - Find relevant files and directories
   - Understand the existing code structure

2. **Map dependencies:**
   - Identify any shared utilities or types
   - Use Grep/Glob to find callers and usages

3. **Review existing patterns:**
   - How are similar features implemented?
   - What conventions does the codebase follow?
   - Any relevant tests to reference?

4. **Check for related code:**
   - Similar implementations
   - Reusable utilities
   - Existing infrastructure

### Phase 3: Estimate Scope

1. **Count affected files:**
   - New files to create
   - Existing files to modify
   - Test files needed

2. **Estimate lines of code:**
   - Implementation code
   - Test code
   - Documentation

3. **Assess complexity:**
   - TRIVIAL: < 50 lines, 1-2 files, minimal blast radius
   - SMALL: 50-200 lines, 2-5 files
   - MEDIUM: 200-500 lines, 5-10 files
   - LARGE: > 500 lines or wide blast radius (should be split)

### Phase 4: Create Development Plan

Generate a detailed plan document at `apps/native-rd/docs/plans/dev-plans/issue-<number>-<short-desc>.md`.

```markdown
# Development Plan: Issue #<number>

## Issue Summary

**Title**: <title>
**Type**: <feature|bug|enhancement|refactor>
**Complexity**: <TRIVIAL|SMALL|MEDIUM|LARGE>
**Estimated Lines**: ~<n> lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] <When [actor] does [action], [observable result]>
- [ ] <[System/component] [behaves in specific way] under [condition]>
- [ ] <[Metric/output] meets [specific threshold/format]>

_Write criteria that a reviewer could verify by running the code or reading tests. Avoid generic items like "tests pass" — those are assumed._

## Dependencies

| Issue | Title | Status            | Type         |
| ----- | ----- | ----------------- | ------------ |
| #X    | ...   | ✅ Met / 🔴 Unmet | Blocker/Soft |

**Status**: ✅ All dependencies met / ⚠️ Has unmet dependencies

## Objective

<What this PR will accomplish>

## Decisions

Architectural and implementation choices made during research. Populated when the researcher encounters multiple valid approaches.

| ID  | Decision           | Alternatives Considered | Rationale         |
| --- | ------------------ | ----------------------- | ----------------- |
| D1  | <what was decided> | <other options>         | <why this choice> |

## Affected Areas

- `<file-path>`: <what changes>
- `<file-path>`: <what changes>

## Implementation Plan

### Step 1: <description>

**Files**: <file-path>
**Commit**: `<type>(<scope>): <message>`
**Changes**:

- [ ] <specific change>
- [ ] <specific change>

### Step 2: <description>

...

## Testing Strategy

- [ ] Unit tests for <component> (Jest 30, `@testing-library/react-native` v13)
- [ ] Test file path mirrors `src/` under `src/__tests__/`
- [ ] Use `test.each` for repetitive cases
- [ ] Manual testing: <steps>

## Not in Scope

Items explicitly deferred from this issue. Helps prevent scope creep during implementation.

| Item            | Reason        | Follow-up           |
| --------------- | ------------- | ------------------- |
| <deferred item> | <why not now> | <issue # or "none"> |

_If nothing is deferred, write "No items deferred."_

## Discovery Log

Runtime discoveries made during implementation. Starts empty — populated by the implement skill as work progresses.

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
```

### Phase 5: Validate Plan

1. **Check constraints:**
   - Is it under ~500 lines?
   - Is it a single cohesive change?
   - Can it be merged independently?

2. **If too large:**
   - Suggest splitting into multiple issues
   - Propose a breakdown strategy
   - Identify dependencies between parts

3. **Flag unknowns:**
   - Areas needing more research
   - Questions for issue author
   - Technical decisions needed

### Phase 6: Save and Report

1. **Save development plan** to the exact `plan_path` computed above.

2. **Report summary:**
   - Key findings
   - Recommended approach
   - Any blockers or questions
   - Exact `plan_path`

## Output Format

Return:

1. **Issue summary** (1-2 sentences)
2. **Complexity assessment** (with reasoning)
3. **`plan_path`** (exact value written to disk)
4. **Development plan** (full markdown)
5. **Recommended next step**

## Error Handling

1. **Issue not found:**
   - Verify issue number
   - Check repository access
   - Suggest correct format

2. **Scope too large:**
   - Recommend splitting
   - Suggest phased approach
   - Identify MVP subset

3. **Missing context:**
   - In autonomous mode, make a reasonable call and log the assumption in the Discovery Log
   - In gated mode, flag for user input

## Example Usage

```
User: "research issue #67"

Agent:
1. Fetches issue #67: "i18n: migrate Welcome, NewGoal, Settings screens"
2. Reads apps/native-rd/CLAUDE.md, i18n patterns under src/i18n/
3. Searches for existing translation keys, finds prior PRs (#127, #128)
4. Maps: 3 screens, ~5 keys per screen, namespace decisions
5. Estimates: ~250 lines (MEDIUM complexity)
6. Creates dev plan at apps/native-rd/docs/plans/dev-plans/issue-67-i18n-welcome-newgoal-settings.md
7. Returns: "Issue #67 — migrate 3 screens to i18n.
   Complexity: MEDIUM (~250 lines). 3-4 commits planned.
   Plan path: apps/native-rd/docs/plans/dev-plans/issue-67-i18n-welcome-newgoal-settings.md
   Ready to proceed with implement skill."
```

## Success Criteria

This agent is successful when:

- Issue is fully understood
- All affected code is identified
- Plan has clear, atomic commits
- Scope is appropriate for single PR
- Plan landed at the hardcoded path under `apps/native-rd/docs/plans/dev-plans/`
- User can proceed confidently with implementation
