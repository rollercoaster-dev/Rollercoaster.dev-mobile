# Issue #65 — i18n: migrate shared labels (`common` namespace)

**Milestone:** #3 — native-rd i18n
**Position:** First sequential step under the 2026-05-18 shipping plan. Unblocks parallel screen migrations (#67–#72).
**Parent epic:** #76 (German first-test path)
**Branch (when implementation starts):** `feat/issue-65-i18n-common-labels`

## Why this is next

Per `docs/plans/milestone-3-i18n.md` (operational source of truth), #65 is the first sequential step under the current strategy. PR #108 (merged 2026-05-19) landed the namespace refactor this issue builds on: `src/i18n/index.ts` declares 15 namespaces; every `resources/en/<ns>.json` is `{}` today. Foundation is plumbing-only; first strings get extracted here.

#64 (testIDs), #66 (Hermes spike), and #63 (raw-string lint) are deferred to post-ship cleanup — the milestone doc has the full rationale.

## Goal

Populate `resources/en/common.json` (+ regenerated `resources/pseudo/common.json`) with the shared labels referenced across multiple screens, and migrate the small number of cross-cutting consumers in `src/types/evidence.ts` and `src/hooks/useTheme.ts` so screen-migration agents can `t("common.actions.save")` etc. without redefining the keys per namespace.

This is the first real `t()`-consumer commit in product code. Today, `useTranslation` usage is zero outside `src/i18n/__tests__/`.

## Readiness

- ✅ Foundation closed (monorepo#988); `src/i18n/{index.ts,language.ts,pseudoTransform.ts,i18next.d.ts}` in place.
- ✅ Namespace refactor landed (PR #108). `NAMESPACES` includes `common` as default; `resources/en/common.json` exists as `{}`.
- ✅ Pseudo-generation script auto-discovers files: `bun run gen:pseudo`.
- ✅ Drift guard test in `src/i18n/__tests__/i18n.test.ts` enforces NAMESPACES ↔ resource-bundle ↔ types alignment.
- ✅ Working tree clean on `next-i18n-issue-research-and-planning`.
- ⚠️ **#64 (testIDs) deliberately deferred.** Test-migration policy below explains how this issue handles assertions without depending on #64.

## Scope (from the issue body, with concrete file targets)

### Keyspace to populate in `resources/en/common.json`

The issue body specifies five top-level keys under `common`. Concrete content below; tone follows the ND-first voice already used in the app (no shouting verbs, short, neutral).

```jsonc
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "dismiss": "Dismiss",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "close": "Close",
    "retry": "Retry",
  },
  "evidenceTypes": {
    "photo": { "label": "Take Photo", "shortLabel": "Photo" },
    "video": { "label": "Record Video", "shortLabel": "Video" },
    "voice_memo": { "label": "Record Voice Memo", "shortLabel": "Voice Memo" },
    "text": { "label": "Write a Note", "shortLabel": "Note" },
    "link": { "label": "Add Link", "shortLabel": "Link" },
    "file": { "label": "Attach File", "shortLabel": "File" },
  },
  "theme": {
    "options": {
      "light-default": {
        "label": "The Full Ride",
        "description": "Standard theme",
      },
      "dark-default": { "label": "Night Ride", "description": "Dark mode" },
      "light-highContrast": {
        "label": "Bold Ink",
        "description": "High contrast (WCAG AAA)",
      },
      "light-dyslexia": {
        "label": "Warm Studio",
        "description": "Dyslexia-friendly",
      },
      "light-autismFriendly": {
        "label": "Still Water",
        "description": "Autism-friendly",
      },
      "light-lowVision": {
        "label": "Loud & Clear",
        "description": "Low vision support",
      },
      "light-lowInfo": {
        "label": "Clean Signal",
        "description": "Reduced visual noise",
      },
    },
  },
  "status": {},
  "a11y": {},
}
```

`status.*` and `a11y.*` start empty. The issue body lists them as scope, but a grep of the codebase shows no centralized status/a11y label module today — both would otherwise be invented here without consumers. **Decision: ship `status: {}` and `a11y: {}` as registered subtrees with a one-line comment in the JSON-adjacent doc explaining they're intentionally empty until a real consumer appears.** Cheaper than re-introducing the keys later; safer than premature design.

If a `status.*` or `a11y.*` candidate surfaces during the migration (e.g. an `a11y.dismissHint` reused by two capture screens), add it here and update consumers in the same commit.

### Consumers to migrate

| File                                                        | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/evidence.ts`                                     | Strip `label` / `shortLabel` strings from `EVIDENCE_OPTIONS` and `EVIDENCE_CAPTURE_OPTIONS`. Keep `type` (enum value) and `icon` (emoji codepoint). Consumers must look up labels via `t("evidenceTypes.<type>.label")` / `.shortLabel`. The `EvidenceOption` / `EvidenceCaptureOption` interfaces drop the `label` / `shortLabel` fields.                                                                                                            |
| `src/hooks/useTheme.ts`                                     | Strip `label` / `description` strings from `themeOptions`. Keep `id` (`ThemeName`). The exported `themeOptions: { id; label; description }[]` becomes `themeOptions: { id }[]` (or `readonly ThemeName[]`); choose the shape that minimizes consumer churn — likely `themeOptions: readonly { id: ThemeName }[]` so existing `.map(o => o.id)` keeps working. Consumers look up display strings via `t("theme.options.<id>.label")` / `.description`. |
| `src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` | Consumes `EVIDENCE_OPTIONS`. Update label rendering to `useTranslation()` + `t("evidenceTypes.<type>.label")`.                                                                                                                                                                                                                                                                                                                                        |
| `src/screens/FocusModeScreen/FocusModeScreen.tsx`           | Same — consumes `EVIDENCE_OPTIONS`.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/components/FABMenu/FABMenu.tsx`                        | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/components/StepCard/StepCard.tsx`                      | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/components/EvidenceTypePicker/EvidenceTypePicker.tsx`  | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/components/ThemeSwitcher/ThemeSwitcher.tsx`            | Consumes `themeOptions`. Update to `t("theme.options.<id>.label")` / `.description`.                                                                                                                                                                                                                                                                                                                                                                  |
| `src/components/ThemeChipGrid/ThemeChipGrid.tsx`            | Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/hooks/useThemePersistence.ts`                          | Consumes `themeOptions` only for `id` values (used to validate persisted names). No string changes needed. Confirm during implementation.                                                                                                                                                                                                                                                                                                             |

### Cross-cutting action-label migrations (small)

These are the only `Save / Cancel / Delete / Close / Dismiss / Retry` occurrences I found in product code today:

- `src/screens/CaptureLinkScreen/CaptureLinkScreen.tsx:138` — `label="Cancel"` → `t("actions.cancel")`
- `src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx:188` — `label="Dismiss"` → `t("actions.dismiss")`
- `src/screens/NewGoalModal/NewGoalModal.tsx:58` — `accessibilityLabel="Close"` → `t("actions.close")`
- `src/components/EvidenceContent/VideoContent.tsx:83` — `<Text>Retry</Text>` → `t("actions.retry")`
- `src/components/EvidenceContent/PhotoContent.tsx:57` — `<Text>Retry</Text>` → `t("actions.retry")`

The screens that hold the bulk of `Save / Save Link / Save Note / Choose File` etc. are scoped to their own namespace (#67, #68, #69, #70, #71). This issue does NOT chase them — that's the whole point of namespacing.

Status: `*Screen.tsx` files that use `label="Save"` (e.g. `CaptureTextNote`, `CaptureLinkScreen`) get migrated in **their** screen ticket and reference `common:actions.save` via colon syntax. Don't preempt them here.

### Tests touched by this scope

- `src/types/__tests__/evidence.test.ts` — currently asserts label strings. Update to either (a) assert structural shape only (option count, types, icons) and let screen tests cover the rendered label, or (b) assert via `t()` inside a `renderWithProviders` wrapper. Prefer (a) — that suite is a type-shape contract, not a rendering test.
- `src/components/FABMenu/__tests__/FABMenu.test.tsx`, `src/components/EvidenceTypePicker/__tests__/EvidenceTypePicker.test.tsx` — these render real labels; update to render with i18n initialised (the existing test-utils already wraps in `<I18nextProvider>` per `src/i18n/__tests__/` patterns — verify and reuse).
- `src/components/ThemeChipGrid/__tests__/ThemeChipGrid.test.tsx`, `src/components/ThemeSwitcher/__tests__/ThemeSwitcher.test.tsx`, `src/hooks/__tests__/useTheme.test.ts`, `src/hooks/__tests__/useThemePersistence.test.ts` — same: assertions on `themeOptions[i].label/description` move to assertions via `t("theme.options.<id>.label")`.

## Naming convention recap (matches `docs/i18n.md`)

- Dotted paths, `lowerCamelCase` segments.
- The `common` namespace is the i18next default; consumers use `useTranslation()` (no namespace argument) and call `t("actions.save")` directly.
- From a non-`common` namespace, use the colon prefix: `t("common:actions.save")`.
- Underscored evidence type `voice_memo` keeps its underscore because that string matches `EvidenceType.voice_memo` — the union type drives key choice here, not camelCase preference.

## Pseudo-locale regeneration

After every edit to `resources/en/common.json`:

```sh
bun run gen:pseudo
```

Commit `resources/en/common.json` and `resources/pseudo/common.json` together so reviewers can diff the source vs. the generator output in one place. The pseudo generator preserves `{{tokens}}`; there are no interpolations in this issue's keys so that protection is unused but consistent with future work.

## Test-migration policy (without #64 testIDs)

The original issue body says "updated assertions use testID or t()". With #64 deferred, the policy is:

1. **Prefer accessibility-role queries.** Existing `Button` / `IconButton` render with `accessibilityRole="button"` and an `accessibilityLabel` that goes through `t()` after this PR. Tests should use `getByRole("button", { name: t("actions.save") })` or `getByA11yLabel(t("actions.save"))`.
2. **`getByText` is acceptable** for the few assertions that genuinely prove visible copy renders — e.g. theme description strings, evidence "shortLabel" chips. The pseudo locale will catch missed `t()` calls; tests don't need to be the gate for that too.
3. **Only add `testID` if the component already exposes one.** This issue does NOT add testIDs proactively. That's #64's scope when (if) it lands.
4. **Pluralization assertions are out of scope** — none of the `common` keys use plurals in this batch. If `_zero` / `_one` / `_other` appear during implementation (e.g. for `evidenceTypes`), they require the Hermes-Intl polyfill decision in #66 first. Don't introduce plurals in `common.json` in this PR.

## Acceptance criteria → evidence

| Issue criterion                                          | Evidence in this PR                                                                                                                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No display strings in `src/types/evidence.ts`            | `EvidenceOption` / `EvidenceCaptureOption` interfaces no longer carry `label` / `shortLabel`. `EVIDENCE_OPTIONS` exports `{ type, icon }[]`.                                           |
| No display strings in `src/hooks/useTheme.ts`            | `themeOptions` exports `{ id: ThemeName }[]`. Display strings live in `common.json` under `theme.options.<id>`.                                                                        |
| Pseudo locale produces visibly transformed shared labels | `resources/pseudo/common.json` regenerated; smoke-test under `EXPO_PUBLIC_I18N_PSEUDO=true` shows bracketed/accented labels on theme chips, FAB menu, evidence type picker.            |
| All tests pass; updated assertions use testID or `t()`   | `bun run test` green. Test changes documented above.                                                                                                                                   |
| Remove ESLint disable comments where applicable          | Grep `eslint-disable.*i18n\|eslint-disable.*string` in touched files; none should remain. (Likely zero today because #63 hasn't landed; this acceptance bullet is mostly a no-op now.) |

## Suggested commit shape

1. `feat(native-rd): populate common namespace with shared labels and theme/evidence keys` — `resources/en/common.json` + `resources/pseudo/common.json` only.
2. `refactor(native-rd): migrate evidence types to t() for display labels` — `src/types/evidence.ts` + the five consumers + their tests.
3. `refactor(native-rd): migrate theme options to t() for display labels` — `src/hooks/useTheme.ts` + `ThemeSwitcher` + `ThemeChipGrid` + their tests.
4. `refactor(native-rd): migrate cross-cutting action labels (cancel/dismiss/close/retry) to t()` — the five spot edits in capture screens / NewGoalModal / EvidenceContent.

Each commit ships with its DCO trailer via the husky `prepare-commit-msg` hook. Do not bypass.

If the diff stays under ~300 lines, commits 2 and 3 can be one commit (`refactor(native-rd): migrate evidence types and theme options to t()`). Reviewer ergonomics over commit purity.

## Risks

- **`EvidenceOption` interface change is API-breaking inside the app.** Every consumer must move in the same commit, otherwise TypeScript fails the build. Mitigated by the type system — the build is the gate. List in commit 2 above is exhaustive per `grep -rln "EVIDENCE_OPTIONS\|EVIDENCE_CAPTURE_OPTIONS\|EvidenceOption" src`.
- **`themeOptions` shape change** has the same risk. Same mitigation.
- **Test brittleness from copy assertions.** With #64 not landing first, some tests still use `getByText("Take Photo")` and will become `getByText(t("evidenceTypes.photo.label"))` or move to role queries. The shipping plan accepts this — migration PRs after this one will keep mass-rewriting tests as namespaces fill. Don't try to pre-fix this for screens out of scope.
- **The theme `dark-default` "Night Ride" rename to `*` translation later.** German native speakers may prefer not to translate brand-flavoured theme names like "Night Ride" or "Full Ride." This is a translator/product decision under #76; ship English `t()` calls now, document the question in #76's review checklist.
- **ND-voice consistency.** `common.actions.*` strings ("Save", "Cancel") are short enough to be untranslated already; tone risk lives mostly in `theme.options.<id>.description`. Pseudo locale won't catch tone — flag for the German native-speaker review under #76.

## Out of scope (explicit)

- Adding `testID` props (issue #64).
- ESLint rule for raw JSX strings (issue #63).
- Hermes Intl spike (issue #66) — no plurals in this PR.
- Migrating screen-specific labels (`Save Link`, `Save Note`, screen titles) — those live in #67–#72.
- `formatDate` / `formatEvidenceLabel` locale-aware utilities (issue #62).
- Populating `status: {}` or `a11y: {}` subtrees beyond `{}`.

## After this lands

The 2026-05-18 shipping plan's parallel-screen-migration phase becomes runnable. Recommended cut from that plan: first-test-path only — `welcome`, `goals`, `focusMode`, `capturePhoto`, `captureVideo`, `captureVoice`, `permissions`. Skip `captureText/File/Link`, `settings`, `newGoal`, badges for now.

## Re-entry instructions

If you `/clear` and come back:

1. Re-read `docs/plans/milestone-3-i18n.md` (operational strategy) and this file (issue plan).
2. Check `git log main..HEAD --oneline` to see what's landed.
3. Verify `src/i18n/resources/en/common.json` state: still `{}` → run this plan from the top; populated → skip to whichever commit is unfinished.
4. Do **not** re-do the namespace refactor (already landed in PR #108).
