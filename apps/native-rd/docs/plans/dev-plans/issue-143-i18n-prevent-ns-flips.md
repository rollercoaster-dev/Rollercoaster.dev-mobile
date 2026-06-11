# Development Plan: Issue #143

## Issue Summary

**Title**: i18n: prevent silent default-namespace flips when migrating useTranslation() to array form
**Type**: testing / code-quality
**Complexity**: MEDIUM (pivoted from SMALL after retrofit-scope decision on 2026-06-11)
**Estimated Lines**: ~430 lines (test ~60, convention doc ~50, retrofit ~324 single-line edits across 46 files)

## Intent Verification

Observable criteria derived from the issue, broadened per the 2026-06-11 design decision to enforce explicit prefixes everywhere, not just for array-form files:

- [ ] `bun run test:ci` fails (with a clear violation report) when any `.tsx`/`.ts` file under `src/screens/` or `src/components/` contains a `t("key.without.colon")` call — regardless of `useTranslation` form.
- [ ] `bun run test:ci` passes clean on `main` after the retrofit lands; no allow-list required.
- [ ] `apps/native-rd/docs/i18n.md` contains a section documenting the "always explicit" convention: every `t()` call uses `ns:key` syntax.
- [ ] `useTranslation` is documented as a **loading concern** (which namespaces this file pulls from), not a default-namespace concern. The `defaultNS` config still exists but is no longer relied on at call sites.
- [ ] Existing canonical compliant files (`CaptureLinkScreen.tsx`, `VoiceMemoScreen.tsx`, `FocusModeScreen.FocusContent`) continue to pass without modification.

## Dependencies

| Issue | Title | Status |
| ----- | ----- | ------ |

No dependencies declared in the issue body.

**Status**: All dependencies met.

## Objective

1. Define and document an "always explicit" namespace convention: every `t()` call uses `ns:key`, no reliance on defaultNS or first-array-element resolution.
2. Add a scan-based test under `apps/native-rd/src/i18n/__tests__/` that enforces this convention with zero allow-list.
3. Retrofit all 46 files in `src/screens/` and `src/components/` to be compliant (324 bare `t()` calls across three useTranslation forms).
4. Update `docs/i18n.md` to reflect the new convention and deprecate guidance that implied unprefixed `t()` was idiomatic.

All three land in a single PR per design decision on 2026-06-11.

## Decisions

| ID  | Decision                                                                  | Alternatives Considered                                         | Rationale                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | "Always explicit" rule — every `t()` uses `ns:key`                        | Issue's original "array-form only" rule                         | One rule, not three. Kills the silent-flip bug class permanently. Makes `t()` calls self-describing in code review (no scroll-up to check `useTranslation` form). Cost is verbosity only; no functional change.                                                                                                             |
| D2  | Retrofit all 46 violators in this PR (no follow-up)                       | Allow-list + follow-up issue for retrofit                       | Joe's call on 2026-06-11: "just do it all in one pr". 324 line edits is within the ~500 LOC cap. Mechanical: most retrofits are no-op refactors.                                                                                                                                                                            |
| D3  | Regex-based scan, no AST parsing                                          | ts-morph / babel                                                | Issue accepts regex as first pass. Matches `locale-parity.test.ts` style. The rule is simple enough (every `t("…")` string literal contains a `:`) that AST adds no value.                                                                                                                                                  |
| D4  | Convention lives as a section in `docs/i18n.md` (not a separate file)     | New `docs/i18n/namespace-convention.md`                         | Single flat i18n doc already covers all rules. Adding a section keeps everything in one place.                                                                                                                                                                                                                              |
| D5  | Test file: `namespace-convention.test.ts`                                 | `useTranslation-array-form.test.ts`, `t-prefix.test.ts`         | Names the rule, not the mechanism. Matches noun-first style of `locale-parity`, `option-key-parity`, `pseudo-locale`.                                                                                                                                                                                                       |
| D6  | Bare-`t()` detection scope: string-literal `t("key")` and `t('key')` only | Also flag `t("key", { ... })` options-bag and template literals | Template literals are dynamic — can't statically verify. Options-bag `t("key", { ... })` is rare and would be caught by the same regex if the key is bare. Start narrow; widen if false negatives appear.                                                                                                                   |
| D7  | Array-form retrofit uses JSON inspection to preserve current behavior     | Default to `common:` for all bare calls in array-form files     | Each bare call's current resolution is determined by which namespace's JSON has the key first (array order). Preserving runtime behavior is safer than guessing. If a bare call relied on the array's _fallback_ element, the retrofit will surface this — call it out in the discovery log so a reviewer can sanity-check. |
| D8  | No allow-list in the new test                                             | Allow-list as migration tracker                                 | Joe's decision: retrofit everything in this PR, so the test ships clean from day one.                                                                                                                                                                                                                                       |
| D9  | Single-line `useTranslation([...])` matcher in the scan                   | Multi-line support                                              | All current array-form calls fit on one line. Test fires on bare `t()` calls regardless of `useTranslation` shape — array-form detection isn't actually needed under the "always explicit" rule. Scan is simpler: "every `t("…")` must contain `:`."                                                                        |

## Affected Areas

### New / modified for convention + test (~110 lines)

- `apps/native-rd/docs/i18n.md`: rewrite the "Cross-namespace lookups" guidance to make explicit-everywhere the default rule (~50 lines net change).
- `apps/native-rd/src/i18n/__tests__/namespace-convention.test.ts`: new scan test (~60 lines, new file).

### Retrofit (~324 edits across 46 files)

Breakdown by `useTranslation` form:

| Form                             | Files with bare calls | Bare `t()` calls | Retrofit strategy                                                                                                                                                           |
| -------------------------------- | --------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTranslation()` (no args)     | 15                    | 38               | Prefix all with `common:` (matches configured `defaultNS`)                                                                                                                  |
| `useTranslation("foo")` (string) | 23                    | 217              | Prefix all with the string arg                                                                                                                                              |
| `useTranslation([...])` (array)  | 8                     | 69               | Per-call: prefix with whichever array-element namespace has the key (preserves current resolution); flag any call where the only-matching namespace is the fallback element |

Files are listed in `Discovery Log` as the retrofit lands per-form.

## Violation audit (pre-existing state as of 2026-06-11)

Total in scope: `src/screens/` + `src/components/` = 351 files, 50 with `useTranslation`, 46 with at least one bare `t()` call.

**Form 1 — `useTranslation()` no-args (17 files, 15 with bare):**
All resolve against the configured `defaultNS = "common"`. Retrofit: prefix every bare `t("key")` → `t("common:key")`.

**Form 2 — `useTranslation("foo")` string (23 files, all with bare):**
All resolve against the string arg. Retrofit: prefix every bare `t("key")` → `t("foo:key")` per file's hook arg.

**Form 3 — `useTranslation([...])` array (10 files, 8 with bare):**
Compliant: `CaptureLinkScreen`, `VoiceMemoScreen`, `FocusModeScreen.FocusContent`.
Non-compliant (need retrofit):

| File                                   | Array arg                         | Bare count |
| -------------------------------------- | --------------------------------- | ---------- |
| `WelcomeScreen.tsx`                    | `["welcome", "common"]`           | ~8         |
| `NewGoalModal.tsx`                     | `["newGoal", "common"]`           | ~4         |
| `GoalsScreen.GoalList`                 | `["goals", "common"]`             | ~6         |
| `CapturePhoto.tsx`                     | `["capturePhoto", "permissions"]` | ~7         |
| `CaptureVideoScreen.tsx`               | `["captureVideo", "permissions"]` | ~15        |
| `VideoRecorder.tsx`                    | `["captureVideo", "permissions"]` | ~20        |
| `BadgeDetailScreen.BadgeDetailContent` | `["badgeDetail", "common"]`       | ~35        |
| `GoalCard.tsx`                         | `["goals", "common"]`             | ~4         |

For each bare call, look up the key in the array elements in order; prefix with the namespace whose JSON contains the key. If the key only exists in a fallback element, that means the original call was _relying_ on i18next fallback — record in Discovery Log and prefix with the fallback element's name (preserves current behavior).

## Implementation Plan

### Step 1: Document the "always explicit" convention in `docs/i18n.md` ✅

**Files**: `apps/native-rd/docs/i18n.md`
**Commit**: 5b6061c — `docs(native-rd): require explicit ns:key prefix on every t() call`
**Changes**:

- [x] Replace "Cross-namespace lookups" subsection with a top-level "Namespace prefixes are required" section.
- [x] State the rule: every `t()` call uses `ns:key`. No bare `t("key")` resolution against defaultNS. No reliance on array-form first-element default.
- [x] Document `useTranslation` as a _loading_ concern — its argument controls which namespace JSON files are loaded for this component, not which namespace `t()` resolves against.
- [x] Include the motivating before/after example from the issue body to anchor the "why".
- [x] Reference `CaptureLinkScreen.tsx` and `VoiceMemoScreen.tsx` as canonical examples.
- [x] Add a checklist item to the "Pre-PR checklist" section: "every new `t()` call uses `ns:key`."

### Step 2: Add the scan test

**Files**: `apps/native-rd/src/i18n/__tests__/namespace-convention.test.ts` (new file)
**Commit**: `test(native-rd): enforce explicit ns:key prefix on every t() call`
**Changes**:

- [ ] Walk every `.tsx`/`.ts` file under `src/screens/` and `src/components/` using `node:fs` / `node:path` (no new deps).
- [ ] For each file, find every string-literal `t("…")` or `t('…')` call via regex `/\bt\(["']([^"'\n]+)["']/g`.
- [ ] Assert every matched key contains a `:` before the first `.` (or at all). Skip empty matches and matches where the key looks like a path (extremely rare).
- [ ] Collect violations as `{ file, line, key }`; fail the test with a sorted, copy-pasteable list.
- [ ] No allow-list. The retrofit in Steps 3–5 makes the codebase pass; this test guards regressions thereafter.
- [ ] Test the test against `CaptureLinkScreen.tsx` (already compliant) — pass.

### Step 3: Retrofit `useTranslation()` no-args files (17 files, 38 calls)

**Commit**: `refactor(native-rd): prefix t() calls with common: in no-args useTranslation files`
**Changes**:

- [ ] List the 17 files in the commit body for review traceability.
- [ ] For each file, replace every bare `t("key")` → `t("common:key")`. Templates and dynamic keys are left alone (per D6).
- [ ] Visual smoke test on one representative screen to confirm no regression.

### Step 4: Retrofit `useTranslation("foo")` string-form files (23 files, 217 calls)

**Commit**: `refactor(native-rd): prefix t() calls with namespace in string-form useTranslation files`
**Changes**:

- [ ] For each file, read the string arg passed to `useTranslation` (e.g. `"goals"`).
- [ ] Replace every bare `t("key")` → `t("goals:key")` per file's arg.
- [ ] Per-file commit body lists the affected file and namespace mapping for review.

### Step 5: Retrofit `useTranslation([...])` array-form files (8 files, 69 calls)

**Commit**: `refactor(native-rd): prefix t() calls in array-form useTranslation files`
**Changes**:

- [ ] For each bare `t("key")` call, look up the key in each namespace JSON in array order.
- [ ] Prefix with the first matching namespace (preserves current i18next resolution).
- [ ] If a key matches only in a fallback element, record in Discovery Log: "{file}:{line} relied on fallback to {ns}". This is a smoke signal — was the call site intending the primary namespace? Reviewer should confirm.
- [ ] Verify each retrofitted file by running the relevant Jest tests (`bun test --testPathPatterns <component>`).

### Step 6: Verify everything

**Commit**: none (verification step; no code commit unless a retrofit miss is found)
**Changes**:

- [ ] Run `bun run test:ci` — all green, including the new namespace-convention test with zero violations.
- [ ] Run `bun run lint` — green.
- [ ] Visual smoke test: launch iOS sim, navigate through Welcome → Goals → Capture flow → Badges → Settings, confirm no missing-key strings appear (would show as the key itself or a `[missing]` placeholder).

## Testing Strategy

- [ ] Unit test for the scan itself: `bun test --testPathPatterns namespace-convention` — passes after Step 2.
- [ ] Manual regression: temporarily add an unprefixed `t("test.key")` to a screen file, confirm the test reports a violation.
- [ ] All existing `i18n/__tests__/*` tests continue to pass (locale-parity, option-key-parity, pseudo-locale).
- [ ] Visual smoke test on iOS sim after Steps 3–5 — confirm no missing-key strings.
- [ ] `bun run test:ci` green.

## Not in Scope

| Item                                                         | Reason                                                                                                                                        | Follow-up                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ESLint rule (Layer 3)                                        | Overkill at current screen count; issue explicitly defers this. Scan test covers regression.                                                  | "Revisit if the test becomes a blocker" — no issue needed now. |
| Multiline `useTranslation([...])` detection                  | The scan checks `t()` calls directly, not `useTranslation` shape. Multiline `useTranslation` is a non-issue under the "always explicit" rule. | None.                                                          |
| Updating `i18n-screen-migration` skill prose                 | Out-of-repo; issue defers it.                                                                                                                 | Joe's skill maintenance backlog.                               |
| Removing or changing `defaultNS` config                      | `defaultNS` still exists for i18next internals; we just don't rely on it at call sites. Removing it would be a bigger semantic change.        | None.                                                          |
| Auditing translation-call sites in `packages/` or other apps | Issue scope is `apps/native-rd/src/`; out-of-app i18n usage is owned elsewhere.                                                               | None unless a downstream consumer asks.                        |

## Risks

| Risk                                                                                            | Likelihood         | Mitigation                                                                                                                                |
| ----------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong namespace prefix introduced during retrofit (typo, copy-paste error)                      | Medium (324 edits) | Each edit is verified by the new scan test + existing locale-parity test; visual smoke test catches user-facing misses.                   |
| Array-form retrofit (Step 5) flips behavior for calls that relied on fallback                   | Low–Medium         | D7 strategy: preserve current resolution by looking up the key in array order. Flag fallback-dependent calls in Discovery Log for review. |
| Merge conflicts with parallel i18n work (`Welcome`, `Goals`, `NewGoal` are in-flight per audit) | Medium             | Rebase before merge; the retrofit is mechanical so conflicts are resolvable. Coordinate with any open PRs touching these files.           |
| Storybook stories that use unprefixed `t()` may be missed (scan is screens/components only)     | Low                | Stories under `src/stories/` are out of scan scope by design; if a story breaks, it's a follow-up.                                        |

## Discovery Log

Runtime discoveries made during implementation. Starts empty — populated by the implement skill as work progresses.

- [2026-06-11] Pre-implementation scan: 45 files, 321 bare `t()` calls (plan's 46/324 estimate was close). Classification by `useTranslation` form in this codebase:
  - **Pure Form 1** (no-args, 14 files): `AudioPlayer`, `AudioPlayerModal`, `CardCarousel`, `EvidenceContent/{File,Link,Photo,Video}Content`, `EvidenceTypePicker`, `PhotoViewerModal`, `ScreenHeader/ScreenSubHeader`, `TextNoteViewerModal`, `ThemeSwitcher`, `VideoPlayerModal`, `ViewerThumbnailStrip`. All prefix with `common:`.
  - **Pure Form 2** (single string-arg hook): `badgeDesigner` (2 files), `badges` (2), `captureFile`, `captureText`, `common` (8 files: `ConfirmDeleteModal`, `EvidenceDrawer`, `GoalEvidenceCard`, `MiniTimeline`, `ModeIndicator`, `ProgressDots`, `StatusBadge`, `StepCard`), `editGoal` (2), `evidenceViewer`, `settings`, `timelineJourney` (3 files).
  - **Pure Form 3** (single array-arg hook, 6 files): `CapturePhoto`, `CaptureVideoScreen`, `NewGoalModal`, `WelcomeScreen`, `VideoRecorder`, `GoalCard`.
  - **Mixed** (multiple hook forms, 4 files): `BadgeDetailScreen` (`"badgeDetail"` + array), `CompletionFlowScreen` (no-args + `"completion"`), `FocusModeScreen` (array + `"focusMode"`), `GoalsScreen` (array + `"goals"`). Need per-scope analysis when retrofitting.
- [2026-06-11] Step 1 complete. Docs reframe `useTranslation` as a loading concern; helper-options-bag exception called out as helper-only. Pre-PR checklist updated to reference the (forthcoming) scan test.
- [2026-06-11] Step 2 complete. Scan test ships failing with 324 violations across 46 files — matches the pre-implementation audit exactly. Verified the report format is copy-pasteable (`src/path/File.tsx:LINE → t("key")`). Canonical compliant files (`CaptureLinkScreen`, `VoiceMemoScreen`) produce zero violations.
- [2026-06-11] Step 3 type-system gotcha: i18next's typed `t()` only accepts `ns:key` syntax when the hook is the **array form** `useTranslation([ns, ...])`. The single-arg forms (`useTranslation()` and `useTranslation("foo")`) type the key as `keyof <defaultNS>` / `keyof "foo"` — _unprefixed_. So mechanically prefixing keys breaks type-check unless we also convert the hook form. Decision: convert all `useTranslation()` → `useTranslation(["common"])` and all `useTranslation("foo")` → `useTranslation(["foo"])` as part of the retrofit. Runtime behavior is identical (same namespaces loaded, same default resolution), but the typed API now accepts the convention's `ns:key` form. This unifies on the canonical pattern from `CaptureLinkScreen` / `VoiceMemoScreen`.
- [2026-06-11] Step 3 complete. 14 components retrofitted: hook → `useTranslation(["common"])`, 35 bare calls prefixed with `common:`. All 87 component-level Jest tests pass; full `tsc --noEmit` is clean. Scan drops from 324 → 288 violations. Side observation: `CompletionFlowScreen.tsx:108` declares `const { t } = useTranslation();` but the binding is unused — the only `t("title")` call on line 785 is in the sibling `CompletionFlowScreen` scope which uses `useTranslation("completion")`. The dead hook is left in place for now; it'll convert with the rest in Step 4.
- [2026-06-11] Step 4 complete. 22 pure Form 2 files retrofitted across 8 namespaces (`common`, `timelineJourney`, `editGoal`, `evidenceViewer`, `badgeDesigner`, `badges`, `settings`, `captureFile`, `captureText`): hook → `useTranslation([ns])`, 181 bare calls prefixed. All 353 Jest tests for these files pass; `tsc --noEmit` clean. Scan drops 288 → 98 violations. Remaining are pure Form 3 (`GoalCard`, `VideoRecorder`, `CapturePhoto`, `CaptureVideoScreen`, `NewGoalModal`, `WelcomeScreen`) and the 4 mixed files (`BadgeDetailScreen`, `CompletionFlowScreen`, `FocusModeScreen`, `GoalsScreen`) — Step 5.

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
