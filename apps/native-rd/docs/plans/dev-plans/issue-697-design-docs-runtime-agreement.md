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

- [x] Every living doc that names a theme count, theme list, theme name, or variant font agrees with runtime (seven product themes; Lexend for Warm Studio; Atkinson Hyperlegible for Loud & Clear).
- [x] One theme inventory (`docs/design/nd-themes.md`) and one component contract (`docs/design/design-language.md`); other docs link to them instead of restating.
- [x] Documented action states (variants, sizes, pressed, disabled, loading, minimum target) and typography presets match `Button.styles.ts` and `compose.ts` `textStyles`.
- [x] Known runtime gaps are described as gaps with their tracking issue (#684, #691, #694), not as the contract.
- [x] A Jest doc-sync test fails if the inventory table drifts from runtime themes, labels, fonts, or size scale.
- [x] Storybook web reference previews load every font family the runtime themes use (verified in the running Storybook, not assumed).
- [x] `KeyboardAvoidingFrame` renders in Storybook web without the `findNodeHandle is not supported on web` error.
- [x] Representative composed-screen stories render the real shell (floating tab bar, safe area, keyboard frame, pinned footer) at phone size, outside the padded decorator.
- [x] Accepted ADR bodies are unchanged.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                 | Rationale                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `nd-themes.md` becomes the theme inventory: one table of the seven product themes with id, label, fonts, size and line-height scales, elevation. Per-theme hex tables are removed and point at the design-tokens sources and the Storybook Colors story. | Hand-copied hex drifted badly (e.g. documented light `accentPrimary` `#0a0a0a`, runtime `#2563eb`; documented `border` `#e5e5e5`, runtime `#262626`). Generated sources cannot drift. |
| D2  | `design-language.md` becomes the component contract and describes runtime as it is, naming the open divergences rather than an aspirational shape.                                                                                                       | Issue asks docs to agree with runtime; the divergences are tracked elsewhere.                                                                                                         |
| D3  | Pin the inventory with a Jest doc-sync test that parses the inventory table.                                                                                                                                                                             | Prevents the recurrence the issue warns about; fails on add/remove/rename/font change.                                                                                                |
| D4  | Do not edit ADR bodies, dated dev plans, research, dated quality reports, or prototype handoffs. `grades.md` is #610's.                                                                                                                                  | ADR rule 2; those files are historical records.                                                                                                                                       |
| D6  | Composed stories mirror each screen's composition with fixture data rather than rendering the screen containers.                                                                                                                                         | The containers read Evolu queries that Storybook mocks to empty; extracting presentational bodies from production screens is a refactor beyond this issue (see Follow-ups).           |
| D7  | Serve Lexend to Storybook as the two bundled TTFs (400/700) instead of four woff2 weights.                                                                                                                                                               | The woff2 files were 404 pages; native bundles exactly regular and bold, so web now matches native weight matching.                                                                   |
| D5  | `KeyboardAvoidingFrame` skips native window measurement on web.                                                                                                                                                                                          | No software keyboard offset to correct on web; `findNodeHandle` throws in react-native-web.                                                                                           |

## Implementation Plan

1. [x] Theme inventory + doc-sync test (`nd-themes.md`, `src/themes/__tests__/themeInventoryDocs.test.ts`).
2. [x] Component contract (`design-language.md`): fonts, typography presets, color roles, elevation, borders/radius, action states, inputs; examples match runtime.
3. [x] Living guidance: `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/accessibility-guidelines.md`, `docs/design/index.md`, `docs/architecture/design-token-system-map.md`, `docs/vision/design-principles.md`, `docs/vision/product-vision.md`, architecture tour, doc-gardener skill, `packages/design-tokens/CLAUDE.md`.
4. [x] Storybook web: keyboard frame web guard (+ test); Lexend font fix (+ `src/__tests__/storybook/webFonts.test.ts`); composed-screen stories (`src/stories/composed/`).
5. [x] Validate: type-check, lint, full test, Storybook web build and visual check of composed stories in two themes.
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

- [2026-10-22] Runtime colors differ widely from the old hand-copied tables (light `accentPrimary` `#2563eb` vs documented `#0a0a0a`; `border` `#262626` vs `#e5e5e5`), confirming D1.
- [2026-10-22] **Lexend never loaded in Storybook web**: `public/fonts/Lexend-*.woff2` (and copies in `assets/fonts/`) were saved Google "Error 404" HTML pages, so Warm Studio previewed in a fallback font. Confirmed with `document.fonts` (Lexend 400/700 `error`), fixed, re-verified `loaded`.
- [2026-10-22] `findNodeHandle is not supported on web` reproduced as an uncaught exception from `KeyboardAvoidingFrame` on the FinishCelebrateStage story; gone after D5. The app also has an `expo start --web` target, where the same crash would occur.
- [2026-10-22] The FocusPillTabBar story renders on this HEAD (stretched to canvas width); the composed stories now show it at device width.
- [2026-10-22] Border usage splits: shared `Card`/`Button` use `thick` (20 style files), most other bordered elements `medium` (51 files). The neo-brutalist skill taught "2px everywhere"; contract and skill now describe the split.
- [2026-10-22] Composed stories make UI-11 visible in review: _Focus · four planned types_ in Loud & Clear at 320×568 buries every evidence action under the tab pill, and at 393×852 the fourth action sits under it. Storybook observation only — native reproduction belongs to #694.

## Review findings and follow-ups

Reviewed HEAD `463025d7`. Three independent reviewers (code quality, test coverage, error handling) ran in parallel. CodeRabbit CLI was unavailable (`Connection failed: Invalid organization`); no CLI verdict is claimed. GitHub CodeRabbit can review after PR publication.

| Reviewer                 | Severity | Finding                                                                                                                                         | Disposition                                                                                                |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Tests                    | Medium   | `findNodeHandle` spy in the KAF web test never intercepted; test name over-claimed                                                              | Fixed: spy removed, case renamed to what it proves (no native measurement on web)                          |
| Tests / Errors / Quality | Low      | Spy restore outside `finally`                                                                                                                   | Fixed by removing the spy                                                                                  |
| Tests / Errors           | Low      | webFonts regex could silently skip a differently written face; only 400 checked                                                                 | Fixed: face count must equal `@font-face` count; headline families need a 700 face                         |
| Errors / Quality         | Medium   | PhoneShell `useCallback` content remounted the screen each render; missing navTheme, ToastProvider, TopInsetColorProvider                       | Fixed: stable `ContentTab` via context; App's providers; shared `navigationTheme()` extracted from App.tsx |
| Errors                   | Medium   | Modal mode does not model the iOS page-sheet offset                                                                                             | Documented in PhoneShell (a few points taller than device)                                                 |
| Errors                   | Low      | `prototypes/welcome-a-live-mirror.html` referenced deleted woff2 files                                                                          | Fixed: points at bundled TTFs                                                                              |
| Quality                  | Medium   | Store listing copy said "7 themes in light or dark … large text"                                                                                | Fixed: lists the seven actual themes                                                                       |
| Quality                  | Medium   | Composed stories copy screen JSX (already missed the header a11y props)                                                                         | Header props added; contract wording changed to "mirror"; extraction deferred (Follow-ups)                 |
| Quality                  | Low      | Border rule wrong for AnimatedSheet side edges; theme registration file misnamed; `theme.action` vs `Button` mixed guidance; heritage font line | Fixed in contract, skill, nd-themes, design-principles                                                     |
| Re-review (`ec17fbdc`)   | Low      | #691 gap row mis-described the badge-wall CTA; `theme.action` readers incomplete; heritage font line missed Atkinson                            | Fixed in contract and design-principles; all earlier findings verified fixed                               |

### Follow-ups

- **Extract presentational screen bodies** (`GoalsScreen`, `FocusModeScreen`) so composed stories render the same component as the screen instead of mirroring its JSX. Affects `src/stories/composed/ComposedScreens.stories.tsx`. Not required by #697; worth doing when #694 or #691 next touch those screens.
- **#694** should use _Composed Screens / Focus · four planned types_ as its review case and reproduce natively.
