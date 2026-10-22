# Development Plan: Issue #744

## Issue Summary

**Title:** [UI-00a] Type-scaling policy core: role caps, useTypeScale, audit test, docs
**Parent:** #741 (type-scaling policy), PR 1 of 3. Unblocks #708 and the rest of #683.
**Labels:** accessibility, app:native-rd, priority:high

React Native multiplies every `<Text>` by the OS `fontScale` with no cap, and the Low Vision theme's 1.25× size scale stacks on top. This PR lands the central policy: per-role caps, one hook that reads the OS scale, the cap applied by default in shared `Text` and `Input`, a scale-audit test, and the written policy.

## Intent Verification

- [ ] Each `Text` variant's host text gets its cap as `maxFontSizeMultiplier`; `chrome` gets 1.3; Low Vision's 1.25× is composed into the cap so the combined size stays bounded.
- [ ] Body text still reaches 2.0× its default-theme base size at OS 200%.
- [ ] `useTypeScale()` is the only OS font-scale reader in `src/`; thresholds live in `src/utils/typeScale.ts`.
- [ ] The scale-audit test is in the suite; `docs/accessibility-guidelines.md` documents caps and hook, linked from the `nd-themes.md` checklist.

## Dependencies

None. The #741 plan file named in the issue (`issue-741-type-scaling-policy.md`) is not on `main` or in any local worktree; the issue body carries the decided values, so it is the spec.

## Objective

One module owns the numbers, one hook owns the OS reading, and the shared text primitives apply the cap without callers doing anything.

## Decisions

- **D1 — Cap values from the issue:** display/headline 1.5; title/body/label/caption/mono 2.0; chrome 1.3. `LARGE_TYPE_AT = 1.3`, `ACCESSIBILITY_SIZE_AT = 1.6`.
- **D2 — Caps are combined bounds against the default theme.** `themeScale = theme.size.md / size.md` (1.25 for Low Vision, 1 otherwise). The OS multiplier handed to RN is `cap / themeScale`, so Low Vision body reaches 2.0× combined (1.25 × 1.6), not 2.5×. Chrome composes the same way.
- **D3 — Never pass an RN multiplier below 1.** RN ignores `maxFontSizeMultiplier` values in (0, 1). `capFor` clamps to ≥ 1; no current cap/theme pair hits it (1.3 / 1.25 = 1.04).
- **D4 — Theme scale from `useUnistyles().theme`,** the same source `BadgeCard`/`Input` already read, so tests can swap the theme through the existing unistyles mock.
- **D5 — `scaleFor(role) = min(fontScale, capFor(role))`:** the multiplier RN actually applies to that role's theme size. Layout math multiplies theme line heights by it.
- **D6 — BadgeCard / GoalEvidenceCard text-column nodes move to shared `Text`** (headline/body/caption variants, existing style kept). Their badge size is computed from those nodes' line heights; if the text stayed on raw RN `Text` it would scale uncapped while the badge used capped math. Other raw-`Text` nodes in those files stay for the #741 lint migration.
- **D7 — Jest font scale pinned to 1** in a setup file via `Dimensions.set`; `mockFontScale(n)` in `src/__tests__/fontScale.ts` changes it inside `act` for a test and the setup restores 1 after each test.
- **D8 — Shared `Text`/`Input` use `useThemeScale()`, not `useTypeScale()`.** They only need the theme scale; RN applies the OS scale natively, so subscribing every text node to window dimensions is wasted re-renders.
- **D9 — "Only reader" is enforced by lint** (`no-restricted-syntax` in `eslint.config.js`): `PixelRatio.getFontScale`, `fontScale` from `useWindowDimensions` or `Dimensions.get` are errors outside `useTypeScale.ts`.
- **D10 — Audit renders at 3.571**, RN's AX5 font scale (`RCTAccessibilityManager.mm`), not the issue's 3.1 (Apple's body-text ratio). Caps are all below AX1 (1.786), so results are unchanged.

## Affected Areas

- `src/utils/typeScale.ts` (new), `src/hooks/useTypeScale.ts` (new)
- `src/components/Text/Text.tsx`, `src/components/Input/Input.tsx`
- `src/components/BadgeCard/BadgeCard.tsx`, `src/components/GoalEvidenceCard/GoalEvidenceCard.tsx`
- `jest.config.js`, `src/__tests__/setup-font-scale.ts` (new), `src/__tests__/fontScale.ts` (new)
- Tests: `src/utils/__tests__/typeScale.test.ts`, `src/hooks/__tests__/useTypeScale.test.ts`, `src/__tests__/typeScaleAudit.test.tsx`, Text/Input/card tests
- Docs: `docs/accessibility-guidelines.md`, `docs/design/nd-themes.md`

## Implementation Plan

### Step 1: Policy module and hook

- [x] `typeScale.ts`: `CAPS`, `CHROME_CAP`, `LARGE_TYPE_AT`, `ACCESSIBILITY_SIZE_AT`, `themeScaleOf(sizeScale)`, `capFor(variant, chrome, themeScale)`.
- [x] `useTypeScale.ts`: `{ fontScale, isLargeType, isAccessibilitySize, themeScale, scaleFor(role) }` from `useWindowDimensions().fontScale`.
- [x] Jest pin + `mockFontScale` helper. Unit tests for both.

### Step 2: Shared Text and Input apply the cap

- [x] `Text` defaults `maxFontSizeMultiplier` to `capFor(variant, chrome, themeScale)`; new `chrome` prop; caller prop wins.
- [x] `Input`: TextInput → body cap, label → label cap, error → caption cap; caller prop wins on the TextInput.

### Step 3: Cards read the hook

- [x] BadgeCard and GoalEvidenceCard drop `PixelRatio.getFontScale()`; per-role `scaleFor` on line heights; text-column nodes on shared `Text`.

### Step 4: Scale-audit test and docs

- [x] Audit: every variant × {default, lowVision} at fontScale 3.1 → effective size ≤ cap × default base; body at 2.0 → exactly 2.0×.
- [x] "Text scaling" section in accessibility guidelines; `nd-themes.md` checklist link; ProgressRing `adjustsFontSizeToFit` documented as the exception.

## Testing Strategy

Unit tests on the pure module, hook tests with `mockFontScale`, render tests that read `maxFontSizeMultiplier` off the host text, the audit test. Root `bun run type-check`, `bun run lint`, `bun run test`.

## Not in Scope

- Banning `Text` from `react-native` and migrating the 44 files (#741 later PR).
- Tab bar large-type treatment (#695), layout responses to `isLargeType` (#708 and other #683 leaves).
- The persisted-but-unused `userSettings.fontScale` column and badge `PathText` `fontScale` (unrelated meanings of the name).

## Discovery Log

- RN jest preset mocks `DeviceInfo` window/screen `fontScale: 2`; every test so far rendered at 2×.
- `sizeL` is exactly 1.25 × `size` on every key, so `md` ratio is a faithful theme scale.
- The #741 plan file the issue cites does not exist anywhere; the issue body was the spec.
- RN ignores `maxFontSizeMultiplier` in (0, 1) and scales `lineHeight` by the same capped multiplier (iOS `RCTAttributedTextUtils.mm`, Android `getEffectiveLineHeight`), so `lineHeight * scaleFor(role)` matches what iOS draws.
- Android 14+ scales large sp sizes non-linearly (`PixelUtil.kt`), so `scaleFor` is an upper bound there; documented on the hook.
- react-native-web reports `fontScale: 1` and drops `maxFontSizeMultiplier`, so caps are a silent no-op in Storybook web.
- BadgeCard's initials glyph was scaled twice (size from the scaled column, then the OS scale again) and overflowed its tile at AX sizes; now `allowFontScaling={false}`.

## Review (round 1, HEAD 8cffcec0)

Reviewers: code quality, test coverage, error handling (independent subagents). CodeRabbit CLI unavailable: `Connection failed: Invalid organization` (CLI 0.7.6); the GitHub CodeRabbit review runs on the PR.

| Finding                                                    | Severity | Disposition                                                                                                                        |
| ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Text/Input subscribe to window dimensions via useTypeScale | medium   | Fixed: `useThemeScale` (a85f2a0e)                                                                                                  |
| BadgeCard initials glyph double-scaled, overflows tile     | medium   | Fixed (5d4c3ec0)                                                                                                                   |
| "Only reader" not enforced                                 | medium   | Fixed: lint rule (5d4c3ec0)                                                                                                        |
| Card badge math not tied to rendered variants              | medium   | Fixed: tests pin title/description caps (5d4c3ec0)                                                                                 |
| Input tests can't tell roles apart, no Low Vision          | medium   | Fixed: Low Vision case, honest test name; roles indistinguishable while caps are equal (5d4c3ec0, a85f2a0e)                        |
| `scaleFor` exact only on iOS                               | medium   | Documented on the hook; onLayout measurement deferred (no Android acceptance here)                                                 |
| Audit ignored RN's ">= 1" rule                             | low      | Fixed (5d4c3ec0)                                                                                                                   |
| Audit/docs used 3.1 not RN's 3.571                         | low      | Fixed (a85f2a0e)                                                                                                                   |
| capForRole loop could not fail                             | low      | Replaced with literal values (5d4c3ec0)                                                                                            |
| Mock reset dropped `rt`                                    | low      | Fixed (5d4c3ec0)                                                                                                                   |
| mockFontScale in beforeAll silently reset                  | low      | Documented (5d4c3ec0)                                                                                                              |
| `fontScale` NaN guard                                      | low      | Fixed in hook (5d4c3ec0)                                                                                                           |
| Nested shared Text overrides outer cap                     | low      | Follow-up #747                                                                                                                     |
| Audit reads theme fontSize, not host style                 | low      | Skipped: StyleSheet mock always renders the default theme, so host style can't show Low Vision; multiplier is the thing under test |
| Caller `null` replaced by cap; (0,1) passes through        | low      | Kept: `??` preserves explicit 0 ("no limit"); null → policy default is the intended behaviour                                      |

## Follow-ups

- #747 — nested shared `Text` should inherit the outer role cap (from review; land with/before #745).
- Android: if card badges look oversized on Android 14+ at large font sizes, measure the text column with `onLayout` instead of predicting it (`src/hooks/useTypeScale.ts` `scaleFor`). No issue filed; no Android acceptance in #744.
