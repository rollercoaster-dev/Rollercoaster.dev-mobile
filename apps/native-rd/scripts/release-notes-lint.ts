#!/usr/bin/env bun
/**
 * Validates release testing-notes against store length limits.
 *
 * Lints every file in docs/release/testing-notes/ except README.md and files
 * starting with "_" (templates). For each file, parses the three marker-delimited
 * slices and asserts the trimmed body fits the per-store character budget.
 *
 * Exits 0 on success, 1 on any violation. Designed for CI.
 *
 * Run: bun run release-notes:lint
 */

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import {
  APP_ROOT,
  checkSlice,
  extractSlice,
  SLICES,
  type SliceViolation,
} from "./release-notes-shared";

const NOTES_DIR = join(APP_ROOT, "docs", "release", "testing-notes");

type FileViolation = SliceViolation & { file: string };

function lintFile(path: string): FileViolation[] {
  const source = readFileSync(path, "utf8");
  const file = basename(path);
  const violations: FileViolation[] = [];
  for (const slice of SLICES) {
    const body = extractSlice(source, slice);
    const v = checkSlice(slice, body);
    if (v) violations.push({ ...v, file });
  }
  return violations;
}

function main(): number {
  let entries: string[];
  try {
    entries = readdirSync(NOTES_DIR);
  } catch {
    console.error(`testing-notes directory not found at ${NOTES_DIR}`);
    return 1;
  }

  const files = entries
    .filter(
      (name) =>
        name.endsWith(".md") && name !== "README.md" && !name.startsWith("_"),
    )
    .map((name) => join(NOTES_DIR, name));

  if (files.length === 0) {
    console.log(
      "release-notes-lint: no version notes to check (only template/README present).",
    );
    return 0;
  }

  const allViolations = files.flatMap(lintFile);

  if (allViolations.length === 0) {
    console.log(`release-notes-lint: ${files.length} file(s) OK.`);
    return 0;
  }

  console.error(`release-notes-lint: ${allViolations.length} violation(s):`);
  for (const v of allViolations) {
    console.error(`  ${v.file} [${v.slice}]: ${v.reason}`);
  }
  return 1;
}

if (import.meta.main) {
  process.exit(main());
}
