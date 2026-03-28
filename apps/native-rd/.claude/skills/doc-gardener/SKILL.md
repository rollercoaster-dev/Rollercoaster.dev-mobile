---
name: doc-gardener
description: Compares doc claims against code behavior, opens fix-up issues for divergences
---

# Doc Gardener

Reads all documentation files, extracts factual claims, verifies each against the actual codebase, and opens GitHub issues for divergences.

## Contract

### Input

| Field       | Type     | Required | Description                                        |
| ----------- | -------- | -------- | -------------------------------------------------- |
| `scope`     | string[] | No       | Specific doc paths to check (default: `docs/**/*.md`, `CLAUDE.md`, `AGENTS.md`) |
| `auto-file` | boolean  | No       | Auto-open GitHub issues for divergences (default: false) |

### Output

| Field               | Type   | Description                         |
| ------------------- | ------ | ----------------------------------- |
| `docsChecked`       | number | Total docs analyzed                 |
| `claimsVerified`    | number | Total factual claims checked        |
| `divergences`       | array  | Claims that don't match code        |
| `issuesCreated`     | number | GitHub issues opened (if auto-file) |

## When to Use

- After a milestone completes — catch stale docs from rapid changes
- After large refactors — verify docs still match reality
- On demand: `/garden-docs` or `Run doc gardener`
- Before releases — ensure docs are accurate

## Claim Types

The gardener extracts and verifies these types of factual claims:

### 1. File Path Claims

Backtick-quoted paths like `` `src/foo/bar.ts` `` or `docs/architecture/something.md`.

**Verification:** Check the path exists using Glob.

### 2. Technology Claims

References to specific technologies, libraries, or tools (e.g., "uses Tamagui", "powered by Drizzle").

**Verification:** Grep `package.json` dependencies and `src/` imports for the technology name. If not found in either, flag as potentially stale.

### 3. Count Claims

Numeric assertions like "14 themes", "253 tests", "6 accessibility variants".

**Verification:**
- Theme count: count entries in `src/themes/compose.ts`
- Test count: `glob src/**/__tests__/**/*.test.{ts,tsx} | wc -l` (fast proxy — avoids spawning Jest)
- Component count: `ls -d src/components/*/ | wc -l`
- Other counts: verify by counting the referenced items

### 4. Feature Claims

Descriptions of behavior like "X screen shows Y" or "the button does Z".

**Verification:** Read the referenced source file and check for the described behavior. Flag if the file doesn't exist or the described behavior is absent.

## Workflow

### Step 1: Collect Documents

```bash
# Default scope
glob docs/**/*.md CLAUDE.md AGENTS.md
```

### Step 2: Extract Claims

For each document, parse line by line:
- Backtick paths → file path claims
- Technology names (match against known list + any proper noun followed by description) → tech claims
- Numbers followed by nouns ("14 themes", "6 variants") → count claims
- "X does Y" / "X has Y" / "X shows Y" patterns near code references → feature claims

Store each claim with: `{ doc, line, type, claim, raw }`

### Step 3: Verify Claims

For each claim, run the appropriate verification (see Claim Types above).

Mark each as: `VERIFIED` or `DIVERGED` with details.

### Step 4: Report Divergences

For each `DIVERGED` claim:

```
{ doc, line, type, claim, actual, severity }
```

Severity:
- **HIGH** — file path doesn't exist, technology removed
- **MEDIUM** — count is wrong, feature description outdated
- **LOW** — minor wording mismatch

### Step 5: Auto-File Issues (if enabled)

For HIGH and MEDIUM divergences:

```bash
gh issue create \
  --title "docs: <doc> line <line> — <claim type> divergence" \
  --body "## Divergence\n\n**Doc:** <doc>\n**Line:** <line>\n**Claim:** <claim>\n**Actual:** <actual>\n\n## Fix\n\n<suggested fix>" \
  --label "type: tech-debt"
```

Group related divergences from the same doc into a single issue when possible.

### Step 6: Update Tech Debt Tracker

If `docs/quality/tech-debt.md` exists, append new divergences that aren't already tracked.

## Output Format

```text
DOC GARDEN REPORT

Docs checked: 12
Claims verified: 47
Divergences found: 3

[HIGH]   CLAUDE.md:45 — path `src/old/removed.ts` does not exist
[MEDIUM] docs/architecture/overview.md:12 — claims "12 themes" but actual count is 14
[LOW]    AGENTS.md:30 — references "Tamagui" but no imports found (may be historical)

Issues created: 2
```

## Error Handling

| Condition                | Behavior                              |
| ------------------------ | ------------------------------------- |
| Doc file unreadable      | Skip file, report as "READ_ERROR"     |
| Verification command fails| Mark claim as "UNVERIFIABLE", continue|
| Issue creation fails     | Report divergence, note "issue not filed"|
| tech-debt.md missing     | Skip tracker update, warn             |
