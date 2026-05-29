/**
 * Shared types and helpers for the release-notes-{lint,generate,split} scripts.
 *
 * The slice limits here are the hard ceilings from Google Play / App Store
 * Connect — see docs/release/testing-notes/README.md for the source.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SliceName = "play" | "appstore" | "testflight";

export const SLICES: readonly SliceName[] = ["play", "appstore", "testflight"];

export const LIMITS: Record<SliceName, number> = {
  play: 500,
  appstore: 4000,
  testflight: 4000,
};

export type SliceViolation = {
  slice: SliceName;
  reason: string;
};

export function extractSlice(source: string, slice: SliceName): string | null {
  const start = `<!-- ${slice}:start -->`;
  const end = `<!-- ${slice}:end -->`;
  const startIdx = source.indexOf(start);
  if (startIdx === -1) return null;
  const endIdx = source.indexOf(end, startIdx + start.length);
  if (endIdx === -1) return null;
  return source.slice(startIdx + start.length, endIdx).trim();
}

export function checkSlice(
  slice: SliceName,
  body: string | null,
): SliceViolation | null {
  if (body === null) {
    return {
      slice,
      reason: `missing <!-- ${slice}:start --> / <!-- ${slice}:end --> markers`,
    };
  }
  if (body.length === 0) {
    return { slice, reason: "empty body between markers" };
  }
  // Match the literal "TODO:" marker the scaffold emits, not any substring,
  // so legitimate prose like "TODO list" doesn't false-positive.
  if (/\bTODO:/.test(body)) {
    return {
      slice,
      reason: "contains TODO: marker — fill in before tagging the release",
    };
  }
  if (body.length > LIMITS[slice]) {
    return {
      slice,
      reason: `${body.length} chars exceeds limit of ${LIMITS[slice]}`,
    };
  }
  return null;
}

// Strict semver shape (with optional prerelease/build) — see semver.org.
// Used to sanitize `version` before it flows into a RegExp constructor in
// release-notes-generate.ts, so CLI argv can't smuggle regex meta-chars in.
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function resolveVersion(
  arg: string | undefined,
  appRoot: string,
): string {
  const candidate = arg && arg.length > 0 ? arg : readPackageVersion(appRoot);
  if (!SEMVER_RE.test(candidate)) {
    throw new Error(
      `Invalid version "${candidate}" — expected semver like 0.1.4 or 0.1.4-rc.1.`,
    );
  }
  return candidate;
}

function readPackageVersion(appRoot: string): string {
  const pkgPath = join(appRoot, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  if (!pkg.version) throw new Error(`No version in ${pkgPath}`);
  return pkg.version;
}
