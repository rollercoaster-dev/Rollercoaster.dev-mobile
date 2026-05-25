import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadGlossary } from "../glossaryLoader";

function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "glossary-loader-test-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("loadGlossary", () => {
  test.each([
    ["missing file", undefined],
    ["empty file", ""],
    ["only blank lines", "\n  \n\t\n"],
    ["only comment lines", "# comment one\n# comment two\n"],
    ["mixed blanks and comments", "\n# header\n  \n#trailing\n"],
  ])("returns [] for %s", (_label, content) => {
    const { dir, cleanup } = makeTmpDir();
    try {
      if (content !== undefined) {
        writeFileSync(join(dir, "glossary.txt"), content, "utf8");
      }
      expect(loadGlossary(dir)).toEqual([]);
    } finally {
      cleanup();
    }
  });

  test("returns only the non-comment, non-blank lines, trimmed", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "glossary.txt"),
        [
          "# Brand name",
          "Rollercoaster.dev",
          "  native-rd  ",
          "",
          "# Persona names",
          "Sam",
          "Cal",
          "",
        ].join("\n"),
        "utf8",
      );
      expect(loadGlossary(dir)).toEqual([
        "Rollercoaster.dev",
        "native-rd",
        "Sam",
        "Cal",
      ]);
    } finally {
      cleanup();
    }
  });

  test("handles CRLF line endings", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      writeFileSync(
        join(dir, "glossary.txt"),
        "Rollercoaster.dev\r\n# comment\r\nSam\r\n",
        "utf8",
      );
      expect(loadGlossary(dir)).toEqual(["Rollercoaster.dev", "Sam"]);
    } finally {
      cleanup();
    }
  });

  test("wraps non-ENOENT read errors with the file path", () => {
    const { dir, cleanup } = makeTmpDir();
    try {
      // A directory at the glossary path triggers EISDIR on readFileSync —
      // anything other than ENOENT must surface, not silently return [].
      mkdirSync(join(dir, "glossary.txt"));
      expect(() => loadGlossary(dir)).toThrow(/glossary read failed/);
    } finally {
      cleanup();
    }
  });
});
