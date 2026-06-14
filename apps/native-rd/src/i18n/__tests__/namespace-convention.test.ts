import { promises as fs } from "node:fs";
import path from "node:path";

import { NAMESPACES, type Namespace } from "../index";

// Direct JSON imports — keyed off the literal en/<ns>.json bundle so the
// assertion stays independent of i18next's runtime keySeparator / nsSeparator /
// pluralization handling. `getResourceBundle("en", ns)` would couple us to
// exactly the silent-fallback behavior #284 is meant to fence against.
import enCommon from "../resources/en/common.json";
import enWelcome from "../resources/en/welcome.json";
import enNewGoal from "../resources/en/newGoal.json";
import enSettings from "../resources/en/settings.json";
import enGoals from "../resources/en/goals.json";
import enFocusMode from "../resources/en/focusMode.json";
import enCapturePhoto from "../resources/en/capturePhoto.json";
import enCaptureVideo from "../resources/en/captureVideo.json";
import enCaptureVoice from "../resources/en/captureVoice.json";
import enCaptureText from "../resources/en/captureText.json";
import enCaptureFile from "../resources/en/captureFile.json";
import enCaptureLink from "../resources/en/captureLink.json";
import enPermissions from "../resources/en/permissions.json";
import enBadges from "../resources/en/badges.json";
import enBadgeDesigner from "../resources/en/badgeDesigner.json";
import enEditGoal from "../resources/en/editGoal.json";
import enTimelineJourney from "../resources/en/timelineJourney.json";
import enCompletion from "../resources/en/completion.json";
import enBadgeDetail from "../resources/en/badgeDetail.json";
import enEvidenceViewer from "../resources/en/evidenceViewer.json";

const EN_BUNDLES: Record<Namespace, Record<string, unknown>> = {
  common: enCommon,
  welcome: enWelcome,
  newGoal: enNewGoal,
  settings: enSettings,
  goals: enGoals,
  focusMode: enFocusMode,
  capturePhoto: enCapturePhoto,
  captureVideo: enCaptureVideo,
  captureVoice: enCaptureVoice,
  captureText: enCaptureText,
  captureFile: enCaptureFile,
  captureLink: enCaptureLink,
  permissions: enPermissions,
  badges: enBadges,
  badgeDesigner: enBadgeDesigner,
  editGoal: enEditGoal,
  timelineJourney: enTimelineJourney,
  completion: enCompletion,
  badgeDetail: enBadgeDetail,
  evidenceViewer: enEvidenceViewer,
};

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

export type PrefixedMatch = {
  file: string;
  line: number;
  // Exact call body with delimiters, ready to echo: `"ns:foo.bar"` for plain
  // strings (re-quoted with double-quotes for consistency), `` `ns:foo.${id}` ``
  // for template literals (interpolation preserved verbatim).
  raw: string;
  ns: string;
  // Dotted path after `ns:`. For dynamic templates the trailing `.` before
  // `${…}` is stripped — `borderColor.options.` → `borderColor.options`.
  path: string;
  isDynamic: boolean;
};

// Inverse of `scanFile`: collects every t() call where the key carries an
// explicit `ns:` prefix. The integration test below feeds these matches into
// resolveJsonPath against the en/<ns>.json bundles to catch typos like
// `t("badgeDetial:foo")` that pass the prefix-presence check but resolve to
// nothing at runtime.
export function scanFilePrefixed(
  file: string,
  source: string,
  repoRoot: string,
): PrefixedMatch[] {
  const cleaned = stripComments(source);
  const rel = path.relative(repoRoot, file);
  const matches: PrefixedMatch[] = [];

  const stringRegex = new RegExp(T_CALL_STRING.source, "g");
  let m: RegExpExecArray | null;
  while ((m = stringRegex.exec(cleaned)) !== null) {
    const key = m[1];
    if (!key.includes(":")) continue;
    const colonIdx = key.indexOf(":");
    matches.push({
      file: rel,
      line: lineOf(cleaned, m.index),
      raw: `"${key}"`,
      ns: key.slice(0, colonIdx),
      path: key.slice(colonIdx + 1),
      isDynamic: false,
    });
  }

  const templateRegex = new RegExp(T_CALL_TEMPLATE.source, "g");
  while ((m = templateRegex.exec(cleaned)) !== null) {
    const body = m[1];
    const interpIdx = body.indexOf("${");
    const prefix = interpIdx === -1 ? body : body.slice(0, interpIdx);
    if (!prefix.includes(":")) continue;
    const colonIdx = prefix.indexOf(":");
    const isDynamic = interpIdx !== -1;
    const rawPath = prefix.slice(colonIdx + 1);
    matches.push({
      file: rel,
      line: lineOf(cleaned, m.index),
      raw: `\`${body}\``,
      ns: prefix.slice(0, colonIdx),
      // Trailing `.` before `${…}` is not a valid path segment — trim it so
      // `borderColor.options.${id}` resolves against `borderColor.options`.
      path: isDynamic ? rawPath.replace(/\.$/, "") : rawPath,
      isDynamic,
    });
  }

  return matches;
}

// Walks a JSON bundle one dotted segment at a time. Returns `undefined` if any
// segment is missing or an intermediate node is not an object. Empty path
// returns the bundle itself (useful as a base case in tests).
export function resolveJsonPath(
  bundle: Record<string, unknown>,
  dottedPath: string,
): unknown {
  if (dottedPath === "") return bundle;
  const segments = dottedPath.split(".");
  let node: unknown = bundle;
  for (const seg of segments) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[seg];
  }
  return node;
}

// CLDR plural categories. i18next resolves `t("foo.bar", { count })` against
// `foo.bar_<form>` where <form> depends on count + language. English uses only
// `_one` and `_other`, but other locales may add `_zero`/`_two`/`_few`/`_many`.
// We accept any sibling with a CLDR suffix as proof that the call is a
// plural-form usage, not a typo.
const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"] as const;

// True when `<dottedPath>_<suffix>` exists in the bundle for any CLDR plural
// suffix. Caller uses this as the second-chance check after a literal
// `resolveJsonPath` miss, so `t("ns:foo", { count })` passes even when the
// bundle has only `foo_one`/`foo_other`.
function hasPluralSibling(
  bundle: Record<string, unknown>,
  dottedPath: string,
): boolean {
  if (dottedPath === "") return false;
  const lastDot = dottedPath.lastIndexOf(".");
  const parentPath = lastDot === -1 ? "" : dottedPath.slice(0, lastDot);
  const leaf = lastDot === -1 ? dottedPath : dottedPath.slice(lastDot + 1);
  const parent = resolveJsonPath(bundle, parentPath);
  if (typeof parent !== "object" || parent === null) return false;
  const parentObj = parent as Record<string, unknown>;
  return PLURAL_SUFFIXES.some((s) => `${leaf}_${s}` in parentObj);
}

// Classifies a prefixed match against the namespace list and en bundles.
// Returns the reason string for `formatFailure`, or null if the match is fine.
// Shared between the integration test and the synthetic-violation test so
// both exercise the same logic.
export function classifyMatch(
  match: PrefixedMatch,
  namespaces: readonly string[],
  bundles: Record<string, Record<string, unknown>>,
): string | null {
  if (!namespaces.includes(match.ns)) {
    return `unknown namespace "${match.ns}"`;
  }
  const bundle = bundles[match.ns];
  const node = resolveJsonPath(bundle, match.path);
  if (node === undefined) {
    // `t("ns:foo", { count })` is valid when the bundle has `foo_one`/`foo_other`
    // even though literal `foo` is missing. Dynamic keys can't be plural-form
    // calls (the suffix would have to be the runtime variable, which CLDR
    // doesn't allow), so this fallback is static-only.
    if (!match.isDynamic && hasPluralSibling(bundle, match.path)) return null;
    return `path "${match.path}" not found in namespace "${match.ns}"`;
  }
  if (match.isDynamic && (typeof node !== "object" || node === null)) {
    return `path "${match.path}" resolves to a string leaf, not an object (dynamic suffix requires an object parent)`;
  }
  return null;
}

// Copy-pasteable single-line failure: `<file>:<line> → t(<exact call>) — <reason>`.
// The `t(...)` substring is literal source so `grep` finds it; the trailing
// reason stands alone in Slack/PR comments.
export function formatFailure(match: PrefixedMatch, reason: string): string {
  return `${match.file}:${match.line} → t(${match.raw}) — ${reason}`;
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

  // Catches typos like `t("badgeDetial:foo")` (real bug from #284's discovery)
  // that satisfy the prefix-presence check above but resolve to nothing at
  // runtime. Layered on top, not replacing, since the two failure modes
  // (no prefix vs broken prefix) want distinct error messages.
  test("every ns:key prefix maps to a real namespace and path", async () => {
    const repoRoot = path.resolve(__dirname, "../../..");
    const files = (await Promise.all(SCAN_ROOTS.map(walk))).flat();

    // Same floor as the sibling test — guards against a silent
    // walk-returns-nothing regression.
    expect(files.length).toBeGreaterThan(50);

    const failures: string[] = [];
    await Promise.all(
      files.map(async (file) => {
        const source = await fs.readFile(file, "utf8");
        const matches = scanFilePrefixed(file, source, repoRoot);
        for (const m of matches) {
          const reason = classifyMatch(m, NAMESPACES, EN_BUNDLES);
          if (reason !== null) failures.push(formatFailure(m, reason));
        }
      }),
    );

    failures.sort();
    expect(failures).toEqual([]);
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

  describe("scanFilePrefixed", () => {
    const repoRoot = "/repo";
    const fake = "/repo/src/components/X.tsx";

    test("captures static string prefix with ns + path", () => {
      const [match] = scanFilePrefixed(fake, `t("common:foo.bar")`, repoRoot);
      expect(match).toEqual({
        file: "src/components/X.tsx",
        line: 1,
        raw: `"common:foo.bar"`,
        ns: "common",
        path: "foo.bar",
        isDynamic: false,
      });
    });

    test("captures template-literal prefix with isDynamic=true and trims trailing dot", () => {
      const [match] = scanFilePrefixed(
        fake,
        "t(`badgeDesigner:borderColor.options.${id}`)",
        repoRoot,
      );
      expect(match).toEqual({
        file: "src/components/X.tsx",
        line: 1,
        raw: "`badgeDesigner:borderColor.options.${id}`",
        ns: "badgeDesigner",
        path: "borderColor.options",
        isDynamic: true,
      });
    });

    test("static template literal (no ${}) is captured with isDynamic=false", () => {
      const [match] = scanFilePrefixed(fake, "t(`common:foo.bar`)", repoRoot);
      expect(match).toMatchObject({
        ns: "common",
        path: "foo.bar",
        isDynamic: false,
      });
    });

    test("does not capture bare keys (no colon)", () => {
      expect(scanFilePrefixed(fake, `t("foo.bar")`, repoRoot)).toEqual([]);
      expect(scanFilePrefixed(fake, "t(`foo.${id}`)", repoRoot)).toEqual([]);
    });

    test("captures multi-line t() calls", () => {
      const src = `t(\n  "common:foo.bar",\n  { count: 1 },\n)`;
      const [match] = scanFilePrefixed(fake, src, repoRoot);
      // `t(` is on line 1 — the regex anchors there even though the literal
      // is on line 2. Matches the existing scanFile behavior.
      expect(match).toMatchObject({ line: 1, ns: "common", path: "foo.bar" });
    });

    test("captures i18n.t() with prefixed key (word boundary on .t)", () => {
      const [match] = scanFilePrefixed(
        fake,
        `i18n.t("common:foo.bar")`,
        repoRoot,
      );
      expect(match).toMatchObject({ ns: "common", path: "foo.bar" });
    });
  });

  describe("resolveJsonPath", () => {
    const bundle = {
      fallback: { goBack: "Go back", inner: { nested: "deep" } },
      earned: "Earned {{date}}",
    } as Record<string, unknown>;

    test("resolves a nested path to its leaf string", () => {
      expect(resolveJsonPath(bundle, "fallback.goBack")).toBe("Go back");
    });

    test("returns undefined when any segment is missing", () => {
      expect(resolveJsonPath(bundle, "fallback.doesNotExist")).toBeUndefined();
      expect(resolveJsonPath(bundle, "nope")).toBeUndefined();
    });

    test("returns undefined when an intermediate node is a string", () => {
      // `earned` is a string leaf; walking into `earned.foo` must not blow up
      // and must report undefined so the integration test can flag it.
      expect(resolveJsonPath(bundle, "earned.foo")).toBeUndefined();
    });

    test("resolves a top-level key", () => {
      expect(resolveJsonPath(bundle, "earned")).toBe("Earned {{date}}");
    });

    test("empty path returns the bundle itself", () => {
      expect(resolveJsonPath(bundle, "")).toBe(bundle);
    });
  });

  describe("classifyMatch plural-form fallback", () => {
    // Lock the second-chance behavior: a static `t("ns:foo", { count })` call
    // resolves against `foo_one`/`foo_other` even when literal `foo` is missing.
    // Without this, the integration test would flag every plural-key call site
    // in the real tree.
    const ns = "common";
    const namespaces = [ns];
    const bundles = {
      [ns]: {
        plural: { count_one: "{{count}} item", count_other: "{{count}} items" },
        items_one: "{{count}} item",
        items_other: "{{count}} items",
      } as Record<string, unknown>,
    };

    const baseMatch = {
      file: "src/X.tsx",
      line: 1,
      raw: "",
      ns,
      isDynamic: false,
    };

    test("accepts a static call whose path has only plural siblings", () => {
      expect(
        classifyMatch(
          { ...baseMatch, path: "plural.count", raw: `"common:plural.count"` },
          namespaces,
          bundles,
        ),
      ).toBeNull();
    });

    test("accepts a top-level plural key (no dot in path)", () => {
      expect(
        classifyMatch(
          {
            ...baseMatch,
            path: "items",
            raw: `"common:items"`,
          },
          namespaces,
          bundles,
        ),
      ).toBeNull();
    });

    test("rejects a path that has no literal and no plural siblings", () => {
      const reason = classifyMatch(
        {
          ...baseMatch,
          path: "plural.missing",
          raw: `"common:plural.missing"`,
        },
        namespaces,
        bundles,
      );
      expect(reason).toBe(
        `path "plural.missing" not found in namespace "common"`,
      );
    });

    test("does not apply plural fallback to dynamic keys", () => {
      // Dynamic suffix can't be a CLDR plural form — the suffix is the runtime
      // variable, not `_one`/`_other`. So a dynamic call against a path that
      // only has plural siblings should still fail.
      const reason = classifyMatch(
        {
          ...baseMatch,
          path: "plural.count",
          raw: "`common:plural.count.${x}`",
          isDynamic: true,
        },
        namespaces,
        bundles,
      );
      expect(reason).toBe(
        `path "plural.count" not found in namespace "common"`,
      );
    });
  });

  describe("formatFailure", () => {
    const baseMatch: PrefixedMatch = {
      file: "src/screens/X.tsx",
      line: 42,
      raw: `"badgeDetail:fallback.goBack"`,
      ns: "badgeDetail",
      path: "fallback.goBack",
      isDynamic: false,
    };

    test("formats unknown-namespace reason verbatim", () => {
      const reason = `unknown namespace "badgeDetial"`;
      expect(formatFailure(baseMatch, reason)).toBe(
        `src/screens/X.tsx:42 → t("badgeDetail:fallback.goBack") — unknown namespace "badgeDetial"`,
      );
    });

    test("formats path-not-found reason verbatim", () => {
      const reason = `path "fallback.doesNotExist" not found in namespace "badgeDetail"`;
      expect(formatFailure(baseMatch, reason)).toBe(
        `src/screens/X.tsx:42 → t("badgeDetail:fallback.goBack") — path "fallback.doesNotExist" not found in namespace "badgeDetail"`,
      );
    });

    test("formats leaf-not-object reason for a dynamic template", () => {
      const dynamic: PrefixedMatch = {
        ...baseMatch,
        raw: "`badgeDetail:earned.${x}`",
        path: "earned",
        isDynamic: true,
      };
      const reason = `path "earned" resolves to a string leaf, not an object (dynamic suffix requires an object parent)`;
      expect(formatFailure(dynamic, reason)).toBe(
        'src/screens/X.tsx:42 → t(`badgeDetail:earned.${x}`) — path "earned" resolves to a string leaf, not an object (dynamic suffix requires an object parent)',
      );
    });
  });

  // Drives the full pipeline (scanFilePrefixed → classifyMatch → formatFailure)
  // against synthetic sources designed to trip each of the three failure modes.
  // Pins the copy-pasteable error contract (D7) end-to-end without depending on
  // any real source file having the typo.
  test("rejects synthetic violations with copy-pasteable error", () => {
    const repoRoot = "/repo";
    const file = "/repo/src/screens/X.tsx";

    const cases: { src: string; expected: string }[] = [
      {
        src: `t("badgeDetial:fallback.goBack")`,
        expected: `src/screens/X.tsx:1 → t("badgeDetial:fallback.goBack") — unknown namespace "badgeDetial"`,
      },
      {
        src: `t("badgeDetail:fallback.doesNotExist")`,
        expected: `src/screens/X.tsx:1 → t("badgeDetail:fallback.doesNotExist") — path "fallback.doesNotExist" not found in namespace "badgeDetail"`,
      },
      {
        src: "t(`badgeDesigner:colour.options.${id}`)",
        expected:
          'src/screens/X.tsx:1 → t(`badgeDesigner:colour.options.${id}`) — path "colour.options" not found in namespace "badgeDesigner"',
      },
      {
        src: "t(`badgeDetail:earned.${x}`)",
        expected:
          'src/screens/X.tsx:1 → t(`badgeDetail:earned.${x}`) — path "earned" resolves to a string leaf, not an object (dynamic suffix requires an object parent)',
      },
    ];

    for (const { src, expected } of cases) {
      const [match] = scanFilePrefixed(file, src, repoRoot);
      expect(match).toBeDefined();
      const reason = classifyMatch(match, NAMESPACES, EN_BUNDLES);
      expect(reason).not.toBeNull();
      expect(formatFailure(match, reason as string)).toBe(expected);
    }
  });
});
