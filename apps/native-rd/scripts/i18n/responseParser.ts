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

export type ParseError =
  | { reason: "malformed-json"; detail: string }
  | { reason: "schema-mismatch"; issues: z.ZodIssue[] }
  | { reason: "missing-keys"; missingKeys: string[] }
  | { reason: "extra-keys"; extraKeys: string[] };

export type ParseResult =
  | { ok: true; data: Record<string, string> }
  | { ok: false; error: ParseError };

export const llmResponseSchema = z.record(z.string(), z.string().min(1));

/**
 * Strip a single outer markdown code fence so models that wrap JSON in
 * ```` ```json … ``` ```` (Anthropic Haiku's default for structured output,
 * and a common default elsewhere) still parse. Untagged ``` and `~~~` work
 * too. If the input is not fenced, returns it unchanged.
 *
 * Only the *outermost* fence is stripped. The body is whatever the model
 * put inside it — if that body is still not valid JSON, we still surface
 * malformed-json downstream.
 */
export function stripFencedCode(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(```|~~~)(?:[a-zA-Z0-9_-]+)?\s*\n?([\s\S]*?)\n?\1\s*$/,
  );
  return match ? match[2].trim() : trimmed;
}

/**
 * Validate a raw LLM response (either a JSON string or pre-parsed value)
 * against `expectedKeys`. Returns the typed dict only when:
 *   - input parses as JSON (if a string; markdown code fences are stripped first)
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
      parsed = JSON.parse(stripFencedCode(raw));
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
        issues: schemaResult.error.issues,
      },
    };
  }

  const data = schemaResult.data;
  const actualKeys = Object.keys(data);
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);

  const missingKeys = expectedKeys.filter((k) => !actualSet.has(k));
  if (missingKeys.length > 0) {
    return {
      ok: false,
      error: { reason: "missing-keys", missingKeys },
    };
  }

  const extraKeys = actualKeys.filter((k) => !expectedSet.has(k));
  if (extraKeys.length > 0) {
    return {
      ok: false,
      error: { reason: "extra-keys", extraKeys },
    };
  }

  return { ok: true, data };
}
