# Finding Contract

Every `review-*` expert agent reads this file before reviewing and returns its
result in exactly this shape. The `expert-review` skill parses it, so do not
add prose around the JSON block.

## What you receive

| Field    | Meaning                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `root`   | The worktree under review. All file paths are relative to it — read code there                                             |
| `diff`   | Path to the unified diff under review (`<root>/tmp/expert-review/<run>/diff.patch`)                                        |
| `files`  | Changed files in your domain (routing already filtered them). A `(deleted)` suffix means the file exists only in the patch |
| `intent` | Commit messages plus PR text, linked issue or the plan the diff touches. Use it to judge whether a deviation is deliberate |

Read the diff first, then the sources your agent file lists, then the
surrounding code of each hunk you comment on. The diff alone is never enough
evidence — open the file. For a deleted file, read it from the patch and
`grep` for what still references it.

The app lives in `apps/native-rd/`; its rules are `apps/native-rd/CLAUDE.md`
and `apps/native-rd/AGENTS.md`. Workspace rules are the root `CLAUDE.md`,
`AGENTS.md` and `.claude/rules/*.md`.

## What you return

A single fenced `json` block, nothing else:

```json
{
  "expert": "review-data-model",
  "reviewed_files": ["apps/native-rd/src/db/schema.ts"],
  "findings": [
    {
      "file": "apps/native-rd/src/db/schema.ts",
      "line": 142,
      "severity": "blocker",
      "title": "Renamed column drops every existing row's value",
      "rule": "apps/native-rd/docs/decisions/ADR-0004-data-model-storage.md#5-sync-ready-schema-design",
      "evidence": "Line 142 renames `plannedEvidence` to `plannedEvidenceTypes`; Evolu has no migration step, so rows written by older builds read as null and queries.ts:88 treats null as 'no plan'.",
      "fix": "Keep the old column and add the new one as nullOr(...); read the new column with a fallback to the old."
    }
  ]
}
```

- `line` — a line in the **new** version of the file under `root` that the
  diff adds or changes; the first line of the range. Never the line number
  inside `diff.patch` — open the file and take the number there. For a deleted
  file, the line in the old file and say so in `evidence`.
- `rule` — a repo doc path with `#section` anchor, a `.claude/rules/*.md`
  path, an ADR, or for generic checks the literal string of your checklist
  item (e.g. `correctness: unawaited promise`). Never invent a doc path — if
  you can't cite one, the finding probably isn't yours.
- `evidence` — what in the code shows it, with line numbers. A behaviour
  claim without a code citation is not a finding.
- `fix` — concrete. Code ≤ 6 lines when the fix is that small.

No findings is a valid and common answer: return `"findings": []`.

## Security findings

A finding about key material, personal data leaving the device, or an
untrusted input reaching a sensitive sink adds a `security` object:

```json
{
  "security": {
    "attacker": "Anyone the user shares an exported badge with",
    "entrypoint": "useBadgeExport.ts:57 — share sheet payload",
    "impact": "Signing key's private JWK embedded in the shared PNG",
    "guards_checked": [
      "credentialBuilder strips d? — no, line 31 spreads the whole JWK"
    ],
    "unknowns": [],
    "next_check": "Bake a badge in a test and assert the iTXt payload has no `d` member"
  }
}
```

Replace every value with observed facts — the example is shape only.

## Severity

| Severity     | Use when                                                                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blocker`    | Loses or corrupts user data (including on upgrade or sync), leaks key material or personal data, ships a badge that fails verification, breaks a build or release, or violates an ADR guardrail (e.g. ADR-0012 no-auto-judgment) |
| `should-fix` | A real bug in an edge case, an accessibility barrier, or a documented convention clearly violated in a way a reviewer would ask to change                                                                                        |
| `nit`        | Minor convention drift, naming, readability. At most 3 nits per expert — keep the most useful                                                                                                                                    |

## Do not flag — every expert

- Anything CI already enforces: `bun run type-check` (tsc), `bun run lint`
  (ESLint incl. the local rules `no-raw-colors`, `no-raw-jsx-strings`,
  `require-barrel-export`, `no-component-imports-screens`, `file-size-limit`,
  `no-validate-at-boundaries`, `no-shared-component-reimplementation`),
  Prettier, the structure tests in `apps/native-rd/src/__tests__/structure/`,
  the i18n namespace/parity tests, DCO. Flag only what those can't see
  (dynamic style construction, a rule disabled inline without reason).
- Issues on lines the diff does not add or change (pre-existing code), unless
  the change makes them newly reachable.
- Generated files: `src/i18n/resources/pseudo/**`, bot-synced
  `src/i18n/resources/de/**`, `packages/design-tokens/css/**`, `dist/**`,
  `__snapshots__/**`, `bun.lock`, `CHANGELOG.md`.
- Speculative problems that need inputs nothing in the codebase produces.
- Personal preference that no doc backs.
- Things outside your domain — another expert owns them. Stay in your lane;
  duplicates cost the reader time.
- A deviation the `intent` explains as deliberate, unless it is a blocker.
- Historical references to removed monorepo siblings in old docs (root
  `AGENTS.md` → "Git provenance").
