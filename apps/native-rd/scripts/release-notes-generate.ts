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
 * Run: bun run release-notes:generate
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { APP_ROOT, resolveVersion } from "./release-notes-shared";

const CHANGELOG_PATH = join(APP_ROOT, "CHANGELOG.md");
const NOTES_DIR = join(APP_ROOT, "docs", "release", "testing-notes");

type ChangelogEntry = {
  scope: string | null;
  title: string;
};

type ChangelogSection = {
  features: ChangelogEntry[];
  fixes: ChangelogEntry[];
};

// Scopes whose entries are internal-only (build infra, CI, dependency bumps,
// release-please chores). They stay in CHANGELOG.md but don't belong in any
// user-facing or tester-facing release notes.
const INTERNAL_SCOPES = new Set(["ci", "chore", "build", "deps", "release"]);

function parseBullet(line: string): ChangelogEntry {
  let text = line.replace(/^[*-]\s+/, "");
  // Extract the conventional-commit scope ("**scope:**") before stripping it,
  // so downstream filters can act on scope rather than cleaned title text.
  const scopeMatch = /^\*\*([^*]+):\*\*\s+/.exec(text);
  const scope = scopeMatch ? scopeMatch[1].trim() : null;
  if (scopeMatch) text = text.slice(scopeMatch[0].length);
  // Strip trailing parenthetical link groups like ` ([#12](url))` or ` ([hash](url))`,
  // including release-please's ", closes [#NN](url)" suffix. Iterate to peel them off.
  while (true) {
    const stripped = text
      .replace(/,?\s+closes\s+\[[^\]]+\]\([^)]+\)\s*$/, "")
      .replace(/\s+\(\[[^\]]+\]\([^)]+\)\)\s*$/, "");
    if (stripped === text) break;
    text = stripped;
  }
  return { scope, title: text.trim() };
}

function extractVersionSection(changelog: string, version: string): string {
  // Match heading lines: "## [X.Y.Z]..." (release-please linked form) or
  // "## X.Y.Z..." (older hand-written entries — CHANGELOG.md mixes both).
  const escaped = version.replace(/\./g, "\\.");
  // Use \b on the unlinked alternative so "## 0.1.4" does not match "## 0.1.41".
  // The bracketed form is already self-delimiting via the closing "]".
  const headingRe = new RegExp(
    `^##\\s+(?:\\[${escaped}\\]|${escaped}\\b)[^\\n]*$`,
    "m",
  );
  const match = headingRe.exec(changelog);
  if (!match) {
    throw new Error(
      `Could not find version ${version} in CHANGELOG.md ` +
        `(looked for "## [${version}]..." or "## ${version}..."). ` +
        `If release-please has not run yet, pass the version explicitly.`,
    );
  }
  const start = match.index + match[0].length;
  // Next heading is the start of the previous (older) release section. Match
  // both linked ("## [x.y.z]") and unlinked ("## x.y.z") forms so we stop at
  // the first older entry regardless of which form CHANGELOG.md uses there.
  const nextHeadingRe = /^##\s+(?:\[|\d)/m;
  const rest = changelog.slice(start);
  const nextMatch = nextHeadingRe.exec(rest);
  return nextMatch ? rest.slice(0, nextMatch.index) : rest;
}

function parseSection(section: string): ChangelogSection {
  const result: ChangelogSection = { features: [], fixes: [] };
  const lines = section.split("\n");
  let bucket: "features" | "fixes" | null = null;
  for (const line of lines) {
    if (/^###\s+Features\b/.test(line)) {
      bucket = "features";
      continue;
    }
    if (/^###\s+Bug\s+Fixes\b/.test(line)) {
      bucket = "fixes";
      continue;
    }
    if (/^###\s+/.test(line)) {
      bucket = null;
      continue;
    }
    if (bucket && /^[*-]\s+/.test(line)) {
      result[bucket].push(parseBullet(line));
    }
  }
  return result;
}

function todoList(items: ChangelogEntry[]): string {
  if (items.length === 0) return "- TODO: (none in this release)";
  return items.map((item) => `- TODO: ${item.title}`).join("\n");
}

function isUserFacing(entry: ChangelogEntry): boolean {
  if (entry.scope === null) return true;
  return !INTERNAL_SCOPES.has(entry.scope.toLowerCase());
}

type Scaffold = {
  content: string;
  userFacingFeatureCount: number;
  userFacingFixCount: number;
  internalFeatureCount: number;
  internalFixCount: number;
};

function buildScaffold(version: string, section: ChangelogSection): Scaffold {
  const today = new Date().toISOString().slice(0, 10);
  const userFacingFeatures = section.features.filter(isUserFacing);
  const userFacingFixes = section.fixes.filter(isUserFacing);
  const content = `---
version: ${version}
versionCode: TODO
date: ${today}
---

# Testing notes — ${version}

> Scaffold generated from CHANGELOG.md. Rewrite each \`TODO: \` line:
> - **play** / **appstore**: user-facing copy (no jargon, no PR numbers)
> - **testflight**: tester instructions (steps to exercise + expected result)
>
> The release-notes:lint check fails while any \`TODO\` remains.

## Google Play — What's new (en-US, max 500 chars)

End-user copy. Lead with the user benefit. Tight — 500 chars goes fast.

<!-- play:start -->

TODO: 2–4 short bullets or a single paragraph describing what improved for the user in plain language.

<!-- play:end -->

## App Store — Release notes (en-US, max 4000 chars)

End-user copy. Same voice as Play, but more room.

<!-- appstore:start -->

**New**

${todoList(userFacingFeatures)}

**Fixed**

${todoList(userFacingFixes)}

<!-- appstore:end -->

## TestFlight — What to test (max 4000 chars)

Tester-facing QA brief. Rewrite each line as: what to do → expected result.

<!-- testflight:start -->

**Focus areas this build**

${todoList(userFacingFeatures)}

**Recent fixes worth a sanity check**

${todoList(userFacingFixes)}

**Reporting**

- File anything weird in GitHub issues with the build number from Settings → About.

<!-- testflight:end -->
`;
  return {
    content,
    userFacingFeatureCount: userFacingFeatures.length,
    userFacingFixCount: userFacingFixes.length,
    internalFeatureCount: section.features.length - userFacingFeatures.length,
    internalFixCount: section.fixes.length - userFacingFixes.length,
  };
}

function main(): number {
  const version = resolveVersion(process.argv[2]);
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
  const scaffold = buildScaffold(version, parsed);
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
