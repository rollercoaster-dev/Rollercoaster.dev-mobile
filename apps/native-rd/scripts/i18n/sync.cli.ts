#!/usr/bin/env bun
/**
 * CLI entrypoint for the i18n sync pipeline.
 *
 * Owns `import.meta.dir` path bootstrap + `.env.local` injection. All
 * orchestration lives in `syncCore.ts` so jest can import it without the
 * `import.meta` transform headache (same split as `lintSource.cli.ts`).
 *
 * Exit codes:
 *   0 — every requested namespace succeeded (wrote, no-gaps, or dry-run)
 *   1 — at least one namespace failed (parse, register, placeholder, etc.)
 *       or argv / target validation failed
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { EN_DIR_REL } from "./lintSource";
import {
  SUPPORTED_TARGETS,
  discoverNamespaces,
  formatOutcome,
  isSupportedTarget,
  parseArgs,
  resolveNamespaces,
  runSync,
} from "./syncCore";

/**
 * Mirror the bash `set -a / source .env.local` pattern from `run-bakeoff.sh`
 * inline so the package.json entry can stay `bun run scripts/i18n/sync.cli.ts`
 * without a wrapper script. CI does not use `.env.local` — secrets are
 * injected directly into the environment by the workflow runner — so the
 * absence of the file is not an error.
 *
 * Existing `process.env` values win: real exported secrets are not clobbered
 * by stale `.env.local` entries, matching bash `set -a` semantics for this
 * use (which would overwrite — but in our flow CI runs without the file).
 */
function loadDotEnvLocal(envPath: string): void {
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  const appDir = join(import.meta.dir, "..", "..");
  loadDotEnvLocal(join(appDir, ".env.local"));

  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`[sync] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  if (!isSupportedTarget(args.target)) {
    console.error(
      `[sync] unsupported locale: ${args.target}. Supported: ${SUPPORTED_TARGETS.join(", ")}`,
    );
    process.exit(1);
  }

  const enDir = join(appDir, EN_DIR_REL);
  const targetDir = join(appDir, "src/i18n/resources", args.target);
  const registerDir = join(appDir, "src/i18n/resources/_register");

  let namespaces: string[];
  try {
    namespaces = resolveNamespaces(discoverNamespaces(enDir), args.namespace);
  } catch (e) {
    console.error(`[sync] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  const summary = await runSync({
    paths: { enDir, targetDir, registerDir },
    namespaces,
    modelName: args.modelName,
    dryRun: args.dryRun,
  });

  for (const outcome of summary.outcomes) {
    const line = formatOutcome(outcome);
    if (outcome.kind === "failed") {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  process.exit(summary.hasFailures ? 1 : 0);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(
      `[sync] unexpected error: ${e instanceof Error ? e.message : String(e)}`,
    );
    process.exit(1);
  });
}
