# Development Plan: Issue #63

## Issue Summary

**Title**: i18n: ESLint rule flagging raw JSX strings in screens/ and components/
**Type**: enhancement / code-quality
**Complexity**: SMALL
**Estimated Lines**: ~235 LOC (rule ~80, config delta ~3, tests ~100, disable comments ~52)

## Intent Verification

Observable criteria derived from the issue:

- [x] Adding `<Text>Hello world</Text>` to any file under `src/screens/` or `src/components/` causes `bun run lint` to exit non-zero with a `local/no-raw-jsx-strings` error on that line
- [x] `<Text>{t("key")}</Text>`, `<Text>{count}</Text>`, `<Text>.</Text>`, `<Text> </Text>`, and pure numeric text like `<Text>42</Text>` do NOT trigger the rule
- [x] `.stories.tsx` and `.test.tsx` files in `src/components/` do NOT trigger the rule (13 Storybook offenders currently exist; none require disable comments)
- [x] All 50 existing offenders in non-story, non-test files (49 in `TestScreen`, 1 in `CapturePlaceholder`) are silenced with `// eslint-disable-next-line local/no-raw-jsx-strings` comments and `bun run lint` exits clean
- [x] `bun run test --testPathPatterns eslint-rules` passes with the new test file covering valid and invalid cases in JSX
- [x] The rule file follows the established CommonJS `module.exports` pattern matching all other files in `src/eslint-rules/`

## Dependencies

| Issue           | Title                                         | Status          | Type          |
| --------------- | --------------------------------------------- | --------------- | ------------- |
| #988 (monorepo) | i18n foundation (expo-localization + i18next) | ✅ Met (closed) | Blocker (was) |

**Status**: ✅ All dependencies met. The issue body says "Blocked by foundation issue" — that is monorepo#988, which is confirmed closed. The i18n setup (`src/i18n/`) is fully in place.

## Objective

Add a custom ESLint rule `local/no-raw-jsx-strings` that flags JSXText nodes containing user-visible strings in `src/screens/` and `src/components/`. Wire it into `eslint.config.js` as `"error"`. Silence all 50 pre-existing offenders with `eslint-disable-next-line` comments so the rule lands without breaking CI. Add a test file following the `RuleTester` pattern used by all other rules in the repo.

## Decisions

| ID  | Decision                                                                                                                                         | Alternatives Considered                                                         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| D1  | Scope guard lives inside `create()` via filename check (not via `files[]` in eslint.config.js)                                                   | Flat-config `files: ["**/src/screens/**", "**/src/components/**"]` scoped block | All other rules (`no-raw-colors`, `no-component-imports-screens`, etc.) use internal filename guards. Consistent with the established pattern; avoids splitting plugin declaration from rule activation across two config blocks.                                                                                                                                                                                                           |
| D2  | Exclude `.stories.` and `.test.` files inside the rule                                                                                           | Require disable comments on all 13 Storybook hits                               | Stories are fixture data, not production UI. `file-size-limit` already skips `.stories.tsx`. Skipping them avoids noise on data that will never ship to a real user.                                                                                                                                                                                                                                                                        |
| D3  | Allowlist: whitespace-only, single non-alpha characters (punctuation/symbols), numeric-only, and strings that are all non-ASCII (icon ligatures) | Only allow whitespace and numbers                                               | Icon font characters (e.g. MaterialCommunityIcons rendered as `<Text>`character`</Text>`) are typically single non-ASCII codepoints or single-char Unicode. Single-ASCII punctuation covers separators like `·`, `/`, `                                                                                                                                                                                                                     | `. These are explicitly called out in the issue as allowed. |
| D4  | Rule type is `"problem"` (same as `no-raw-colors`, `no-component-imports-screens`)                                                               | `"suggestion"`                                                                  | A raw string in a shipped screen is a migration regression, not style advice. Severity in config is `"error"` for the same reason.                                                                                                                                                                                                                                                                                                          |
| D5  | Add disable comments to TestScreen even though it is a dev-only showcase screen                                                                  | Exclude TestScreen from the rule scope                                          | TestScreen lives under `src/screens/` and ships in the same bundle. An explicit path exclusion for TestScreen would add ongoing maintenance burden. Disable comments are self-documenting and trivially removable when TestScreen is migrated or deleted.                                                                                                                                                                                   |
| D6  | Do NOT wire a scoped `files[]` override for stories in eslint.config.js                                                                          | Add a files-scoped `off` override for stories                                   | The rule handles story exclusion internally (same pattern as `file-size-limit`). A config-level override would be redundant.                                                                                                                                                                                                                                                                                                                |
| D7  | TestScreen silenced with ONE file-level `/* eslint-disable */` instead of 60+ per-line comments (supersedes D5)                                  | Per-line disable on each of the 62 offenders                                    | TestScreen is a dev-only design-token showcase; all offenders are token labels/demo copy that will be migrated or deleted as a unit. 60+ per-line JSX comments roughly double the file's noise and are error-prone to insert across single-line and multi-line `<Text>` forms. File-level disable removes as one unit when the showcase is migrated. Per-line disables retained for real shipping surfaces (CapturePlaceholder, BadgeCard). |

## Affected Areas

- `apps/native-rd/src/eslint-rules/no-raw-jsx-strings.js`: new rule file (~80 lines)
- `apps/native-rd/eslint.config.js`: add `require` entry in plugin map and `"error"` activation (~3 lines changed)
- `apps/native-rd/src/__tests__/eslint-rules/no-raw-jsx-strings.test.ts`: new RuleTester test file (~100 lines)
- `apps/native-rd/src/screens/TestScreen/TestScreen.tsx`: add ~49 `eslint-disable-next-line` comments
- `apps/native-rd/src/screens/CapturePlaceholder/CapturePlaceholder.tsx`: add 1 `eslint-disable-next-line` comment

## Implementation Plan

### Step 1: Add the rule file

**Files**: `apps/native-rd/src/eslint-rules/no-raw-jsx-strings.js`

**Commit**: `feat(native-rd/lint): add no-raw-jsx-strings ESLint rule`

**Changes**:

- [x] Create `src/eslint-rules/no-raw-jsx-strings.js` as CommonJS `module.exports = { meta, create }` (matching all peers)
- [x] Set `meta.type = "problem"`, `meta.docs.description`, one message key `noRawJsxString`
- [x] `meta.schema = []` (no configuration options)
- [x] In `create(context)`: extract and normalize filename using `context.filename || context.getFilename()`, replace backslashes
- [x] Return `{}` early if file does not include `/screens/` or `/components/` in the path
- [x] Return `{}` early if filename ends with `.stories.tsx`, `.stories.ts`, `.test.tsx`, `.test.ts`
- [x] Visitor: `JSXText(node)` — the AST node type for direct text children of JSX elements (e.g. `<Text>hello</Text>`)
- [x] In the visitor: extract `node.value` (the raw string content of the JSXText node)
- [x] Apply allowlist checks in order:
  1. Trim the value; if empty or whitespace-only → allowed
  2. If the trimmed string is a single character → allowed (covers punctuation, separators, icon ligatures)
  3. If the trimmed string matches `/^\d[\d\s.,]*$/` (numeric, possibly with separators) → allowed
  4. If every character in the trimmed string is non-ASCII (`codePointAt > 127`) → allowed (icon font ranges)
  5. Otherwise → `context.report({ node, messageId: "noRawJsxString" })`
- [x] Message text: explain the rule, point to `docs/i18n.md`, give the escape hatch

**Allowlist precision notes (D3 elaborated):**

- Single character check covers: `.`, `,`, `!`, `?`, `:`, `;`, `-`, `|`, `/`, `·`, and icon font single-codepoint characters
- Numeric check uses a regex, not `isNaN`, to avoid accepting strings like `"  "` (which `isNaN` treats as 0)
- Non-ASCII check handles multi-codepoint icon strings — iterate with `[...str]` to handle surrogate pairs

---

### Step 2: Wire rule into ESLint config

**Files**: `apps/native-rd/eslint.config.js`

**Commit**: `feat(native-rd/lint): wire no-raw-jsx-strings into eslint config`

**Changes**:

- [x] In the `localRules.plugins.local.rules` object, add: `"no-raw-jsx-strings": require("./src/eslint-rules/no-raw-jsx-strings")`
- [x] In `localRules.rules`, add: `"local/no-raw-jsx-strings": "error"`
- [x] Run `bun run lint` locally to confirm it fires (it will produce errors before Step 3)

---

### Step 3: Add disable comments on existing offenders

**Files**:

- `apps/native-rd/src/screens/TestScreen/TestScreen.tsx`
- `apps/native-rd/src/screens/CapturePlaceholder/CapturePlaceholder.tsx`

**Commit**: `chore(native-rd/lint): silence pre-existing no-raw-jsx-strings offenders`

**Changes**:

- [x] Add `// eslint-disable-next-line local/no-raw-jsx-strings -- pre-existing; remove when migrated to t()` on the line before each of the ~49 JSXText offenders in `TestScreen.tsx`

  The 49 offenders are located on these lines (confirmed by grep):
  L53, L70, L88, L122, L141, L157, L183, L185, L197, L200, L213, L223, L232, L250, L260, L269, L316, L326, L610, L612, L627, L629, L631, L633, L651, L653, L655, L675, L677, L679, L699, L701, L703, L724, L726, L728, L738, L740, L756, L759, L770, L773, L780, L782, L784, L787, L793, L795, L818, L820 (line numbers as of 2026-05-27; reconfirm during implementation as other PRs may shift lines)

- [x] Add `// eslint-disable-next-line local/no-raw-jsx-strings -- pre-existing; remove when migrated to t()` before line 31 in `CapturePlaceholder.tsx` (`This feature is coming soon.`)
- [x] Run `bun run lint` to confirm zero errors from this rule

**Note on line numbers**: The `TestScreen.tsx` lines above were verified on the `main` branch as of 2026-05-27. If concurrent PRs land before this one, re-run the grep to get updated line numbers before adding comments:

```
grep -n "" src/screens/TestScreen/TestScreen.tsx | grep -v '{t(' | grep -P '>\s*[A-Za-z][A-Za-z0-9 ,!?.]{2,}\s*<'
```

---

### Step 4: Add RuleTester tests

**Files**: `apps/native-rd/src/__tests__/eslint-rules/no-raw-jsx-strings.test.ts`

**Commit**: `test(native-rd/lint): RuleTester cases for no-raw-jsx-strings`

**Changes**:

- [x] Create `src/__tests__/eslint-rules/no-raw-jsx-strings.test.ts`
- [x] Use the exact pattern from `no-validate-at-boundaries.test.ts` and `no-shared-component-reimplementation.test.ts`:
  ```ts
  const { RuleTester } = require("eslint");
  const rule = require("../../eslint-rules/no-raw-jsx-strings");
  const ruleTester = new RuleTester({
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });
  ```
- [x] **Valid cases** (no error expected):
  - `<Text>{t("key")}</Text>` in a screen file — expression child, not JSXText
  - `<Text> </Text>` — whitespace-only JSXText
  - `<Text>.</Text>` — single character (punctuation)
  - `<Text>42</Text>` — numeric-only
  - `<Text>100%</Text>` — numeric with symbol (single non-alpha)... actually needs thought: this may be flagged. Add as invalid unless we refine the allowlist.
  - `<View><Text>{label}</Text></View>` — expression, not raw
  - `<Text>Hello World</Text>` in a file outside `/screens/` or `/components/` — rule does not apply
  - `<Text>Hello World</Text>` in a `.stories.tsx` file — excluded
  - `<Text>Hello World</Text>` in a `.test.tsx` file — excluded
  - Single non-ASCII character (icon glyph scenario): `<Text>\u{F0000}</Text>` if supported
- [x] **Invalid cases** (error expected):
  - `<Text>Hello World</Text>` in a screen file — flags with `noRawJsxString`
  - `<Text>This feature is coming soon.</Text>` in a screen file
  - Multi-word mixed case string in a component file
  - Multi-line JSXText: a `<Text>` with a newline + text + newline content
- [x] Use `test.each` if there are 3+ valid or invalid cases that share the same fixture structure
- [x] End with the sentinel `test("no-raw-jsx-strings rule passes all RuleTester cases", () => { expect(true).toBe(true); })` as per established pattern

---

## Testing Strategy

- [x] Unit tests via `RuleTester` in `src/__tests__/eslint-rules/no-raw-jsx-strings.test.ts` (Jest 30, CommonJS require pattern)
- [x] Test file mirrors `src/` under `src/__tests__/`
- [x] Use `test.each` for the valid-case matrix if there are 4+ structurally identical cases
- [x] Manual: after Step 3, run `bun run lint` — zero lint errors
- [x] Manual: add a raw string to any screen file and confirm lint fails with a helpful message pointing to `docs/i18n.md`

## Not in Scope

| Item                                                                                    | Reason                                                                                                                          | Follow-up                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Migrating TestScreen strings to `t()`                                                   | TestScreen is a dev showcase screen with ~49 hardcoded design-token labels; migrating it now would mix two concerns into one PR | None — TestScreen is internal tooling, not production UI |
| Migrating `CapturePlaceholder`'s "This feature is coming soon." to `t()`                | That's the scope of the ongoing i18n migration PRs (#144 or a follow-on)                                                        | #144                                                     |
| Covering JSX prop string values (e.g. `label="Go Back"`, `accessibilityLabel="Submit"`) | The issue scope is JSXText children only. Prop string auditing is a separate concern                                            | None filed                                               |
| Covering Storybook stories files                                                        | Stories are fixture data; the 13 current Storybook hits are intentional placeholder text                                        | None                                                     |
| Auto-fix (`meta.fixable`)                                                               | The correct fix is always `t("key")`, which requires a namespace decision — automated fixers can't make that call               | None                                                     |

_Nothing else is deferred._

## Discovery Log

- [2026-05-27] Offender count drifted from plan's 50 to 63 as i18n PRs landed: TestScreen 62 (was 49), CapturePlaceholder 1, plus one NEW component offender the plan missed — `BadgeCard.tsx:101` (`{count} {plural} of evidence`). The plan's grep missed it because the raw text "of\nevidence" spans lines. Silenced per-line referencing #62 (formatEvidenceLabel owns that string).
- [2026-05-27] Steps 2 and 3 combined into one commit (wire + silence) so HEAD stays lint-green; a commit that only wires the rule leaves `bun run lint` red (not buildable). See D7 for the TestScreen silencing approach change.
- [2026-05-27] `100%`-style strings (open question 2 in research): rule flags them (the `%` breaks the numeric allowlist `/^\d[\d\s.,]*$/`). Encoded as an explicit invalid test case rather than refining the allowlist — conservative default forces a human t() decision; zero such offenders currently exist in scope.
