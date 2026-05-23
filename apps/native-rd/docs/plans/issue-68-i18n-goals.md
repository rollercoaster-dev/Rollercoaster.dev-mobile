# Issue #68 — i18n: migrate Goals screen

**Milestone:** #3 — native-rd i18n
**Position:** Second of the parallel screen-migration phase under the 2026-05-18 shipping plan. Runs in parallel with #69 / #70 / #72 (no shared write target — each agent owns one namespace JSON). #67 (Welcome / NewGoal / Settings) landed in PRs #127/#128.
**Parent epic:** #76 (German first-test path)
**Branch (when implementation starts):** `feat/issue-68-i18n-goals`

## Why this is next

Per `docs/plans/milestone-3-i18n.md` (operational source of truth), the parallel-screen phase opens once #65 lands. PR #113 (merged 2026-05-21) populated `resources/en/common.json`. PRs #127 / #128 migrated Welcome, NewGoal, Settings (#67). Every other `resources/en/<ns>.json` consumed by user-visible flows is still `{}`.

The milestone's first-test-path cut (`milestone-3-i18n.md:27-33`) lists #68 immediately after #67. Goals is a high-traffic screen that introduces three migration shapes the rest of the parallel wave will reuse:

1. A reusable status taxonomy (`StatusBadge` defaults) that #69 (Focus Mode), #70 (Evidence capture cards via `StepCard`), and #73 (Badges) will all consume. Landing it here puts it under `common:status.*` so the sibling PRs don't fork.
2. An accessibility-label interpolation pattern with multiple variables (title + next step + progress + status) — the templates from #67 only had one or two variables.
3. A confirmation-modal pattern (`ConfirmDeleteModal`) where the same modal is overridden by #69 / EditModeScreen. We migrate **call sites** here, not the modal itself, so #69 and EditMode can migrate their own call sites without contending on the same file.

#64 (testIDs), #66 (Hermes spike), and #63 (raw-string lint) remain deferred per `milestone-3-i18n.md:49-58`.

## Goal

Populate `resources/en/goals.json` + extend `resources/en/common.json` with the status taxonomy (+ regenerated `resources/pseudo/<ns>.json`) and migrate every literal display string in:

- `src/screens/GoalsScreen/GoalsScreen.tsx`
- `src/components/GoalCard/GoalCard.tsx`
- `src/components/StatusBadge/StatusBadge.tsx` (default-label map → `common:status.*`)

…to `t()` calls, so a German tester sees translated copy across the Goals tab, goal cards, the empty state, and the delete-confirmation modal launched from a long-press.

## Readiness

- ✅ Foundation closed (#988); `src/i18n/{index.ts,language.ts,pseudoTransform.ts,i18next.d.ts}` in place.
- ✅ Namespace refactor landed (PR #108). `NAMESPACES` already includes `goals`; `resources/en/goals.json` exists as `{}`.
- ✅ `common` namespace populated (#65 / PR #113). `common:actions.*`, `common:theme.*`, `common:a11y.*`, `common:stepCard.*` available. **`common:status` exists but is `{}`** — this PR populates it.
- ✅ #67 landed (#127/#128). Migration patterns and the `welcome` / `newGoal` / `settings` namespaces are precedent; mirror their shape.
- ✅ Pseudo-generation script auto-discovers files: `bun run gen:pseudo`.
- ✅ Drift guard test in `src/i18n/__tests__/i18n.test.ts` enforces namespace registration; no edits needed.
- ⚠️ **#64 (testIDs) deliberately deferred.** Reuse existing testIDs (`goal-card-next-step`); no new ones.

## Correction against the issue body

The issue body (rendered before the namespace refactor) names keys as `screens.goals.*`. **That path is stale.** After PR #108, keys are top-level within the `goals` namespace:

```tsx
const { t } = useTranslation(["goals", "common"]);
t("emptyState.title"); // resources/en/goals.json → { "emptyState": { "title": "No goals yet" } }
t("common:status.active");
```

Authority: `docs/i18n.md` § "Resource bundles" and `milestone-3-i18n.md`. PR description should call out the namespace-path correction.

The issue's `dep:blocked` label is stale (set when the wave plan ordered #64/#66 first). Strip it during this PR's housekeeping.

The issue body also lists "Update related component strings (GoalCard if not covered in shared labels)". Reading the actual GoalCard at HEAD, the only strings are:

- The `accessibilityHint` `"Double-tap to view details"` — Goals-scoped (this is a GoalCard, not a generic Card).
- The composite `accessibilityLabel` built from goal title, next-step title, progress fragment, and raw status string.
- The progress label `"{n}/{m} steps"`.

These all migrate as part of this PR.

## Scope per file

### `src/screens/GoalsScreen/GoalsScreen.tsx`

Literals to migrate (line refs against `GoalsScreen.tsx@HEAD`):

| Line   | Literal                                                                 | Key                           | Notes                                                                                                                                                                |
| ------ | ----------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 86     | `No goals yet`                                                          | `goals:emptyState.title`      |                                                                                                                                                                      |
| 87     | `Add your first learning goal to get started.`                          | `goals:emptyState.body`       |                                                                                                                                                                      |
| 89     | `Create Goal`                                                           | `goals:emptyState.cta`        | Identical English copy to `newGoal:cta.create`. **Keep separate** — one is an empty-state CTA, the other is a modal submit; translators may render them differently. |
| 118    | `Delete this goal?`                                                     | `goals:confirmDelete.title`   |                                                                                                                                                                      |
| 119-23 | `"${deleteTarget.title}" and all progress will be permanently deleted.` | `goals:confirmDelete.message` | Interpolation: `{{title}}`. Keep the quote characters in the English value as curly-equivalent ASCII (`"`) — translator may swap to locale quotes.                   |
| 134    | `Goals`                                                                 | `goals:header.title`          |                                                                                                                                                                      |

Hook form: `useTranslation(["goals", "common"])` — the screen reaches into `common:actions.delete` and `common:actions.cancel` for the modal's confirm/cancel buttons (passed as props; defaults stay literal English for #69/EditMode to migrate later).

Pass to `ConfirmDeleteModal`:

```tsx
<ConfirmDeleteModal
  title={t("confirmDelete.title")}
  message={t("confirmDelete.message", { title: deleteTarget?.title ?? "" })}
  confirmLabel={t("common:actions.delete")}
  cancelLabel={t("common:actions.cancel")}
  ...
/>
```

The empty-string fallback for `message` when `deleteTarget` is null can drop — `confirmDelete.message` is only resolved when the modal renders (modal is visible iff `deleteTarget !== null`). Keep the `?? ""` defensively in the interpolation arg, not as a branched message.

### `src/components/GoalCard/GoalCard.tsx`

Literals to migrate:

| Line  | Literal                                              | Key                                                                                                      | Notes                                                                                                                                                     |
| ----- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 33-39 | composite `accessibilityLabel` array-join            | `goals:card.a11y.label` (no next step) / `goals:card.a11y.labelWithNextStep`                             | **Replace concatenation with single interpolated `t()` call** (anti-pattern flagged in `docs/i18n.md` § "No fragment concatenation"). See template below. |
| 35    | `${stepsCompleted} of ${stepsTotal} steps completed` | folded into `goals:card.a11y.{label,labelWithNextStep}` via `{{stepsCompleted}}` / `{{stepsTotal}}`      |                                                                                                                                                           |
| 34    | `next: ${nextStep}`                                  | folded into `goals:card.a11y.labelWithNextStep` via `{{nextStep}}`                                       |                                                                                                                                                           |
| 37    | raw `goal.status` ("active" / "completed")           | folded into a11y label via `t(`common:status.${goal.status}`)` then passed as `{{status}}` interpolation | Dynamic key — needs drift-guard pair (forward + reverse) against `StatusBadgeVariant`.                                                                    |
| 46    | `Double-tap to view details`                         | `goals:card.a11y.hint`                                                                                   |                                                                                                                                                           |
| 74    | `{stepsCompleted}/{stepsTotal} steps`                | `goals:card.progressLabel`                                                                               | Interpolation `{{completed}}/{{total}} steps`. **No plurals** until #66 lands.                                                                            |

a11y-label template:

```json
"card": {
  "progressLabel": "{{completed}}/{{total}} steps",
  "a11y": {
    "hint": "Double-tap to view details",
    "label": "{{title}}, {{stepsCompleted}} of {{stepsTotal}} steps completed, {{status}}",
    "labelWithNextStep": "{{title}}, next: {{nextStep}}, {{stepsCompleted}} of {{stepsTotal}} steps completed, {{status}}"
  }
}
```

Why two keys instead of optional `{{nextStep}}` interpolation: i18next renders unfilled placeholders as the empty string, but the comma separator before `next: ` is locale-sensitive — translators may move the next-step fragment to a different position in the sentence. Two explicit templates give the translator both forms to phrase independently. The TS shape stays simple: a single ternary at the call site picks the key.

Hook form: `useTranslation(["goals", "common"])` — needs `common:status.*` lookup for the status interpolation.

### `src/components/StatusBadge/StatusBadge.tsx`

Strip the `defaultLabels` map (line 12-17). Replace with a `t()` call:

```tsx
import { useTranslation } from "react-i18next";

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const { t } = useTranslation("common");
  const displayLabel = label ?? t(`status.${variant}`);
  return (
    <View
      ...
      accessibilityLabel={t("status.a11yPrefix", { label: displayLabel })}
      ...
    >
      <Text ...>{displayLabel}</Text>
    </View>
  );
}
```

Add to `resources/en/common.json` under the existing `status: {}` placeholder:

```json
"status": {
  "active": "Active",
  "completed": "Done",
  "locked": "Locked",
  "earned": "Earned",
  "a11yPrefix": "Status: {{label}}"
}
```

The `a11yPrefix` interpolation replaces line 40's `` `Status: ${displayLabel}` ``. Locale-sensitive (German would render this as something like `Status: {{label}}` too, but capitalisation rules differ — translator decides).

Dynamic-key contract: `t(`status.${variant}`)` where `variant: StatusBadgeVariant = "active" | "completed" | "locked" | "earned"`. Drift-guard pair required.

**Runtime variant array.** Currently `StatusBadgeVariant` is a TS union only (`StatusBadge.styles.ts:4`). To run the drift-guard `describe.each`, export a runtime tuple alongside the type:

```ts
// StatusBadge.styles.ts (or a new tiny variants.ts beside it)
export const STATUS_BADGE_VARIANTS = [
  "active",
  "completed",
  "locked",
  "earned",
] as const;
export type StatusBadgeVariant = (typeof STATUS_BADGE_VARIANTS)[number];
```

Type stays identical; the array becomes the parity test's source of truth. Mirrors how `themeOptions` / `densityOptions` work (which the existing drift guard already walks).

## Tests touched by this scope

| File                                                              | Change                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx`          | Replace every hardcoded English literal (lines 64, 67, 72, 77, 85, 90, 231, 233-35) with `i18n.t("goals:…")` / `i18n.t("common:…")` lookups. The "Goal title" assertions (e.g. `"Learn TypeScript"`, `"Open a savings account"`) are user data, **not** UI copy — leave hardcoded.  |
| `src/components/GoalCard/__tests__/GoalCard.test.tsx`             | Same treatment for any progress-label / a11y-label assertions.                                                                                                                                                                                                                      |
| `src/components/StatusBadge/__tests__/StatusBadge.test.tsx`       | Default-label assertions move to `i18n.t("common:status.<variant>")`. Tests passing an explicit `label` prop stay literal.                                                                                                                                                          |
| `src/__tests__/accessibility.test.tsx` (lines 51-77)              | a11y contract test for `GoalCard` asserts the full composite label by name. Switch to `i18n.t("goals:card.a11y.label", { ... })` / `labelWithNextStep` and `i18n.t("goals:card.a11y.hint")`. These are contract tests — don't delete, just retarget.                                |
| `src/i18n/__tests__/option-key-parity.test.ts`                    | Add forward + reverse drift-guard pair for `STATUS_BADGE_VARIANTS` ↔ `common:status.*`.                                                                                                                                                                                             |
| `src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx` (append) | New `describe("pseudo locale")` block exercising 4 representative keys: `goals:header.title`, `goals:emptyState.body`, `goals:confirmDelete.message` (interpolation), `goals:card.a11y.labelWithNextStep` (interpolation). Pattern in `docs/i18n.md` § "Pseudo-render smoke tests". |

## Naming convention recap (matches `docs/i18n.md`)

- Top-level keys inside the namespace JSON. **Never** `screens.goals.*`.
- One translatable string per key. No string concatenation across keys (`{t("a")} {t("b")}`); use interpolation.
- Reuse `common:*` for actions, status, theme, a11y, evidenceTypes. Do not duplicate.
- Dynamic keys (template literals) must pair with both forward and reverse drift guards in `option-key-parity.test.ts`.

## Pseudo-locale regeneration

After every edit to `resources/en/goals.json` or `resources/en/common.json`:

```sh
cd apps/native-rd
bun run gen:pseudo
```

Commit `resources/en/<ns>.json` and `resources/pseudo/<ns>.json` together (one diff, source + generated output).

## Test-migration policy (without #64 testIDs)

Mirroring #67's approach:

1. **`i18n.t("ns:key")` lookups** for visible-copy assertions. Survives copy tweaks; key path becomes the contract.
2. **Role queries with translated names** for interaction assertions: `screen.getByRole("button", { name: i18n.t("common:actions.delete") })`.
3. **Don't add new testIDs.** Reuse `goal-card-next-step` (already in `GoalCard.tsx:63`); nothing else gets one.
4. **No plurals.** `goals:card.progressLabel` stays a single interpolated string until #66 confirms Hermes Intl coverage.

## Acceptance criteria → evidence

- [ ] No raw display strings in `GoalsScreen.tsx`, `GoalCard.tsx`, `StatusBadge.tsx` → `rg '"[A-Z][a-z]' src/screens/GoalsScreen src/components/GoalCard src/components/StatusBadge` returns only style/identifier strings.
- [ ] Pseudo locale renders correctly → manual `EXPO_PUBLIC_I18N_PSEUDO=true` smoke with Metro restart, walking the Goals tab and triggering the delete modal. **Note: per the global rule, this verification is "user runs build, agent walks them through what to look for"** — every label bracketed/accented, no plain English, no `[…][…]` patterns.
- [ ] Tests pass → `bun run type-check && bun run lint && bun run test`.

## Suggested commit shape

Three commits to keep diff review surfaces small:

1. **`feat(native-rd): extract common:status.* + STATUS_BADGE_VARIANTS runtime tuple`**
   - `common.json` (status subtree)
   - `StatusBadge.tsx` + `StatusBadge.styles.ts` (runtime tuple, `t()` calls)
   - `StatusBadge.test.tsx` (assertion swap)
   - `option-key-parity.test.ts` (new drift-guard pair)
   - `pseudo/common.json` (regen)

2. **`feat(native-rd): migrate Goals screen + GoalCard strings to t()`**
   - `goals.json` (new keys)
   - `pseudo/goals.json` (regen)
   - `GoalsScreen.tsx`, `GoalCard.tsx`
   - `GoalsScreen.test.tsx`, `GoalCard.test.tsx`, `accessibility.test.tsx` (assertion swaps)
   - new `describe("pseudo locale")` block in `GoalsScreen.test.tsx`

3. **`chore(native-rd): drop stale dep:blocked label from #68`** — label-only change, no code. Optional; can fold into the second commit's PR housekeeping.

Each commit gets DCO sign-off via the husky `prepare-commit-msg` hook.

## Risks

| Risk                                                                                                                                                                                                                                                                                           | Mitigation                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StatusBadge` change cascades — `StepCard` (#69), `TimelineStep`, `GoalEvidenceCard`, `BadgesScreen` (#73) all import it. Visual no-op (same English text via `common:status.*`), but their tests may assert against the old hardcoded strings.                                                | Search `rg "StatusBadge" --type ts --type tsx` and audit any test asserting on `"Active"`/`"Done"`/`"Locked"`/`"Earned"` literally. Swap those to `i18n.t("common:status.<v>")` lookups in the same PR (mechanical change, small surface).                                                   |
| `ConfirmDeleteModal` defaults still English. #69 / EditMode will see "Delete this item?" if a future caller forgets to pass `title`. Not a regression; matches HEAD behaviour.                                                                                                                 | Out of scope for #68. Open a follow-up ticket if it becomes a problem; otherwise, the next call site that overrides defaults will surface the gap.                                                                                                                                           |
| a11y label switch from concat to interpolated template — the new label string at runtime is byte-identical to the old one for the English case, **but** the comma separators are now baked into the JSON value. A translator who reorders the label parts can't move the commas independently. | Acceptable. The composite a11y label is one logical sentence; reordering parts is a translator decision and the interpolation gives them the levers (`{{title}}`, `{{nextStep}}`, etc.). If a German reviewer in #76 wants different separators, that's a JSON copy edit, not a code change. |
| Drift-guard test addition for `STATUS_BADGE_VARIANTS` could fail if a future variant is added but JSON isn't updated — that's the **point** of the test, but it might surprise the next contributor.                                                                                           | Test failure message is the contract; if it surprises, that's working as intended. Document in the test comment that the assertion is bidirectional.                                                                                                                                         |

## Out of scope (explicit)

- **`ConfirmDeleteModal.tsx` default labels.** Migrating them touches a component shared with #69 and EditModeScreen; #68 migrates the GoalsScreen _call site_ only.
- **`EmptyState.tsx`** — pure prop-passing; no internal strings to migrate. Strings come from GoalsScreen.
- **`ScreenHeader.tsx`** — pure prop-passing; same reason.
- **`GoalCard.stories.tsx`** — Storybook story copy is dev-only sample data, not user-facing. Leave literal.
- **Goal title / step title** — user data, not UI copy. Stays literal in tests.
- **German `resources/de/goals.json`** — generated translations are #76's first-batch concern; this PR ships English + pseudo only.
- **plurals on `card.progressLabel`** — gated on #66 Hermes Intl spike. Single interpolated string for now.
- **adding new testIDs** — #64's scope.
- **raw-string ESLint rule** — #63's scope.

## After this lands

- #69 (Focus Mode), #70 (Evidence capture: photo/video/voice), #72 (Permission-denied UI) can run in parallel against their own namespaces. Each can rely on `common:status.*` already being populated.
- `StatusBadge`'s `STATUS_BADGE_VARIANTS` tuple is now the established pattern for any other variant union that wants i18n keys (e.g. `EvidenceType`, `GoalStatus` if they grow display labels).

## Re-entry instructions

If you `/clear` mid-implementation:

1. `git log main..HEAD --oneline` — see which commit shape you're at.
2. `cat src/i18n/resources/en/goals.json` — `{}` means start at commit 1 (StatusBadge extraction first; do NOT start with goals.json); populated means you're mid-commit-2.
3. `rg "useTranslation" src/screens/GoalsScreen src/components/GoalCard src/components/StatusBadge` — hook forms in place? If yes, focus on test migration and pseudo regen.
4. Re-read `apps/native-rd/.claude/skills/i18n-screen-migration/SKILL.md` (or invoke the skill) for the per-PR checklist, then resume at the next unchecked step.
