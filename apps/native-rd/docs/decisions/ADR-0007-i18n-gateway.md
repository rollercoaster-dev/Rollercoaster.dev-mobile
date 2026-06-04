# ADR-0007: i18n LLM gateway — OpenRouter + Vercel AI SDK

**Date:** 2026-05-24
**Status:** Accepted
**Owner:** Joe

---

## Context

native-rd needs LLM calls to translate `src/i18n/resources/en/*.json` into `de/*.json` on a sync-script cadence (see [`docs/plans/i18n-llm-sync.md`](../plans/i18n-llm-sync.md) for the full plan and the 8-model bake-off candidate list). The options were:

- **Per-vendor SDKs** (`openai`, `@anthropic-ai/sdk`, etc.) — swapping models means swapping SDKs and rewriting the call site.
- **Self-hosted proxy** (e.g. LiteLLM behind our own gateway) — operational burden for a dev-time script that runs in CI.
- **Unified gateway** (OpenRouter) over a TS-native SDK — one endpoint, one auth, model swap is a string change.

The sync is a dev-time CLI invoked from CI and local dev. It does not ship in the app bundle.

## Decision

- **Gateway: OpenRouter.** Single OpenAI-compatible endpoint, ~300 models, pay-per-call, no infra to host.
- **Client SDK: Vercel AI SDK** (`ai` + `@ai-sdk/openai` with a `baseURL` override pointing at `https://openrouter.ai/api/v1`). Documented integration path; not a workaround.
- **Wrapper module:** `apps/native-rd/scripts/i18n/llmGateway.ts` exports one function, `callModel(name, systemPrompt, userContent): Promise<string>`. The `(name, system, user)` shape is locked from this PR so the translator (PR #5) inherits a stable contract — no breaking change later to add prompt-engineering surface area.
- **Registry:** `apps/native-rd/scripts/i18n/models.ts` keys are short human-readable strings (`"gpt-4o-mini"`), not OpenRouter paths. Provider swaps keep the caller-facing name stable.

## Rationale

- Model swap is a one-line change in `models.ts`. promptfoo bake-offs reference the same registry keys, so the registry is the single source of truth for which models are in scope.
- Vercel AI SDK is TS-native, has provider-swap built in, and is the SDK Vercel themselves recommend for OpenRouter via the `baseURL` override. Community `@openrouter/ai-sdk-provider` exists but has slower update cadence and adds no capability for our use case.
- `devDependencies` placement keeps the production app bundle clean — Metro never resolves `ai` or `@ai-sdk/openai`.

## Swap-out path

If OpenRouter becomes inadequate (cost, latency, model availability, or vendor risk), swap `createOpenAI` in `llmGateway.ts` for another Vercel AI SDK provider (`@ai-sdk/anthropic`, `@ai-sdk/google`, etc.). The registry and `callModel` interface are unchanged; the translator and promptfoo configs do not need to know.

## Consequences

- **devDep coupling** to `ai` + `@ai-sdk/openai`. Acceptable: not bundled, dev-time only.
- **Pay-per-call cost model.** Acceptable: the sync is gap-only and batched, so per-PR cost is bounded.
- **Model availability** is subject to OpenRouter's router. Acceptable: the registry is the single switch point if a model is pulled.
- **No offline fallback.** Acceptable: the sync is a CI job and expected to be online; the runtime app never calls this code.
- **Prompt shape committed to `(system, user)` split.** The translator (PR #5) inherits this from `callModel`'s 3-arg signature, not a single-blob `prompt` arg. Reverting to a single-arg shape later would be a breaking change to a foundation file.
- **Attribution headers — deliberately omitted.** The wrapper sends no `HTTP-Referer` or `X-Title` to OpenRouter. This is intentional, not an oversight. Sending those headers opts the project into OpenRouter's public leaderboard at `openrouter.ai/rankings`, which we explicitly do not want. If per-caller spend separation ever becomes necessary (i18n sync vs. future graph-flow / badge-engine uses), the path is **mint a second API key**, not add attribution headers. A future contributor reading this ADR should not "fix" the missing headers as a best-practices cleanup.

## Supersession

Changes to this decision require a new ADR that supersedes this one, per the pattern established in [ADR-0006](./ADR-0006-iteration-b-scope-amendment.md) (2026-05-23). Do not amend this ADR in place.

---

_Accepted 2026-05-24._
