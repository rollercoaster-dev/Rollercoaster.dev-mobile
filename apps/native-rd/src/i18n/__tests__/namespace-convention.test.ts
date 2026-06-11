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

// Matches t("…") / t('…'). The `\s*` between `t(` and the opening quote
// tolerates whitespace including newlines, so a literal on the line after `t(`
// is caught:
//
//   t(
//     "common:foo",
//     { label },
//   )
//
// Strings can't contain raw newlines in JS, so the body class `[^"'\n]+` stays.
const T_CALL_STRING = /\bt\(\s*["']([^"'\n]+)["']/g;

// Matches t(`…`) template literals. Same whitespace tolerance as the string
// form. The literal segment before the first ${…} interpolation must contain
// the `ns:` prefix — that portion is statically verifiable even when the
// suffix is dynamic. Backticks delimit template bodies that don't contain
// nested backticks (rare in t() calls), so [^`\n]* on the body is safe.
const T_CALL_TEMPLATE = /\bt\(\s*`([^`\n]*)`/g;

// Out of scope for this regex pass:
//   - Fully computed keys: `t(buildKey(x))`, `t(KEYS.foo)`
//   - Literals nested inside expressions: `t(cond ? "a" : "b")` — the call
//     site is `t(<ternary>)`, not `t("a")`. Refactor to two `t()` calls so
//     each site is verifiable.

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

// Convert a character offset in `source` to a 1-indexed line number using
// the prefix-sum of newline positions. Linear scan is fine — sources are <10k
// lines and we run this a handful of times per file.
function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
}

type Violation = { file: string; line: number; key: string };

export function scanFile(
  file: string,
  source: string,
  repoRoot: string,
): Violation[] {
  const cleaned = stripComments(source);
  const violations: Violation[] = [];

  const stringRegex = new RegExp(T_CALL_STRING.source, "g");
  let match: RegExpExecArray | null;
  while ((match = stringRegex.exec(cleaned)) !== null) {
    const key = match[1];
    if (key.includes(":")) continue;
    violations.push({
      file: path.relative(repoRoot, file),
      line: lineOf(cleaned, match.index),
      key,
    });
  }

  const templateRegex = new RegExp(T_CALL_TEMPLATE.source, "g");
  while ((match = templateRegex.exec(cleaned)) !== null) {
    const raw = match[1];
    const interpIdx = raw.indexOf("${");
    const prefix = interpIdx === -1 ? raw : raw.slice(0, interpIdx);
    if (prefix.includes(":")) continue;
    violations.push({
      file: path.relative(repoRoot, file),
      line: lineOf(cleaned, match.index),
      key: `\`${raw}\``,
    });
  }

  return violations;
}

describe("i18n namespace convention", () => {
  test("every t() call uses an explicit ns:key prefix", async () => {
    const repoRoot = path.resolve(__dirname, "../../..");
    const files = (await Promise.all(SCAN_ROOTS.map(walk))).flat();

    // Floor against a silent walk-returns-nothing regression (renamed SCAN_ROOTS,
    // broken recursion, etc). Tree had ~150 files at the time of writing; 50
    // is comfortably below that and well above zero.
    expect(files.length).toBeGreaterThan(50);

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

    // Template-literal violations arrive backtick-wrapped (e.g. `` `foo.${id}` ``)
    // so the report stays copy-pasteable back into code: t(`foo.${id}`) for
    // templates, t("foo.bar") for plain strings.
    const report = violations.map((v) => {
      const formatted = v.key.startsWith("`") ? v.key : `"${v.key}"`;
      return `${v.file}:${v.line} → t(${formatted})`;
    });
    expect(report).toEqual([]);
  });

  // Unit tests pin scanner behavior so a regex tweak can't silently widen or
  // narrow the rule. Each case is a small synthetic source — the integration
  // test above is the load-bearing assertion against the real tree.
  describe("scanFile", () => {
    const repoRoot = "/repo";
    const fake = "/repo/src/components/X.tsx";

    const scan = (src: string) =>
      scanFile(fake, src, repoRoot).map((v) => v.key);

    test("flags bare double-quoted t() calls", () => {
      expect(scan(`t("foo.bar")`)).toEqual(["foo.bar"]);
    });

    test("flags bare single-quoted t() calls", () => {
      expect(scan(`t('foo.bar')`)).toEqual(["foo.bar"]);
    });

    test("flags bare template-literal t() calls", () => {
      expect(scan("t(`foo.bar`)")).toEqual(["`foo.bar`"]);
    });

    test("flags template-literal prefix before ${} interpolation", () => {
      expect(scan("t(`foo.${id}`)")).toEqual(["`foo.${id}`"]);
    });

    test("accepts prefixed string keys", () => {
      expect(scan(`t("common:foo.bar")`)).toEqual([]);
    });

    test("accepts prefixed template-literal keys", () => {
      expect(scan("t(`common:foo.${id}`)")).toEqual([]);
    });

    test("catches multi-line t() calls", () => {
      expect(
        scan(`t(
  "foo.bar",
  { count: 1 },
)`),
      ).toEqual(["foo.bar"]);
    });

    test("ignores t() calls inside pure-line // comments", () => {
      expect(scan(`// t("foo.bar")`)).toEqual([]);
    });

    test("ignores t() calls inside /* */ block comments", () => {
      expect(scan(`/* example: t("foo.bar") */`)).toEqual([]);
    });

    test("does not falsely match i18n.t() with prefixed key", () => {
      expect(scan(`i18n.t("common:foo")`)).toEqual([]);
    });

    test("flags i18n.t() with bare key (matches word boundary)", () => {
      // Word boundary between `.` and `t(` means this DOES match. Acceptable —
      // bare i18n.t() outside helpers violates the same convention.
      expect(scan(`i18n.t("foo")`)).toEqual(["foo"]);
    });

    test("reports correct line number for multi-line call", () => {
      const src = `import x from "y";\nimport z from "w";\nt(\n  "foo.bar",\n)`;
      const v = scanFile(fake, src, repoRoot);
      // `t(` lives on line 3; the regex anchors there.
      expect(v).toEqual([
        { file: "src/components/X.tsx", line: 3, key: "foo.bar" },
      ]);
    });
  });
});
