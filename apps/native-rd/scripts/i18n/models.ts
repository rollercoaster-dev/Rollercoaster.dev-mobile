/**
 * Typed registry of OpenRouter model entries available to the i18n sync.
 *
 * Lookups are by short string key (e.g. `"gpt-4o-mini"`) — not by the
 * OpenRouter path — so swapping a model to a different provider keeps
 * the same caller-facing name. The same keys are referenced from
 * promptfoo bake-off configs.
 *
 * Pure data + one lookup helper. No I/O, no SDK imports.
 */

export type ModelEntry = {
  /** OpenRouter model path, e.g. `"openai/gpt-4o-mini"`. */
  modelId: string;
  /** Effective sampling temperature; 0.0 for all bake-off candidates. */
  temperature: number;
  /** Optional max output tokens; left unset until post-bake-off tuning. */
  maxTokens?: number;
  /** Optional human-readable note (provider routing, caveats). */
  note?: string;
};

// ADR-0008 drops reasoning-tuned candidates from the bake-off pool after live
// evals showed "Thinking:" preamble leakage. Re-add them only with explicit
// reasoning-suppression support in llmGateway.ts.
export const MODELS: Record<string, ModelEntry> = {
  "gpt-4o-mini": { modelId: "openai/gpt-4o-mini", temperature: 0.0 },
  "gpt-4o": { modelId: "openai/gpt-4o", temperature: 0.0 },
  "claude-haiku-4-5": {
    modelId: "anthropic/claude-haiku-4-5",
    temperature: 0.0,
  },
  "claude-sonnet-4-6": {
    modelId: "anthropic/claude-sonnet-4-6",
    temperature: 0.0,
  },
  "gemini-2.5-flash": {
    modelId: "google/gemini-2.5-flash",
    temperature: 0.0,
  },
  "deepseek-chat": { modelId: "deepseek/deepseek-chat", temperature: 0.0 },
};

/**
 * Resolve a registry entry by name. Throws on unknown names with a message
 * that lists the valid keys, so a typo at the call site is fixable without
 * grepping.
 */
export function getModel(name: string): ModelEntry {
  const entry = MODELS[name];
  if (!entry) {
    const valid = Object.keys(MODELS).join(", ");
    throw new Error(`Unknown model name "${name}". Valid keys: ${valid}`);
  }
  return entry;
}
