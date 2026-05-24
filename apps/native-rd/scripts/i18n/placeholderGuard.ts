/**
 * Hard-fail placeholder validation for i18next mustache-style interpolation.
 *
 * Verifies that every `{{name}}` placeholder in the source string appears
 * exactly once in the candidate translation. No additions, no drops, no
 * renames. This is key invariant #2 from the i18n-llm-sync plan: wrong
 * placeholder shape aborts the batch — the candidate never ships.
 *
 * Scope: i18next mustache only. ICU, nested, and named-capture forms are
 * out of scope until translator.ts needs them.
 *
 * TS/JS twin: scripts/i18n/promptfoo/asserts/placeholders.js mirrors the
 * regex and `extractPlaceholders()` for the promptfoo CommonJS assert
 * runtime. Update both or factor up — Jest parity test pins them.
 */

const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

export type PlaceholderError = {
  key: string;
  missing: string[];
  extra: string[];
  duplicates: string[];
};

export type PlaceholderCheckResult =
  | { ok: true }
  | { ok: false; error: PlaceholderError };

/**
 * Extract all `{{name}}` placeholder names from `str` in source order,
 * preserving duplicates so the caller can detect repeated placeholders.
 */
export function extractPlaceholders(str: string): string[] {
  const matches: string[] = [];
  for (const m of str.matchAll(PLACEHOLDER_RE)) {
    matches.push(m[1].trim());
  }
  return matches;
}

/**
 * Returns `{ ok: true }` iff `candidate`'s placeholder set matches
 * `source`'s exactly and no placeholder is duplicated in `candidate`.
 *
 * Returned error fields:
 * - `missing`: placeholders in source but not in candidate
 * - `extra`: placeholders in candidate but not in source
 * - `duplicates`: placeholders that appear more than once in candidate
 */
export function checkPlaceholders(
  source: string,
  candidate: string,
  key: string,
): PlaceholderCheckResult {
  const sourcePlaceholders = extractPlaceholders(source);
  const candidatePlaceholders = extractPlaceholders(candidate);

  const sourceSet = new Set(sourcePlaceholders);
  const candidateSet = new Set(candidatePlaceholders);

  const missing = [...sourceSet].filter((p) => !candidateSet.has(p));
  const extra = [...candidateSet].filter((p) => !sourceSet.has(p));

  const counts = new Map<string, number>();
  for (const p of candidatePlaceholders) {
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([p]) => p);

  if (missing.length === 0 && extra.length === 0 && duplicates.length === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    error: { key, missing, extra, duplicates },
  };
}
