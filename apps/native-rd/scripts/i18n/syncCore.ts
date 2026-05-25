/**
 * Pure orchestration for the en→target i18n sync pipeline.
 *
 * The CLI entrypoint (`sync.cli.ts`) anchors paths via `import.meta.dir` and
 * forwards them here. Tests import `syncCore.ts` directly with absolute
 * paths to a tmpdir fixture — the split keeps jest + babel-jest off the
 * `import.meta` hazard (same pattern as `lintSource.ts`/`lintSource.cli.ts`).
 *
 * Idempotency lives in this module: a namespace whose target tree already
 * covers every source-side string-leaf produces zero writes and zero LLM
 * calls. Detection runs *before* `translateNamespace` to keep the no-op
 * path observably free of network traffic.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { translatableSubtree, type JsonTree } from "./jsonTreeUtils";
import { discoverNamespaces as discoverNamespaceFiles } from "./lintSource";
import { translateNamespace } from "./translator";

export const SUPPORTED_TARGETS = ["de"] as const;
export type SupportedTarget = (typeof SUPPORTED_TARGETS)[number];

export const DEFAULT_MODEL_NAME = "claude-haiku-4-5";

export type SyncPaths = {
  readonly enDir: string;
  readonly targetDir: string;
  readonly registerDir: string;
};

export type CliArgs = {
  readonly namespace: string | undefined;
  readonly dryRun: boolean;
  readonly target: string;
  readonly modelName: string;
};

export type NamespaceOutcome =
  | { kind: "no-gaps"; ns: string }
  | { kind: "wrote"; ns: string; path: string }
  | { kind: "dry-run"; ns: string }
  | { kind: "failed"; ns: string; message: string };

export type SyncSummary = {
  readonly outcomes: readonly NamespaceOutcome[];
  readonly hasFailures: boolean;
};

/**
 * Parse the subset of CLI flags the sync entrypoint needs. Unknown flags
 * surface as a thrown error so a typo (`--namspace common`) does not
 * silently fall back to defaults.
 */
export function parseArgs(argv: readonly string[]): CliArgs {
  let namespace: string | undefined;
  let dryRun = false;
  let target = "de";
  let modelName = DEFAULT_MODEL_NAME;

  function requireValue(flag: string, value: string | undefined): string {
    // Reject the next-flag token too — otherwise `--model --dry-run` would
    // silently bind `--dry-run` as the model name and leave dryRun=false,
    // turning an intended dry run into a write.
    if (value === undefined || value === "" || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    return value;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--namespace":
        namespace = requireValue("--namespace", argv[++i]);
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--target":
        target = requireValue("--target", argv[++i]);
        break;
      case "--model":
        modelName = requireValue("--model", argv[++i]);
        break;
      default:
        throw new Error(`unknown flag: ${arg}`);
    }
  }

  return { namespace, dryRun, target, modelName };
}

export function isSupportedTarget(target: string): target is SupportedTarget {
  return (SUPPORTED_TARGETS as readonly string[]).includes(target);
}

export function discoverNamespaces(absEnDir: string): string[] {
  return discoverNamespaceFiles(absEnDir).map((f) =>
    f.slice(0, -".json".length),
  );
}

/**
 * Resolve which namespaces to sync. If `requested` is given, validate it
 * exists in `available` (fails fast on typos). Otherwise return all.
 */
export function resolveNamespaces(
  available: readonly string[],
  requested: string | undefined,
): string[] {
  if (requested === undefined) {
    return [...available];
  }
  if (!available.includes(requested)) {
    throw new Error(
      `unknown namespace: ${requested}. Available: ${available.join(", ")}`,
    );
  }
  return [requested];
}

function readJsonFile(absPath: string): unknown {
  const raw = readFileSync(absPath, "utf8");
  return JSON.parse(raw);
}

function readJsonFileOrEmpty(absPath: string): unknown {
  if (!existsSync(absPath)) {
    return {};
  }
  return readJsonFile(absPath);
}

function readRegisterText(absPath: string, ns: string): string {
  if (!existsSync(absPath)) {
    throw new Error(
      `register file not found for namespace ${ns} at ${absPath} — voice register authoring is tracked in apps/native-rd/docs/plans/i18n-llm-sync.md`,
    );
  }
  return readFileSync(absPath, "utf8");
}

/**
 * Run the sync pipeline for a single namespace and return the outcome. Never
 * throws — failures are returned as `{ kind: "failed", message }` so the
 * caller can accumulate per-namespace errors and surface them together.
 */
export async function syncOneNamespace(opts: {
  ns: string;
  paths: SyncPaths;
  modelName: string;
  dryRun: boolean;
}): Promise<NamespaceOutcome> {
  const { ns, paths, modelName, dryRun } = opts;
  try {
    const enPath = join(paths.enDir, `${ns}.json`);
    const targetPath = join(paths.targetDir, `${ns}.json`);
    const registerPath = join(paths.registerDir, `${ns}.yml`);

    const enTree = readJsonFile(enPath) as JsonTree;
    const targetTree = readJsonFileOrEmpty(targetPath);

    // Idempotency: bail before touching the register or the LLM if the
    // target already covers every source leaf. translateNamespace performs
    // the same check internally, but stopping here keeps `--dry-run` and
    // the no-op path free of register I/O as well.
    if (translatableSubtree(enTree, targetTree).pathMap.keys.length === 0) {
      return { kind: "no-gaps", ns };
    }

    const registerText = readRegisterText(registerPath, ns);
    const result = await translateNamespace({
      enTree,
      deTree: targetTree,
      ns,
      modelName,
      registerText,
    });

    if (dryRun) {
      return { kind: "dry-run", ns };
    }

    const content = `${JSON.stringify(result, null, 2)}\n`;
    writeFileSync(targetPath, content, "utf8");
    return { kind: "wrote", ns, path: targetPath };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { kind: "failed", ns, message };
  }
}

export async function runSync(opts: {
  paths: SyncPaths;
  namespaces: readonly string[];
  modelName: string;
  dryRun: boolean;
}): Promise<SyncSummary> {
  const outcomes: NamespaceOutcome[] = [];
  for (const ns of opts.namespaces) {
    outcomes.push(
      await syncOneNamespace({
        ns,
        paths: opts.paths,
        modelName: opts.modelName,
        dryRun: opts.dryRun,
      }),
    );
  }
  return {
    outcomes,
    hasFailures: outcomes.some((o) => o.kind === "failed"),
  };
}

export function formatOutcome(o: NamespaceOutcome): string {
  switch (o.kind) {
    case "no-gaps":
      return `[sync] ${o.ns}: no gaps`;
    case "wrote":
      return `[sync] ${o.ns}: wrote ${o.path}`;
    case "dry-run":
      return `[sync] ${o.ns}: dry-run (no write)`;
    case "failed":
      return `[sync] ${o.ns}: FAILED — ${o.message}`;
  }
}
