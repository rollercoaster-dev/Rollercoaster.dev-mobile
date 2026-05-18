#!/usr/bin/env bun
/**
 * Validates release testing-notes against store length limits.
 *
 * Lints every file in docs/release/testing-notes/ except README.md and files
 * starting with "_" (templates). For each file, parses the three marker-delimited
 * slices and asserts the trimmed body fits the per-store character budget.
 *
 * Limits are hard ceilings from Google Play / App Store Connect. See README.md
 * in the same directory for the source of those numbers.
 *
 * Exits 0 on success, 1 on any violation. Designed for CI.
 *
 * Run: bun run release-notes:lint
 */

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

type SliceName = "play" | "appstore" | "testflight";

const LIMITS: Record<SliceName, number> = {
  play: 500,
  appstore: 4000,
  testflight: 4000,
};

const SLICES: readonly SliceName[] = ["play", "appstore", "testflight"];

const NOTES_DIR = join(
  import.meta.dir,
  "..",
  "docs",
  "release",
  "testing-notes",
);

type Violation = {
  file: string;
  slice: SliceName;
  reason: string;
};

function extractSlice(source: string, slice: SliceName): string | null {
  const start = `<!-- ${slice}:start -->`;
  const end = `<!-- ${slice}:end -->`;
  const startIdx = source.indexOf(start);
  const endIdx = source.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
  return source.slice(startIdx + start.length, endIdx).trim();
}

function lintFile(path: string): Violation[] {
  const source = readFileSync(path, "utf8");
  const file = basename(path);
  const violations: Violation[] = [];

  for (const slice of SLICES) {
    const body = extractSlice(source, slice);
    if (body === null) {
      violations.push({
        file,
        slice,
        reason: `missing <!-- ${slice}:start --> / <!-- ${slice}:end --> markers`,
      });
      continue;
    }
    if (body.length === 0) {
      violations.push({ file, slice, reason: "empty body between markers" });
      continue;
    }
    if (body.includes("TODO")) {
      violations.push({
        file,
        slice,
        reason: "contains TODO — fill in before tagging the release",
      });
    }
    if (body.length > LIMITS[slice]) {
      violations.push({
        file,
        slice,
        reason: `${body.length} chars exceeds limit of ${LIMITS[slice]}`,
      });
    }
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
    .filter((name) => name.endsWith(".md"))
    .filter((name) => name !== "README.md")
    .filter((name) => !name.startsWith("_"))
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

process.exit(main());
