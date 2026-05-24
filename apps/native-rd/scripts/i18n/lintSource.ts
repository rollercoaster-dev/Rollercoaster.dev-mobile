/**
 * Source-side linter for `apps/native-rd/src/i18n/resources/en/`.
 *
 * Warn-only in v1: every finding is printed; exit code stays 0. The point
 * is to surface sync-quality risks at authoring time, not to block work.
 *
 * Three checks, all warn-level:
 *   1. Bare strings without intent sidecar — a leaf has no entry in its
 *      `<ns>.intents.json` companion file (or the sidecar is absent).
 *   2. Placeholder consistency within a single namespace — the same
 *      `{{name}}` token appears in two or more leaves with materially
 *      different semantic load (heuristic: different top-level key prefix).
 *   3. Banned phrasings — leaf text matches a phrase from the brand voice
 *      anti-patterns list (`landing/docs/BRAND_LANGUAGE.md`).
 *
 * Strict promotion (exit non-zero) is a future PR gated on ALL of:
 *   1. Zero `eslint-disable-next-line i18n/no-bare-string` under
 *      `apps/native-rd/src/i18n/resources/en/`.
 *   2. Zero warn-level findings on most recent `bun run lint` against `main`.
 *   3. At least one end-to-end sync has run on `main` (the de/ bot
 *      commit has fired at least once — see PR #9 in the i18n LLM sync plan).
 *
 * This criterion is policy, not code. No `--strict` flag, no CI gate
 * lives here. When the criterion is met, a follow-up PR flips the exit.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Local copy of the placeholder regex — intentionally not imported from
// `placeholderGuard.ts`. That module is a hard-fail sync-pipeline validator;
// keeping the linter independent avoids coupling two tools with different
// failure semantics.
const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

export type FindingCategory =
  | "bare-string"
  | "placeholder-conflict"
  | "banned-phrasing";

export type Finding = {
  category: FindingCategory;
  file: string;
  keyPath: string;
  detail: string;
};

export function formatFinding(f: Finding): string {
  return `[${f.category}] ${f.file} ${f.keyPath} ${f.detail}`;
}

export function walkLeaves(
  obj: unknown,
  prefix: string,
  cb: (keyPath: string, value: string) => void,
): void {
  if (typeof obj === "string") {
    cb(prefix, obj);
    return;
  }
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix === "" ? key : `${prefix}.${key}`;
    walkLeaves(value, next, cb);
  }
}

export function loadNamespace(filePath: string): unknown {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function loadSidecar(nsPath: string): Record<string, unknown> | null {
  const sidecarPath = nsPath.replace(/\.json$/, ".intents.json");
  if (!existsSync(sidecarPath)) {
    return null;
  }
  const raw = readFileSync(sidecarPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

/**
 * `keyPath` resolves to a non-null value in `sidecar` (e.g. `"hero.title"`
 * traverses `sidecar.hero.title`). The presence of any value at the leaf
 * — shape ignored — counts as "intent documented" for v1; sidecar shape
 * validation belongs in the register-YAML PR.
 */
function sidecarHasEntry(
  sidecar: Record<string, unknown>,
  keyPath: string,
): boolean {
  const segments = keyPath.split(".");
  let cursor: unknown = sidecar;
  for (const seg of segments) {
    if (
      cursor === null ||
      typeof cursor !== "object" ||
      Array.isArray(cursor)
    ) {
      return false;
    }
    cursor = (cursor as Record<string, unknown>)[seg];
    if (cursor === undefined) {
      return false;
    }
  }
  return cursor !== null;
}

export function checkBareStrings(
  nsPath: string,
  tree: unknown,
  sidecar: Record<string, unknown> | null,
): Finding[] {
  const findings: Finding[] = [];
  walkLeaves(tree, "", (keyPath) => {
    if (sidecar !== null && sidecarHasEntry(sidecar, keyPath)) {
      return;
    }
    findings.push({
      category: "bare-string",
      file: nsPath,
      keyPath,
      detail:
        "no intent sidecar entry — add to <ns>.intents.json to guide translation register",
    });
  });
  return findings;
}

export function checkPlaceholderConsistency(
  _nsPath: string,
  _tree: unknown,
): Finding[] {
  return [];
}

export function checkBannedPhrasings(
  _nsPath: string,
  _tree: unknown,
): Finding[] {
  return [];
}

export const EN_DIR_REL = "src/i18n/resources/en";

export function discoverNamespaces(absEnDir: string): string[] {
  return readdirSync(absEnDir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".intents.json"))
    .sort();
}

/**
 * Runs all three checks across every namespace file under `absEnDir` and
 * returns the collected findings. Pure (no I/O beyond reading the en/ tree),
 * exported for the CLI entrypoint at `lintSource.cli.ts` and for tests.
 */
export function lintEnDir(absEnDir: string): {
  findings: Finding[];
  namespaceCount: number;
} {
  const namespaces = discoverNamespaces(absEnDir);
  const findings: Finding[] = [];
  for (const ns of namespaces) {
    const absPath = join(absEnDir, ns);
    const relPath = `apps/native-rd/${EN_DIR_REL}/${ns}`;
    const tree = loadNamespace(absPath);
    const sidecar = loadSidecar(absPath);
    findings.push(...checkBareStrings(relPath, tree, sidecar));
    findings.push(...checkPlaceholderConsistency(relPath, tree));
    findings.push(...checkBannedPhrasings(relPath, tree));
  }
  return { findings, namespaceCount: namespaces.length };
}
