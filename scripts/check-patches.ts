#!/usr/bin/env bun

/**
 * Guards bun's `patchedDependencies` against silent drift.
 *
 * Bun matches patch keys by exact `name@version`, silently drops keys that no
 * longer resolve, and `bun install --frozen-lockfile` still exits 0 — so a
 * vendored fix can stop being applied with zero signal. That is exactly how the
 * unistyles shadow-tree double-free returned to the field for three weeks
 * (issue #588).
 *
 * The check therefore runs in both directions — declared keys must resolve, and
 * every patch file must be referenced — and verifies the patch actually landed
 * in node_modules rather than trusting the bookkeeping.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

type Manifest = {
  patchedDependencies?: Record<string, string>;
};

type BunLock = {
  patchedDependencies?: Record<string, string>;
  packages?: Record<string, unknown[]>;
};

type PatchEntry = {
  /** Repo-relative manifest that declared this entry. */
  manifest: string;
  /** The `name@version` key. */
  key: string;
  name: string;
  version: string;
  /** Repo-relative path to the `.patch` file. */
  patchPath: string;
};

const repoRoot = resolve(
  process.env.CHECK_PATCHES_ROOT ?? resolve(import.meta.dir, ".."),
);
const patchesDir = join(repoRoot, "patches");
const workspaceRoots = ["apps", "packages"];

const errors: string[] = [];
const notes: string[] = [];

function fail(message: string): never {
  console.error("Patched dependency check failed.");
  console.error("");
  console.error(message);
  process.exit(1);
}

/**
 * bun.lock is JSONC-ish: trailing commas before `}`/`]` are legal there but not
 * in strict JSON, so strip them before parsing. Only bracket-adjacent commas
 * are touched, and `$1` re-emits the bracket.
 */
function readBunLock(path: string): BunLock {
  let text: string;

  try {
    text = readFileSync(path, "utf8");
  } catch {
    fail(`bun.lock could not be read at ${path}. Run \`bun install\`.`);
  }

  try {
    return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1")) as BunLock;
  } catch (error) {
    fail(
      `bun.lock is not parseable (${(error as Error).message}).\n` +
        `  Fix: regenerate it with \`bun install\` and commit the result.`,
    );
  }
}

/** Split `name@version` on the last `@` so scoped packages survive. */
function splitPatchKey(key: string): { name: string; version: string } | null {
  const at = key.lastIndexOf("@");
  if (at <= 0) return null;
  return { name: key.slice(0, at), version: key.slice(at + 1) };
}

function readManifest(path: string): Manifest {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Manifest;
  } catch (error) {
    fail(`${path} is not parseable (${(error as Error).message}).`);
  }
}

/**
 * Every manifest whose `patchedDependencies` bun honors: the root plus each
 * workspace. Walking only the root would leave the whole #588 failure class
 * reachable by moving the entry next to the package that needs it.
 */
function manifestPaths(): string[] {
  const paths = [join(repoRoot, "package.json")];

  for (const workspaceRoot of workspaceRoots) {
    const dir = join(repoRoot, workspaceRoot);
    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(dir, entry.name, "package.json");
      if (existsSync(manifest)) paths.push(manifest);
    }
  }

  return paths;
}

function descriptorName(entry: unknown[] | undefined): string | null {
  const descriptor = entry?.[0];
  if (typeof descriptor !== "string") return null;
  return splitPatchKey(descriptor)?.name ?? null;
}

function descriptorVersion(entry: unknown[] | undefined): string | null {
  const descriptor = entry?.[0];
  if (typeof descriptor !== "string") return null;
  return splitPatchKey(descriptor)?.version ?? null;
}

/**
 * The version the workspace actually gets — bun.lock's top-level entry for the
 * name. Checking membership in the union of *all* resolutions instead would let
 * a patch key match some transitive copy while the direct dependency runs
 * unpatched, which is the same silence this guard exists to remove.
 */
function directVersion(lock: BunLock, name: string): string | null {
  return descriptorVersion(lock.packages?.[name]);
}

/** Every version `name` resolves to anywhere in the tree, direct or nested. */
function allVersions(lock: BunLock, name: string): string[] {
  const versions = new Set<string>();

  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const nameMatchesKey = key === name || key.endsWith(`/${name}`);
    // An alias key (`string-width-cjs`) carries a descriptor for a different
    // name, so match on either side.
    if (!nameMatchesKey && descriptorName(entry) !== name) continue;

    const version = descriptorVersion(entry);
    if (version) versions.add(version);
  }

  return [...versions].sort();
}

/** Where `name@version` is installed. Bun's store dir may carry a peer hash. */
function installDirs(name: string, version: string): string[] {
  const dirs: string[] = [];
  const store = join(repoRoot, "node_modules", ".bun");
  const escaped = name.replace(/\//g, "+");

  if (existsSync(store)) {
    for (const dir of readdirSync(store)) {
      if (
        dir !== `${escaped}@${version}` &&
        !dir.startsWith(`${escaped}@${version}+`)
      )
        continue;
      const candidate = join(store, dir, "node_modules", ...name.split("/"));
      if (existsSync(candidate)) dirs.push(candidate);
    }
  }

  const hoisted = join(repoRoot, "node_modules", ...name.split("/"));
  if (existsSync(hoisted)) dirs.push(hoisted);

  return dirs;
}

type Hunk = {
  /** Context + added lines, i.e. what the file must look like after applying. */
  postImage: string[];
  /** Removed lines, used when a hunk only deletes. */
  removed: string[];
};

/**
 * Per-hunk post-image line sequences, keyed by file.
 *
 * Comparing the post-image rather than only the added lines means deletion-only
 * and modification-only hunks are verified too — checking `+` lines alone
 * reports success for a patch that has none, which defeats the guard.
 *
 * Lines are compared trimmed, because bun's applied output is not always
 * byte-identical to the patch's post-image (the ajv-formats patch changes only
 * whitespace-adjacent JSON), so hashing the result would report a
 * correctly-applied patch as broken.
 */
function hunksByFile(patchText: string): Map<string, Hunk[]> {
  const byFile = new Map<string, Hunk[]>();
  let hunks: Hunk[] | null = null;
  let current: Hunk | null = null;

  for (const line of patchText.split("\n")) {
    const header = /^diff --git a\/.+? b\/(.+)$/.exec(line);

    if (header) {
      hunks = [];
      current = null;
      byFile.set(header[1], hunks);
      continue;
    }

    if (!hunks) continue;

    if (line.startsWith("@@")) {
      current = { postImage: [], removed: [] };
      hunks.push(current);
      continue;
    }

    // Everything before the first @@ is header noise (---, +++, index, mode).
    if (!current) continue;
    // "\ No newline at end of file" is a marker, not content.
    if (line.startsWith("\\")) continue;

    if (line.startsWith("+")) current.postImage.push(line.slice(1).trim());
    else if (line.startsWith("-")) current.removed.push(line.slice(1).trim());
    // Context lines start with a space; anything else (notably the trailing
    // empty string from splitting on "\n") is not diff content.
    else if (line.startsWith(" ")) current.postImage.push(line.slice(1).trim());
  }

  return byFile;
}

/** Whether `needle` appears as a contiguous run inside `haystack`. */
function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0) return true;

  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }

  return false;
}

/** Verify the patch's effect is present in the installed package. */
function checkApplied(entry: PatchEntry, patchText: string): void {
  const dirs = installDirs(entry.name, entry.version);

  if (dirs.length === 0) {
    errors.push(
      `- ${entry.key}: "${entry.name}" is not installed, so the patch cannot be verified.\n` +
        `  Fix: run \`bun install\` before this check.`,
    );
    return;
  }

  const byFile = hunksByFile(patchText);

  if (byFile.size === 0) {
    errors.push(
      `- ${entry.key}: ${entry.patchPath} contains no file diffs.\n` +
        `  Fix: regenerate it with \`bun patch ${entry.name}\` — bun accepts a hunkless patch silently.`,
    );
    return;
  }

  for (const dir of dirs) {
    for (const [file, hunks] of byFile) {
      const target = join(dir, ...file.split("/"));

      if (!existsSync(target)) {
        errors.push(
          `- ${entry.key}: patched file "${file}" is missing from ${dir}.`,
        );
        continue;
      }

      if (hunks.length === 0) {
        errors.push(
          `- ${entry.key}: "${file}" has no hunks in ${entry.patchPath}, so nothing about it can be verified.\n` +
            `  Fix: regenerate with \`bun patch ${entry.name}\`.`,
        );
        continue;
      }

      const lines = readFileSync(target, "utf8")
        .split("\n")
        .map((line) => line.trim());
      const present = new Set(lines);

      hunks.forEach((hunk, index) => {
        const applied =
          hunk.postImage.length > 0
            ? containsSequence(lines, hunk.postImage)
            : // A hunk that only deletes leaves nothing to match, so absence of
              // every removed line is the signal instead.
              hunk.removed.every((line) => !present.has(line));

        if (applied) return;

        const sample = (hunk.postImage[0] ?? hunk.removed[0] ?? "").slice(
          0,
          80,
        );
        errors.push(
          `- ${entry.key}: hunk ${index + 1}/${hunks.length} for "${file}" is NOT applied in ${dir}.\n` +
            `  expected near: ${sample}\n` +
            `  Fix: re-run \`bun install\`; if that does not restore it, regenerate with \`bun patch ${entry.name}\`.`,
        );
      });
    }
  }
}

const lockPath = join(repoRoot, "bun.lock");

if (!existsSync(lockPath)) {
  fail(`bun.lock not found at ${lockPath}.`);
}

const lock = readBunLock(lockPath);

if (Object.keys(lock.packages ?? {}).length === 0) {
  fail(
    "bun.lock has no `packages` block — the lockfile is empty or malformed.\n" +
      "  Fix: regenerate it with `bun install`. Do NOT drop patch entries to make this pass.",
  );
}

const lockPatched = lock.patchedDependencies ?? {};
const entries: PatchEntry[] = [];
const referencedPatches = new Set<string>();

for (const manifestPath of manifestPaths()) {
  const relative = manifestPath.slice(repoRoot.length + 1);
  const patched = readManifest(manifestPath).patchedDependencies ?? {};

  for (const [key, patchPath] of Object.entries(patched)) {
    referencedPatches.add(basename(patchPath));
    const split = splitPatchKey(key);

    if (!split) {
      errors.push(
        `- ${relative}: "${key}" is not a valid "name@version" patch key.`,
      );
      continue;
    }

    entries.push({ manifest: relative, key, patchPath, ...split });
  }
}

for (const entry of entries) {
  const { key, name, version, patchPath, manifest } = entry;
  const absolutePatch = join(repoRoot, patchPath);

  if (!existsSync(absolutePatch)) {
    errors.push(
      `- ${key}: patch file "${patchPath}" does not exist (declared in ${manifest}).`,
    );
    continue;
  }

  // A half-done re-key — key bumped, path left pointing at the old file — is
  // otherwise invisible.
  if (basename(patchPath) !== `${key}.patch`) {
    errors.push(
      `- ${key}: patch file is named "${basename(patchPath)}" but the key is "${key}".\n` +
        `  Fix: rename it to "${key}.patch" and update ${manifest}.`,
    );
  }

  if (statSync(absolutePatch).size === 0) {
    errors.push(`- ${key}: patch file "${patchPath}" is empty.`);
    continue;
  }

  const patchText = readFileSync(absolutePatch, "utf8");

  if (!/^@@ /m.test(patchText)) {
    errors.push(
      `- ${key}: "${patchPath}" has no hunks (@@) — bun applies it as a no-op without complaining.\n` +
        `  Fix: regenerate with \`bun patch ${name}\`.`,
    );
    continue;
  }

  const direct = directVersion(lock, name);
  const everywhere = allVersions(lock, name);

  if (everywhere.length === 0) {
    errors.push(
      `- ${key}: "${name}" is not in bun.lock at all.\n` +
        `  Fix: re-add the dependency, or remove this entry from ${manifest} AND delete ${patchPath}.`,
    );
    continue;
  }

  if (direct !== null && direct !== version) {
    errors.push(
      `- ${key}: bun.lock resolves "${name}" to ${direct}, so this patch is SILENTLY SKIPPED.\n` +
        `  Fix: bun patch ${name} && (re-apply ${patchPath}) && bun patch --commit ${name}`,
    );
    continue;
  }

  if (direct === null && !everywhere.includes(version)) {
    errors.push(
      `- ${key}: "${name}" resolves only to ${everywhere.join(", ")} in bun.lock, never ${version}.\n` +
        `  Fix: bun patch ${name} && (re-apply ${patchPath}) && bun patch --commit ${name}`,
    );
    continue;
  }

  if (everywhere.length > 1) {
    notes.push(
      `- ${key}: "${name}" also resolves to ${everywhere.filter((v) => v !== version).join(", ")} elsewhere in the tree; those copies are NOT patched.`,
    );
  }

  // bun drops unresolvable patchedDependencies keys from the lockfile without
  // warning — that silence is what hid #588 for three weeks.
  if (!(key in lockPatched)) {
    errors.push(
      `- ${key}: missing from bun.lock's own patchedDependencies block.\n` +
        `  Fix: run \`bun install\` and commit the updated bun.lock.`,
    );
    continue;
  }

  if (lockPatched[key] !== patchPath) {
    errors.push(
      `- ${key}: ${manifest} points at "${patchPath}" but bun.lock records "${lockPatched[key]}".\n` +
        `  Fix: run \`bun install\` and commit the updated bun.lock.`,
    );
    continue;
  }

  checkApplied(entry, patchText);
}

// Reverse drift: bun.lock carrying a key no manifest declares.
const declaredKeys = new Set(entries.map((entry) => entry.key));
const reportedNames = new Set(entries.map((entry) => entry.name));

for (const key of Object.keys(lockPatched)) {
  if (declaredKeys.has(key)) continue;

  // A stale lock key beside a re-keyed manifest entry is one desync, and the
  // forward pass already named the right fix for it.
  const name = splitPatchKey(key)?.name;
  if (name && reportedNames.has(name)) continue;

  errors.push(
    `- ${key}: present in bun.lock but declared in no package.json.\n` +
      `  Fix: run \`bun install\` and commit the updated bun.lock.`,
  );
}

// Orphan patch files. Without this, deleting a `patchedDependencies` block
// leaves the patch files sitting unused and the check reports success — the
// #588 failure mode with a green tick.
if (existsSync(patchesDir)) {
  for (const file of readdirSync(patchesDir)) {
    if (!file.endsWith(".patch") || referencedPatches.has(file)) continue;

    errors.push(
      `- patches/${file} is referenced by no package.json patchedDependencies entry, so it is NOT applied.\n` +
        `  Fix: re-add the entry (\`bun patch <pkg>\`), or delete the file if the patch is genuinely obsolete.`,
    );
  }
}

if (errors.length > 0) {
  console.error("Patched dependency check failed.");
  console.error("");
  for (const error of errors) console.error(error);
  process.exit(1);
}

for (const note of notes) console.warn(`warning: ${note.slice(2)}`);

console.log(
  `Patched dependency check passed (${entries.length} patch(es) verified, applied in node_modules).`,
);
