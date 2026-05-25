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

export type TranslateNamespaceOptions = {
  enTree: JsonTree;
  deTree: unknown;
  ns: string;
  modelName: string;
  registerText: string;
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
  }
}

function isRegisterData(value: unknown): value is RegisterData {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (
    typeof v.speaker !== "string" ||
    typeof v.audience !== "string" ||
    typeof v.formality !== "string"
  ) {
    return false;
  }
  if (
    !Array.isArray(v.banned_phrasings) ||
    !v.banned_phrasings.every((p) => typeof p === "string")
  ) {
    return false;
  }
  if (
    v.notes !== undefined &&
    (!Array.isArray(v.notes) || !v.notes.every((n) => typeof n === "string"))
  ) {
    return false;
  }
  return true;
}

function parseRegister(text: string, ns: string): RegisterData {
  let parsed: unknown;
  try {
    parsed = loadYaml(text);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`namespace ${ns}: register YAML parse failed — ${detail}`);
  }
  if (!isRegisterData(parsed)) {
    throw new Error(
      `namespace ${ns}: register YAML missing required fields (speaker, audience, formality, banned_phrasings)`,
    );
  }
  return parsed;
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
    const sourceStr = dict[key];
    const candidateStr = parsed.data[key];
    if (sourceStr === undefined || candidateStr === undefined) {
      throw new Error(
        `namespace ${ns}: internal — missing key ${key} after parse validation`,
      );
    }
    const check = checkPlaceholders(sourceStr, candidateStr, key);
    if (!check.ok) {
      const { missing, extra, duplicates } = check.error;
      throw new Error(
        `namespace ${ns}: placeholder mismatch on key ${key} — missing=[${missing.join(",")}] extra=[${extra.join(",")}] duplicates=[${duplicates.join(",")}]`,
      );
    }
  }

  return mergeTranslations(deTree, parsed.data, pathMap);
}
