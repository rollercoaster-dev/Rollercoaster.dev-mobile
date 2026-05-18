#!/usr/bin/env bun
/**
 * Splits docs/release/testing-notes/<version>.md into three store-bound artifacts:
 *
 *   1. store.config.json (EAS Metadata) — apple.info.en-US.releaseNotes
 *      → `eas metadata:push --profile production` for App Store "What's New"
 *   2. .release-artifacts/play-changelog-en-US.txt
 *      → Play Console "What's new" (manual paste or future API push)
 *   3. .release-artifacts/what-to-test.txt
 *      → `eas submit --what-to-test "$(cat ...)"` for TestFlight "What to Test"
 *
 * Refuses to write any artifact if the testing-notes file fails the same
 * checks release-notes:lint enforces, so the pipeline halts before partial
 * state can reach the stores.
 *
 * Version defaults to apps/native-rd/package.json. Override with arg.
 *
 * Run: bun run release-notes:split
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  APP_ROOT,
  checkSlice,
  extractSlice,
  resolveVersion,
  SLICES,
  type SliceName,
} from "./release-notes-shared";

const NOTES_DIR = join(APP_ROOT, "docs", "release", "testing-notes");
const ARTIFACTS_DIR = join(APP_ROOT, ".release-artifacts");
const STORE_CONFIG_PATH = join(APP_ROOT, "store.config.json");
const STORE_CONFIG_BASE_PATH = join(APP_ROOT, "store.config.base.json");

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

  const bodies: Record<SliceName, string> = {
    play: "",
    appstore: "",
    testflight: "",
  };
  for (const slice of SLICES) {
    const body = extractSlice(source, slice);
    const violation = checkSlice(slice, body);
    if (violation || body === null) {
      console.error(
        `release-notes-split: ${slice}: ${violation?.reason ?? "missing markers"}`,
      );
      return 1;
    }
    bodies[slice] = body;
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
  const storeConfig = mergeStoreConfig(base, bodies.appstore);
  writeFileSync(STORE_CONFIG_PATH, JSON.stringify(storeConfig, null, 2) + "\n");

  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const playPath = join(ARTIFACTS_DIR, "play-changelog-en-US.txt");
  const testflightPath = join(ARTIFACTS_DIR, "what-to-test.txt");
  writeFileSync(playPath, bodies.play + "\n");
  writeFileSync(testflightPath, bodies.testflight + "\n");

  console.log(
    `release-notes-split: wrote artifacts for ${version}\n` +
      `  store.config.json (appstore release notes, ${bodies.appstore.length} chars)\n` +
      `  ${playPath} (play, ${bodies.play.length} chars)\n` +
      `  ${testflightPath} (testflight, ${bodies.testflight.length} chars)\n` +
      `  next:\n` +
      `    iOS:     eas metadata:push --profile production\n` +
      `             eas submit --platform ios --profile production --what-to-test "$(cat ${testflightPath})"\n` +
      `    Android: eas submit --platform android --profile production\n` +
      `             (then push play changelog via Play Developer API — see docs/release/testing-notes/README.md)`,
  );
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
