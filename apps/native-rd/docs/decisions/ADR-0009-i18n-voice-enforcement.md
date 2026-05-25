# ADR-0009: i18n voice enforcement shape — three-layer register + intent sidecar + glossary

**Date:** 2026-05-25
**Status:** Accepted
**Owner:** Joe
**Relates to:** [ADR-0007](./ADR-0007-i18n-gateway.md), [ADR-0008](./ADR-0008-i18n-bakeoff-model-pool.md)

---

## Context

native-rd is translated en → de via an LLM batch pipeline (`scripts/i18n/`).
The product has a distinct brand voice documented in
`landing/docs/BRAND_LANGUAGE.md`: named-maker (Joe by name, solo, bipolar +
ADHD), identity-first ND vocabulary, refusal-as-feature, parenthetical
recognition asides (`(noch da? gut.)`), and a hard ban on dismissive
exit-asides (`oder nicht`, `oder lass es`). A flat German glossary cannot
capture _stance_ — banning a word list doesn't tell a model how to write like
this brand. The voice problem is prompt engineering, not translation
selection (ADR-0008 handled selection).

## Decision

Three-layer voice enforcement, applied per batch in `buildSystemPrompt`:

1. **Per-namespace register YAML** — `apps/native-rd/src/i18n/resources/_register/<ns>.yml`.
   Default voice for every string in the namespace. Required (hard-fail if
   missing). Carries `speaker`, `audience`, `formality`, `banned_phrasings`,
   `notes`. Authored by hand. Schema: `registerSchema` in `translator.ts`.

2. **Per-string intent sidecar JSON** — `apps/native-rd/src/i18n/resources/en/<ns>.intents.json`.
   Optional overrides for individual keys when a string needs sharper framing
   than the register default. Loaded by `intentLoader.ts`. Missing-file is
   graceful (most namespaces have none); present-but-corrupt hard-fails.

3. **Thin glossary string** — passed by `syncCore.ts`. Canonical brand tokens
   only (e.g. "Rollercoaster.dev → Rollercoaster.dev — do not translate").
   Not the primary voice mechanism. Authored content deferred to a follow-up
   (#179).

### Layer ordering rationale

Decreasing strength. Register is always present and frames every string.
Sidecar overrides for the specific key when present. Glossary is lookup
material, not instruction.

### Composition with the system preamble

`VOICE_PREAMBLE` in `promptBuilder.ts` carries brand-wide rules sourced
verbatim from `BRAND_LANGUAGE.md`: identity-first ND vocab, banned
dismissive exits, parenthetical preservation, placeholder contract.
Register `banned_phrasings` are deduped against the preamble at assembly
time so the same phrase never appears twice in the same prompt.

## Alternatives Considered

This is a closed decision. Voice enforcement was the central question for
the i18n LLM pipeline — relitigating it churns the prompt builder, the
register format, and the sync pipeline together. The alternatives below are
recorded so they are not raised again as "have we tried…" without new
evidence.

### Rejected: ICU MessageFormat

- Runtime parsing complexity for plurals/genders the corpus does not yet
  use — ICU pays off when message structure is the problem.
- Would require either swapping out i18next or running a second i18n
  library alongside it, doubling the surface area.
- The voice problem is prompt engineering; ICU is a _format_ solution to a
  _stance_ problem. Wrong layer.

### Rejected: Lingui

- Compile-time message extraction is genuinely useful, but it would
  require migrating every `t()` call and the source-string format from
  i18next-shaped JSON to Lingui's catalogues.
- Requires a Babel/swc transform integrated into the Expo build — adds a
  build-time dependency to a runtime concern that is already settled.
- The i18n-llm-sync pipeline is a sync-time tool; Lingui is an extraction
  tool. They solve different problems.

### Rejected: Fluent (Project Fluent)

- Strong message format for selectors, attributes, and complex
  pluralization — features the corpus does not need.
- Adds a runtime parser plus a second string format alongside i18next-style
  JSON.
- Same wrong-layer issue as ICU: a format solution to a voice problem.

## Authoring Affordances

- **Registers** are YAML next to locale files (`_register/`). Edited by
  hand. Schema-validated at sync time.
- **Sidecars** are JSON next to source-locale files. Authored only when a
  string needs sharper intent than the register can express. Most
  namespaces will not have one.
- **Glossary** is a string passed by the sync CLI. Deferred (#179).

## Composition with promptfoo Assertions

The bake-off (#159, ADR-0008) evaluated inherent model voice quality with a
minimal prompt — it tested whether a candidate model _can_ follow
register-style instructions at all. This ADR formalises the _production_
prompt shape that runs against the chosen model. The two are independent:
promptfoo answered "is this model trainable to our voice"; ADR-0009 defines
"what voice instructions does production send".

## Consequences

- `promptBuilder.ts` carries brand-voice copy as a module-level
  `VOICE_PREAMBLE` constant. Voice copy changes are ADR-0009 amendments,
  not casual edits.
- All 15 current namespaces must have a register YAML or sync fails.
- New namespaces require a new register YAML before they enter the sync
  pipeline.
- Sidecars are optional; their absence is normal.
- Glossary remains plumbed-but-empty until #179 lands.

## Supersession

This ADR is superseded only by a new ADR that names this number and
explains why the three-layer shape is no longer load-bearing. Voice copy
edits inside `VOICE_PREAMBLE` are an amendment of this ADR — they require
a dated revision note here, not a fresh ADR.
