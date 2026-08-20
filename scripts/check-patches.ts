#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

type RootManifest = {
  patchedDependencies?: Record<string, string>;
};

type BunLock = {
  patchedDependencies?: Record<string, string>;
  packages?: Record<string, unknown[]>;
};

const repoRoot = resolve(import.meta.dir, "..");

/**
 * bun.lock is JSONC-ish: trailing commas before `}`/`]` are legal there but
 * not in strict JSON, so strip them before parsing.
 */
function readBunLock(path: string): BunLock {
  const text = readFileSync(path, "utf8");
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1")) as BunLock;
}

/** Split `name@version` on the last `@` so scoped packages survive. */
function splitPatchKey(key: string): { name: string; version: string } | null {
  const at = key.lastIndexOf("@");
  if (at <= 0) return null;
  return { name: key.slice(0, at), version: key.slice(at + 1) };
}

/**
 * Resolved versions for a package name. bun.lock keys are either the bare name
 * or a `parent/name` path for nested resolutions, and each entry's first
 * element is the `name@version` descriptor.
 */
function resolvedVersions(lock: BunLock, name: string): string[] {
  const versions = new Set<string>();

  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    if (key !== name && !key.endsWith(`/${name}`)) continue;

    const descriptor = entry?.[0];
    if (typeof descriptor !== "string") continue;

    const split = splitPatchKey(descriptor);
    if (split?.name === name) versions.add(split.version);
  }

  return [...versions].sort();
}

const manifestPath = join(repoRoot, "package.json");
const lockPath = join(repoRoot, "bun.lock");

if (!existsSync(lockPath)) {
  console.error(`bun.lock not found at ${lockPath}.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as RootManifest;
const lock = readBunLock(lockPath);

const patched = manifest.patchedDependencies ?? {};
const lockPatched = lock.patchedDependencies ?? {};
const errors: string[] = [];
const reportedNames = new Set<string>();

function report(name: string | null, message: string): void {
  if (name) reportedNames.add(name);
  errors.push(message);
}

for (const [key, patchPath] of Object.entries(patched)) {
  const split = splitPatchKey(key);

  if (!split) {
    report(null, `- "${key}" is not a valid "name@version" patch key.`);
    continue;
  }

  const { name, version } = split;

  if (!existsSync(join(repoRoot, patchPath))) {
    report(name, `- ${key}: patch file "${patchPath}" does not exist.`);
  }

  const versions = resolvedVersions(lock, name);

  if (versions.length === 0) {
    report(
      name,
      `- ${key}: "${name}" is not in bun.lock at all. Drop the patch entry or add the dependency back.`,
    );
    continue;
  }

  if (!versions.includes(version)) {
    report(
      name,
      `- ${key}: bun.lock resolves "${name}" to ${versions.join(", ")}, so this patch is SILENTLY SKIPPED.\n` +
        `  Fix: bun patch ${name} && (re-apply ${patchPath}) && bun patch --commit ${name}`,
    );
    continue;
  }

  // bun drops unresolvable patchedDependencies keys from the lockfile without
  // warning — that silence is what hid issue #588 for three weeks.
  if (!(key in lockPatched)) {
    report(
      name,
      `- ${key}: missing from bun.lock's own patchedDependencies block.\n` +
        `  Fix: run \`bun install\` and commit the updated bun.lock.`,
    );
  }
}

// Reverse drift: a key bun.lock still carries that package.json has dropped.
// Skip names the forward pass already reported — a stale lock key alongside a
// re-keyed manifest entry is one desync, and the forward pass names the right fix.
for (const key of Object.keys(lockPatched)) {
  if (key in patched) continue;

  const name = splitPatchKey(key)?.name;
  if (name && reportedNames.has(name)) continue;

  errors.push(
    `- ${key}: present in bun.lock but not in package.json's patchedDependencies.\n` +
      `  Fix: run \`bun install\` and commit the updated bun.lock.`,
  );
}

if (errors.length > 0) {
  console.error("Patched dependency check failed.");
  console.error("");
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(
  `Patched dependency check passed (${Object.keys(patched).length} patch(es) verified).`,
);
