#!/usr/bin/env bun
/**
 * CLI entrypoint for the i18n source linter.
 *
 * Pure linting logic lives in `lintSource.ts` so the test runner (jest +
 * babel-preset-expo, which targets Hermes) can import it without tripping on
 * `import.meta`. This thin wrapper owns the file-system bootstrap and the
 * unconditional exit-0 contract.
 */

import { join } from "node:path";

import { EN_DIR_REL, formatFinding, lintEnDir } from "./lintSource";

function main(): void {
  const appDir = join(import.meta.dir, "..", "..");
  const absEnDir = join(appDir, EN_DIR_REL);
  const { findings, namespaceCount } = lintEnDir(absEnDir);

  for (const f of findings) {
    console.log(formatFinding(f));
  }
  if (findings.length > 0) {
    console.log(
      `\n${findings.length} findings across ${namespaceCount} namespaces (warn-only).`,
    );
  }
  process.exit(0);
}

if (import.meta.main) {
  main();
}
