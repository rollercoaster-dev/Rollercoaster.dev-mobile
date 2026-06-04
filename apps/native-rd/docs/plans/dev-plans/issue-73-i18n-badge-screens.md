# Development Plan: Issue #73

## Issue Summary

**Title**: i18n: migrate badge list + detail screens
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~160 LOC (implementation + tests; JSON additions are generated content)

## Intent Verification

Observable criteria derived from the issue:

- [ ] When a de_DE device opens the Badges tab, the empty-state title, body, CTA, and header all render in German (not hardcoded English)
- [ ] When a de_DE device opens the BadgeEarnedModal, microcopy, a11y labels, and action buttons all render in German
- [ ] `EXPO_PUBLIC_I18N_PSEUDO=true` + Metro restart: every chrome string on BadgesScreen and BadgeEarnedModal shows bracketed/accented copy; user-generated badge titles/descriptions remain literal
- [ ] `describe("pseudo locale")` block in BadgesScreen test covers `header`, `empty.title`, `empty.body`, `empty.action`, `card.untitledFallback` — at least 5 keys
- [ ] `describe("pseudo locale")` block in BadgeEarnedModal test covers `earned.microcopy.subsequent`, `earned.microcopy.first`, `earned.actions.view`, `earned.a11y.card`, `earned.a11y.image` — at least 5 keys
- [ ] All test assertions for migrated strings use `i18n.t("badges:key")` lookups, not hardcoded English literals
- [ ] `bun run type-check && bun run lint && bun run test` exits green
- [ ] `resources/en/badges.json` is populated (not `{}`)
- [ ] `resources/de/badges.json` and `resources/pseudo/badges.json` are populated
- [ ] `resources/_register/badges.yml` covers `earned.*` context in its notes (the file already exists and has base content)

## Dependencies

| Issue           | Title            | Status                                  | Type          |
| --------------- | ---------------- | --------------------------------------- | ------------- |
| #988 (monorepo) | Foundation       | ✅ Met (closed)                         | Blocker (was) |
| #64             | testID additions | ✅ Met (permanently deferred per skill) | Soft          |

**Status**: ✅ All dependencies met. Issue body explicitly removed `dep:blocked` label — nothing is blocking.

## Objective

Populate the `badges` namespace JSON (en + de + pseudo), migrate `BadgesScreen` and `BadgeEarnedModal` to `useTranslation("badges")`, update their tests to use `i18n.t()` lookups, and add `describe("pseudo locale")` smoke blocks to each. Two screens, one namespace, one PR.

## Decisions

| ID  | Decision                                                                             | Alternatives Considered                           | Rationale                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Fold `BadgeEarnedModal` strings into `badges` namespace under `earned.*`             | New `badgeEarned` namespace                       | Same domain; mirrors how `goals.json` covers list + empty state; avoids namespace proliferation for closely related surfaces                                                                                                                                           |
| D2  | `useTranslation("badges")` scalar form for both screens                              | Array form `useTranslation(["badges", "common"])` | Neither screen reaches into `common:` keys; scalar is the correct hook form per the decision tree                                                                                                                                                                      |
| D3  | No drift-guard pairs in `option-key-parity.test.ts`                                  | Add pairs                                         | No template-literal `t()` calls; `isFirstBadge` branch resolves to two static keys, not a runtime key build                                                                                                                                                            |
| D4  | `resources/_register/badges.yml` already exists — update notes only, do not recreate | Recreate from scratch                             | File was created ahead of content population (as commented inside it); just needs `earned.*` context in its notes section                                                                                                                                              |
| D5  | Commit JSON + pseudo in same commit as screen migration (one commit per screen)      | Three separate commits                            | Skill specifies "commit `en/<ns>.json` and `pseudo/<ns>.json` together"; since two screens share one namespace, JSON is committed with the first screen and pseudo is regenerated after the second screen, or all JSON in commit 1 and both screens in commits 2 and 3 |

**Chosen commit shape**: JSON resources (en + de + pseudo + register notes) in commit 1; BadgesScreen + its test in commit 2; BadgeEarnedModal + its test in commit 3. This keeps JSON as the foundation, then each screen migration is independently reviewable.

## Affected Areas

- `apps/native-rd/src/i18n/resources/en/badges.json`: populate from `{}` with all 12 keys across `header`, `empty`, `card`, `earned`
- `apps/native-rd/src/i18n/resources/de/badges.json`: populate with German translations (parallel to en)
- `apps/native-rd/src/i18n/resources/pseudo/badges.json`: regenerate via `bun run gen:pseudo` (committed alongside en)
- `apps/native-rd/src/i18n/resources/_register/badges.yml`: add notes about `earned.*` context (file exists; base voice register already authored)
- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`: add `useTranslation("badges")`; replace 5 hardcoded strings with `t()` calls
- `apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesScreen.test.tsx`: add `i18n` import; switch 4 hardcoded-string assertions to `i18n.t()` lookups; add `describe("pseudo locale")` block
- `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx`: add `useTranslation("badges")`; replace 7 hardcoded strings with `t()` calls (microcopy, a11y labels, button labels)
- `apps/native-rd/src/screens/BadgeEarnedModal/__tests__/BadgeEarnedModal.test.tsx`: add `i18n` import; switch 7 hardcoded-string assertions to `i18n.t()` lookups; add `describe("pseudo locale")` block

## Implementation Plan

### Step 1: Populate badges namespace JSON resources and update voice register

**Files**:

- `apps/native-rd/src/i18n/resources/en/badges.json`
- `apps/native-rd/src/i18n/resources/de/badges.json`
- `apps/native-rd/src/i18n/resources/pseudo/badges.json`
- `apps/native-rd/src/i18n/resources/_register/badges.yml`

**Commit**: `feat(native-rd/i18n): populate badges namespace (en + de + pseudo)`

**Changes**:

- [ ] Write `resources/en/badges.json` with all 12 keys:
  ```json
  {
    "header": "Badges",
    "empty": {
      "title": "No badges yet",
      "body": "Complete goals to earn badges. Your collection will grow here.",
      "action": "Go to Goals"
    },
    "card": {
      "untitledFallback": "Untitled"
    },
    "earned": {
      "microcopy": {
        "first": "First one. (noted.)",
        "subsequent": "Badge earned."
      },
      "a11y": {
        "card": "Badge earned",
        "image": "Badge image",
        "imagePlaceholder": "Badge image placeholder"
      },
      "actions": {
        "view": "View Badge",
        "continue": "Keep going"
      }
    }
  }
  ```
- [ ] Write `resources/de/badges.json` with German equivalents (matter-of-fact per register: "Badges" stays as English loanword per `badges.yml` note and `badgeDetail.yml` convention; microcopy stays minimal/non-achievement-porn)
- [ ] Run `bun run gen:pseudo` from `apps/native-rd/` to generate `resources/pseudo/badges.json`
- [ ] Add to `_register/badges.yml` notes section: context that `earned.*` covers the celebration modal (a11y labels, microcopy, CTA buttons), and that `card.untitledFallback` is chrome shown when `goalTitle` is null — not user-generated content

### Step 2: Migrate BadgesScreen to useTranslation("badges")

**Files**:

- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`
- `apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesScreen.test.tsx`

**Commit**: `feat(native-rd/i18n): migrate BadgesScreen to t() [badges ns]`

**Changes**:

- [ ] Add `import { useTranslation } from "react-i18next";` to BadgesScreen.tsx
- [ ] Call `const { t } = useTranslation("badges");` inside `BadgeList()` and `BadgesScreen()` (each component that renders strings needs its own hook call, or hoist to a shared component if architectural)
  - Note: `BadgeList` renders `EmptyState` strings and the `"Untitled"` fallback; `BadgesScreen` renders `<ScreenHeader title="Badges" />`. Both need `t`.
- [ ] Replace line 31 `"No badges yet"` → `t("empty.title")`
- [ ] Replace line 32 `"Complete goals to earn badges. Your collection will grow here."` → `t("empty.body")`
- [ ] Replace line 34 `"Go to Goals"` → `t("empty.action")`
- [ ] Replace line 60 `"Untitled"` → `t("card.untitledFallback")`
- [ ] Replace line 78 `<ScreenHeader title="Badges" />` → `<ScreenHeader title={t("header")} />`
- [ ] In `BadgesScreen.test.tsx`: add `import { i18n } from "../../../i18n";`
- [ ] Switch hardcoded-string assertions to `i18n.t()` lookups:
  - `"No badges yet"` → `i18n.t("badges:empty.title")`
  - `"Complete goals to earn badges. Your collection will grow here."` → `i18n.t("badges:empty.body")`
  - `"Go to Goals"` → `i18n.t("badges:empty.action")`
  - `"Badges"` (header) → `i18n.t("badges:header")`
- [ ] Add `describe("pseudo locale")` block:

  ```tsx
  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      "badges:header",
      "badges:empty.title",
      "badges:empty.body",
      "badges:empty.action",
      "badges:card.untitledFallback",
    ] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<BadgesScreen />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );
  });
  ```

  Note: `card.untitledFallback` test needs `mockUseQuery.mockReturnValue([makeBadgeRow({ goalTitle: null })])` so the fallback renders; `header`, `empty.*` tests use the default `mockUseQuery` returning `[]`.

### Step 3: Migrate BadgeEarnedModal to useTranslation("badges")

**Files**:

- `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx`
- `apps/native-rd/src/screens/BadgeEarnedModal/__tests__/BadgeEarnedModal.test.tsx`

**Commit**: `feat(native-rd/i18n): migrate BadgeEarnedModal to t() [badges ns]`

**Changes**:

- [ ] Add `import { useTranslation } from "react-i18next";` to BadgeEarnedModal.tsx
- [ ] Call `const { t } = useTranslation("badges");` inside the component body
- [ ] Replace line 54 microcopy: `isFirstBadge ? "First one. (noted.)" : "Badge earned."` → `isFirstBadge ? t("earned.microcopy.first") : t("earned.microcopy.subsequent")`
- [ ] Replace line 60 `accessibilityLabel: "Badge earned"` → `accessibilityLabel: t("earned.a11y.card")`
- [ ] Replace line 90 `accessibilityLabel="Badge image"` → `accessibilityLabel={t("earned.a11y.image")}`
- [ ] Replace line 97 `accessibilityLabel="Badge image placeholder"` → `accessibilityLabel={t("earned.a11y.imagePlaceholder")}`
- [ ] Replace line 110 `label="View Badge"` → `label={t("earned.actions.view")}`
- [ ] Replace line 115 `label="Keep going"` → `label={t("earned.actions.continue")}`
- [ ] In `BadgeEarnedModal.test.tsx`: add `import { i18n } from "../../../i18n";`
- [ ] Switch hardcoded-string assertions to `i18n.t()` lookups:
  - `"Badge earned."` (not-visible check) → `i18n.t("badges:earned.microcopy.subsequent")`
  - `"Badge image"` (getByLabelText) → `i18n.t("badges:earned.a11y.image")`
  - `"Badge image placeholder"` → `i18n.t("badges:earned.a11y.imagePlaceholder")`
  - `"First one. (noted.)"` → `i18n.t("badges:earned.microcopy.first")`
  - `"Badge earned."` (subsequent microcopy) → `i18n.t("badges:earned.microcopy.subsequent")`
  - `"View Badge"` (getByLabelText) → `i18n.t("badges:earned.actions.view")`
  - `"Keep going"` (getByLabelText) → `i18n.t("badges:earned.actions.continue")`
  - `"Badge earned"` (card a11y label) → `i18n.t("badges:earned.a11y.card")`
- [ ] Add `describe("pseudo locale")` block:

  ```tsx
  describe("BadgeEarnedModal — pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      {
        key: "badges:earned.microcopy.subsequent" as const,
        props: defaultProps,
      },
      {
        key: "badges:earned.microcopy.first" as const,
        props: { ...defaultProps, isFirstBadge: true },
      },
      { key: "badges:earned.actions.view" as const, props: defaultProps },
      { key: "badges:earned.a11y.image" as const, props: defaultProps },
      {
        key: "badges:earned.a11y.imagePlaceholder" as const,
        props: { ...defaultProps, imageUri: "pending:baked-image" },
      },
    ])(
      "renders $key as bracketed copy under pseudo locale",
      async ({ key, props }) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<BadgeEarnedModal {...props} />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(
          screen.getByText(pseudo) ?? screen.getByLabelText(pseudo),
        ).toBeOnTheScreen();
      },
    );
  });
  ```

  Note: `earned.a11y.card` is exercised via `getByLabelText` on the card `View` — confirm the pseudo string is reachable. `earned.a11y.image` and `earned.actions.*` are reachable via `getByLabelText`. Adjust the each block to use `getByLabelText` where the string is an a11y label rather than a text node.

## Testing Strategy

- [ ] Unit tests via `bun test --testPathPatterns BadgesScreen` and `bun test --testPathPatterns BadgeEarnedModal` after each commit
- [ ] Test file paths mirror `src/` under `src/screens/<Screen>/__tests__/` — already in place; no new files created
- [ ] `describe("pseudo locale")` covers 5 representative keys per screen (title, body/microcopy, CTA, a11y, fallback)
- [ ] No `test.each` needed for main assertions (distinct behaviors per test); `it.each` used for the pseudo locale smoke block
- [ ] All migrated assertions use `i18n.t("badges:key")` — no hardcoded English strings remain in the migrated tests
- [ ] Manual smoke: `EXPO_PUBLIC_I18N_PSEUDO=true` with full Metro restart; verify both screens show bracketed copy on all chrome strings; badge titles/descriptions remain literal

## Not in Scope

Items explicitly deferred from this issue:

| Item                                                                     | Reason                                       | Follow-up |
| ------------------------------------------------------------------------ | -------------------------------------------- | --------- |
| Badge designer surfaces                                                  | Out of scope per issue, separate concern     | #74       |
| Snapshot tests                                                           | Post-migration snapshot work                 | #75       |
| Translating user-generated badge content (names, descriptions, criteria) | Intentional design: this is issuer/user data | none      |
| Pluralizing badge count strings                                          | Requires Hermes Intl spike                   | #66       |
| Native German locale files (`app.json` + `locales/`)                     | Sequential phase                             | #61       |

No items are deferred beyond what the issue already named.

## Discovery Log

Discoveries made during research (2026-05-26):

- [2026-05-26] Line numbers in the issue body are exact — verified by reading both source files. No shift.
- [2026-05-26] `resources/_register/badges.yml` already exists (created ahead of content in a prior commit). The issue note "currently absent" is stale. The file has good base content (speaker, audience, formality, banned_phrasings, notes). Only needs an addendum to notes about `earned.*` context.
- [2026-05-26] `resources/en/badges.json`, `resources/de/badges.json`, and `resources/pseudo/badges.json` are all `{}` — confirmed. All three need population.
- [2026-05-26] Neither BadgesScreen nor BadgeEarnedModal has any dynamic template-literal `t()` calls (the `isFirstBadge` conditional picks one of two static keys, not a runtime-built key path). No drift-guard pairs needed in `option-key-parity.test.ts`.
- [2026-05-26] Both existing test files use hardcoded English strings exclusively — no `i18n` import present yet. Full migration of assertions required.
- [2026-05-26] `BadgeList` and `BadgesScreen` are separate function components in the same file. Both render translated strings, so both need `useTranslation("badges")` calls (or the hook can live only in `BadgeList` and `BadgesScreen` passes `title={t("header")}` — but `BadgesScreen` renders `<ScreenHeader>` directly, so it needs its own `t`). Implementer should call the hook in each component that uses `t()`.
- [2026-05-26] The `dep:blocked` label was already noted in the issue body as removed. The skill checklist item to strip it from the GitHub issue still applies — do this as part of PR creation.
- [2026-05-26] PR #198 / commit `32dbcea` (BadgeDetail migration) established the pattern: JSON populated → screen migrated → pseudo regenerated → tests updated → pseudo block added. This plan mirrors that shape exactly.
- [2026-05-26] `BadgeEarnedModal` test uses `getByLabelText("View Badge")` and `getByLabelText("Keep going")` — these are button labels exposed as a11y labels by the `Button` component. Confirmed both strings are in `label=` props on `<Button>` (lines 110, 115), not rendered text nodes. The `i18n.t()` lookup form will work the same way.
