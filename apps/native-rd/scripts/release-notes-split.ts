#!/usr/bin/env bun
/**
 * Splits docs/release/testing-notes/<version>.md into the three store-bound
 * artifacts:
 *
 *   1. store.config.json (EAS Metadata) — apple.info.en-US.releaseNotes
 *      → consumed by `eas metadata:push --profile production` to set the
 *        App Store "What's New in This Version" field.
 *
 *   2. .release-artifacts/play-changelog-en-US.txt — raw text of the play slice
 *      → consumed by the (future) Play Developer API push, or copied into
 *        Play Console manually until that automation lands.
 *
 *   3. .release-artifacts/what-to-test.txt — raw text of the testflight slice
 *      → consumed by `eas submit --platform ios --what-to-test "$(cat ...)"`
 *        or `eas build --auto-submit --what-to-test "$(cat ...)"` to set the
 *        TestFlight "What to Test" field.
 *
 * Refuses to write any artifact if the testing-notes file still contains
 * TODO markers — that's the same check release-notes:lint enforces. The
 * intent is that this script is safe to run unattended in CI: either the
 * notes are fully edited and it produces clean artifacts, or it exits
 * non-zero and the pipeline halts before anything reaches the stores.
 *
 * Version defaults to apps/native-rd/package.json. Override with arg:
 * `bun run scripts/release-notes-split.ts 0.1.5`.
 *
 * Run: bun run release-notes:split
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const APP_ROOT = join(import.meta.dir, "..");
const NOTES_DIR = join(APP_ROOT, "docs", "release", "testing-notes");
const ARTIFACTS_DIR = join(APP_ROOT, ".release-artifacts");
const STORE_CONFIG_PATH = join(APP_ROOT, "store.config.json");
const STORE_CONFIG_BASE_PATH = join(APP_ROOT, "store.config.base.json");
const PACKAGE_JSON_PATH = join(APP_ROOT, "package.json");

type SliceName = "play" | "appstore" | "testflight";

const LIMITS: Record<SliceName, number> = {
  play: 500,
  appstore: 4000,
  testflight: 4000,
};

function resolveVersion(arg: string | undefined): string {
  if (arg && arg.length > 0) return arg;
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
    version?: string;
  };
  if (!pkg.version) throw new Error(`No version in ${PACKAGE_JSON_PATH}`);
  return pkg.version;
}

function extractSlice(source: string, slice: SliceName): string {
  const start = `<!-- ${slice}:start -->`;
  const end = `<!-- ${slice}:end -->`;
  const startIdx = source.indexOf(start);
  const endIdx = source.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Missing ${slice} markers in testing-notes file`);
  }
  return source.slice(startIdx + start.length, endIdx).trim();
}

type StoreConfig = {
  configVersion?: number;
  apple?: {
    info?: Record<string, Record<string, unknown> | undefined>;
  };
};

function mergeStoreConfig(
  base: unknown,
  appstoreReleaseNotes: string,
): StoreConfig {
  const cloned = JSON.parse(JSON.stringify(base ?? {})) as StoreConfig;
  cloned.apple ??= {};
  cloned.apple.info ??= {};
  const locale = cloned.apple.info["en-US"] ?? {};
  cloned.apple.info["en-US"] = {
    ...locale,
    releaseNotes: appstoreReleaseNotes,
  };
  return cloned;
}

function validate(slice: SliceName, body: string): void {
  if (body.length === 0) {
    throw new Error(`${slice}: empty body between markers`);
  }
  if (body.includes("TODO")) {
    throw new Error(
      `${slice}: contains TODO — rewrite all TODO lines before splitting`,
    );
  }
  if (body.length > LIMITS[slice]) {
    throw new Error(
      `${slice}: ${body.length} chars exceeds store limit of ${LIMITS[slice]}`,
    );
  }
}

function main(): number {
  const version = resolveVersion(process.argv[2]);
  const notesPath = join(NOTES_DIR, `${version}.md`);

  let source: string;
  try {
    source = readFileSync(notesPath, "utf8");
  } catch {
    console.error(
      `release-notes-split: no testing-notes file at ${notesPath}. ` +
        `Run \`bun run release-notes:generate ${version}\` first, then edit the TODO lines.`,
    );
    return 1;
  }

  const slices: Record<SliceName, string> = {
    play: extractSlice(source, "play"),
    appstore: extractSlice(source, "appstore"),
    testflight: extractSlice(source, "testflight"),
  };

  for (const name of ["play", "appstore", "testflight"] as const) {
    try {
      validate(name, slices[name]);
    } catch (err) {
      console.error(`release-notes-split: ${(err as Error).message}`);
      return 1;
    }
  }

  let base: unknown;
  try {
    base = JSON.parse(readFileSync(STORE_CONFIG_BASE_PATH, "utf8"));
  } catch {
    console.error(
      `release-notes-split: missing or unreadable ${STORE_CONFIG_BASE_PATH}. ` +
        `This file holds the static EAS Metadata (title, privacyPolicyUrl, etc.) ` +
        `that release notes get merged into.`,
    );
    return 1;
  }
  const storeConfig = mergeStoreConfig(base, slices.appstore);
  writeFileSync(STORE_CONFIG_PATH, JSON.stringify(storeConfig, null, 2) + "\n");

  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const playPath = join(ARTIFACTS_DIR, "play-changelog-en-US.txt");
  const testflightPath = join(ARTIFACTS_DIR, "what-to-test.txt");
  writeFileSync(playPath, slices.play + "\n");
  writeFileSync(testflightPath, slices.testflight + "\n");

  console.log(
    `release-notes-split: wrote artifacts for ${version}\n` +
      `  store.config.json (appstore release notes, ${slices.appstore.length} chars)\n` +
      `  ${playPath} (play, ${slices.play.length} chars)\n` +
      `  ${testflightPath} (testflight, ${slices.testflight.length} chars)\n` +
      `  next:\n` +
      `    iOS:     eas metadata:push --profile production\n` +
      `             eas submit --platform ios --profile production --what-to-test "$(cat ${testflightPath})"\n` +
      `    Android: eas submit --platform android --profile production\n` +
      `             (then push play changelog via Play Developer API — see docs/release/testing-notes/README.md)`,
  );
  return 0;
}

process.exit(main());
