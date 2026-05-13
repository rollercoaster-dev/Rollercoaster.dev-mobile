#!/usr/bin/env bun
/**
 * Generates src/i18n/resources/pseudo.json from en.json.
 *
 * Pseudo locale is a development/QA tool, not a user-facing language. It surfaces:
 *   - Untranslated strings (anything still in raw English stands out)
 *   - Layout overflow (~40% padding mimics languages like German or French)
 *   - Concatenation bugs (brackets surround each leaf so glued fragments stand out)
 *   - Encoding issues (accented characters round-trip through bundlers/native bridges)
 *
 * The pure transform lives in src/i18n/pseudoTransform.ts so it can be unit
 * tested without dragging Bun-specific import.meta through babel-preset-expo.
 *
 * Run: bun run gen:pseudo
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  pseudoizeTree,
  type TranslationTree,
} from "../src/i18n/pseudoTransform";

function main(): void {
  const root = join(import.meta.dir, "..");
  const enPath = join(root, "src/i18n/resources/en.json");
  const pseudoPath = join(root, "src/i18n/resources/pseudo.json");

  const en = JSON.parse(readFileSync(enPath, "utf8")) as TranslationTree;
  const pseudo = pseudoizeTree(en);
  // Trailing newline matches prettier output and avoids spurious diffs.
  writeFileSync(pseudoPath, `${JSON.stringify(pseudo, null, 2)}\n`);
  console.log(`✓ Wrote ${pseudoPath}`);
}

if (import.meta.main) {
  main();
}
