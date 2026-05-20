#!/usr/bin/env bun
/**
 * Generates src/i18n/resources/pseudo/<ns>.json from each src/i18n/resources/en/<ns>.json.
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
 * Auto-discovers namespaces by reading every .json file in resources/en/, so
 * adding a new namespace requires no script changes.
 *
 * Run: bun run gen:pseudo
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  pseudoizeTree,
  type TranslationTree,
} from "../src/i18n/pseudoTransform";

function main(): void {
  const root = join(import.meta.dir, "..");
  const enDir = join(root, "src/i18n/resources/en");
  const pseudoDir = join(root, "src/i18n/resources/pseudo");

  if (!existsSync(pseudoDir)) {
    mkdirSync(pseudoDir, { recursive: true });
  }

  const files = readdirSync(enDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  for (const file of files) {
    const enPath = join(enDir, file);
    const pseudoPath = join(pseudoDir, file);
    const en = JSON.parse(readFileSync(enPath, "utf8")) as TranslationTree;
    const pseudo = pseudoizeTree(en);
    // Trailing newline matches prettier output and avoids spurious diffs.
    writeFileSync(pseudoPath, `${JSON.stringify(pseudo, null, 2)}\n`);
    console.log(`✓ Wrote ${pseudoPath}`);
  }
}

if (import.meta.main) {
  main();
}
