#!/usr/bin/env bun
/**
 * Scaffolds docs/release/testing-notes/<version>.md from CHANGELOG.md.
 *
 * Parses the release-please-generated CHANGELOG.md for the target version,
 * pulls the `### Features` and `### Bug Fixes` bullets, strips conventional-
 * commit scope prefixes and trailing PR/commit link groups, then writes a
 * marker-delimited testing-notes file with each bullet prefixed `TODO: ` so
 * the release-notes:lint check forces a human edit before merge.
 *
 * The scaffold is INTENTIONALLY linter-failing. The "TODO" check catches
 * unedited entries; the human must rewrite each bullet as user-facing copy
 * (play/appstore) or a tester instruction (testflight) before tagging.
 *
 * Version defaults to the current apps/native-rd/package.json version
 * (i.e. the version release-please just bumped to). Pass a version arg
 * to override: `bun run scripts/release-notes-generate.ts 0.1.5`.
 *
 * Parsing + scaffold-building live in release-notes-changelog.ts (pure, no
 * `import.meta`) so they're unit-testable; this file owns the fs bootstrap.
 *
 * Run: bun run release-notes:generate
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildScaffold,
  extractVersionSection,
  parseSection,
} from "./release-notes-changelog";
import { resolveVersion } from "./release-notes-shared";

const APP_ROOT = join(import.meta.dir, "..");
const CHANGELOG_PATH = join(APP_ROOT, "CHANGELOG.md");
const NOTES_DIR = join(APP_ROOT, "docs", "release", "testing-notes");

function main(): number {
  const version = resolveVersion(process.argv[2], APP_ROOT);
  const outPath = join(NOTES_DIR, `${version}.md`);
  if (existsSync(outPath)) {
    console.error(
      `release-notes-generate: ${outPath} already exists. Delete it or pick another version.`,
    );
    return 1;
  }
  const changelog = readFileSync(CHANGELOG_PATH, "utf8");
  const section = extractVersionSection(changelog, version);
  const parsed = parseSection(section);
  if (parsed.features.length === 0 && parsed.fixes.length === 0) {
    console.error(
      `release-notes-generate: no Features or Bug Fixes found in CHANGELOG.md for ${version}.`,
    );
    return 1;
  }
  const today = new Date().toISOString().slice(0, 10);
  const scaffold = buildScaffold(version, parsed, today);
  writeFileSync(outPath, scaffold.content);
  const hiddenFeatures =
    scaffold.internalFeatureCount > 0
      ? ` (+${scaffold.internalFeatureCount} internal hidden)`
      : "";
  const hiddenFixes =
    scaffold.internalFixCount > 0
      ? ` (+${scaffold.internalFixCount} internal hidden)`
      : "";
  console.log(
    `release-notes-generate: wrote ${outPath}\n` +
      `  features: ${scaffold.userFacingFeatureCount} user-facing${hiddenFeatures}\n` +
      `  fixes: ${scaffold.userFacingFixCount} user-facing${hiddenFixes}\n` +
      `  next: edit the TODO lines, then \`bun run release-notes:lint\` to verify.`,
  );
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
