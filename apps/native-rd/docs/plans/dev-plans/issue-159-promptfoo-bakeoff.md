# Development Plan: Issue #159

## Issue Summary

**Title**: i18n sync: promptfoo bake-off — config, fixtures, voice assertions
**Type**: enhancement (research/tooling)
**Complexity**: SMALL
**Estimated Lines**: ~250 yaml/json hand-written across 3–5 files. Generated eval reports called out separately, not counted.

## Decisions Resolved (2026-05-24)

User confirmed the three gating decisions before implementation. Implementation can proceed.

| #   | Decision                           | Resolution                                                                                                                                                                            |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | promptfoo location (Option A vs B) | **Option A** — `apps/native-rd/scripts/i18n/promptfoo/`. Self-contained, deletable, matches the `scripts/i18n/promptfoo/reports/` literal already in `i18n-llm-sync.md`.              |
| 2   | Judge model for `llm-rubric`       | **`openrouter:anthropic/claude-opus-4-5`**. Not in the 8-candidate pool — no self-grading bias. ~$1.60 per full 160-judge-call run. Uses the same `OPENROUTER_API_KEY` as candidates. |
| 3   | Reports artifact handling          | **Gitignored.** `reports/` excluded via `.gitignore`. Winning HTML report attached to PR description as a file upload.                                                                |

**Implementation paths (locked in):**

- Config: `apps/native-rd/scripts/i18n/promptfoo/promptfooconfig.yaml`
- Fixtures: `apps/native-rd/scripts/i18n/promptfoo/fixtures.json`
- Reports (gitignored): `apps/native-rd/scripts/i18n/promptfoo/reports/`
- Script entry in `apps/native-rd/package.json`: `"i18n:bakeoff": "promptfoo eval --config scripts/i18n/promptfoo/promptfooconfig.yaml"`
- `promptfoo` devDep added to `apps/native-rd/package.json`

**Still open (lower priority, handle in implementation):**

- Q4 — German banned-phrase list. The researcher-drafted list (`"oder nicht"`, `"oder lass es"`, etc.) is best-effort, not authoritative. Joe to review before the first full eval run; safe to commit the config with placeholder phrases marked `// TODO: review` and refine in a follow-up commit if needed.

**Issue-body context corrections (from research):**

- `landing/docs/BRAND_LANGUAGE.md` is in the **sibling `landing/` repo**, not this one. The `llm-rubric` config must inline the brand voice rules — captured in the plan's rubric text.
- `badges.json` and `badgeDesigner.json` are empty `{}` on main. Fixture corpus draws from the other 13 namespaces.
- `dep:blocked` label on issue #159 is stale — #157 merged as PR #170 on 2026-05-24.

---

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] Running `bun run i18n:bakeoff` (or the chosen script entry) against a live `OPENROUTER_API_KEY` completes without error and writes a report to `apps/native-rd/scripts/i18n/promptfoo/reports/`. _(Pending — requires live key. Config validates structurally via `npx promptfoo validate config`.)_
- [x] The fixture corpus contains exactly the strings drawn from real `src/i18n/resources/en/` namespace files — no invented strings, no placeholder strings like "Hello World". _(Verified by reading each en/`<ns>`.json and copy-pasting via a verification script.)_
- [x] Every fixture string with a `{{interpolation}}` placeholder: the output translation preserves the exact same placeholder set (same names, same count). A model that drops or renames a placeholder fails its assertion row. _(Assertion #1 in promptfooconfig.yaml, vacuously true for empty placeholder lists.)_
- [x] Every fixture string passes a banned-phrase check: none of the BRAND*LANGUAGE.md forbidden terms appear in the German output (e.g. "special needs", "differently abled", "high/low functioning", exit-aside phrasings). *(Assertion #2 via `not-icontains-any` with English + researcher-drafted German equivalents.)\_
- [x] Length bounds are checked for all strings: translated output is between 0.5× and 2.5× the source character length (German is structurally wordier than English; tighter bounds would produce false failures on short strings). _(Assertion #3 in promptfooconfig.yaml.)_
- [x] All 8 candidate models from the bake-off table are configured as separate providers. _(8 `openrouter:` providers at temperature 0.)_
- [x] The LLM-as-judge rubric is grounded in `landing/docs/BRAND_LANGUAGE.md` — specifically: direct/non-patronizing tone, identity-first ND vocabulary, absence of toxic positivity, and recognition-not-dismissal parenthetical voice when present. _(All 5 criteria inlined in the `llm-rubric` value, judged by claude-opus-4-5 outside the candidate pool.)_
- [x] The plan doc's open-decisions table is updated: decision #1 marked resolved. _(Resolution row landed in commit #5.)_
- [ ] PR description includes a one-line winner summary (which model, rough quality/cost tradeoff reasoning).

## Dependencies

| Issue | Title                                                                           | Status                         | Type    |
| ----- | ------------------------------------------------------------------------------- | ------------------------------ | ------- |
| #157  | i18n sync: models registry + Vercel AI SDK + OpenRouter wrapper + ADR (gateway) | Merged as PR #170 (2026-05-24) | Blocker |

**Status:** All dependencies met. `models.ts` and `llmGateway.ts` are in the codebase. The `dep:blocked` label on issue #159 is stale — #157 merged on 2026-05-24.

## Objective

Ship a checked-in promptfoo configuration that evaluates all 8 candidate translation models against a representative fixture corpus drawn from real `en/` namespaces. The output is a bake-off report that informs the model choice for the production sync pipeline (translator.ts, PR #5 / issue #160).

This PR is read-only against the namespace JSONs — it only samples strings, never modifies them. It is also independent of `translator.ts` and `promptBuilder.ts` (both in later PRs); the promptfoo config constructs its own minimal translation prompt inline.

## Decisions

| ID  | Decision                                                                                                                                         | Alternatives Considered                                                                             | Rationale                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | promptfoo location: `apps/native-rd/scripts/i18n/promptfoo/` (Option A) — **resolved 2026-05-24**                                                | Option B (repo-root `promptfoo/i18n/`)                                                              | User confirmed. Matches existing AC text in `i18n-llm-sync.md`. No cross-cutting LLM evals on the visible roadmap to justify Option B. Re-evaluate if a second eval appears in the same milestone.                                              |
| D2  | promptfoo provider syntax uses `openrouter:<model-id>` native provider (not `openai` with baseURL override)                                      | Use `openai` provider with `config.apiBaseUrl: https://openrouter.ai/api/v1`                        | promptfoo has a first-class `openrouter:` provider that reads `OPENROUTER_API_KEY` automatically. No custom baseURL plumbing needed. Simpler config, less to maintain.                                                                          |
| D3  | Temperature in promptfoo config matches `models.ts`: `0.0` for all providers                                                                     | Per-provider temperature tuning                                                                     | Consistency with the registry. The registry is the single source of truth for temperature settings. Any deviation in the promptfoo config would make the bake-off results non-representative of production inference.                           |
| D4  | Fixture file is a standalone `fixtures.json` with `{ns, key, en, categories}` shape (not embedded inline in the YAML)                            | Embed test cases as YAML `tests:` list directly in config                                           | Separating fixtures makes the corpus independently reviewable and reusable by a hypothetical `translator.ts` integration test. The YAML `tests:` block references the JSON file via `tests: fixtures.json`.                                     |
| D5  | LLM-as-judge uses `llm-rubric` assertion with an explicit rubric drawn from BRAND_LANGUAGE.md                                                    | `model-graded-closedqa` or `similar`                                                                | `llm-rubric` is the natural fit: we're evaluating prose quality against a set of criteria, not a factual answer. The rubric text can directly quote the brand voice principles.                                                                 |
| D6  | Judge model for `llm-rubric` is `openrouter:anthropic/claude-opus-4-5` — **resolved 2026-05-24**                                                 | A model from the candidate pool (self-grading bias); local model via Ollama (weaker voice judgment) | User confirmed. Outside the 8-candidate pool — no self-grading conflict. Strong instruction-following for rubric scoring. ~$1.60 per full 160-judge-call eval run via OpenRouter.                                                               |
| D7  | The translation prompt in the promptfoo config is a minimal inline system prompt (not importing from `promptBuilder.ts` which doesn't exist yet) | Wait for PR #5 before running the bake-off                                                          | The bake-off's purpose is model selection, not prompt engineering. A minimal prompt isolates the model's inherent voice quality. The production prompt (PR #8) will add register YAMLs and intent sidecars — that is a later optimization pass. |
| D8  | `promptfoo` is added as a devDependency, not globally installed                                                                                  | `npx promptfoo`                                                                                     | Checked-in devDep means the exact version is pinned and CI can run it without a global install step.                                                                                                                                            |

## Affected Areas

- `apps/native-rd/scripts/i18n/promptfoo/promptfooconfig.yaml`: new file — main promptfoo config with 8 providers, prompt, and assertion suite
- `apps/native-rd/scripts/i18n/promptfoo/fixtures.json`: new file — ~20 representative en strings with categories and metadata
- `apps/native-rd/scripts/i18n/promptfoo/reports/`: directory — generated eval reports (gitignored or committed, see Open Questions)
- `apps/native-rd/package.json` (Option A) or root `package.json` (Option B): add `promptfoo` devDep + script entry
- `apps/native-rd/docs/plans/i18n-llm-sync.md`: update open-decisions table row #1 to mark resolved
- `bun.lock`: lockfile churn from new devDep (generated, not counted)

## Fixture Corpus Selection

The corpus is drawn from real `src/i18n/resources/en/` namespace files. All 15 namespaces exist at that path. The ~20 strings below cover the four hard-case categories from the issue. Exact strings confirmed by reading the JSON files.

### Operational labels (short/dense) — from `common.json`, `goals.json`, `settings.json`

| #   | Namespace | Key path                            | String                       | Why                                                                   |
| --- | --------- | ----------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| 1   | common    | `actions.save`                      | `"Save"`                     | Minimal — 1 word, no context                                          |
| 2   | common    | `actions.dismiss`                   | `"Dismiss"`                  | Action verb with dismissal connotation — tests voice neutrality       |
| 3   | common    | `modeIndicator.complete`            | `"Complete"`                 | Short state label                                                     |
| 4   | goals     | `emptyState.title`                  | `"No goals yet"`             | Short, no-pressure empty state — tests for toxic positivity avoidance |
| 5   | settings  | `density.options.comfortable.label` | `"Comfortable"`              | Single adjective                                                      |
| 6   | common    | `stepCard.blocker.label`            | `"Add evidence to complete"` | Action-oriented label without exclamation                             |

### `{{interpolation}}` strings — from `common.json`, `focusMode.json`, `captureText.json`

| #   | Namespace   | Key path                    | String                                                                          | Why                                              |
| --- | ----------- | --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| 7   | common      | `status.a11yPrefix`         | `"Status: {{label}}"`                                                           | Single placeholder — baseline                    |
| 8   | common      | `stepCard.progress`         | `"Step {{current}} of {{total}}"`                                               | Two placeholders in one string                   |
| 9   | goals       | `card.a11y.label`           | `"{{title}}, {{stepsCompleted}} of {{stepsTotal}} steps completed, {{status}}"` | Four placeholders — stress test                  |
| 10  | focusMode   | `errors.couldNotUpdateStep` | `"Could not update step: {{message}}"`                                          | Error string with interpolated detail            |
| 11  | captureText | `charCount.a11y`            | `"{{count}} of {{max}} characters used"`                                        | Numeric interpolation                            |
| 12  | captureFile | `description`               | `"Select a PDF, image, or document (max {{maxSize}})."`                         | Parenthetical with interpolation — compound test |

### Parenthetical asides / brand voice signature — from `welcome.json`, `common.json`, `newGoal.json`

| #   | Namespace | Key path             | String                                                                                                               | Why                                         |
| --- | --------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 13  | welcome   | `cta.footnote`       | `"You can change this anytime in Settings."`                                                                         | Reassurance-in-closing — core brand move    |
| 14  | welcome   | `intro.body2`        | `"First, let's pick a look that fits your brain. Tap a swatch — the whole app changes so you can see how it feels."` | Informal, self-aware, avoids corporate tone |
| 15  | common    | `theme.picker.title` | `"Pick what feels right"`                                                                                            | Imperative with autonomy framing            |

### Refusal phrasings / ND-affirming — from `focusMode.json`, `goals.json`, `captureVoice.json`

| #   | Namespace    | Key path                 | String                                                                                     | Why                                                            |
| --- | ------------ | ------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 16  | focusMode    | `toast.evidenceRequired` | `"Add evidence before completing this step"`                                               | Instructional without pressure/exclamation                     |
| 17  | focusMode    | `confirmDelete.message`  | `"You can undo this briefly after deleting."`                                              | No-pressure reassurance pattern                                |
| 18  | goals        | `emptyState.body`        | `"Add your first learning goal to get started."`                                           | Invitational, not directive                                    |
| 19  | captureVoice | `discardUnsaved.keep`    | `"Keep Recording"`                                                                         | Affirming the user's existing action                           |
| 20  | focusMode    | `a11y.allStepsComplete`  | `"All steps complete for \"{{title}}\". Mark Complete is now available on the goal card."` | Complex congratulatory string — tests brevity + no exclamation |

**Note on `badges.json` and `badgeDesigner.json`:** Both files are empty (`{}`) as of the current main branch. They are excluded from the corpus — including empty-namespace strings would produce meaningless fixture entries.

## Assertion Suite Design

Three deterministic assertion types + one LLM-as-judge per string.

### 1. Placeholder preservation (deterministic, per-string)

For each string with `{{...}}` placeholders, extract the set of placeholder names from the source and assert they all appear in the output. Use a JavaScript assertion per string:

```yaml
- type: javascript
  value: |
    // placeholders extracted from source: ['label']
    const expected = ['label'];
    return expected.every(p => output.includes('{{' + p + '}}'));
```

Applied only to fixture entries #7–#12 and #20. Strings #1–#6 and #13–#19 have no placeholders (skip this assertion).

### 2. Banned-phrase absence (deterministic, applies to all strings)

Check the translated output does not contain a set of forbidden terms from BRAND_LANGUAGE.md. Use a regex assertion with the `not-` prefix:

```yaml
- type: not-icontains-any
  value:
    - "special needs"
    - "differently abled"
    - "high-functioning"
    - "low-functioning"
    - "suffers from"
    - "oder nicht" # German exit-aside equivalent of "(or don't)"
    - "oder lass es" # German exit-aside
```

**Note on German banned terms:** The exit-aside anti-pattern has German equivalents. The list above is a starting set — the exact German phrasings will evolve after the first eval run. See Open Questions.

### 3. Length bounds (deterministic, applies to all strings)

German inherently runs longer than English. A blanket 0.5× to 2.5× ratio avoids false failures on short strings while catching runaway verbosity on longer ones:

```yaml
- type: javascript
  value: |
    const ratio = output.length / context.vars.en.length;
    return ratio >= 0.5 && ratio <= 2.5;
```

This ratio is intentionally wide for v1. Post-bake-off, per-string tighter bounds can be added for critical UI labels.

### 4. LLM-as-judge voice quality (1 assertion per string, provider TBD)

```yaml
- type: llm-rubric
  value: |
    Score the German translation of this UI string on these BRAND_LANGUAGE.md criteria:
    1. Direct and non-patronizing: no "special," "differently-abled," "everyone is unique"
    2. Matter-of-fact tone: no exclamation points unless the source had one
    3. Identity-first ND vocabulary where relevant (e.g. "autistische Person" not "Betroffene")
    4. Parenthetical asides (if present in source) preserved as recognition, not exit/dismissal
    5. Brevity: as concise as grammatically possible in German
    Rate PASS if all criteria hold, FAIL if any are violated. Explain the rating in one sentence.
  provider: <see Open Questions — judge model not yet chosen>
  threshold: 0.5
```

## Models Config

promptfoo's native `openrouter:` provider reads `OPENROUTER_API_KEY` from env automatically (same env var as `llmGateway.ts`). One entry per model from the `models.ts` registry, `temperature: 0` to match registry defaults:

```yaml
providers:
  - id: openrouter:openai/gpt-4o-mini
    config:
      temperature: 0
  - id: openrouter:openai/gpt-4o
    config:
      temperature: 0
  - id: openrouter:openai/gpt-5-mini
    config:
      temperature: 0
  - id: openrouter:anthropic/claude-haiku-4-5
    config:
      temperature: 0
  - id: openrouter:anthropic/claude-sonnet-4-6
    config:
      temperature: 0
  - id: openrouter:google/gemini-2.5-flash
    config:
      temperature: 0
  - id: openrouter:deepseek/deepseek-chat
    config:
      temperature: 0
  - id: openrouter:openai/gpt-oss-120b
    config:
      temperature: 0
```

The `openrouter:` prefix is the promptfoo native provider string. This does not interact with or import from `llmGateway.ts` — promptfoo manages its own HTTP calls. The two systems share `OPENROUTER_API_KEY` and the same OpenRouter model IDs (taken from the `MODELS` registry).

## Implementation Plan

### Step 1: Add `promptfoo` devDep + script entry

**Files**: `apps/native-rd/package.json` (Option A) or root `package.json` (Option B)
**Commit**: `chore(native-rd/i18n): add promptfoo devDependency + bakeoff script entry`
**LOC**: ~3 lines

**Changes**:

- [x] Add `"promptfoo": "^0.x.y"` (pin to current latest stable) to `devDependencies` in the chosen `package.json` _(pinned `^0.121.12`)_
- [x] Add `"i18n:bakeoff": "promptfoo eval --config scripts/i18n/promptfoo/promptfooconfig.yaml --output scripts/i18n/promptfoo/reports/$(date +%Y%m%d-%H%M%S).html"` (or equivalent for Option B paths) to `scripts`
- [x] Run `bun install` from repo root to update `bun.lock`
- [x] Confirm `bun run type-check` still passes

---

### Step 2: Fixture corpus

**Files**: `apps/native-rd/scripts/i18n/promptfoo/fixtures.json`
**Commit**: `feat(native-rd/i18n): promptfoo fixture corpus — 20 real en strings`
**LOC**: ~90 lines JSON

**Changes**:

- [x] Create `fixtures.json` containing the 20 strings from the corpus table above
- [x] Shape: array of objects `{ "ns": string, "key": string, "en": string, "categories": string[], "placeholders": string[] }` _(actual shape is `{ description, vars: { ns, key, en, categories, placeholders } }` per promptfoo's TestCase format — see Discovery Log)_
  - `placeholders` is an empty array for strings #1–#6 and #13–#19; populated for #7–#12 and #20
  - `categories` uses values: `"operational-label"`, `"interpolation"`, `"parenthetical"`, `"refusal-affirming"`
- [x] Verify each `en` value by copy-paste from the actual JSON file — no transcription from memory
- [x] No invented strings, no lorem ipsum, no placeholders

---

### Step 3: promptfoo config

**Files**: `apps/native-rd/scripts/i18n/promptfoo/promptfooconfig.yaml`
**Commit**: `feat(native-rd/i18n): promptfoo config — 8 providers, brand-voice assertions`
**LOC**: ~140 lines YAML

**Changes**:

- [x] `description:` field: `"native-rd i18n bake-off: en→de voice fidelity across 8 candidate models"`
- [x] `providers:` — all 8 entries from models config section above, `temperature: 0`
- [x] `prompt:` — inline system + user prompt. System: minimal translation instruction that names the target language (German) and requests brief, direct output without corporate language. User: `"Translate to German: {{en}}"`. The prompt is intentionally minimal — the bake-off tests model quality, not prompt quality. _(System prompt avoids literal `{{...}}` in copy to prevent nunjucks substitution; placeholders described as "double-curly-brace" instead.)_
- [x] `tests:` — references `fixtures.json` via `- file://./fixtures.json` and uses `vars.en`, `vars.ns`, `vars.key`
- [x] Per-test `assert:` block composed from: _(moved to `defaultTest.assert` since every fixture takes the same assertion set)_
  - placeholder check (`javascript`, conditional on non-empty `placeholders` array) _(unconditional — `(placeholders ?? []).every(...)` is vacuously true for empty arrays)_
  - banned-phrase check (`not-icontains-any`)
  - length bounds check (`javascript`)
  - voice rubric (`llm-rubric`, provider TBD — see Open Questions) _(judge resolved to `openrouter:anthropic/claude-opus-4-5`)_
- [x] `outputPath:` not set in config (report path is passed via CLI flag in the script entry — gives a timestamped file per run)
- [x] `env:` block confirming `OPENROUTER_API_KEY` is required (promptfoo surfaces a clear error if unset)

---

### Step 4: Reports gitignore + plan doc update

**Files**:

- `apps/native-rd/scripts/i18n/promptfoo/.gitignore` (new, for `reports/` dir) — OR commit one example report if the acceptance criterion requires a checked-in report artifact
- `apps/native-rd/docs/plans/i18n-llm-sync.md` — update open-decisions table row #1

**Commit**: `docs(native-rd/i18n): resolve promptfoo location decision, gitignore reports`
**LOC**: ~5 lines

**Changes**:

- [x] Create `apps/native-rd/scripts/i18n/promptfoo/.gitignore` with `reports/` to keep generated HTML/JSON reports out of the tree (reports are run artifacts, not source)
  - **Exception**: if the first eval run is committed as a PR artifact (acceptance criterion says "PR description includes a one-line summary"), commit the HTML report in a separate commit or attach it as a PR file drop. Either approach satisfies the AC — clarify with user. _(Locked to PR file-drop attachment per resolved decision #3.)_
- [x] Update `i18n-llm-sync.md` open-decisions table: row #1 status from "Open" to "Resolved — Option A/B chosen, YYYY-MM-DD"

---

### Step 5: First eval run (not a commit — PR description artifact)

This step is not a code commit. It is a prerequisite for the PR description's required content.

- [ ] `OPENROUTER_API_KEY=<key> bun run i18n:bakeoff`
- [ ] Read the report and identify the winner: which model best balanced voice fidelity (LLM-judge pass rate) and cost (promptfoo outputs per-model cost if configured)
- [ ] Write a one-line winner summary for the PR description, e.g.: "claude-haiku-4-5 won: highest rubric pass rate (18/20) at roughly 0.3× the cost of sonnet-4-6; gpt-4o-mini matched on deterministic checks but failed 4 voice rubrics."

## Testing Strategy

This PR produces no Jest tests. The promptfoo config is the test artifact — it exercises the models directly.

- [ ] Manual: `OPENROUTER_API_KEY=<key> bun run i18n:bakeoff` completes without YAML parse errors
- [ ] Manual: report file appears at `apps/native-rd/scripts/i18n/promptfoo/reports/<timestamp>.html`
- [ ] Manual: all 20 fixture strings appear in the report with per-model pass/fail rows
- [ ] Deterministic assertions (placeholder, banned-phrase, length) produce consistent results across re-runs with the same output (they are not model-dependent, so a second run should not flip their pass/fail if the model output is identical at temperature 0)
- [ ] Post-run: share report with user for visual inspection of the LLM-judge scores

## Not in Scope

| Item                                              | Reason                                                                                        | Follow-up                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------- |
| `translator.ts` or `promptBuilder.ts` integration | Those are PR #5 (issue #160)                                                                  | #160                          |
| Per-namespace register YAML files                 | PR #8; the bake-off uses a minimal inline prompt                                              | Post-bake-off                 |
| Intent sidecar (`.intents.json`)                  | PR #8 scope                                                                                   | Post-bake-off                 |
| German banned-phrase list refinement              | Needs first eval output to identify real false positives                                      | Discovery log after first run |
| Concurrent/parallel batch eval                    | Single-threaded for v1 (plan locked decision #5)                                              | Post-v1                       |
| Cost threshold assertions (`type: cost`)          | Requires model cost config per provider; deferred until cost data from first run is available | Optional follow-up            |

## Open Questions

### Q1 — Judge model for `llm-rubric` — RESOLVED 2026-05-24

**Decision:** `openrouter:anthropic/claude-opus-4-5`. Not in the 8-candidate pool — no self-grading bias. ~$1.60 per full 160-judge-call eval run. Uses the same `OPENROUTER_API_KEY` as candidates. See D6 in Decisions table.

### Q2 — Reports artifact handling — RESOLVED 2026-05-24

**Decision:** Gitignored. `reports/` excluded via `apps/native-rd/scripts/i18n/promptfoo/.gitignore`. Winning HTML report attached to the PR description as a file upload — satisfies the "report exists" AC without polluting git history with generated output.

### Q3 — German banned-phrase list completeness (still open, lower priority)

The banned-phrase list above (`"oder nicht"`, `"oder lass es"`, etc.) is a research best-effort at German equivalents of BRAND_LANGUAGE.md's English anti-patterns. It is not authoritative — Joe may know additional German phrasings that violate the brand voice. **Implementation guidance:** commit the config with the researcher-drafted list and mark it `// TODO: review` in a comment. Joe reviews before the first full eval run; refine in a follow-up commit if needed.

## Discovery Log

Runtime discoveries made during research. Starts empty — populated by the implement skill as work progresses.

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-05-24] **`badges.json` and `badgeDesigner.json` are empty (`{}`) on main.** The issue body and i18n-llm-sync.md both imply 15 namespaces are populated. Two of the 15 are empty shells. The corpus was built from the 13 non-empty namespaces. No impact on the bake-off scope — 20 representative strings were found without needing these files.
- [2026-05-24] **`landing/docs/BRAND_LANGUAGE.md` lives in the sibling `landing` repo at `~/Code/rollercoaster.dev/landing/`, NOT in this mobile repo.** The issue body references it as a local path. It is not checked in to the mobile repo, only to the `landing` repo. The promptfoo config's `llm-rubric` assertion must quote the relevant brand voice rules inline rather than referencing a relative file path. Plan text updated accordingly.
- [2026-05-24] **`dep:blocked` label on issue #159 is stale.** PR #170 (merged 2026-05-24T14:00:06Z) closed issue #157 — the declared blocker. The label can be removed when the issue is picked up.
- [2026-05-24] **promptfoo has a first-class `openrouter:` provider** that reads `OPENROUTER_API_KEY` directly, matching the env var convention already established in `llmGateway.ts`. No baseURL override needed in the config — simpler than the `openai` provider approach.
- [2026-05-24] **`tests: file://*.json` expects `TestCase` shape, not flat data.** The plan's Step 2 specced fixtures.json as `[{ns, key, en, categories, placeholders}, ...]`. promptfoo's `validate config` rejected it: "Test case must contain one of the following properties: assert, vars, options, metadata, provider, providerOutput, threshold." Restructured fixtures.json to `[{description, vars: {ns, key, en, categories, placeholders}}, ...]`. The config still references via `vars.en`, `vars.ns`, etc., matching the plan's documented access pattern. `npx promptfoo validate config` now reports "Configuration is valid."
- [2026-05-24] **bun can't run the promptfoo CLI** — `bunx promptfoo` fails with `'better-sqlite3' is not yet supported in Bun` (oven-sh/bun#4290). promptfoo bundles better-sqlite3 for its eval cache. Workaround: the `i18n:bakeoff` script entry resolves `promptfoo` via the node-shebang binary in `node_modules/.bin/`, so `bun run i18n:bakeoff` invokes the right runtime even though `bunx promptfoo` doesn't.
