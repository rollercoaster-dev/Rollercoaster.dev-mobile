# Development Plan: Issue #131

## Issue Summary

**Title**: i18n: migrate shared focus widgets to common.\*
**Type**: enhancement
**Complexity**: MEDIUM
**Estimated Lines**: ~360 lines (locale JSON ~80, widget changes ~130, test updates ~150)

## Intent Verification

- [ ] No raw display strings or `accessibilityLabel`s remain in the five widgets (GoalEvidenceCard, EvidenceDrawer, MiniTimeline, ProgressDots, ModeIndicator)
- [ ] `EXPO_PUBLIC_I18N_PSEUDO=true` causes every migrated label to render as bracketed accented text
- [ ] FocusModeScreen tests still pass after widget a11y labels become `i18n.t(...)` values — assertions that use `getByLabelText("Goal evidence")`, `getByRole("button", { name: "Mark goal complete" })`, and `getByLabelText("Step navigation")` are updated to use `i18n.t("common:...")` lookups
- [ ] Drift-guard pairs added for `common:modeIndicator.<mode>` (forward: each of `edit|focus|complete|timeline` resolves; reverse: JSON keyset matches union) and `common:timeline.a11y.step` (forward: resolves; reverse: no orphan)
- [ ] `bun run type-check && bun run lint && bun run test` green after every commit

## Dependencies

| Issue | Title                          | Status               | Type |
| ----- | ------------------------------ | -------------------- | ---- |
| #68   | i18n migrate Goals screen      | Closed (merged #130) | Soft |
| #69   | i18n migrate Focus Mode screen | Closed (merged #134) | Soft |

**Status**: All dependencies met. Issue #131 should have landed before #68/#69 per the original plan but both have already merged without touching these widgets — all five widget files still carry literal strings, so the migration is unblocked and clean.

## Objective

Extract all literal display strings and `accessibilityLabel`s from the five shared focus widgets into `common.json` / `pseudo/common.json`, wire each widget to `useTranslation("common")`, and add drift-guard pairs for the two template-literal `t()` call sites.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                    | Alternatives Considered                                                 | Rationale                                                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Migrate ModeIndicator first (smallest, no consumer test breakage)                                                                                                                                                                                                           | Any order                                                               | Establishes the `useTranslation` + `MODE_CONFIG` refactor pattern before touching widgets with more complex test surfaces                                                                                                                                                                                                                       |
| D2  | `common:timeline.a11y.step` is shared by both MiniTimeline and ProgressDots via the same JSON key                                                                                                                                                                           | Duplicate into separate keys                                            | The strings are identical in both components; one key is the right answer per i18n DRY, and the issue explicitly calls this out                                                                                                                                                                                                                 |
| D3  | Keep `accessibilityLabel` prop on MiniTimeline as a raw `string`; callers pass a translated string from their context                                                                                                                                                       | Move the default into `common.json` and call `t()` inside the component | The prop has a default value used in tests and E2E contracts. The simplest safe migration: remove the default from the prop signature and require callers to pass `t("common:timeline.a11y.label")`. Callers (FocusModeScreen) already use `useTranslation` so this is zero extra cost. Component tests pass an explicit label string directly. |
| D4  | FocusModeScreen test assertions on `"Goal evidence"`, `"Mark goal complete"`, and `"Step navigation"` switch to `i18n.t("common:...")` lookup                                                                                                                               | Leave as literal strings                                                | These assertions go through the widget; after migration the rendered string is whatever `t()` returns (which in tests is the English value). Using `i18n.t(...)` is the established pattern from GoalsScreen tests and keeps the test robust to future copy changes.                                                                            |
| D5  | EvidenceDrawer: the `drawerLabel` dynamic string (`"Goal evidence: N items"` / `"N evidence items"`) is NOT migrated in this issue — it is computed from count and does not match the a11y label pattern; it is out of scope as it involves plural rules (#66 prerequisite) | Migrate it                                                              | Kept out of scope per milestone-3-i18n.md § "No plurals until #66"                                                                                                                                                                                                                                                                              |

## Affected Areas

- `apps/native-rd/src/i18n/resources/en/common.json`: add `goalCard`, `evidenceDrawer`, `timeline`, `progressDots`, `modeIndicator` sub-trees
- `apps/native-rd/src/i18n/resources/pseudo/common.json`: regenerated via `bun run gen:pseudo` after en changes
- `apps/native-rd/src/components/ModeIndicator/ModeIndicator.tsx`: add `useTranslation`, migrate `MODE_CONFIG` labels + a11y label
- `apps/native-rd/src/components/ModeIndicator/__tests__/ModeIndicator.test.tsx`: switch `getByText`/`getByLabelText` assertions to `i18n.t()` lookups
- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.tsx`: add `useTranslation`, migrate 5 strings
- `apps/native-rd/src/components/GoalEvidenceCard/__tests__/GoalEvidenceCard.test.tsx`: update 4 `getByLabelText`/`getByRole` assertions
- `apps/native-rd/src/components/EvidenceDrawer/EvidenceDrawer.tsx`: add `useTranslation`, migrate 3 a11y strings
- `apps/native-rd/src/components/EvidenceDrawer/__tests__/EvidenceDrawer.test.tsx`: update 2 `getByLabelText` assertions
- `apps/native-rd/src/components/MiniTimeline/MiniTimeline.tsx`: add `useTranslation`, migrate 3 strings; remove default for `accessibilityLabel` prop
- `apps/native-rd/src/components/MiniTimeline/__tests__/MiniTimeline.test.tsx`: update 5 label assertions
- `apps/native-rd/src/components/ProgressDots/ProgressDots.tsx`: add `useTranslation`, migrate 2 strings
- `apps/native-rd/src/components/ProgressDots/__tests__/ProgressDots.test.tsx`: update 6 label assertions
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: update 10+ assertions that reach into widget a11y labels
- `apps/native-rd/src/i18n/__tests__/option-key-parity.test.ts`: add drift-guard blocks for `modeIndicator` modes and `timeline.a11y.step`

## Implementation Plan

### Step 1: Add new `common.*` keys to locale files

**Files**:

- `apps/native-rd/src/i18n/resources/en/common.json`
- `apps/native-rd/src/i18n/resources/pseudo/common.json`

**Commit**: `feat(i18n): add common.* keys for shared focus widget strings`

**Changes**:

- [ ] Append to `en/common.json` (after existing `stepCard` block):

```json
"goalCard": {
  "metaLabel": "Goal",
  "markComplete": "Mark goal complete",
  "a11y": {
    "badgePreview": "Badge preview for {{title}}, tap to edit design",
    "evidenceCount": "{{count}} goal evidence items, tap to view",
    "markCompleteHint": "Opens completion flow to capture final evidence"
  }
},
"evidenceDrawer": {
  "a11y": {
    "label": "Evidence drawer",
    "labelGoal": "Goal evidence drawer",
    "close": "Close evidence drawer",
    "toggle": "Toggle evidence drawer"
  }
},
"timeline": {
  "hint": "Tap to expand timeline",
  "a11y": {
    "label": "Step progress timeline — tap to expand",
    "hint": "Opens full timeline view",
    "step": "Step {{index}}: {{status}}",
    "goalEvidence": "Goal evidence"
  }
},
"progressDots": {
  "a11y": {
    "label": "Step navigation"
  }
},
"modeIndicator": {
  "edit": "Edit",
  "focus": "Focus",
  "complete": "Complete",
  "timeline": "Timeline",
  "a11y": {
    "current": "Current mode: {{label}}"
  }
}
```

- [ ] Run `bun run gen:pseudo` from `apps/native-rd/` to regenerate `pseudo/common.json`
- [ ] Commit en + pseudo JSON together

### Step 2: Migrate ModeIndicator

**Files**:

- `apps/native-rd/src/components/ModeIndicator/ModeIndicator.tsx`
- `apps/native-rd/src/components/ModeIndicator/__tests__/ModeIndicator.test.tsx`

**Commit**: `feat(i18n): migrate ModeIndicator strings to common.*`

**Changes**:

- [ ] Add `import { useTranslation } from "react-i18next"` to `ModeIndicator.tsx`
- [ ] Remove the `label` field from `MODE_CONFIG` (keep only `emoji`); type becomes `Record<LifecycleMode, { emoji: string }>`
- [ ] Call `const { t } = useTranslation("common")` inside `ModeIndicator`
- [ ] Replace `config.label` with `t(\`modeIndicator.${mode}\`)` for the displayed label (`<Text variant="label">`)
- [ ] Replace the `accessibilityLabel` string with `t("modeIndicator.a11y.current", { label: t(\`modeIndicator.${mode}\`) })`
- [ ] In the test: add `import { i18n } from "../../../i18n"` and replace every `"Edit"`, `"Focus"`, `"Complete"`, `"Timeline"` literal and `"Current mode: ${label}"` string with `i18n.t("common:modeIndicator.<key>")` / `i18n.t("common:modeIndicator.a11y.current", { label: ... })` lookups

### Step 3: Migrate GoalEvidenceCard

**Files**:

- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.tsx`
- `apps/native-rd/src/components/GoalEvidenceCard/__tests__/GoalEvidenceCard.test.tsx`

**Commit**: `feat(i18n): migrate GoalEvidenceCard strings to common.*`

**Changes**:

- [ ] Add `useTranslation` import; call `const { t } = useTranslation("common")`
- [ ] L85: `"Goal"` → `{t("goalCard.metaLabel")}`
- [ ] L94: `accessibilityLabel={\`Badge preview for ${goalTitle}, tap to edit design\`}`→`accessibilityLabel={t("goalCard.a11y.badgePreview", { title: goalTitle })}`
- [ ] L125: `accessibilityLabel={\`${evidenceCount} goal evidence items, tap to view\`}`→`accessibilityLabel={t("goalCard.a11y.evidenceCount", { count: evidenceCount })}`
- [ ] L148: `accessibilityLabel="Mark goal complete"` → `accessibilityLabel={t("goalCard.markComplete")}`
- [ ] L149: `accessibilityHint="Opens completion flow to capture final evidence"` → `accessibilityHint={t("goalCard.a11y.markCompleteHint")}`
- [ ] L156: `Mark goal complete` text → `{t("goalCard.markComplete")}`
- [ ] In the test: add `i18n` import; replace the 4 literal label/role-name strings with `i18n.t("common:goalCard.a11y.badgePreview", { title: "Run my first 5k" })`, `i18n.t("common:goalCard.a11y.evidenceCount", { count: N })`, `i18n.t("common:goalCard.markComplete")` lookups

### Step 4: Migrate EvidenceDrawer

**Files**:

- `apps/native-rd/src/components/EvidenceDrawer/EvidenceDrawer.tsx`
- `apps/native-rd/src/components/EvidenceDrawer/__tests__/EvidenceDrawer.test.tsx`

**Commit**: `feat(i18n): migrate EvidenceDrawer a11y strings to common.*`

**Changes**:

- [ ] Add `useTranslation` import; call `const { t } = useTranslation("common")`
- [ ] L102-103: `"Goal evidence drawer"` → `t("evidenceDrawer.a11y.labelGoal")`; `"Evidence drawer"` → `t("evidenceDrawer.a11y.label")`
- [ ] L117: `accessibilityLabel="Close evidence drawer"` → `accessibilityLabel={t("evidenceDrawer.a11y.close")}`
- [ ] L133: `accessibilityLabel="Toggle evidence drawer"` → `accessibilityLabel={t("evidenceDrawer.a11y.toggle")}`
- [ ] In the test: add `i18n` import; replace `"Toggle evidence drawer"`, `"Close evidence drawer"`, `"Goal evidence drawer"`, `"Evidence drawer"` literals with `i18n.t("common:evidenceDrawer.a11y.<key>")` lookups

### Step 5: Migrate MiniTimeline

**Files**:

- `apps/native-rd/src/components/MiniTimeline/MiniTimeline.tsx`
- `apps/native-rd/src/components/MiniTimeline/__tests__/MiniTimeline.test.tsx`

**Commit**: `feat(i18n): migrate MiniTimeline strings to common.*`

**Changes**:

- [ ] Add `useTranslation` import; call `const { t } = useTranslation("common")`
- [ ] Remove the default value `"Step progress timeline — tap to expand"` from the `accessibilityLabel` prop — make it required (`accessibilityLabel: string`). The only caller (FocusModeScreen) already passes `useTranslation` context so it will supply `t("common:timeline.a11y.label")`. Component-level tests that previously relied on the default must pass the translated string explicitly.
- [ ] L47: `accessibilityHint: "Opens full timeline view"` → `accessibilityHint: t("timeline.a11y.hint")`
- [ ] L62: `` `Step ${index + 1}: ${step.status}` `` → `t("timeline.a11y.step", { index: index + 1, status: step.status })`
- [ ] L88: `accessibilityLabel="Goal evidence"` → `accessibilityLabel={t("timeline.a11y.goalEvidence")}`
- [ ] L100: `Tap to expand timeline` text → `{t("timeline.hint")}`
- [ ] In the test: add `i18n` import; pass `accessibilityLabel={i18n.t("common:timeline.a11y.label")}` explicitly in all test renders that previously used the default; update label/hint string assertions to use `i18n.t()` lookups

### Step 6: Migrate ProgressDots

**Files**:

- `apps/native-rd/src/components/ProgressDots/ProgressDots.tsx`
- `apps/native-rd/src/components/ProgressDots/__tests__/ProgressDots.test.tsx`

**Commit**: `feat(i18n): migrate ProgressDots strings to common.*`

**Changes**:

- [ ] Add `useTranslation` import; call `const { t } = useTranslation("common")`
- [ ] L40: `accessibilityLabel="Step navigation"` → `accessibilityLabel={t("progressDots.a11y.label")}`
- [ ] L51: `` `Step ${index + 1}: ${step.status}` `` → `t("timeline.a11y.step", { index: index + 1, status: step.status })` (shared key from Step 5)
- [ ] L71: `accessibilityLabel="Goal evidence"` → `accessibilityLabel={t("timeline.a11y.goalEvidence")}` (shared key)
- [ ] In the test: add `i18n` import; update all `getByLabelText("Step N: status")`, `getByLabelText("Goal evidence")`, `getByLabelText("Step navigation")` with `i18n.t(...)` lookups

### Step 7: Update FocusModeScreen tests + add drift guards

**Files**:

- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`
- `apps/native-rd/src/i18n/__tests__/option-key-parity.test.ts`

**Commit**: `test(i18n): update FocusModeScreen assertions + add drift guards for common.* widget keys`

**Changes**:

- [ ] In `FocusModeScreen.test.tsx`: `i18n` is already imported. Replace every literal string that is now served by `t("common:...")`:
  - `getByLabelText("Goal evidence")` → `getAllByLabelText(i18n.t("common:timeline.a11y.goalEvidence"))`
  - `getByRole("button", { name: "Mark goal complete" })` → `getByRole("button", { name: i18n.t("common:goalCard.markComplete") })`
  - `getByLabelText("Step navigation")` → `getByLabelText(i18n.t("common:progressDots.a11y.label"))`
  - (Any others that appear in screen-level tests and reach into these widgets)
- [ ] In `option-key-parity.test.ts`: add after the existing `STATUS_BADGE_VARIANTS` block:

```ts
// Forward: each LifecycleMode member resolves to a real translation
import type { LifecycleMode } from "../../components/ModeIndicator";
const LIFECYCLE_MODES: LifecycleMode[] = [
  "edit",
  "focus",
  "complete",
  "timeline",
];

describe.each(LIFECYCLE_MODES.map((mode) => ({ mode })))(
  "LIFECYCLE_MODES[$mode]",
  ({ mode }) => {
    test(`common:modeIndicator.${mode} resolves`, () => {
      const key = `common:modeIndicator.${mode}` as const;
      expect(i18n.t(key)).not.toBe(key);
    });
  },
);

// Reverse: JSON keyset for modeIndicator matches the union exactly
test("common:modeIndicator keyset matches LifecycleMode union", () => {
  const bundle = i18n.getResourceBundle("en", "common") as {
    modeIndicator: Record<string, unknown>;
  };
  const jsonKeys = new Set(
    Object.keys(bundle.modeIndicator).filter((k) => k !== "a11y"),
  );
  const unionKeys = new Set<string>(LIFECYCLE_MODES);
  expect(jsonKeys).toEqual(unionKeys);
});

// Forward: common:timeline.a11y.step resolves (template-literal t() call)
test("common:timeline.a11y.step resolves", () => {
  const key = "common:timeline.a11y.step";
  expect(i18n.t(key, { index: 1, status: "pending" })).not.toBe(key);
});
```

## Testing Strategy

- [ ] Unit tests exist for all 5 widgets — updated in their respective commits, each commit must be green before proceeding
- [ ] `FocusModeScreen.test.tsx` updated in the final commit
- [ ] Drift-guard tests added in the final commit follow the forward/reverse pattern from existing `option-key-parity.test.ts` blocks
- [ ] Test file path convention: component tests live in `src/components/<Name>/__tests__/` (already the case for all 5)
- [ ] Manual: run `EXPO_PUBLIC_I18N_PSEUDO=true` + Metro restart and verify all five widgets render bracketed pseudo text

## Not in Scope

| Item                                                        | Reason                                                                                                       | Follow-up |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- |
| `EvidenceDrawer` dynamic count label (`"N evidence items"`) | Requires plural rules; blocked on #66 Hermes Intl spike                                                      | #66       |
| `GoalEvidenceCard` "Ready" `StatusBadge` label              | Driven by `status.active` key already in `common.json` from #65; no change needed                            | none      |
| `ConfirmDeleteModal`                                        | Receives title/message as props from call-site (already translated at the call-site); out of scope per issue | none      |
| `StepCard`                                                  | Already migrated under #65                                                                                   | none      |
| FocusPillTabBar                                             | Does not render any of the five widgets' strings; no assertions break                                        | none      |
| German translations                                         | Added as post-first-ship batch per milestone-3-i18n.md                                                       | #76       |

## Discovery Log

<!-- Entries added by implement skill:
- [2026-05-23 00:00] Confirmed all 5 source file line numbers match issue's table exactly (no drift). EvidenceDrawer L102 note: the issue simplifies the label — actual code uses a ternary for the accessible wrapper (`drawerA11yProps`), but the two a11y label strings match `labelGoal` and `label` keys exactly.
- [2026-05-23 00:00] `MiniTimeline.accessibilityLabel` prop default removed per D3; FocusModeScreen is the only caller and already has `useTranslation` in scope.
- [2026-05-23 00:00] FocusModeScreen.test.tsx already imports `i18n` from `"../../../i18n"` — no new import needed in that test file.
- [2026-05-23 00:00] `common:timeline.a11y.step` drift guard: the `status` param is passed as `{{status}}` interpolation (not a TS union), so only a forward resolution check is needed — no reverse union guard.
-->
