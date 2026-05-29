import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cross-file contract test for the chore-only-release path.
 *
 * release-please.yml runs release-notes-generate.ts when it opens a release PR.
 * For a chore-only release (no Features/Bug Fixes in CHANGELOG.md) the script
 * exits non-zero on purpose; the workflow distinguishes that *expected* failure
 * from a real one by grepping the script's stderr for a sentinel phrase:
 *
 *   if ! grep -q "no Features or Bug Fixes" "$GEN_STDERR"; then ... exit 1
 *
 * The two sides live in different files and languages (a `.ts` console.error and
 * a `.yml` grep), so nothing but this test stops them drifting. If the error
 * message is reworded, a chore-only release crashes the workflow; if the grep is
 * reworded, every chore-only release silently scaffolds nothing. Both are
 * invisible until a release actually happens. This test fails the moment either
 * side moves. release-notes-generate.ts is not imported directly — it uses
 * `import.meta`, which babel-preset-expo (Hermes target) can't parse — so we
 * read it as source instead.
 */
const SENTINEL = "no Features or Bug Fixes";

const SCRIPTS_DIR = join(__dirname, "..");
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

describe("chore-only release grep coupling", () => {
  test("release-notes-generate.ts emits the sentinel phrase", () => {
    const src = readFileSync(
      join(SCRIPTS_DIR, "release-notes-generate.ts"),
      "utf8",
    );
    expect(src).toContain(SENTINEL);
  });

  test("release-please.yml greps for the same sentinel phrase", () => {
    const workflow = readFileSync(
      join(REPO_ROOT, ".github", "workflows", "release-please.yml"),
      "utf8",
    );
    expect(workflow).toContain(`grep -q "${SENTINEL}"`);
  });
});
