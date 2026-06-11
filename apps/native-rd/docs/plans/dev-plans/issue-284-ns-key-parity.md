# Development Plan: Issue #284

> **Status:** ready to implement. All seven open questions surfaced in discussion (2026-06-11) are resolved in the Decisions table below (D1–D7). Implementer should follow the table as the authoritative spec.

## Issue Summary

**Title**: i18n: namespace-convention test should verify ns: prefix points at a real namespace + key
**Type**: enhancement (test quality)
**Complexity**: SMALL
**Estimated Lines**: ~120 lines

## Intent Verification

Observable criteria derived from the issue.

- [ ] Running `bun run test:ci` against a tree containing `t("badgeDetial:foo")` anywhere under `src/screens/` or `src/components/` fails with an error message that names the file, line, and bad namespace.
- [ ] Running `bun run test:ci` against the clean tree passes (no regressions on the existing codebase).
- [ ] A call site with a real namespace but a nonexistent static key — e.g. `t("badgeDetail:fallback.doesNotExist")` — fails with an error message that names the file, line, and the missing key path.
- [ ] A template-literal call with a typo in the static prefix path — e.g. `t(\`badgeDesigner:colour.options.${id}\`)`— fails because`colour`is not a key of the`badgeDesigner` bundle.
- [ ] A template-literal call whose static prefix path resolves to a leaf string (not an object) — e.g. `t(\`badgeDetail:earned.${x}\`)`where`earned` is a string — fails because a dynamic suffix on a leaf makes no sense.
- [ ] The error messages are copy-pasteable: they name the file (repo-relative path), line number, the namespace tried, and the dotted path that was missing or a leaf.

## Dependencies

| Issue | Title                                        | Status         | Type                                                       |
| ----- | -------------------------------------------- | -------------- | ---------------------------------------------------------- |
| #143  | i18n: prevent silent default-namespace flips | Open (PR #285) | Soft — this issue extends the test file introduced in #143 |

**Status**: Soft dependency. PR #285 introduces `namespace-convention.test.ts`. This plan extends that file. The implementation should be done on the same branch as #143 (or branched from it) rather than from `main`, since the file does not exist on `main` yet. Alternatively, wait until #285 merges.

## Objective

Add a second `test(...)` block inside the existing `describe("i18n namespace convention")` in `namespace-convention.test.ts` that:

1. Collects every prefixed `ns:key` found across `src/screens/` and `src/components/` (static strings and template-literal static prefixes).
2. Asserts each `ns` is a member of `NAMESPACES`.
3. For fully-static keys (no `${}`): asserts the dotted path resolves to a value (not undefined) in the `en/<ns>.json` bundle.
4. For template-literal keys (has `${}`): asserts the static path portion (everything before `${`, with trailing `.` stripped) resolves to an object (not a string leaf and not undefined) in the `en/<ns>.json` bundle.

The implementation also adds a small `resolveJsonPath` helper function (exported for unit-testability) inside `namespace-convention.test.ts`.

## Decisions

| ID  | Decision                                                                                                                                                                                               | Alternatives Considered                                                                                           | Rationale                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Export a new `scanFilePrefixed` function from `namespace-convention.test.ts` that collects all matched prefixed keys (mirroring `scanFile` but inverting the filter)                                   | (a) Modify `scanFile` to accept a mode flag; (b) inline a fresh regex loop in the second test                     | A separate named export is the smallest change, keeps the existing `scanFile` contract intact, and follows the test file's established pattern of exporting scanner helpers for unit tests.                                                                                                                                                                  |
| D2  | Load `en/<ns>.json` bundles via direct ES imports (mirroring the import pattern in `src/i18n/index.ts`), keyed by namespace name                                                                       | `i18n.getResourceBundle("en", ns)` (the pattern in `option-key-parity.test.ts`)                                   | The contract this test enforces is "the literal path exists in the literal JSON" — independent of i18next runtime config. `getResourceBundle` couples the assertion to i18next's `keySeparator`/`nsSeparator`/pluralization handling, which is exactly the silent-fallback behavior #284 is meant to fence against. Direct JSON imports break that coupling. |
| D3  | Keep `resolveJsonPath` in `namespace-convention.test.ts` (not a shared helper across test files)                                                                                                       | Extract to a `src/i18n/__tests__/testUtils.ts` shared file                                                        | Test isolation: the two test files (`namespace-convention` and `option-key-parity`) have different resolution semantics. Option-key-parity uses direct property access on typed bundles; a generic resolver would need `unknown` typing and would obscure intent. If a third test file needs it, extract then.                                               |
| D4  | For template-literal paths: trim trailing `.` before resolving, assert result is a non-null object                                                                                                     | Assert `typeof result === "object"` directly on the path including trailing `.` segment                           | A key path ending in `.` like `"borderColor.options."` is not a valid dotted-path segment — trimming is the correct normalization.                                                                                                                                                                                                                           |
| D5  | Demonstrate the synthetic-violation AC via a **real (non-skipped)** test that runs `scanFilePrefixed` against a synthetic source string and asserts on the exact `formatFailure(match, reason)` output | (a) `test.skip` with a comment; (b) a separate shell script                                                       | "Copy-pasteable error" is a format contract — format contracts deserve a test that runs in CI. The cost is one assert with a known string plus extracting the inline string-building into a named `formatFailure` helper that both the live test and the synthetic test call.                                                                                |
| D6  | Walk the file tree twice (re-declare the walk in the new test) rather than hoist files to a `beforeAll` shared across both tests                                                                       | `let files: string[]` + `beforeAll` hoist                                                                         | The walk is ~10–20ms over ~150 files. Each test stays self-contained; no shared mutable state. Reach for a hoist only if a third test arrives.                                                                                                                                                                                                               |
| D7  | Error message format: `<repo-relative path>:<line> → t(<exact call as written>) — <reason>`, free-text reasons                                                                                         | (a) JSON output, (b) structured CI prefix like `[i18n-ns-check]`, (c) fix-it hints (Levenshtein "did you mean…?") | `file:line` is editor-friendly; the `t(...)` substring is literal source for `grep`; one line stands alone in Slack/PR comments. Three reasons cover the failure modes ("unknown namespace", "path not found in namespace", "path resolves to a leaf, not an object"). Fix-it suggestions are a follow-up.                                                   |

## Affected Areas

- `apps/native-rd/src/i18n/__tests__/namespace-convention.test.ts`: add `scanFilePrefixed` export, `resolveJsonPath` helper, and second `test(...)` block inside the existing `describe`.

That is the only file that changes.

## Implementation Plan

### Step 1: Extend namespace-convention.test.ts

**Files**: `apps/native-rd/src/i18n/__tests__/namespace-convention.test.ts`

**Commit**: `test(native-rd/i18n): assert ns:key prefixes point at real namespace + path (#284)`

**Changes**:

- [ ] Add import of `{ NAMESPACES }` from `"../index"`, and direct ES imports of each `en/<ns>.json` bundle (mirror the import block at the top of `src/i18n/index.ts`). Keep them in an `EN_BUNDLES: Record<Namespace, Record<string, unknown>>` map for lookup by namespace name.
- [ ] Add `resolveJsonPath(bundle: Record<string, unknown>, dottedPath: string): unknown` helper function (exported). Splits on `.`, walks the tree one segment at a time, returns the node or `undefined` if any segment is missing or the parent is not an object/array.
- [ ] Add `scanFilePrefixed(file: string, source: string, repoRoot: string): PrefixedMatch[]` export, where `PrefixedMatch = { file: string; line: number; raw: string; ns: string; path: string; isDynamic: boolean }`. Mirrors `scanFile` but collects entries where `:` IS present. Stores `raw` = the exact call body text (with backticks for templates, quotes for strings) so `formatFailure` can echo the source verbatim. For static strings: `ns` = part before `:`, `path` = part after `:`, `isDynamic = false`. For template literals: `ns` = part before `:`, `path` = static part after `:` before `${` (trimmed of trailing `.`), `isDynamic = true`.
- [ ] Add `formatFailure(match: PrefixedMatch, reason: string): string` helper (exported). Returns `${match.file}:${match.line} → t(${formatCall(match.raw, match.isDynamic)}) — ${reason}` — exactly the format documented in D7.
- [ ] Add the second `test("every ns:key prefix maps to a real namespace and path", async () => { ... })` block inside the existing `describe("i18n namespace convention")`. The test:
  1. Walks the same `SCAN_ROOTS` (re-declared per D6).
  2. Calls `scanFilePrefixed` on each file.
  3. For each match: if `!NAMESPACES.includes(ns as Namespace)`, push `formatFailure(match, 'unknown namespace "${ns}"')`. Else look up `EN_BUNDLES[ns]` and call `resolveJsonPath(bundle, path)`. If `result === undefined`, push `formatFailure(match, 'path "${path}" not found in namespace "${ns}"')`. Else if `isDynamic && (typeof result !== "object" || result === null)`, push `formatFailure(match, 'path "${path}" resolves to a string leaf, not an object (dynamic suffix requires an object parent)')`.
  4. Sort failures by file then line then ns then path.
  5. `expect(failures).toEqual([])`.
- [ ] Add unit tests for `resolveJsonPath` in the existing `describe("scanFile")` block or a new parallel `describe("resolveJsonPath")`: resolves nested path, returns undefined for missing segment, returns undefined when intermediate node is a string, handles top-level key, handles empty path string returning the bundle itself.
- [ ] Add unit tests for `scanFilePrefixed`: static prefixed key captured with correct ns/path/isDynamic=false; template-literal prefix captured with isDynamic=true and trailing `.` trimmed; bare key NOT captured (inverse of `scanFile`); multi-line call captured; `i18n.t("ns:key")` form captured (the `\bt(` boundary already matches).
- [ ] Add unit test for `formatFailure`: assert exact string output for each of the three reasons against a known `PrefixedMatch`, locking the copy-pasteable contract from D7.
- [ ] Add a real `test("rejects synthetic violations with copy-pasteable error", () => { ... })` per D5. Constructs synthetic source strings (`t("badgeDetial:foo")`, `t("badgeDetail:fallback.doesNotExist")`, ``t(`badgeDesigner:colour.options.${id}`)``, ``t(`badgeDetail:earned.${x}`)``), runs them through `scanFilePrefixed` + the same validation pipeline as the integration test, and asserts the output of `formatFailure` matches the exact lines documented in D7's table. This both proves the synthetic AC and pins the error format.

## Testing Strategy

- [ ] Unit tests for `resolveJsonPath` (Jest 30, no RN deps needed — pure function).
- [ ] Unit tests for `scanFilePrefixed` (same pattern as existing `scanFile` unit tests in this file).
- [ ] Integration test via the new `test("every ns:key prefix maps to a real namespace and path")` block, which runs against the live tree.
- [ ] `bun run test:ci` green on a clean tree.
- [ ] Manual negative test: temporarily add `t("badgeDetial:foo")` to any screen, confirm test fails with expected copy-pasteable message, then revert.

## Not in Scope

| Item                                                                                                                                  | Reason                                                                                                       | Follow-up                                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Verifying every dynamic-suffix key per union member (e.g. every `BadgeShape` value resolves in `badgeDesigner:shape.options.<value>`) | That is `option-key-parity.test.ts`'s explicit job                                                           | Existing test already covers it              |
| Layer 3 ESLint rule                                                                                                                   | Still out of scope per #143's out-of-scope list                                                              | Revisit only if test suite becomes a blocker |
| Checking `de/` or `pseudo/` namespaces for the static path                                                                            | German bundles may be `{}` by design (sync-bot fills them); pseudo is generated; `en` is the source of truth | No follow-up needed                          |
| Expanding `SCAN_ROOTS` to cover `src/i18n/labels.ts` or other helpers                                                                 | Labels.ts is called out as a `useTranslation` helper-options-bag exception in #143's docs                    | No follow-up needed                          |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

---

## Implementation Notes for the Implementer

### `scanFilePrefixed` shape

The existing `scanFile` filter is `if (key.includes(":")) continue` (skips prefixed keys = those are valid). The new function inverts this: collect only where `:` IS present.

For static strings (`T_CALL_STRING` matches):

```
key = "badgeDetail:fallback.goBack"
→ ns = "badgeDetail", path = "fallback.goBack", isDynamic = false
```

For template literals (`T_CALL_TEMPLATE` matches):

```
raw = "badgeDesigner:borderColor.options.${id}"
interpIdx = raw.indexOf("${") = 34
prefix = raw.slice(0, 34) = "badgeDesigner:borderColor.options."
colonIdx = prefix.indexOf(":") = 13
ns = "badgeDesigner"
rawPath = "borderColor.options."
path = rawPath.replace(/\.$/, "") = "borderColor.options"
isDynamic = true
```

For a static template literal (no `${}`):

```
raw = "badgeDetail:fallback.goBack"
interpIdx = -1
prefix = raw (entire string)
ns = "badgeDetail", path = "fallback.goBack", isDynamic = false
```

### `resolveJsonPath` logic

```ts
function resolveJsonPath(
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
```

### Integration test failure-message format

```
src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx:166 → t("badgeDetial:fallback.goBack") — unknown namespace "badgeDetial"
src/screens/SomeScreen.tsx:42 → t("badgeDetail:fallback.doesNotExist") — path "fallback.doesNotExist" not found in namespace "badgeDetail"
src/screens/SomeScreen.tsx:55 → t(`badgeDesigner:colour.options.${…}`) — path "colour.options" not found in namespace "badgeDesigner"
src/screens/SomeScreen.tsx:60 → t(`badgeDetail:earned.${…}`) — path "earned" resolves to a string leaf, not an object (dynamic suffix requires an object parent)
```

### Walk deduplication (D6)

The integration test re-declares the walk inside the test body (the
`walk` helper is already exported at module scope). Walks the same ~150
files twice per `npx jest namespace-convention` run. ~10–20ms of
redundant `readdir` is acceptable; the per-file `readFile` dominates
anyway. Each test stays self-contained — no shared mutable state via
`beforeAll`/`let files`. Reach for a hoist only if a third test arrives.

### Real synthetic-violation test (D5)

```ts
test("rejects synthetic violations with copy-pasteable error", () => {
  const repoRoot = "/repo";
  const file = "/repo/src/screens/X.tsx";

  const cases: { src: string; reason: string; expected: string }[] = [
    {
      src: `t("badgeDetial:fallback.goBack")`,
      reason: `unknown namespace "badgeDetial"`,
      expected: `src/screens/X.tsx:1 → t("badgeDetial:fallback.goBack") — unknown namespace "badgeDetial"`,
    },
    {
      src: `t("badgeDetail:fallback.doesNotExist")`,
      reason: `path "fallback.doesNotExist" not found in namespace "badgeDetail"`,
      expected: `src/screens/X.tsx:1 → t("badgeDetail:fallback.doesNotExist") — path "fallback.doesNotExist" not found in namespace "badgeDetail"`,
    },
    {
      src: "t(`badgeDesigner:colour.options.${id}`)",
      reason: `path "colour.options" not found in namespace "badgeDesigner"`,
      expected:
        'src/screens/X.tsx:1 → t(`badgeDesigner:colour.options.${id}`) — path "colour.options" not found in namespace "badgeDesigner"',
    },
    // …leaf-not-object case omitted here; full case-set lives in the test
  ];

  for (const { src, reason, expected } of cases) {
    const [match] = scanFilePrefixed(file, src, repoRoot);
    expect(formatFailure(match, reason)).toBe(expected);
  }
});
```

Real test, runs in CI, pins both the scan-and-classify path and the format
contract in one assertion.

### `i18n.t(...)` is already covered

The `\bt(` word boundary matches `i18n.t(` too — `.` is non-word, `t` is
word, the transition between them satisfies `\b`. No regex change needed.
Examples in the tree today: `EvidenceViewerScreen.test.tsx`,
`BadgeDesignerScreen.test.tsx` both use `i18n.t("ns:key")` from inside
`__tests__/` dirs, which are scanned (no `__tests__` filter in `walk`).
Those already pass the existing `scanFile` (have `:`); they'll pass
`scanFilePrefixed`'s downstream validation too because every namespace
and path in them resolves.
