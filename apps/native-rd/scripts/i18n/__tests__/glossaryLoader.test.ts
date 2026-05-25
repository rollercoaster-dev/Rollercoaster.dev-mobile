import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadGlossary } from "../glossaryLoader";

describe("loadGlossary", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "glossary-loader-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test.each([
    ["missing file", undefined],
    ["empty file", ""],
    ["only blank lines", "\n  \n\t\n"],
    ["only comment lines", "# comment one\n# comment two\n"],
    ["mixed blanks and comments", "\n# header\n  \n#trailing\n"],
  ])("returns [] for %s", (_label, content) => {
    if (content !== undefined) {
      writeFileSync(join(dir, "glossary.txt"), content, "utf8");
    }
    expect(loadGlossary(dir)).toEqual([]);
  });

  test("returns only the non-comment, non-blank lines, trimmed", () => {
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
  });

  test("handles CRLF line endings", () => {
    writeFileSync(
      join(dir, "glossary.txt"),
      "Rollercoaster.dev\r\n# comment\r\nSam\r\n",
      "utf8",
    );
    expect(loadGlossary(dir)).toEqual(["Rollercoaster.dev", "Sam"]);
  });

  test("wraps non-ENOENT read errors with the file path", () => {
    // A directory at the glossary path triggers EISDIR on readFileSync —
    // anything other than ENOENT must surface, not silently return [].
    mkdirSync(join(dir, "glossary.txt"));
    expect(() => loadGlossary(dir)).toThrow(/glossary read failed/);
  });
});
