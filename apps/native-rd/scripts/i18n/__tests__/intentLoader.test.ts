import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadIntentSidecar } from "../intentLoader";

function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "intent-loader-test-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("loadIntentSidecar", () => {
  test.each([
    ["missing file", undefined],
    ["empty string content", ""],
    ["whitespace-only content", "   \n  "],
    ["empty JSON object", "{}"],
  ])("returns {} for %s", (_label, content) => {
    const { dir, cleanup } = makeTmpDir();
    try {
      if (content !== undefined) {
        writeFileSync(join(dir, "common.intents.json"), content, "utf8");
      }
      expect(loadIntentSidecar(dir, "common")).toEqual({});
    } finally {
      cleanup();
    }
  });

  test("returns partial record when only some keys have intent entries", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      const sidecar = {
        "save.confirm": { intent: "matter-of-fact acknowledgment" },
        "welcome.title": {
          intent: "named-maker warmth",
          audience: "first-run",
        },
        "permissions.mic.body": {
          intent: "plain need",
          register: "matter-of-fact",
        },
      };
      writeFileSync(
        join(dir, "common.intents.json"),
        JSON.stringify(sidecar),
        "utf8",
      );
      expect(loadIntentSidecar(dir, "common")).toEqual(sidecar);
    } finally {
      cleanup();
    }
  });

  test("throws with namespace and 'not valid JSON' on malformed JSON", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(join(dir, "welcome.intents.json"), "{not valid", "utf8");
      expect(() => loadIntentSidecar(dir, "welcome")).toThrow(
        /namespace welcome:.*not valid JSON/,
      );
    } finally {
      cleanup();
    }
  });

  test("throws with namespace and 'unexpected root type' when root is an array", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "goals.intents.json"),
        JSON.stringify(["a", "b"]),
        "utf8",
      );
      expect(() => loadIntentSidecar(dir, "goals")).toThrow(
        /namespace goals:.*unexpected root type.*array/,
      );
    } finally {
      cleanup();
    }
  });

  test("throws with namespace and 'unexpected root type' when root is a string", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "goals.intents.json"),
        JSON.stringify("hello"),
        "utf8",
      );
      expect(() => loadIntentSidecar(dir, "goals")).toThrow(
        /namespace goals:.*unexpected root type.*string/,
      );
    } finally {
      cleanup();
    }
  });

  test("throws when an entry is missing the required 'intent' field", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "permissions.intents.json"),
        JSON.stringify({
          "mic.body": { audience: "first-run" },
        }),
        "utf8",
      );
      expect(() => loadIntentSidecar(dir, "permissions")).toThrow(
        /namespace permissions:.*shape invalid.*intent/,
      );
    } finally {
      cleanup();
    }
  });

  test("wraps non-ENOENT read errors with the namespace name", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      // A directory at the sidecar path triggers EISDIR on readFileSync —
      // any non-ENOENT errno that surfaces must carry the namespace.
      mkdirSync(join(dir, "goals.intents.json"));
      expect(() => loadIntentSidecar(dir, "goals")).toThrow(
        /namespace goals:.*intent sidecar read failed/,
      );
    } finally {
      cleanup();
    }
  });

  test("throws on an unknown leaf key (e.g. an `audiance` typo)", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "welcome.intents.json"),
        JSON.stringify({
          "welcome.title": {
            intent: "named-maker warmth",
            audiance: "first-run",
          },
        }),
        "utf8",
      );
      expect(() => loadIntentSidecar(dir, "welcome")).toThrow(
        /namespace welcome:.*shape invalid.*audiance/,
      );
    } finally {
      cleanup();
    }
  });

  test.each([
    ["empty string", ""],
    ["whitespace only (spaces)", "   "],
    ["whitespace only (tab/newline)", "\t\n"],
  ])("throws when `intent` is %s", (_label, intent) => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "common.intents.json"),
        JSON.stringify({ "save.confirm": { intent } }),
        "utf8",
      );
      expect(() => loadIntentSidecar(dir, "common")).toThrow(
        /namespace common:.*shape invalid.*intent/,
      );
    } finally {
      cleanup();
    }
  });

  test.each([
    ["audience", "audience"],
    ["register", "register"],
  ])(
    "throws when optional `%s` is present but whitespace-only",
    (_label, field) => {
      const { dir, cleanup } = makeTmpDir();
      try {
        writeFileSync(
          join(dir, "common.intents.json"),
          JSON.stringify({
            "save.confirm": { intent: "matter-of-fact", [field]: "   " },
          }),
          "utf8",
        );
        expect(() => loadIntentSidecar(dir, "common")).toThrow(
          new RegExp(`namespace common:.*shape invalid.*${field}`),
        );
      } finally {
        cleanup();
      }
    },
  );

  test("throws when an entry value is a string instead of an object", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "common.intents.json"),
        JSON.stringify({ "save.confirm": "matter-of-fact" }),
        "utf8",
      );
      expect(() => loadIntentSidecar(dir, "common")).toThrow(
        /namespace common:.*shape invalid/,
      );
    } finally {
      cleanup();
    }
  });
});
