# Development Plan: Issue #699

## Issue Summary

**Title**: [UI-16] Pluralize the badge collection title
**Type**: bug (i18n)
**Complexity**: TRIVIAL (verging SMALL)
**Estimated Lines**: ~60 lines (3 JSON files x 2-line swap, ~35 lines of tests, 0 component change)

## Intent Verification

- [ ] When the user has exactly 1 badge, the wall heading (`badges-wall-count`) reads "1 badge" (en) and "1 Badge" (de), not "1 badges".
- [ ] When the user has 2+ badges, the heading reads "N badges" (en) / "N Badges" (de).
- [ ] `BadgesWall` is rendered with `count=1` and the visible heading text is asserted against the literal "1 badge", so a revert to a single `wall.count` string fails the test.
- [ ] The pseudo locale resolves both forms (`count_one` / `count_other`) so dev-time pseudo mode no longer shows "1 ƀàđğêš".

## Dependencies

| Issue | Title                                            | Status                      | Type    |
| ----- | ------------------------------------------------ | --------------------------- | ------- |
| #683  | UI consistency epic (parent)                     | Parent only, not a blocker  | Context |
| #80   | Evidence accessibility label (different surface) | Not a dependency, see Scope | None    |

**Status**: ✅ All dependencies met (no `Blocked by` / `Depends on` markers in the body). `has_blockers=false`.

## Objective

Split `badges:wall.count` into i18next plural forms `count_one` / `count_other` in `en`, `de`, and `pseudo`, so the wall heading is grammatical for 1 badge. No component change: `BadgesWall.tsx:215` already passes `{ count }`.

## Decisions

Every item below was answered from the codebase; none is an open question.

| ID  | Decision                                                                                                                                                | Alternatives Considered                                                 | Rationale (precedent)                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use i18next's `_one` / `_other` suffix keys: `wall.count_one`, `wall.count_other`. Delete the bare `wall.count`.                                        | `_zero` too; ICU/`Intl.PluralRules`-based formatter; conditional in TSX | Suffix keys are the established convention: `goals.json:4-5` (`goalCount_one/_other`), `newGoal.json:30-31`, `editGoal.json:75-76`, `common.json:129-130`, and `badges.json:22-23` itself (`credential.narrative_one/_other`). Documented at `docs/i18n.md:141-163` ("Always include `_other`").                                                                                                                                                                                   |
| D2  | No `_zero` key.                                                                                                                                         | Add `wall.count_zero`                                                   | `BadgesScreen.tsx:84-86` only renders the wall when `count > 0`; count 0 shows the separate empty state (`badges:empty.*` / `wall.empty.*`). A `_zero` key would be unreachable. `docs/i18n.md:163` also says `_zero` is optional.                                                                                                                                                                                                                                                 |
| D3  | No component change; keep `t("badges:wall.count", { count })` at `src/screens/BadgesScreen/BadgesWall.tsx:215`.                                         | Rename the key, add `defaultValue`                                      | i18next resolves `foo` -> `foo_one`/`foo_other` when `count` is passed. The lint/convention test explicitly allows a static call whose literal key is missing but has plural siblings (`src/i18n/__tests__/namespace-convention.test.ts:272-305`, cases at 549-626). The call site and its other consumers (`BadgesWall.test.tsx:93`, which uses `i18n.t("badges:wall.count", { count: 24 })`) keep working unchanged.                                                             |
| D4  | No `Intl.PluralRules` polyfill needed.                                                                                                                  | Add `@formatjs/intl-pluralrules`                                        | Hermes lacks `Intl.PluralRules`; i18next 26 falls back to `dummyRule` (`one` iff count === 1, else `other`), which matches en and de cardinals exactly. Verified in `docs/research/hermes-intl-spike-66-findings.md:51-66` and `docs/research/native-rd-translations-research.md:326` ("current en+de release works without a polyfill"). Polyfill is only a pre-req for a language with >2 plural categories.                                                                     |
| D5  | Languages to cover: `en`, `de`, `pseudo` (exactly three).                                                                                               | Add others                                                              | `supportedLngs: ["en","de","pseudo"]` at `src/i18n/index.ts:~150`; `SupportedLanguage = "en" \| "de" \| "pseudo"` at `src/i18n/language.ts:3`; NAMESPACES/resources only register those three. "Supported languages" in the issue = en + de (pseudo is dev-only, `language.ts:11-18`).                                                                                                                                                                                             |
| D6  | German forms: `count_one: "{{count}} Badge"`, `count_other: "{{count}} Badges"`. Keep the loanword "Badge".                                             | "Abzeichen"                                                             | `_register/badges.yml` notes: "noun stays as English loanword 'Badge' / 'Badges' ... Do not translate to 'Abzeichen'." Current `de/badges.json:4` is `"{{count}} Badges"`. German plurals use the same one/other categories (precedent: `de/goals.json:4`, `de/newGoal.json:30`).                                                                                                                                                                                                  |
| D7  | Hand-author `de` and `pseudo` in the same PR; do not rely on the sync bot.                                                                              | Leave `de` for the i18n-sync workflow                                   | `i18n-sync.yml` triggers on `en/**` changes, but a hand-edited `de` for a 2-key change is trivial and avoids a window where de shows English (`index.ts` comment on fallback). Pseudo is generated: run `bun run gen:pseudo` (`package.json:37`, `scripts/generate-pseudo-locale.ts`); `pseudoTransform.ts:9` preserves `_one/_other` suffixes verbatim and pseudoizes values (`pseudo-locale.test.ts:53-66`).                                                                     |
| D8  | Parity is enforced for en vs pseudo only, and it compares flattened key paths, so en and pseudo MUST both change to `count_one`/`count_other` together. | n/a                                                                     | `src/i18n/__tests__/locale-parity.test.ts:26-48` fails if en has keys pseudo lacks (or vice versa). There is no en-vs-de parity test (de may legitimately lag via fallback), but D7 keeps de in step anyway. `option-key-parity.test.ts` is unrelated to this key.                                                                                                                                                                                                                 |
| D9  | Test at component level in `BadgesWall.test.tsx` with literal strings for count 1 and count 2+, not `i18n.t(...)` round-trips.                          | Only assert via `i18n.t`                                                | The existing test (`BadgesWall.test.tsx:84-98`) builds expectations with `i18n.t("badges:wall.count", {count: 24})`, which would pass even under the bug (same function on both sides). Literal "1 badge" is the falsifiable assertion required by `.claude/rules/no-unfalsifiable-assertions.md`. Jest runs under Node (`scripts/jest-node.sh`) where real `Intl.PluralRules` exists; en/de one/other agree with `dummyRule` for 1 and 24, so the test is valid for both engines. |
| D10 | Keep `testID="badges-wall-count"`; e2e needs no change.                                                                                                 | n/a                                                                     | `e2e/flows/full-ride.yaml:587` asserts only visibility by id, not text.                                                                                                                                                                                                                                                                                                                                                                                                            |

## Affected Areas

- `apps/native-rd/src/i18n/resources/en/badges.json`: `wall.count` -> `wall.count_one` ("{{count}} badge") + `wall.count_other` ("{{count}} badges").
- `apps/native-rd/src/i18n/resources/de/badges.json`: `wall.count` -> `count_one` ("{{count}} Badge") + `count_other` ("{{count}} Badges").
- `apps/native-rd/src/i18n/resources/pseudo/badges.json`: regenerated via `bun run gen:pseudo` (`count_one` / `count_other`).
- `apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesWall.test.tsx`: add falsifiable singular + plural heading cases.
- No change: `BadgesWall.tsx`, `BadgesScreen.tsx`, `i18next.d.ts` (types derive from en JSON; confirm `bun run type-check` passes since `t("badges:wall.count", {count})` must still type-check with plural siblings, as the other `_one/_other` keys do).

## Implementation Plan

### Step 1: Split the wall count into plural forms (en, de, pseudo)

**Files**: `src/i18n/resources/en/badges.json`, `src/i18n/resources/de/badges.json`, `src/i18n/resources/pseudo/badges.json`
**Commit**: `fix(native-rd): pluralize the badge wall count heading`
**Changes**:

- [x] en: replace `"count": "{{count}} badges"` with `"count_one": "{{count}} badge"` and `"count_other": "{{count}} badges"`.
- [x] de: replace with `"count_one": "{{count}} Badge"` and `"count_other": "{{count}} Badges"`.
- [x] Run `bun run gen:pseudo` in `apps/native-rd`; confirm the diff is limited to `wall.count_one/_other` in `pseudo/badges.json`.

### Step 2: Pin singular and plural in the wall test

**Files**: `src/screens/BadgesScreen/__tests__/BadgesWall.test.tsx`
**Commit**: `test(native-rd): assert the badge wall heading singular and plural`
**Changes**:

- [x] In `describe("count header")`, add a `count={1}` case asserting `getByTestId("badges-wall-count")` text is "1 badge".
- [x] Convert/extend the existing 24 case to `test.each([[1, "1 badge"], [2, "2 badges"], [24, "24 badges"]])` asserting literal heading text (keep the `allVerifiable` overline assertion in one case).
- [x] ~~Optional (only if cheap with the existing i18n test helper): one `de` case via `i18n.changeLanguage("de")` with reset in `afterEach`, asserting "1 Badge" / "2 Badges". Skip if no precedent for language switching in screen tests (check `renderWithProviders`).~~ Skipped: no screen-test precedent for switching to `de` (only `src/i18n/__tests__/i18n.test.ts` does it).

(Steps may be squashed into one commit; two keeps the fix and its pin separately reviewable. Hooks add the DCO trailer; run `bun install` once if husky is not active.)

## Testing Strategy

- [ ] Jest (`bun run test` in `apps/native-rd`): `BadgesWall.test.tsx`, plus `src/i18n/__tests__/locale-parity.test.ts`, `namespace-convention.test.ts`, `pseudo-locale.test.ts` (must stay green: en/pseudo key parity and plural-sibling call-site resolution).
- [ ] `bun run type-check` and `bun run lint` from the repo root.
- [ ] Test file path mirrors `src/` under `__tests__/` (existing file, no new file).
- [ ] Manual (per issue "Verify on affected native screens"): earn exactly one badge on a simulator; Badges tab heading shows "1 badge"; with 2+ badges shows "N badges"; switch device language to German and confirm "1 Badge" / "N Badges"; spot-check the heading in all seven runtime themes for no layout change (string is shorter by one letter, so no overflow risk). Optional pseudo mode (`EXPO_PUBLIC_I18N_PSEUDO=true`) to confirm both forms render bracketed.

## Not in Scope

| Item                                                                                                                                                                                                                                                 | Reason                                                                                                                                                                                                            | Follow-up                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `common.json:114` `stepCard.evidenceBadge.a11y` ("{{count}} evidence items, tap to view") and `common.json:123` `goalCard.a11y.evidenceCount` ("{{count}} goal evidence items, tap to view"); callers `StepCard.tsx:215`, `GoalEvidenceCard.tsx:136` | Same "1 items" bug in screen-reader labels. Issue names #80 as covering the evidence accessibility label; different surface.                                                                                      | #80                                                      |
| `focusMode.json:90` `a11y.carousel` ("Focus mode cards, {{count}} steps"; de `focusMode.json:90`)                                                                                                                                                    | Same "1 steps" shape in an a11y label; only referenced in `FocusModeScreen.test.tsx:399` by static grep (call site may be dynamic or unused, unverified). Not the badge wall heading, and not trivially adjacent. | Suggest a small follow-up issue under #683               |
| `common.json:134-137` status counts ("{{count}} done", "{{count}} in motion", ...), `focusMode.json:21`, `focusMode.json:80`                                                                                                                         | Grammatically fine for any count (no noun to inflect). No bug.                                                                                                                                                    | none                                                     |
| `Intl.PluralRules` polyfill                                                                                                                                                                                                                          | Not needed for en/de (D4).                                                                                                                                                                                        | Revisit when adding a language with >2 plural categories |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-10-22] Researcher assumption: `de` hand-authored in this PR (D7) rather than waiting for the i18n-sync bot; `syncCore.ts` was not inspected for stale-key pruning, so if the bot runs on the PR it should find de already in step with en.
- [2026-10-22] Implemented as one commit (fix + test together, per implement skill). Confirmed the new `count=1` case fails against the pre-fix en copy (1 failed / 23 passed) and passes after.
- [2026-10-22] Line numbers cited for `src/i18n/index.ts` (`supportedLngs`) are approximate (~150); re-verify when editing if needed (no edit to that file is planned).
