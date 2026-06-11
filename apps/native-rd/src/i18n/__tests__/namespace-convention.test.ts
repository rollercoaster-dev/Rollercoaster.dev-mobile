import { promises as fs } from "node:fs";
import path from "node:path";

// Enforces the "always explicit" rule from docs/i18n.md: every t() call site
// must spell out its namespace as `ns:key`. Bare `t("key")` is forbidden even
// when useTranslation pulls only one namespace, because:
//
//   - useTranslation(["a", "b"]) silently routes bare keys to the first array
//     element. Reordering or pruning the array flips resolution invisibly.
//   - useTranslation("foo") and useTranslation() differ only in which namespace
//     bare keys fall back to. Refactors between these forms used to flip
//     resolution without changing any t() call site.
//   - Prefixed keys are self-describing in review: no scroll-up to learn what
//     namespace a key resolves against.
//
// Scope: .ts/.tsx files under src/screens and src/components. Storybook stories
// (src/stories) and i18n internals (src/i18n) are out of scope by design.

const SCAN_ROOTS = [
  path.resolve(__dirname, "../../screens"),
  path.resolve(__dirname, "../../components"),
];

// Matches t("…") and t('…') with optional whitespace before the literal.
// Template literals (`…`) and computed keys are excluded by design — they
// can't be statically verified.
const T_CALL = /\bt\(\s*["']([^"'\n]+)["']/g;

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Replace comments with whitespace so line numbers in violation reports
// still line up with the original source. Strips /* … */ block comments and
// pure-comment lines (^\s*//); leaves inline trailing comments alone since
// any t() call on such a line is real code, not commentary.
function stripComments(source: string): string {
  const noBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  return noBlocks
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? "" : line))
    .join("\n");
}

type Violation = { file: string; line: number; key: string };

function scanFile(file: string, source: string, repoRoot: string): Violation[] {
  const cleaned = stripComments(source);
  const lines = cleaned.split("\n");
  const violations: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("t(")) continue;
    const regex = new RegExp(T_CALL.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const key = match[1];
      if (key.includes(":")) continue;
      violations.push({
        file: path.relative(repoRoot, file),
        line: i + 1,
        key,
      });
    }
  }
  return violations;
}

describe("i18n namespace convention", () => {
  test("every t() call uses an explicit ns:key prefix", async () => {
    const repoRoot = path.resolve(__dirname, "../../..");
    const files = (await Promise.all(SCAN_ROOTS.map(walk))).flat();
    const violations: Violation[] = [];
    await Promise.all(
      files.map(async (file) => {
        const source = await fs.readFile(file, "utf8");
        violations.push(...scanFile(file, source, repoRoot));
      }),
    );

    violations.sort(
      (a, b) =>
        a.file.localeCompare(b.file) ||
        a.line - b.line ||
        a.key.localeCompare(b.key),
    );

    const report = violations.map((v) => `${v.file}:${v.line} → t("${v.key}")`);
    expect(report).toEqual([]);
  });
});
