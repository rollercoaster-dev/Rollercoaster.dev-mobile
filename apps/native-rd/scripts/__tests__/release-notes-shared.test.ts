import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  checkSlice,
  extractSlice,
  LIMITS,
  resolveVersion,
} from "../release-notes-shared";

describe("extractSlice", () => {
  const src = [
    "intro",
    "<!-- play:start -->",
    "  Goals now show your next step.  ",
    "<!-- play:end -->",
    "outro",
  ].join("\n");

  test("returns the trimmed body between markers", () => {
    expect(extractSlice(src, "play")).toBe("Goals now show your next step.");
  });

  test("returns null when the start marker is missing", () => {
    expect(extractSlice("<!-- play:end -->", "play")).toBeNull();
  });

  test("returns null when the end marker is missing", () => {
    expect(extractSlice("<!-- play:start -->body", "play")).toBeNull();
  });

  test("returns null for a slice whose markers are absent", () => {
    expect(extractSlice(src, "testflight")).toBeNull();
  });

  test("returns empty string when markers are adjacent", () => {
    expect(extractSlice("<!-- play:start --><!-- play:end -->", "play")).toBe(
      "",
    );
  });
});

describe("checkSlice", () => {
  test("flags missing markers when body is null", () => {
    expect(checkSlice("play", null)).toEqual({
      slice: "play",
      reason: expect.stringContaining("missing"),
    });
  });

  test("flags an empty body between markers", () => {
    expect(checkSlice("play", "")).toEqual({
      slice: "play",
      reason: "empty body between markers",
    });
  });

  test("flags the literal TODO: scaffold marker", () => {
    const v = checkSlice("appstore", "**New**\n- TODO: add next-step hint");
    expect(v?.reason).toContain("TODO:");
  });

  test("does not false-positive on prose containing the word TODO", () => {
    // "TODO list" has no colon, so the \bTODO: guard must let it through.
    expect(checkSlice("play", "We rebuilt the TODO list view.")).toBeNull();
  });

  test("flags a body that exceeds the per-store limit", () => {
    const tooLong = "x".repeat(LIMITS.play + 1);
    const v = checkSlice("play", tooLong);
    expect(v?.reason).toContain(`exceeds limit of ${LIMITS.play}`);
  });

  test("accepts a body exactly at the limit", () => {
    expect(checkSlice("play", "x".repeat(LIMITS.play))).toBeNull();
  });

  test("passes a well-formed body", () => {
    expect(
      checkSlice("testflight", "Create a goal, verify the hint."),
    ).toBeNull();
  });
});

describe("resolveVersion", () => {
  // appRoot is only read for the no-arg fallback; the arg path never touches fs.
  const NO_FS = "/this/path/does/not/exist";

  test("returns a valid semver arg without reading the filesystem", () => {
    expect(resolveVersion("0.1.4", NO_FS)).toBe("0.1.4");
  });

  test("accepts a prerelease version", () => {
    expect(resolveVersion("0.1.4-rc.1", NO_FS)).toBe("0.1.4-rc.1");
  });

  test("accepts build metadata", () => {
    expect(resolveVersion("1.2.3+build.5", NO_FS)).toBe("1.2.3+build.5");
  });

  test.each([
    "1.2",
    "v1.2.3",
    "1.2.3.4",
    "latest",
    "../../etc/passwd",
    "1.2.x",
  ])("rejects non-semver arg %p", (bad) => {
    expect(() => resolveVersion(bad, NO_FS)).toThrow(/Invalid version/);
  });

  test("falls back to package.json version when no arg is given", () => {
    const appRoot = join(__dirname, "..", "..");
    const pkgVersion = (
      JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8")) as {
        version: string;
      }
    ).version;
    expect(resolveVersion(undefined, appRoot)).toBe(pkgVersion);
  });

  test("throws a clear error when the fallback package.json is unreadable", () => {
    expect(() => resolveVersion(undefined, NO_FS)).toThrow();
  });
});
