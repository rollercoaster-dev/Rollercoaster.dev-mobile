/**
 * Per-namespace batch translation pipeline.
 *
 * Composes the wave-1 primitives into the en→de sync pipeline:
 *   translatableSubtree → register-parse → promptBuilder → callModel
 *     → parseAndValidate → checkPlaceholders → mergeTranslations
 *
 * Stays model-agnostic: callers pass `modelName` (no default). CLI defaults
 * live in `sync.ts` (PR #6). Single-threaded per namespace — concurrent
 * batching is a post-v1 concern (locked decision #5 in i18n-llm-sync.md).
 *
 * Hard-fails surface upstream with `ns` context so the caller can produce
 * `"namespace: common — parse failure: ..."` style messages without
 * unwrapping the entire pipeline.
 */

import { load as loadYaml } from "js-yaml";
import { z } from "zod";

import {
  deepFillMissingStrings,
  mergeTranslations,
  translatableSubtree,
  type FilledJsonTree,
  type JsonTree,
} from "./jsonTreeUtils";
import { callModel } from "./llmGateway";
import { checkPlaceholders } from "./placeholderGuard";
import {
  buildSystemPrompt,
  type IntentEntry,
  type RegisterData,
} from "./promptBuilder";
import { parseAndValidate, type ParseError } from "./responseParser";

const registerSchema: z.ZodType<RegisterData> = z.object({
  speaker: z.string(),
  audience: z.string(),
  formality: z.string(),
  banned_phrasings: z.array(z.string()),
  notes: z.array(z.string()).optional(),
});

export type TranslateNamespaceOptions = {
  enTree: JsonTree;
  deTree: unknown;
  ns: string;
  modelName: string;
  registerText: string;
  // intents/glossary are passed straight to buildSystemPrompt without runtime
  // validation. The register YAML gets a zod schema (parseRegister); these
  // sidecars don't yet because no CLI loader reads them from disk. PR #8 wires
  // the sidecar loader — add zod schemas + hard-fail at that boundary then,
  // mirroring registerSchema. Until then, callers are responsible for shape.
  intents?: Record<string, IntentEntry>;
  glossary?: string;
};

function describeParseError(error: ParseError): string {
  switch (error.reason) {
    case "malformed-json":
      return `malformed-json: ${error.detail}`;
    case "schema-mismatch":
      return `schema-mismatch: ${error.issues
        .map((i) => i.message)
        .join("; ")}`;
    case "missing-keys":
      return `missing-keys: ${error.missingKeys.join(", ")}`;
    case "extra-keys":
      return `extra-keys: ${error.extraKeys.join(", ")}`;
    default: {
      const _exhaustive: never = error;
      throw new Error(
        `describeParseError: unhandled ParseError variant ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

function parseRegister(text: string, ns: string): RegisterData {
  let raw: unknown;
  try {
    raw = loadYaml(text);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`namespace ${ns}: register YAML parse failed — ${detail}`, {
      cause: e,
    });
  }
  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(
      `namespace ${ns}: register YAML schema invalid — ${details}`,
    );
  }
  return result.data;
}

/**
 * Run the batch-translation pipeline for one namespace and return the merged
 * `de/` tree. If the namespace has zero gaps, returns a deep-fill of the
 * existing target tree without calling the LLM.
 *
 * Throws (with `ns` in the message) on register parse failure, LLM response
 * parse failure, or placeholder mismatch. Upstream `callModel` errors
 * propagate verbatim.
 */
export async function translateNamespace(
  opts: TranslateNamespaceOptions,
): Promise<FilledJsonTree> {
  const { enTree, deTree, ns, modelName, registerText, intents, glossary } =
    opts;

  const { dict, pathMap } = translatableSubtree(enTree, deTree);

  if (pathMap.keys.length === 0) {
    return deepFillMissingStrings(enTree, deTree);
  }

  const register = parseRegister(registerText, ns);
  const systemPrompt = buildSystemPrompt({ register, intents, glossary });
  const userContent = JSON.stringify(dict);

  const rawResponse = await callModel(modelName, systemPrompt, userContent);

  const parsed = parseAndValidate(rawResponse, [...pathMap.keys]);
  if (!parsed.ok) {
    throw new Error(
      `namespace ${ns}: response parse failed — ${describeParseError(parsed.error)}`,
    );
  }

  for (const key of pathMap.keys) {
    const check = checkPlaceholders(dict[key]!, parsed.data[key]!, key);
    if (!check.ok) {
      const { missing, extra, duplicates } = check.error;
      throw new Error(
        `namespace ${ns}: placeholder mismatch on key ${key} — missing=[${missing.join(",")}] extra=[${extra.join(",")}] duplicates=[${duplicates.join(",")}]`,
      );
    }
  }

  return mergeTranslations(deTree, parsed.data, pathMap);
}
