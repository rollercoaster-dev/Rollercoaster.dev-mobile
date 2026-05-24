# i18n LLM sync (en → de) — plan

**Status:** Design phase. No code yet. Last updated 2026-05-24.

This plan tracks the architectural decisions, PR sequence, and learnings for native-rd's LLM-assisted i18n sync. Issues reference this doc; the doc gets updated as decisions land and learnings emerge.

---

## What this is

native-rd authors edit `apps/native-rd/src/i18n/resources/en/*.json` (15 namespaces). A CLI sync fills `apps/native-rd/src/i18n/resources/de/*.json` idempotently using an LLM. Gap-only translation, placeholder guard, key-anonymised batches, register/intent/glossary-driven voice.

Voice is the load-bearing constraint. native-rd's voice — named-maker stance, identity-first ND vocab, refusal-as-feature, parenthetical asides, banned dismissive verbs — is documented in `landing/docs/BRAND_LANGUAGE.md` (sibling repo). A flat target-locale glossary alone would not be enough.

---

## Locked decisions

### LLM gateway: OpenRouter

Single API endpoint, ~300 models, pay-per-call. We swap models by changing a string in `models.ts`. No proxy infrastructure to host. Lets promptfoo evaluate candidates across vendors before committing to one. ADR lands with PR #3.

### Runtime SDK: Vercel AI SDK

TS-native, provider-swap is one line, Zod schemas validate response shape end-to-end. Pairs naturally with OpenRouter.

### Target locales: `de` only for v1

`fr` is a near-trivial add later (second target in the model registry). Building all infrastructure for one target keeps PR scope honest.

### Voice enforcement: per-namespace register + per-string intent sidecar + thin glossary

Three layers, in decreasing strength:

1. **Per-namespace register** — one YAML file per namespace carries the default voice register (speaker, audience, formality, banned phrasings). Loaded into the system prompt per batch. Exact filesystem location is decision #2 in [Open decisions](#open-decisions).
2. **Per-string intent sidecar** — optional `apps/native-rd/src/i18n/resources/en/<ns>.intents.json` mirrors the namespace JSON shape, replacing string leaves with `{ intent, audience?, register? }` objects. Only authored for strings that override or sharpen the namespace register. ~80% of strings will not need a sidecar entry.
3. **Glossary** — thin reference for canonical wordings (brand tokens, app names). Not the primary voice mechanism.

The runtime i18next JSON is untouched. The sync reads `en/*.json`, optional `en/*.intents.json`, and the register YAMLs together; runtime reads only `en/*.json` and `de/*.json`. ADR lands with PR #8.

### PR cap: ~500 LOC hand-written

Per `~/.claude/rules/estimate-format.md`. Generated locale JSONs and lockfile churn called out separately, not counted. Tests count.

### Linter strict-promotion trip-wire

`scripts/i18n/lintSource.ts` ships warn-only. Promotes to strict (failing CI) when all three hold for one calendar week:

1. Zero `eslint-disable-next-line i18n/no-bare-string` under `apps/native-rd/src/i18n/resources/en/`.
2. Zero warn-level findings on most recent `bun run lint` against `main`.
3. At least one end-to-end sync has run on `main` (the bot has committed `de/` back at least once).

Clause 3 ensures the linter has been exercised against real sync output before becoming load-bearing.

---

## Open decisions

| #   | Decision                                                                                                                                                               | Status                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | promptfoo location: `scripts/i18n/promptfoo/` (scoped to sync) vs. repo-root `promptfoo/` (if other LLM evals appear later)                                            | Resolved 2026-05-24 — `apps/native-rd/scripts/i18n/promptfoo/` (Option A, scoped). See dev plan for #159. |
| 2   | Register file location: `src/i18n/resources/_register/` (sits next to locale files for author affordance) vs. `scripts/i18n/registers/` (groups sync tooling together) | Open                                                                                                      |
| 3   | Bot identity for CI commit-back: reuse existing bot account vs. create `rd-i18n-bot`                                                                                   | Punted to PR #9                                                                                           |
| 4   | Identity-first German forms (Sie/du, gender-neutral patterns)                                                                                                          | Punted to first sync output review                                                                        |
| 5   | Concurrent batching vs. single-threaded for v1                                                                                                                         | Single-threaded for v1; revisit if sync time exceeds CI budget                                            |

---

## Architecture

```
en/*.json (15 namespaces) + en/*.intents.json (optional) + <register>/<ns>.yml
        │
        │ (CI: only if en/ changed in PR diff)
        ▼
scripts/i18n/sync.ts (Bun CLI)
        │
        ├── jsonTreeUtils.deepFillMissingStrings
        ├── jsonTreeUtils.translatableSubtree       ← idempotency guarantee
        │
        └── translator.translateTree
                  │       ▲
                  │       │ promptBuilder.buildSystemPrompt(register, intents)
                  ▼       │
            placeholderGuard.normalize
                  │
            responseParser.parseAndValidate (Zod)
                  │
                  ▼
            deepMerge into de/ tree → write JSON
                  │
                  ▼
            bot push → de/*.json × 15 namespaces back on PR branch
```

### Module layout

| File                                      | Role                                                          |
| ----------------------------------------- | ------------------------------------------------------------- |
| `scripts/i18n/jsonTreeUtils.ts`           | Pure-function tree operations (the algorithm core)            |
| `scripts/i18n/placeholderGuard.ts`        | Hard-fail validation of `{{name}}` placeholders               |
| `scripts/i18n/responseParser.ts`          | Zod-validated LLM response → `{k0: ...}` dict                 |
| `scripts/i18n/promptBuilder.ts`           | System prompt assembly (register + intents + glossary)        |
| `scripts/i18n/translator.ts`              | Tree → batched LLM call → write-back-by-path                  |
| `scripts/i18n/sync.ts`                    | CLI entry point, orchestrates the pipeline                    |
| `scripts/i18n/lintSource.ts`              | Source-side linter for `en/` (bare strings, missing intents)  |
| `scripts/i18n/models.ts`                  | Model registry (OpenRouter IDs + per-model defaults)          |
| `<register-dir>/<ns>.yml`                 | Per-namespace voice register (location: see open decision #2) |
| `src/i18n/resources/en/<ns>.intents.json` | Optional per-string intent sidecar                            |
| `.github/workflows/i18n-sync.yml`         | CI: diff-aware, runs sync, bot commits results to PR          |

### Key invariants

1. **Gap-only translation.** Re-running is idempotent. Existing `de/` values are never overwritten.
2. **Placeholder guard hard-fails.** Wrong-shape LLM output aborts the batch, no silent ship.
3. **Key anonymisation.** Batches go to the LLM as `{k0, k1, ...}` — the model never sees real key names, only the strings. Prevents the model from "helpfully" inferring context from key paths.
4. **Single JSON pipeline.** native-rd is one app, one runtime; no per-locale file format split.
5. **Runtime untouched by sync metadata.** i18next loads `en/*.json` and `de/*.json` only — sidecars and registers are sync-only.
6. **Batching at `temperature: 0.0`.** Reduces variance across runs but is not a determinism guarantee — providers retain residual nondeterminism, and model/router updates change outputs. The real stability guarantee is invariant #1 (gap-only + never overwrite): once a `de/` string is written, the pipeline does not re-translate it. Re-translation requires deleting the target value first.

---

## PR sequence

Hand-written LOC only. Generated `de/*.json` (PR #10) doesn't count toward the cap.

| #   | PR                                                                                                            | LOC            | Files       | Depends on   |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------- | ----------- | ------------ |
| 1   | `jsonTreeUtils.ts` + tests                                                                                    | ~350           | 2           | —            |
| 2   | `placeholderGuard.ts` + `responseParser.ts` (Zod) + tests                                                     | ~250           | 4           | —            |
| 3   | `models.ts` registry + Vercel AI SDK + OpenRouter wrapper + tests + **ADR: gateway choice**                   | ~250           | 3 (+ ADR)   | —            |
| 4   | promptfoo config + ~20 fixture en strings + brand-voice assertions                                            | ~250 yaml/json | 3–5         | #3           |
| 5   | `translator.ts` + `promptBuilder.ts` + tests                                                                  | ~450           | 4           | #1, #2, #3   |
| 6   | `sync.ts` CLI + integration test                                                                              | ~300           | 2           | #5           |
| 7   | `lintSource.ts` warn-only + tests + strict-promotion criterion documented                                     | ~350           | 2           | — (parallel) |
| 8   | Voice system prompt + per-namespace register YAMLs + sidecar intent loader + **ADR: voice enforcement shape** | ~250 md/yaml   | 2–3 (+ ADR) | #5           |
| 9   | CI workflow + bot identity                                                                                    | ~100 yaml      | 1–2         | #6, #8       |
| 10  | First sync output: `resources/de/*.json` × 15 namespaces                                                      | generated      | 15          | #9           |

**Total hand-written: ~2,550 LOC across 9 code PRs.**

PRs #1, #2, #3, #7 are independent and can land in any order. PR #5 is the integration point.

---

## promptfoo candidate models for first eval

Tested against ~20 representative en strings (operational labels, `{{interp}}`, parenthetical asides, refusal phrasings):

| Model                            | Why in the bake-off               |
| -------------------------------- | --------------------------------- |
| `openai/gpt-4o-mini`             | cheap baseline                    |
| `openai/gpt-4o`                  | quality midpoint                  |
| `openai/gpt-5-mini`              | newer same-tier candidate         |
| `anthropic/claude-haiku-4-5`     | strong voice/register, cheap tier |
| `anthropic/claude-sonnet-4-6`    | quality benchmark                 |
| `google/gemini-2.5-flash`        | very cheap baseline               |
| `deepseek/deepseek-chat`         | cheap wild card                   |
| `openai/gpt-oss-120b` (via Groq) | open-weight workhorse             |

---

## Acceptance — "i18n LLM sync v1 done" means:

1. Author edits `en/<ns>.json`, opens PR.
2. CI detects `en/` change, runs `scripts/i18n/sync.ts`, commits `de/<ns>.json` back to the PR branch.
3. PR diff shows both `en/` and `de/` changes side by side.
4. Re-running the sync with no `en/` changes is a no-op.
5. A placeholder mismatch (`{{name}}` dropped or renamed) aborts the batch with a clear error, no silent ship.
6. `lintSource.ts` warns on bare strings in `en/` source files.
7. promptfoo eval report exists in `scripts/i18n/promptfoo/reports/` for the chosen model.

Strict-mode promotion of `lintSource` is post-v1.

---

## Changelog

ADRs amending decisions in this plan use **supersession** (write a new ADR that supersedes the old one), not in-place amendment. See ADR-0006 (2026-05-23) for the pattern.

| Date       | Change                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-24 | Initial plan. OpenRouter gateway, Vercel AI SDK, sidecar+register voice shape, three-clause linter trip-wire all locked. |

---

## Learnings

Appended as PRs land. Format: `YYYY-MM-DD — short title — one paragraph`.

_(empty — first PR will seed this section)_
