/**
 * Zod-validated parser for the LLM batch-translation response.
 *
 * The translator sends the LLM an anonymised dict shaped `{ k0: "source0",
 * k1: "source1", ... }` (the positional form produced by
 * `translatableSubtree` from issue #155) and expects the same key set
 * back with translated string values. This module is the hard-fail gate
 * between that response and anything downstream — wrong shape aborts
 * the batch, no silent ship.
 *
 * Returns a discriminated union so the orchestrator can compose this
 * with `placeholderGuard` uniformly. Pure: no I/O, no LLM calls.
 */

import { z } from "zod";

export type ParseErrorReason =
  | "malformed-json"
  | "schema-mismatch"
  | "missing-keys"
  | "extra-keys";

export type ParseError = {
  reason: ParseErrorReason;
  detail: string;
};

export type ParseResult =
  | { ok: true; data: Record<string, string> }
  | { ok: false; error: ParseError };

export const llmResponseSchema = z.record(z.string(), z.string().min(1));

/**
 * Validate a raw LLM response (either a JSON string or pre-parsed value)
 * against `expectedKeys`. Returns the typed dict only when:
 *   - input parses as JSON (if a string)
 *   - shape is `Record<string, string>` with all values non-empty
 *   - key set matches `expectedKeys` exactly
 */
export function parseAndValidate(
  raw: unknown,
  expectedKeys: string[],
): ParseResult {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return {
        ok: false,
        error: {
          reason: "malformed-json",
          detail: e instanceof Error ? e.message : String(e),
        },
      };
    }
  }

  const schemaResult = llmResponseSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return {
      ok: false,
      error: {
        reason: "schema-mismatch",
        detail: schemaResult.error.message,
      },
    };
  }

  const data = schemaResult.data;
  const actualKeys = Object.keys(data);
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);

  const missing = expectedKeys.filter((k) => !actualSet.has(k));
  if (missing.length > 0) {
    return {
      ok: false,
      error: {
        reason: "missing-keys",
        detail: `missing keys: ${missing.join(", ")}`,
      },
    };
  }

  const extra = actualKeys.filter((k) => !expectedSet.has(k));
  if (extra.length > 0) {
    return {
      ok: false,
      error: {
        reason: "extra-keys",
        detail: `extra keys: ${extra.join(", ")}`,
      },
    };
  }

  return { ok: true, data };
}
