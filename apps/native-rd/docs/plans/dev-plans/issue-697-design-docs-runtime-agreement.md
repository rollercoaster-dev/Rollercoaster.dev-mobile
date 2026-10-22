# Development Plan: Issue #697 — bring design documentation into agreement with runtime

## Workspace and scope

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/697 (UI-14 of epic #683)
- Branch: `codex/issue-697` (manual run, no manager reservation)
- Base: `0b20541ed0d407194532f40a2a4bab26008092cd` (`origin/main`, 2026-10-22)
- Scope: living design/accessibility/agent guidance, one theme inventory, one component contract, Storybook web reference previews (fonts, keyboard frame, composed-screen stories), and a doc-sync test.
- Coordinates with #610 (stale docs prune — owns `docs/quality/grades.md`, `docs/plans/active/`, dev-plans README) and #604 (screenshots / accessibility strip — owns `docs/design/screenshots/`).

## Runtime facts (source of truth for the docs)

- **Themes:** seven product themes — `productThemeEntries` in `src/themes/compose.ts`, `themeOptions` in `src/hooks/useTheme.ts`, labels in `src/i18n/resources/*/common.json` `theme.options`. Dark is a peer theme (`dark-default`, "Night Ride"), not an axis. `largeText` and `dark-<variant>` pairs are composable for tests/previews only.
- **Fonts:** body Instrument Sans, headline Anybody, mono DM Mono; Warm Studio (dyslexia) uses Lexend for body + headline; Loud & Clear (lowVision) uses Atkinson Hyperlegible for body + headline. OpenDyslexic ships in assets but no product theme uses it.
- **Scales:** Loud & Clear uses `sizeL` (1.25×); Warm Studio uses `lineHeightL`. `textStyles` presets use fixed multipliers, so `lineHeightL` does not reach them yet (#684).
- **Elevation:** semantic shadow roles `cardElevation` / `cardElevationSmall` / `modalElevation` via `shadowStyle(theme, key)`. Hard offset shadows in The Full Ride and Clean Signal; Night Ride uses a 6pt drop cutout; Warm Studio uses soft low shadows; Bold Ink, Still Water, Loud & Clear have none.
- **Actions:** shared `Button` — variants primary/secondary/ghost/destructive, sizes sm/md/lg, 48pt minimum, 3pt border, `cardElevation`, pressed = 2pt translate + collapsed shadow, disabled = 0.4 opacity, loading = spinner + disabled. Focus and badge-wall CTAs diverge (#691).

## Intent Verification

- [ ] Every living doc that names a theme count, theme list, theme name, or variant font agrees with runtime (seven product themes; Lexend for Warm Studio; Atkinson Hyperlegible for Loud & Clear).
- [ ] One theme inventory (`docs/design/nd-themes.md`) and one component contract (`docs/design/design-language.md`); other docs link to them instead of restating.
- [ ] Documented action states (variants, sizes, pressed, disabled, loading, minimum target) and typography presets match `Button.styles.ts` and `compose.ts` `textStyles`.
- [ ] Known runtime gaps are described as gaps with their tracking issue (#684, #691, #694), not as the contract.
- [ ] A Jest doc-sync test fails if the inventory table drifts from runtime themes, labels, fonts, or size scale.
- [ ] Storybook web reference previews load every font family the runtime themes use (verified in the running Storybook, not assumed).
- [ ] `KeyboardAvoidingFrame` renders in Storybook web without the `findNodeHandle is not supported on web` error.
- [ ] Representative composed-screen stories render the real shell (floating tab bar, safe area, keyboard frame, pinned footer) at phone size, outside the padded decorator.
- [ ] Accepted ADR bodies are unchanged.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                 | Rationale                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `nd-themes.md` becomes the theme inventory: one table of the seven product themes with id, label, fonts, size and line-height scales, elevation. Per-theme hex tables are removed and point at the design-tokens sources and the Storybook Colors story. | Hand-copied hex drifted badly (e.g. documented light `accentPrimary` `#0a0a0a`, runtime `#2563eb`; documented `border` `#e5e5e5`, runtime `#262626`). Generated sources cannot drift. |
| D2  | `design-language.md` becomes the component contract and describes runtime as it is, naming the open divergences rather than an aspirational shape.                                                                                                       | Issue asks docs to agree with runtime; the divergences are tracked elsewhere.                                                                                                         |
| D3  | Pin the inventory with a Jest doc-sync test that parses the inventory table.                                                                                                                                                                             | Prevents the recurrence the issue warns about; fails on add/remove/rename/font change.                                                                                                |
| D4  | Do not edit ADR bodies, dated dev plans, research, dated quality reports, or prototype handoffs. `grades.md` is #610's.                                                                                                                                  | ADR rule 2; those files are historical records.                                                                                                                                       |
| D5  | `KeyboardAvoidingFrame` skips native window measurement on web.                                                                                                                                                                                          | No software keyboard offset to correct on web; `findNodeHandle` throws in react-native-web.                                                                                           |

## Implementation Plan

1. [ ] Theme inventory + doc-sync test (`nd-themes.md`, test under `src/__tests__/docs/`).
2. [ ] Component contract (`design-language.md`): fonts, typography presets, color roles, elevation, borders/radius, action states, inputs; examples match runtime.
3. [ ] Living guidance: `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/accessibility-guidelines.md`, `docs/design/index.md`, `docs/architecture/design-token-system-map.md`, `docs/vision/design-principles.md`, `docs/vision/product-vision.md`, architecture tour, doc-gardener skill, `packages/design-tokens/CLAUDE.md`.
4. [ ] Storybook web: keyboard frame web guard (+ test); confirm/fix font loading; composed-screen stories.
5. [ ] Validate: type-check, lint, full test, Storybook web build and visual check of composed stories in two themes.
6. [ ] Review (code quality, tests, error handling), fix, finalize PR.

## Not in Scope

| Item                                                          | Reason / follow-up |
| ------------------------------------------------------------- | ------------------ |
| Fixing typography inheritance / `lineHeightL` in `textStyles` | #684 (UI-01)       |
| Unifying Focus / badge-wall action treatments                 | #691 (UI-08)       |
| Small-screen action-group bounds                              | #694 (UI-11)       |
| `grades.md`, `docs/plans/active/`, dev-plans README           | #610               |
| Real app screenshots, accessibility strip                     | #604               |

## Discovery Log

- [2026-10-22] `.storybook-web/preview.tsx` already injects `@font-face` for Anybody, Instrument Sans, DM Mono, Lexend, Atkinson Hyperlegible, OpenDyslexic from `public/fonts/`. Needs a running check, not assumption.
- [2026-10-22] The decorator wraps every story in a padded `ScrollView`; `flex: 1` children (e.g. a nested `SafeAreaProvider`) collapse there — likely why the FocusPillTabBar story showed nothing.

## Review findings and follow-ups

_(filled during review)_
