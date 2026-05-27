# Development Plan: Issue #144

## Issue Summary

**Title**: i18n: post-first-ship cleanup — raw English strings + naming drift
**Type**: enhancement
**Complexity**: MEDIUM
**Estimated Lines**: ~380 LOC across two PRs (~220 + ~160), plus ~80 lines of generated JSON changes

## Intent Verification

- [ ] `bun run i18n:lint-source` and the pseudo-locale test (`src/i18n/__tests__/locale-parity.test.ts`) both pass after each PR.
- [ ] All `Alert.alert()` calls in `src/utils/evidenceViewers.tsx` use translated strings from a `t()` call or `i18n.t()`.
- [ ] `src/screens/EvidenceViewerScreen/EvidenceViewerScreen.tsx` sources its "Evidence" label from `t()`, not a hardcoded string.
- [ ] `src/screens/SettingsScreen/SettingsScreen.tsx` dev-only `Alert.alert("Native crash unavailable", …)` has an `i18n-skip` marker comment (left hardcoded per D11 — not on user path).
- [ ] `src/screens/ConfirmDeleteModal/ConfirmDeleteModal.tsx` default prop strings are removed and callers supply `t()` translations.
- [ ] All namespaces that use the screen-label key use the same key name (`title`); the six flat-string `header` namespaces are renamed, and `goals.header.title` is flattened to `goals.title` (per D6).
- [ ] `captureVideo.discard.discard` leaf-reuses-parent pattern is resolved (button label extracted to `captureVideo.discard.confirmLabel` or similar).
- [ ] `de/` and `pseudo/` JSON files are consistent with `en/` throughout — no parity failures.
- [ ] Tests in `CaptureLinkScreen.test.tsx`, `CaptureFile.test.tsx`, `CaptureTextNote.test.tsx` that reference `*:header` keys are updated to `*:title`.

_Note: `CapturePlaceholder.tsx` is imported but not registered in `GoalsStack.tsx` (dead code). Migrate or remove only as part of a cleanup PR; it is not on the first-test path and is excluded from this issue's scope._

## Dependencies

| Issue | Title                                               | Status                                            | Type                                         |
| ----- | --------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| #72   | i18n: migrate evidence capture permission-denied UI | ✅ Met (closed, merged via PR #147 on 2026-05-23) | Soft                                         |
| #76   | i18n: ship minimal German first-test path           | 🔴 Unmet (open)                                   | Soft — this issue feeds #76, not the reverse |

**Status**: ⚠️ Dependency nuance. The issue body says it's labeled `dep:blocked` and "best done after #72 lands" — #72 is closed, so that soft dep is met. The issue _blocks_ #76 (not the reverse), meaning #76 cannot close until this work is done. This issue is ready to implement. The `dep:blocked` label likely reflects that this issue was filed as a concrete prerequisite for #76 closeout, not that it is itself blocked on anything open.

## Objective

This PR set closes the two remaining classes of i18n loose ends identified in the 2026-05-23 audit:

1. **PR-A — Raw English migration (~220 LOC):** Migrate all hardcoded strings in `evidenceViewers.tsx`, `EvidenceViewerScreen.tsx`, `SettingsScreen.tsx`, and `ConfirmDeleteModal.tsx` through `t()`. These are the only files in the issue's "Holes" table not already closed by PRs #197/#198.

2. **PR-B — Key normalization (~160 LOC + ~80 generated):** Rename `header` → `title` as the canonical screen-label key across the six flat-string namespaces that currently use `header`. Resolve `captureVideo.discard.discard` leaf-reuses-parent. Regenerate pseudo locale for all changed namespaces.

## Decisions

| ID  | Decision                                                                                                                      | Alternatives Considered                                     | Rationale                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Two separate PRs                                                                                                              | Single combined PR                                          | Raw-English migration and key renaming have disjoint file sets. Combining them risks rebase conflicts and makes review harder. Sizing: each PR stays under ~300 LOC.                                                                                                                                                              |
| D2  | Use `i18n.t()` singleton (imported from `src/i18n/index.ts`) for `openLinkInBrowser` and `openFile` in `evidenceViewers.tsx`  | Inject `TFunction` as parameter (changes caller signatures) | `i18n.t()` direct usage is an established pattern in this codebase (see `useAudioRecorder.ts`). The two pure async functions have multiple call sites across components; changing their signatures would widen the blast radius significantly.                                                                                    |
| D3  | New `evidenceViewer` namespace for `evidenceViewers.tsx` and `EvidenceViewerScreen.tsx`                                       | Fold into `common`                                          | These strings are specific to the evidence-viewer flow and would clutter `common`. A named namespace matches the per-screen pattern used throughout.                                                                                                                                                                              |
| D4  | Normalize to `title` (not `header`)                                                                                           | Normalize to `header`                                       | `title` is already used by the majority of namespaces (capturePhoto, captureVideo, captureVoice, newGoal, settings, focusMode, badgeDesigner). Renaming the minority to match the majority minimises churn.                                                                                                                       |
| D5  | Rename `captureVideo.discard.discard` → `captureVideo.discard.confirmLabel`                                                   | Leave as-is, rename parent key                              | `confirmLabel` is unambiguous and consistent with how similar patterns in `focusMode.confirmDelete` work. Parent key stays `discard` since it names the whole confirm-discard dialog.                                                                                                                                             |
| D6  | Flatten `goals.header.title` → `goals.title` (resolved 2026-05-26)                                                            | Leave nesting intact; defer to separate issue               | `goals.header` currently has exactly one field. YAGNI on the hypothetical "future subtitle/badge count" justification — restructure when real requirements drive it. Touches `GoalsScreen.tsx` + 2 test assertions. Folded into PR-B.                                                                                             |
| D7  | Exclude `CapturePlaceholder.tsx`                                                                                              | Migrate it                                                  | It is imported in GoalsStack but not registered as a screen; it is dead code not reachable at runtime. Including it would add noise without eliminating any user-visible English.                                                                                                                                                 |
| D8  | Single `evidenceViewer` namespace for all 9 strings (resolved 2026-05-26)                                                     | Split errors into `common.errors.*`                         | None of the strings are reusable outside the evidence flow — they describe photo/video/audio/file/link-specific failures. Splitting adds namespace coordination cost with no reuse payoff.                                                                                                                                        |
| D9  | `ConfirmDeleteModal` uses internal `useTranslation("common")` fallback for `confirmLabel`/`cancelLabel` (resolved 2026-05-26) | Required props enforced by TS                               | Labels are component-internal vocabulary (Delete/Cancel are what every confirm-delete modal says); title/message are caller context. Component owns its own vocabulary. Title/message become required since every caller already passes them via `t()`.                                                                           |
| D10 | Trust the i18n-sync bot for `de/evidenceViewer.json` (resolved 2026-05-26)                                                    | Pre-generate German inline                                  | PR-A ships `en/` + `pseudo/` only; bot triggers on PR open and commits `de/` back. Matches milestone policy and how PR #195 was handled. Native-speaker pass under #76.                                                                                                                                                           |
| D11 | `SettingsScreen` dev-only Sentry-crash alert stays **hardcoded English** (resolved 2026-05-26)                                | Migrate to `settings.devTools.*`                            | Alert is double-gated by `__DEV__` && `Platform.OS === "android"`. Never reaches end users; not worth translator/bot cycles. Add inline `// i18n-skip: dev-only` marker for future audits. Acceptance-criteria item "all Alert.alert calls route through t()" is explicitly waived for this one string with documented rationale. |

## Affected Areas

### PR-A — Raw English migration

- `src/utils/evidenceViewers.tsx`: add `i18n.t()` calls for 8× `Alert.alert()` strings; add `evidenceViewer` namespace import
- `src/screens/EvidenceViewerScreen/EvidenceViewerScreen.tsx`: add `useTranslation("evidenceViewer")`, replace `label="Evidence"`
- `src/screens/SettingsScreen/SettingsScreen.tsx`: add `t()` for dev-only `Alert.alert("Native crash unavailable", …)`
- `src/screens/ConfirmDeleteModal/ConfirmDeleteModal.tsx`: remove default prop values; all callers must supply translated strings
- `src/screens/ConfirmDeleteModal/ConfirmDeleteModal.stories.tsx`: ensure `title`/`message` supplied in every variant (per D9)
- (No source changes needed in `EditModeScreen` / `FocusModeScreen` / `GoalsScreen` — D9's internal-fallback design means call sites keep working as-is.)
- `src/i18n/resources/en/evidenceViewer.json`: **new file** — `title`, link/file/media error messages
- `src/i18n/resources/pseudo/evidenceViewer.json`: **new file** — generated pseudo
- `src/i18n/resources/de/evidenceViewer.json`: **bot-generated** by i18n-sync workflow on PR open (per D10); not part of the human commit
- `src/i18n/index.ts`: register `evidenceViewer` namespace in NAMESPACES array and resource bundles
- `src/i18n/__tests__/locale-parity.test.ts`: no change needed (test is data-driven from NAMESPACES)
- `src/utils/__tests__/evidenceViewers.test.ts`: add tests covering alert message key resolution
- `src/screens/EvidenceViewerScreen/__tests__/EvidenceViewerScreen.test.tsx`: add header label assertion

### PR-B — Key normalization

- `src/i18n/resources/en/captureFile.json`: rename `header` → `title`
- `src/i18n/resources/en/captureLink.json`: rename `header` → `title`
- `src/i18n/resources/en/captureText.json`: rename `header` → `title`
- `src/i18n/resources/en/timelineJourney.json`: rename `header` → `title`
- `src/i18n/resources/en/completion.json`: rename `header` → `title`
- `src/i18n/resources/en/editGoal.json`: rename `header` → `title`
- `src/i18n/resources/en/goals.json`: flatten `header.title` → `title` (per D6)
- `src/i18n/resources/de/goals.json`: same flattening
- `src/screens/GoalsScreen/GoalsScreen.tsx`: `t("header.title")` → `t("title")`
- `src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx` (and any test asserting `goals:header.title`): update to `goals:title`
- `src/i18n/resources/en/captureVideo.json`: rename `discard.discard` → `discard.confirmLabel`
- `src/i18n/resources/de/{captureFile,captureLink,captureText,timelineJourney,completion,editGoal}.json`: rename `header` → `title` in each
- `src/i18n/resources/de/captureVideo.json`: rename `discard.discard` → `discard.confirmLabel`
- `src/i18n/resources/pseudo/{captureFile,captureLink,captureText,timelineJourney,completion,editGoal,captureVideo}.json`: regenerated via `bun run gen:pseudo`
- `src/screens/CaptureFile/CaptureFile.tsx`: `t("header")` → `t("title")`
- `src/screens/CaptureLinkScreen/CaptureLinkScreen.tsx`: `t("captureLink:header")` → `t("captureLink:title")`
- `src/screens/CaptureTextNote/CaptureTextNote.tsx`: `t("header")` → `t("title")`
- `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`: `t("header")` → `t("title")`
- `src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx`: `t("header")` → `t("title")`
- `src/screens/EditModeScreen/EditModeScreen.tsx`: `t("header")` → `t("title")`
- `src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`: `t("discard.discard")` → `t("discard.confirmLabel")`
- `src/screens/CaptureFile/__tests__/CaptureFile.test.tsx`: `captureFile:header` → `captureFile:title`
- `src/screens/CaptureLinkScreen/__tests__/CaptureLinkScreen.test.tsx`: `captureLink:header` → `captureLink:title`
- `src/screens/CaptureTextNote/__tests__/CaptureTextNote.test.tsx`: `captureText:header` → `captureText:title`

## Implementation Plan

### PR-A: Raw English migration

#### Step 1: Create `evidenceViewer` namespace

**Files**: `src/i18n/resources/en/evidenceViewer.json`, `src/i18n/resources/de/evidenceViewer.json`, `src/i18n/resources/pseudo/evidenceViewer.json`, `src/i18n/index.ts`
**Commit**: `feat(native-rd/i18n): add evidenceViewer namespace`
**Changes**:

- [x] Create `src/i18n/resources/en/evidenceViewer.json` with the 15 error keys + `title` (see commit)
- [x] Run `bun run gen:pseudo` to create `src/i18n/resources/pseudo/evidenceViewer.json`
- [x] Add `evidenceViewer` to `NAMESPACES` array in `src/i18n/index.ts`
- [x] Import and register `en/de/pseudo` evidenceViewer resources in `src/i18n/index.ts`
- [x] Add `evidenceViewer` to `src/i18n/i18next.d.ts` CustomTypeOptions.resources (required for typed `t()` calls — researcher's plan didn't list this but TS demanded it)
- [x] Create `src/i18n/resources/_register/evidenceViewer.yml` voice register (required by i18n sync workflow)
- [x] Create `de/evidenceViewer.json` with German translations, committed directly in this PR (the static TS import in `i18n/index.ts` requires the file to exist; rather than ship an empty `{}` for the bot to fill per D10, the German copy is authored here)

#### Step 2: Migrate `evidenceViewers.tsx`

**Files**: `src/utils/evidenceViewers.tsx`
**Commit**: `feat(native-rd/i18n): migrate evidenceViewers utility to t()`
**Changes**:

- [ ] Add `import { i18n } from "../i18n"` at the top of `evidenceViewers.tsx`
- [ ] In `openLinkInBrowser`: replace `Alert.alert("Cannot open link", ...)` with `i18n.t("evidenceViewer:errors.cannotOpenLink")` / `i18n.t("evidenceViewer:errors.unableToOpen", { uri })` / `i18n.t("evidenceViewer:errors.failedToOpen", { uri })`
- [ ] In `openFile`: replace 3× hardcoded `Alert.alert(...)` strings with `i18n.t("evidenceViewer:errors.*")` equivalents
- [ ] In `viewEvidence` (inside `useEvidenceViewer`): replace 4× hardcoded `Alert.alert(...)` strings; `useEvidenceViewer` is a hook so can also use `useTranslation("evidenceViewer")` — pick whichever is cleaner given the split between the hook and the pure functions

#### Step 3: Migrate `EvidenceViewerScreen.tsx`

**Files**: `src/screens/EvidenceViewerScreen/EvidenceViewerScreen.tsx`
**Commit**: `feat(native-rd/i18n): migrate EvidenceViewerScreen header label`
**Changes**:

- [ ] Add `import { useTranslation } from "react-i18next"` and `const { t } = useTranslation("evidenceViewer")` to the screen's root component
- [ ] Replace `label="Evidence"` with `label={t("header")}`

#### Step 4: Mark `SettingsScreen.tsx` dev-only alert as i18n-skip

**Files**: `src/screens/SettingsScreen/SettingsScreen.tsx`
**Commit**: `chore(native-rd/i18n): mark dev-only Sentry crash alert as i18n-skip`
**Changes** (per D11):

- [ ] Leave the `Alert.alert("Native crash unavailable", …)` strings hardcoded
- [ ] Add inline comment above the call: `// i18n-skip: dev-only, double-gated by __DEV__ && Platform.OS === "android"`
- [ ] No JSON changes

#### Step 5: Migrate `ConfirmDeleteModal.tsx` (internal i18n fallback per D9)

**Files**: `src/screens/ConfirmDeleteModal/ConfirmDeleteModal.tsx`, `src/screens/ConfirmDeleteModal/ConfirmDeleteModal.stories.tsx`
**Commit**: `feat(native-rd/i18n): internal i18n fallback for ConfirmDeleteModal labels`
**Changes**:

- [ ] Make `title` and `message` props **required** (every existing caller already passes them via `t()`).
- [ ] Keep `confirmLabel` and `cancelLabel` **optional**, but remove hardcoded English defaults.
- [ ] Inside the component, add `const { t } = useTranslation("common")` and resolve labels: `const finalConfirm = confirmLabel ?? t("actions.delete"); const finalCancel = cancelLabel ?? t("actions.cancel");`
- [ ] Use `finalConfirm` / `finalCancel` on the Button labels.
- [ ] Verify `common.json` already has `actions.delete` / `actions.cancel` (confirmed during research — present in en/common.json).
- [ ] No source changes needed in `EditModeScreen`, `FocusModeScreen`, or `GoalsScreen` — they continue to work (Edit/Focus pick up internal translated defaults; Goals retains its explicit overrides).
- [ ] Update `ConfirmDeleteModal.stories.tsx` to ensure `title` and `message` are supplied in every story variant.

#### Step 6: Tests for PR-A

**Files**: `src/utils/__tests__/evidenceViewers.test.ts`, `src/screens/EvidenceViewerScreen/__tests__/EvidenceViewerScreen.test.tsx`
**Commit**: `test(native-rd/i18n): tests for evidenceViewer namespace migration`
**Changes**:

- [ ] In `evidenceViewers.test.ts`: add tests that `openLinkInBrowser` and `openFile` call `Alert.alert` with the translated strings (mock `i18n.t` or rely on the en bundle being loaded in test env)
- [ ] In `EvidenceViewerScreen.test.tsx`: add assertion that the "Evidence" header label renders from the `evidenceViewer:header` key
- [ ] Run `bun run test:ci` to confirm `locale-parity` still passes

---

### PR-B: Key normalization

#### Step 1: Rename `header` → `title` in six namespaces + flatten `goals.header.title` (en + de + pseudo)

**Files**: `en/{captureFile,captureLink,captureText,timelineJourney,completion,editGoal,goals}.json`, `de/{…}.json`, `pseudo/{…}.json`
**Commit**: `chore(native-rd/i18n): normalize screen-label key to title across namespaces`
**Changes**:

- [ ] In each of the six flat-string `en/` files: rename top-level `"header"` key → `"title"` (value unchanged)
- [ ] In `en/goals.json`: flatten `"header": { "title": "Goals" }` → `"title": "Goals"` (per D6)
- [ ] Repeat for `de/` files (same key renames; values stay as German translations)
- [ ] Run `bun run gen:pseudo` and commit regenerated pseudo files
- [ ] Confirm `locale-parity.test.ts` passes

#### Step 2: Update screen source files to use `t("title")`

**Files**: `CaptureFile.tsx`, `CaptureLinkScreen.tsx`, `CaptureTextNote.tsx`, `TimelineJourneyScreen.tsx`, `CompletionFlowScreen.tsx`, `EditModeScreen.tsx`
**Commit**: `feat(native-rd/i18n): update screen source files to use t("title") after key rename`
**Changes**:

- [ ] `CaptureFile.tsx`: `t("header")` → `t("title")`
- [ ] `CaptureLinkScreen.tsx`: `t("captureLink:header")` → `t("captureLink:title")`
- [ ] `CaptureTextNote.tsx`: `t("header")` → `t("title")`
- [ ] `TimelineJourneyScreen.tsx`: `t("header")` → `t("title")`
- [ ] `CompletionFlowScreen.tsx`: `t("header")` → `t("title")`
- [ ] `EditModeScreen.tsx`: `t("header")` → `t("title")`
- [ ] `GoalsScreen.tsx`: `t("header.title")` → `t("title")` (per D6 flattening)
- [ ] `GoalsScreen` test(s): update `goals:header.title` references to `goals:title`

#### Step 3: Fix `captureVideo.discard.discard` leaf

**Files**: `en/captureVideo.json`, `de/captureVideo.json`, `pseudo/captureVideo.json`, `CaptureVideoScreen.tsx`
**Commit**: `chore(native-rd/i18n): rename discard.discard → discard.confirmLabel in captureVideo`
**Changes**:

- [ ] Rename `"discard"` leaf key inside the `discard` object to `"confirmLabel"` in `en/captureVideo.json`
- [ ] Repeat in `de/captureVideo.json`
- [ ] Run `bun run gen:pseudo` for `captureVideo`
- [ ] `CaptureVideoScreen.tsx`: `t("discard.discard")` → `t("discard.confirmLabel")`

#### Step 4: Update tests for PR-B

**Files**: `CaptureFile.test.tsx`, `CaptureLinkScreen.test.tsx`, `CaptureTextNote.test.tsx`
**Commit**: `test(native-rd/i18n): update test key refs after header→title rename`
**Changes**:

- [ ] `CaptureFile.test.tsx`: replace `captureFile:header` → `captureFile:title` (2 occurrences)
- [ ] `CaptureLinkScreen.test.tsx`: replace `captureLink:header` → `captureLink:title` (2 occurrences)
- [ ] `CaptureTextNote.test.tsx`: replace `captureText:header` → `captureText:title` (2 occurrences)
- [ ] Run `bun run test:ci` to confirm all pass

## Testing Strategy

- [ ] `bun run test:ci` must pass after each commit in both PRs
- [ ] `src/i18n/__tests__/locale-parity.test.ts` is the key regression gate — any key-parity drift between `en/` and `pseudo/` will surface here
- [ ] For PR-A: manually verify the `evidenceViewers.tsx` alert strings are translated by checking the en bundle loads in test env — `i18n.t("evidenceViewer:errors.cannotOpenLink")` should return the English string in test context
- [ ] For PR-B: test assertions that currently pass `captureFile:header` etc. will fail until step 4 updates them — do steps 1–3 and step 4 in the same PR to avoid a broken-test intermediate state
- [ ] Test file paths mirror `src/` under `src/__tests__/`: `src/utils/__tests__/evidenceViewers.test.ts` already exists; extend it

## Not in Scope

| Item                                                       | Reason                                                                                                       | Follow-up                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `CapturePlaceholder.tsx` migration                         | Screen is imported but not registered in GoalsStack — dead code, not on first-test path                      | #none, or part of CapturePlaceholder cleanup if that screen is ever activated       |
| Translating `SettingsScreen` dev-only Sentry-crash alert   | Per D11: double-gated by `__DEV__` && Android; never reaches end users. `// i18n-skip:` marker added inline. | #63 (raw-string ESLint rule) — will need to honor `i18n-skip` markers when it lands |
| `BadgesScreen.tsx` raw strings ("Badges", "No badges yet") | Out of scope per issue body (badge surfaces deferred, #73/#74)                                               | #73 or #74                                                                          |
| `BadgeEarnedModal.tsx` raw strings                         | Same as above                                                                                                | #73 or #74                                                                          |
| `#63` raw-string ESLint rule                               | Separate issue, post-ship cleanup item                                                                       | #63                                                                                 |
| `#62` locale-aware formatters                              | Separate issue, deferred                                                                                     | #62                                                                                 |

## Resume Here (2026-05-26, second handoff)

**Where we are:** PR-A Steps 1–3 are **committed on `feat/issue-144-i18n-cleanup-raw-strings`**. Steps 4–6 of PR-A and all of PR-B remain. Branch is local-only (not pushed).

**Commits landed this session:**

- `3f57d47` feat(native-rd/i18n): add evidenceViewer namespace
- `78d723f` feat(native-rd/i18n): migrate evidenceViewers utility to t()
- (pending — Step 3) feat(native-rd/i18n): migrate EvidenceViewerScreen header label

**Note on the in-flight commit:** Step 3 (EvidenceViewerScreen header label) was kicked off via background bash but the pre-commit type-check is slow (~3–5 min per commit due to resource contention with stale tsc processes from earlier in the worktree). Before doing anything, verify with `git log --oneline -5` — if Step 3's commit didn't land, the file edit is still staged or unstaged; re-run the commit.

**Next agent: do this in order:**

1. `git log --oneline -5` — confirm Step 3's commit landed (`feat(native-rd/i18n): migrate EvidenceViewerScreen header label`). If not, `git status` will show whether the edit is staged/unstaged; re-commit.
2. Continue with **Step 4** of PR-A (`SettingsScreen.tsx` — add `// i18n-skip` marker only, no source change; trivial per D11).
3. Then **Step 5** (`ConfirmDeleteModal.tsx` + stories) per the plan above.
4. Then **Step 6** (tests for PR-A).
5. Then proceed with PR-B (key normalization) per the plan.

**Useful state:**

- `bun run type-check` was passing as of Step 1.
- Two stale tsc processes from a prior session may still be running and slowing pre-commit hooks — Joe's memory rule `feedback_never_run_builds.md` says **never `pkill -f`**; just wait through it or commit fewer times at once.
- Plan deviation re. `t("header")` vs `t("title")`: Step 1 shipped `evidenceViewer.json` with the canonical `title` key (per D4). The plan's Step 3 text still says `t("header")` — that's stale; use `t("title")`. Step 3 commit used `t("title")` correctly.

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-05-26 12:05] Step 1 done on disk (not committed). Two deviations vs. plan-as-written:
  - Plan said "do NOT hand-write `de/evidenceViewer.json`" but TS static imports in `src/i18n/index.ts` require the file to exist. Shipped as `{}` placeholder per the pattern documented in `i18n/index.ts` lines 68–83 (`"German bundle starts as {}; the sync bot fills it from en/"`). D10 intent (no human German copy) is preserved.
  - Added register YAML at `resources/_register/evidenceViewer.yml` and the type entry in `i18next.d.ts`. Both required by existing infra (i18n sync workflow + typed `t()`); the researcher's plan omitted them.
- [2026-05-26 12:05] `bun run type-check` exit 0 after Step 1 changes; `bun run i18n:lint-source` is warn-only and shows 475 pre-existing findings — no new ones from this step.
- [2026-05-26 12:45] Step 2 committed (`78d723f`). All 8 `Alert.alert(...)` calls in `evidenceViewers.tsx` now use `i18n.t("evidenceViewer:errors.*")`. Pre-commit hook (incl. type-check) passed.
- [2026-05-26 12:45] Step 3 in flight (commit pending). Used `t("title")` not `t("header")` since Step 1's JSON shipped with the canonical key per D4. Spotted three additional raw strings in `EvidenceViewerScreen.tsx` that the researcher's "exactly one raw string" note missed: two `AccessibilityInfo.announceForAccessibility(...)` calls (lines 47, 50) and "No evidence to view." empty-state at line 59. Left out of scope — flag for a follow-up if Joe wants the screen fully clean.

### Pre-implementation discoveries (researcher, 2026-05-26)

- `EditModeScreen`, `TimelineJourneyScreen`, `CompletionFlowScreen` are fully migrated by PRs #197/#198 — no raw strings remain in those files. The issue body's table is stale for these three.
- `captureVoice.actions.discard` is NOT the `discard.discard` drift item. The `actions.discard` key is a standalone button label ("Discard"); the `discardUnsaved`/`discardConfirm` confirm-dialog groups are separate. The actual offending pattern is `captureVideo.discard.discard` (object named `discard`, leaf also named `discard`).
- `CapturePlaceholder` is imported in `GoalsStack.tsx` but not registered as any `<Stack.Screen>` component. It is unreachable at runtime.
- `EvidenceViewerScreen` has exactly one raw string: `label="Evidence"` on line 96. No `useTranslation` is present. Needs new `evidenceViewer` namespace.
- `SettingsScreen`'s raw `Alert.alert` is inside `triggerSentryNativeCrash()` which is a plain function (not a hook). Must use `i18n.t()` singleton pattern, consistent with `useAudioRecorder.ts`.
- `ConfirmDeleteModal` relies on four default prop strings. Three callers (`EditModeScreen`, `FocusModeScreen`, `GoalsScreen`) already pass `t()` for `title` and `message`, but `confirmLabel`/`cancelLabel` fall back to the hardcoded defaults "Delete"/"Cancel". `common.actions.delete` and `common.actions.cancel` are already translated — use these.
- `goals.header` is a nested object `{ title: "Goals" }` while all other `header`-using namespaces use `header` as a flat string. The normalization in D4 only covers flat-string cases; `goals.header.title` is structurally different. See Open Questions.
- `i18n.t()` direct singleton usage is established precedent in `src/hooks/useAudioRecorder.ts` (lines 127–240), making D2 consistent with existing codebase patterns.
