# ADR-0008: i18n bake-off model pool — drop reasoning-tuned candidates

**Date:** 2026-05-24
**Status:** Accepted
**Owner:** Joe
**Amends:** [ADR-0007](./ADR-0007-i18n-gateway.md) — model registry (`scripts/i18n/models.ts`) only

---

## Context

ADR-0007 named 8 candidate models for the i18n bake-off. PR #171 ran the bake-off live for the first time. Two candidates failed structurally, not on translation quality:

- **`openai/gpt-oss-120b`** — 0% pass rate across the fixture corpus. Every output included `"Thinking: ..."` reasoning preamble despite the system prompt's `"Return only the German translation: no quotes, no commentary, no explanations"` rule.
- **`openai/gpt-5-mini`** — 23% pass rate. Same reasoning-leakage pattern, intermittent.

Both are reasoning-tuned models. OpenRouter exposes per-request `reasoning: { exclude: true }` (and per-model `reasoning_effort: "minimal"`) controls that would, in principle, suppress the preamble. Enabling either requires per-model branching in `llmGateway.ts` (today the gateway sends a flat `(system, user, temperature)` shape; reasoning suppression would add provider-conditional payload assembly).

## Decision

Drop `openai/gpt-oss-120b` and `openai/gpt-5-mini` from `apps/native-rd/scripts/i18n/models.ts` and from the promptfoo provider list. The bake-off pool is now 6 models:

- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `anthropic/claude-haiku-4-5`
- `anthropic/claude-sonnet-4-6`
- `google/gemini-2.5-flash`
- `deepseek/deepseek-chat`

## Rationale

- The bake-off is a model-selection tool. A candidate that can't be evaluated fairly without per-provider gateway branching adds no signal to that selection, only noise.
- The remaining six span the price/capability range we care about (frontier × cheap × open-weight-via-managed), so the winner-picking exercise is unaffected by the cut.
- The alternative — adding reasoning-suppression to `llmGateway.ts` — is a larger architectural change than this ADR's scope. ADR-0007 explicitly committed `callModel` to a `(name, system, user)` signature precisely to avoid prompt-engineering creep at the gateway layer. Re-opening that contract for two underperforming candidates is the wrong trade.

## Consequences

- ADR-0007's "8 candidate models" wording (in [`docs/plans/i18n-llm-sync.md`](../plans/i18n-llm-sync.md) and ADR-0007 itself) now reads as historical. ADR-0007's body is preserved as the original decision; the current pool is in this ADR.
- The two `dev-plans/issue-15{7,9}-*.md` planning documents reference the original 8-model pool. They are PR-scoped historical artifacts and not updated here.
- If a reasoning-tuned model becomes a strategic fit later (e.g. a quality jump justifies the gateway complexity), the path is: implement reasoning-suppression in `llmGateway.ts` behind a per-entry `ModelEntry` flag, then file a new ADR re-adding the model to the registry. Do not edit this ADR.

## Supersession

Changes to this decision require a new ADR that supersedes it, per the pattern established in [ADR-0006](./ADR-0006-iteration-b-scope-amendment.md) and re-affirmed in [ADR-0007's Supersession clause](./ADR-0007-i18n-gateway.md#supersession). Do not amend this ADR in place.

---

_Accepted 2026-05-24._
