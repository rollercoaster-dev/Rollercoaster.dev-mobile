/**
 * Pure changelog→scaffold logic for release-notes-generate.
 *
 * Parses a release-please CHANGELOG.md section into Features/Bug Fixes entries
 * and builds the marker-delimited testing-notes scaffold. Kept free of
 * `import.meta` and filesystem access so jest (babel-preset-expo, which targets
 * Hermes) can import it directly — see release-notes-generate.ts for the thin
 * CLI wrapper that owns the fs bootstrap and the `import.meta.main` guard.
 */

export type ChangelogEntry = {
  scope: string | null;
  title: string;
};

export type ChangelogSection = {
  features: ChangelogEntry[];
  fixes: ChangelogEntry[];
};

// Scopes whose entries are internal-only (build infra, CI, dependency bumps,
// release-please chores). They stay in CHANGELOG.md but don't belong in any
// user-facing or tester-facing release notes.
export const INTERNAL_SCOPES = new Set([
  "ci",
  "chore",
  "build",
  "deps",
  "release",
]);

export function parseBullet(line: string): ChangelogEntry {
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

export function extractVersionSection(
  changelog: string,
  version: string,
): string {
  // Match heading lines: "## [X.Y.Z]..." (release-please linked form) or
  // "## X.Y.Z..." (older hand-written entries — CHANGELOG.md mixes both).
  // `version` is already sanitized to strict semver by resolveVersion, but we
  // still apply the MDN-canonical full regex-meta escape here so CodeQL's
  // "incomplete string escaping" heuristic doesn't trip on a partial escape.
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

export function parseSection(section: string): ChangelogSection {
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

export function todoList(items: ChangelogEntry[]): string {
  if (items.length === 0) return "- TODO: (none in this release)";
  return items.map((item) => `- TODO: ${item.title}`).join("\n");
}

export function isUserFacing(entry: ChangelogEntry): boolean {
  if (entry.scope === null) return true;
  return !INTERNAL_SCOPES.has(entry.scope.toLowerCase());
}

export type Scaffold = {
  content: string;
  userFacingFeatureCount: number;
  userFacingFixCount: number;
  internalFeatureCount: number;
  internalFixCount: number;
};

export function buildScaffold(
  version: string,
  section: ChangelogSection,
  today: string,
): Scaffold {
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
