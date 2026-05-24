// TS/JS twin of scripts/i18n/placeholderGuard.ts — both must use the same
// regex. Update both or factor up. A Jest parity test pins the two
// implementations to identical outputs; see
// scripts/i18n/__tests__/placeholders-parity.test.ts.
//
// This file exists because promptfoo evaluates assert `value:` blocks as
// CommonJS at runtime, with no TS loader in scope. Building TS just for
// promptfoo is heavier than maintaining one small mirror file.

const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

function extractPlaceholders(str) {
  const matches = [];
  for (const m of String(str).matchAll(PLACEHOLDER_RE)) {
    matches.push(m[1].trim());
  }
  return matches;
}

module.exports = { extractPlaceholders, PLACEHOLDER_RE };
