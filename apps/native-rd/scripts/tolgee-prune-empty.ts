#!/usr/bin/env bun
/**
 * Recursively prunes empty string values and resulting empty branches from
 * every src/i18n/resources/de/<ns>.json file.
 *
 * Why: `tolgee pull` round-trips every key in a project, writing `""` (or an
 * empty subtree) for keys the translator hasn't filled yet. Committing those
 * empty leaves means a half-translated namespace produces a noisy diff full of
 * empty strings that i18next would resolve to literal `""` rather than the
 * `en` fallback. Pruning leaves the file as `{}` (or sparsely populated) so
 * fallback behavior stays correct and the diff only shows real translations.
 *
 * The file is left in place — even if every key was empty and the result is
 * `{}` — so the import in src/i18n/index.ts continues to resolve and the
 * namespace registration test stays green.
 *
 * Run: bun run i18n:pull (which runs `tolgee pull` first and then this script).
 *      Or directly: bun run scripts/tolgee-prune-empty.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { pruneEmpty } from "../src/i18n/pruneEmpty";

const DE_DIR = join(import.meta.dir, "..", "src", "i18n", "resources", "de");

function pruneFile(path: string): { changed: boolean; finalSize: number } {
  const original = readFileSync(path, "utf-8");
  const parsed = JSON.parse(original) as unknown;
  const pruned = pruneEmpty(parsed) ?? {};
  const serialized = `${JSON.stringify(pruned, null, 2)}\n`;
  const finalSize =
    typeof pruned === "object" && pruned !== null && !Array.isArray(pruned)
      ? Object.keys(pruned).length
      : 0;
  if (serialized === original) {
    return { changed: false, finalSize };
  }
  writeFileSync(path, serialized);
  return { changed: true, finalSize };
}

function main(): void {
  const files = readdirSync(DE_DIR).filter((f) => f.endsWith(".json"));
  let totalChanged = 0;
  for (const file of files) {
    const path = join(DE_DIR, file);
    const { changed, finalSize } = pruneFile(path);
    if (changed) {
      totalChanged += 1;
      console.log(
        `pruned ${file} (${finalSize} top-level key${finalSize === 1 ? "" : "s"} remain)`,
      );
    }
  }
  if (totalChanged === 0) {
    console.log("no empty values found in resources/de/*.json");
  } else {
    console.log(`pruned ${totalChanged} file(s) under resources/de/`);
  }
}

main();
