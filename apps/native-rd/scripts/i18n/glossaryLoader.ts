/**
 * Glossary loader for the i18n batch translator — third voice-enforcement
 * layer after the per-namespace register (#162) and per-string intent
 * sidecar (#180, #189). Reads a single brand-global text file of terms that
 * must pass through translation untouched (or with a specific gloss).
 *
 * Format:
 *   - one term per line
 *   - blank lines ignored
 *   - lines starting with `#` are comments and are ignored
 *   - leading/trailing whitespace trimmed on every line
 *
 * Failure modes are deliberately forgiving — missing file returns `[]`
 * rather than throwing. The glossary is optional brand content; absence is
 * the common bootstrap state, not a content-authoring error. (Contrast with
 * `readRegisterText`, which throws on missing files because every namespace
 * requires a register.) Non-ENOENT read errors still surface — those signal
 * environmental problems (EACCES, EISDIR) the caller needs to see.
 *
 * Pure sync `node:fs` I/O — no Bun-specific APIs, no `import.meta`. Jest can
 * import this module directly without a `.cli.ts` split.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadGlossary(registerDir: string): string[] {
  const path = join(registerDir, "glossary.txt");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
      return [];
    }
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`glossary read failed at ${path} — ${detail}`, {
      cause: e,
    });
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}
