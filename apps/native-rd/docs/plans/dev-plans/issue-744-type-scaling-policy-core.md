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

## Affected Areas

- `src/utils/typeScale.ts` (new), `src/hooks/useTypeScale.ts` (new)
- `src/components/Text/Text.tsx`, `src/components/Input/Input.tsx`
- `src/components/BadgeCard/BadgeCard.tsx`, `src/components/GoalEvidenceCard/GoalEvidenceCard.tsx`
- `jest.config.js`, `src/__tests__/setup-font-scale.ts` (new), `src/__tests__/fontScale.ts` (new)
- Tests: `src/utils/__tests__/typeScale.test.ts`, `src/hooks/__tests__/useTypeScale.test.ts`, `src/__tests__/typeScaleAudit.test.tsx`, Text/Input/card tests
- Docs: `docs/accessibility-guidelines.md`, `docs/design/nd-themes.md`

## Implementation Plan

### Step 1: Policy module and hook

- [ ] `typeScale.ts`: `CAPS`, `CHROME_CAP`, `LARGE_TYPE_AT`, `ACCESSIBILITY_SIZE_AT`, `themeScaleOf(sizeScale)`, `capFor(variant, chrome, themeScale)`.
- [ ] `useTypeScale.ts`: `{ fontScale, isLargeType, isAccessibilitySize, themeScale, scaleFor(role) }` from `useWindowDimensions().fontScale`.
- [ ] Jest pin + `mockFontScale` helper. Unit tests for both.

### Step 2: Shared Text and Input apply the cap

- [ ] `Text` defaults `maxFontSizeMultiplier` to `capFor(variant, chrome, themeScale)`; new `chrome` prop; caller prop wins.
- [ ] `Input`: TextInput → body cap, label → label cap, error → caption cap; caller prop wins on the TextInput.

### Step 3: Cards read the hook

- [ ] BadgeCard and GoalEvidenceCard drop `PixelRatio.getFontScale()`; per-role `scaleFor` on line heights; text-column nodes on shared `Text`.

### Step 4: Scale-audit test and docs

- [ ] Audit: every variant × {default, lowVision} at fontScale 3.1 → effective size ≤ cap × default base; body at 2.0 → exactly 2.0×.
- [ ] "Text scaling" section in accessibility guidelines; `nd-themes.md` checklist link; ProgressRing `adjustsFontSizeToFit` documented as the exception.

## Testing Strategy

Unit tests on the pure module, hook tests with `mockFontScale`, render tests that read `maxFontSizeMultiplier` off the host text, the audit test. Root `bun run type-check`, `bun run lint`, `bun run test`.

## Not in Scope

- Banning `Text` from `react-native` and migrating the 44 files (#741 later PR).
- Tab bar large-type treatment (#695), layout responses to `isLargeType` (#708 and other #683 leaves).
- The persisted-but-unused `userSettings.fontScale` column and badge `PathText` `fontScale` (unrelated meanings of the name).

## Discovery Log

- RN jest preset mocks `DeviceInfo` window/screen `fontScale: 2`; every test so far rendered at 2×.
- `sizeL` is exactly 1.25 × `size` on every key, so `md` ratio is a faithful theme scale.

## Follow-ups

(none yet)
