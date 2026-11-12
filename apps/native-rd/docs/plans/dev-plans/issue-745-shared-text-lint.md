# Development Plan: Issue #745

## Issue Summary

**Title:** [UI-00b] Use shared Text everywhere and ban react-native Text imports
**Parent:** #741 (type-scaling policy), PR 2 of 3. Depends on #744/#748 (merged), #708 and #711 (merged).

Raw RN `Text` skips the theme type ramp and the type-scaling caps from #744, so it grows uncapped under Dynamic Type. This PR adds a lint rule that bans it outside `components/Text/` and migrates every production file to shared `Text`.

## Intent Verification

- [ ] No production file outside `components/Text/` imports `Text` from `react-native` (`bun run lint` reports zero `local/no-native-text-import` hits).
- [ ] The rule is `error`; its tests cover unaliased, aliased, multi-line, re-export, type-only and exempt paths (component dir, `*.stories.tsx`, `__tests__/**`).
- [ ] Migrated components render the same: existing tests pass; each migrated node keeps its local style, and the variant only fills in what the local style left unset.

## Dependencies

#744 (policy core) and #748 merged; #708 and #711 merged, so the files they touched are migrated on top of them. The #741 plan file named in the issue is not on `main`; `issue-744-type-scaling-policy-core.md` and the issue body are the spec.

## Implementation Plan

### Step 1: Lint rule (warn)

- [ ] `src/eslint-rules/no-native-text-import.js`: reports `Text` / `Text as X` value imports and re-exports from `react-native`; `components/Text/` exempt in the rule.
- [ ] `eslint.config.js`: register as `warn`; `files` override turns it off for `**/*.stories.tsx` and `**/__tests__/**`.
- [ ] Tests: RuleTester cases plus lint-through-the-real-config cases for the `files` override and type-only imports.

### Step 2: Migrate the 56 files

- [ ] `src/badges/` (9 files)
- [ ] `src/components/` (43 files)
- [ ] `FocusPillTabBar` (label → `<Text variant="label" chrome>`), `BadgesWall`, `TestScreen`, `stories/design-system/shared.tsx`

### Step 3: Flip to error

- [ ] `local/no-native-text-import: "error"` in the last commit.

## Migration rules

- Variant follows the local style's font size: `xs` → `caption`, `sm` → `label` (bold/uppercase/spaced) or `metadata`, `md` → `body`, `lg` → `title`, `2xl` → `headline`, `3xl` → `taskTitle`, `4xl` → `display`. Styles that already spread `theme.textStyles.X` take variant `X`.
- Local styles stay and win. The variant adds only what the style left unset (`lineHeight`, `letterSpacing`, `fontFamily`, `color`). Where that would clip or change a fixed-size layout, the local style pins the old value.
- Chrome text (tab labels, pills, counters, overlines, status badges) gets `chrome`.
- Explicit `maxFontSizeMultiplier` / `allowFontScaling` props stay; the caller wins over the variant cap.
- Nested spans take the outer span's variant, so they don't reset inherited size/weight to `body`.

## Testing Strategy

Rule tests; existing component tests unchanged in intent. Root `bun run type-check`, `bun run lint`, `bun run test` (sequentially).

## Not in Scope

- #747 (nested shared `Text` inheriting the outer cap).
- Tab bar large-type treatment (#695) and #746's headline/chrome additions.

## Decisions

## Discovery Log

- `@typescript-eslint/parser` is not a direct dependency, so the type-only cases lint through the real config (which brings the parser via `eslint-config-expo`) instead of RuleTester.
- ESLint's config loader uses a dynamic `import()` that Jest can't run without `--experimental-vm-modules`; the config test passes `eslint.config.js` in through `overrideConfig`.

## Follow-ups
