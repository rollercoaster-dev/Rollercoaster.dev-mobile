# ADR-0008: i18n bake-off model pool - drop reasoning-tuned candidates

**Date:** 2026-05-25
**Status:** Accepted
**Owner:** Joe
**Amends:** [ADR-0007](./ADR-0007-i18n-gateway.md) - model registry only

---

## Context

ADR-0007 named 8 candidate models for the first en-to-de i18n bake-off. The
first live evals showed that two candidates failed structurally rather than on
translation quality:

- `openai/gpt-oss-120b` returned `Thinking:` preambles across the corpus.
- `openai/gpt-5-mini` leaked the same reasoning preamble intermittently.

Those outputs violate the bake-off prompt's "translation only" contract and
inflate length/rubric failures. Evaluating them fairly would require
per-provider reasoning suppression in `llmGateway.ts`, which is outside the
selection rig's scope.

## Decision

Drop `openai/gpt-oss-120b` and `openai/gpt-5-mini` from the i18n model registry
and promptfoo bake-off config. The first decision-quality pool is:

- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `anthropic/claude-haiku-4-5`
- `anthropic/claude-sonnet-4-6`
- `google/gemini-2.5-flash`
- `deepseek/deepseek-chat`

## Consequences

- The bake-off compares candidates that can follow the current flat prompt and
  gateway contract.
- Re-adding a reasoning-tuned model requires a new ADR plus explicit
  reasoning-suppression support in `llmGateway.ts`.
- Historical issue plans that mention the original 8-model pool remain
  historical artifacts.
