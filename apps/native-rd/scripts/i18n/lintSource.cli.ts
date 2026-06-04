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

  // The warn-only contract is structural, not just declarative: even if
  // `lintEnDir` throws on a malformed namespace or sidecar JSON, the CLI
  // must still exit 0 so sync-pipeline callers never see a non-zero status.
  try {
    const { findings, namespaceCount } = lintEnDir(absEnDir);

    for (const f of findings) {
      console.log(formatFinding(f));
    }
    if (findings.length > 0) {
      console.log(
        `\n${findings.length} findings across ${namespaceCount} namespaces (warn-only).`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[lintSource] aborted: ${message}`);
  }
  process.exit(0);
}

if (import.meta.main) {
  main();
}
