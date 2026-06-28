# Issue #376: Tokens — redesign contract for screen header, brand accent, per-theme shadow

## Summary

Extend the current **Unistyles-only** design-token contract so the full-ride redesign has first-class semantic roles for:

1. a real screen-header band (`screenHeaderBg/Fg/Border`),
2. brand-accent surfaces that are not the neutral `accent`/`backgroundTertiary` gray, and
3. per-theme elevation/shadow behavior instead of app-local hardcoded shadow policy.

This is foundation work for the screen redesign issues (#377–#383). It should not port redesigned screens; it should make the tokens and existing header/nav/elevation primitives ready for those ports.

## Current state / research

- Branch: `feat/issue-376-tokens-redesign-contract`.
- Issue #375 has already landed and changed the token package to **Unistyles-only**:
  - no Style Dictionary CSS output is authoritative anymore,
  - build command is `packages/design-tokens: bun run build` → `build-unistyles.js`,
  - generated files live under `packages/design-tokens/build/unistyles/`.
- `packages/design-tokens/src/tokens/chrome.json` currently has:
  - `chrome-header-*` = card/web header surface (not the redesign's colored band),
  - `chrome-tab-bar-*` = bottom nav/brand-purple surface,
  - `chrome-top-bar-*` = yellow status/top bar.
- There is **no** `screen-header` token in design-tokens.
- The current app `ScreenHeader` uses `theme.colors.accentPurple` / `accentPurpleFg`, not a header semantic token.
- The current `FocusPillTabBar` also uses `theme.colors.accentPurple` for the nav band and active tab. This is already better than neutral `accent`, but the brand role is implicit and not named.
- `tokens/semantic.json` still uses `accent` as a neutral gray surface; do **not** repurpose it into brand purple because app code also uses `backgroundTertiary`/neutral accent semantics.
- `build-unistyles.js` hardcodes the generated semantic color categories in `SEMANTIC_CATEGORIES`; new chrome/brand keys must be added there or they will not appear in generated TypeScript.
- Shadows:
  - `packages/design-tokens/src/tokens/spacing.json` has `hard-sm/md/lg` root shadows.
  - theme JSON files have `theme.shadow` overrides, but `build-unistyles.js` currently emits only the root `spacing.shadow` values.
  - native-rd then adds app-local semantic roles in `apps/native-rd/src/themes/tokens.ts` (`cardElevation`, `cardElevationSmall`, `modalElevation`) and hardcodes dark tier-1 shadows off in `compose.ts`.
  - This means the package does not currently author hard shadows per theme.
- Runtime product themes are the seven in `apps/native-rd/src/themes/compose.ts`: `light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`, `light-autismFriendly`, `light-lowVision`, `light-lowInfo`.

## Decisions

| ID  | Decision                                                                                                                                                         | Alternatives                                                                    | Rationale                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Add `screen-header-*` and `brand-accent-*` keys to `tokens/chrome.json`, surfaced on `theme.chrome` as `screenHeaderBg/Fg/Border` and `brandAccentBg/Fg/Border`. | Reuse `chrome-header-*` or `chrome-tab-bar-*` directly.                         | The handoff explicitly says `chrome-header` is the old/card header and `tab-bar` is bottom nav. New semantic names prevent future screen ports from guessing.                                                 |
| D2  | Keep `semantic.accent` neutral; do not repurpose it.                                                                                                             | Make `accent` brand purple.                                                     | Existing neutral surfaces (`backgroundTertiary`, controls, inputs) rely on `accent` as gray/quiet surface. The issue asks to repoint brand-accent _off_ neutral accent, not mutate all neutral accent usages. |
| D3  | Generate package-level per-theme shadow overrides, then compose app semantic roles from those values.                                                            | Keep the existing app-only `darkShadowOverrides` and `variant.shadows.opacity`. | Acceptance asks for per-theme authored hard-offset shadow; the package must own the theme contract rather than the app inferring it.                                                                          |
| D4  | Treat issue text “Style Dictionary rebuilt” as stale; run `packages/design-tokens` `bun run build` and commit generated Unistyles outputs.                       | Reintroduce / run Style Dictionary.                                             | Issue #375 removed the Style Dictionary platforms.                                                                                                                                                            |

## Intended token values

Seed from the redesign prototype and existing contrast-fixed theme tokens. Confirm with the contrast gate before finalizing.

| Product theme | `screenHeaderBg`                            | `screenHeaderFg` | `screenHeaderBorder`        | `brandAccentBg` / `Fg` |
| ------------- | ------------------------------------------- | ---------------- | --------------------------- | ---------------------- |
| Full Ride     | `#a78bfa`                                   | `#0a0a0a`        | theme strong/default border | `#a78bfa` / `#0a0a0a`  |
| Night Ride    | `#2a1d4e`                                   | `#fafafa`        | dark strong/default border  | `#c4b5fd` / `#0a0a0a`  |
| Bold Ink      | `#000000`                                   | `#ffffff`        | `#000000`                   | `#000000` / `#ffffff`  |
| Warm Studio   | `#8860a0`                                   | `#f8f5e4`        | `#c8c3a9`                   | `#8860a0` / `#ffffff`  |
| Still Water   | use contrast-fixed muted purple (`#6d5d7d`) | `#ffffff`        | `#dddddd`                   | `#6d5d7d` / `#ffffff`  |
| Loud & Clear  | `#003d99`                                   | `#ffffff`        | `#555555`                   | `#003d99` / `#ffffff`  |
| Clean Signal  | `#222222`                                   | `#ffffff`        | `#cccccc`                   | `#222222` / `#ffffff`  |

Shadow intent:

- Default/base: `cardElevation = hardMd`, `cardElevationSmall = hardSm`, `modalElevation = hardLg`.
- Night Ride: use the dark theme’s authored `lg` cutout shadow for the hard/elevation role (acceptance: “dark uses `lg`”).
- Shadow-off themes: Bold Ink, Still Water, Loud & Clear produce zero/no shadow for card and modal elevation.
- If existing Clean Signal reduced-noise shadow overrides are preserved as no-shadow, record that as a discovery; the issue only explicitly names the three required shadow-off themes.

## Implementation plan

### Commit 1 — `feat(design-tokens): add redesign chrome semantics`

Files likely touched:

- `packages/design-tokens/src/tokens/chrome.json`
- `packages/design-tokens/src/themes/dark.json`
- `packages/design-tokens/src/themes/high-contrast.json`
- `packages/design-tokens/src/themes/dyslexia-friendly.json`
- `packages/design-tokens/src/themes/autism-friendly.json`
- `packages/design-tokens/src/themes/low-vision.json`
- `packages/design-tokens/src/themes/low-info.json`
- `packages/design-tokens/build-unistyles.js`
- generated `packages/design-tokens/build/unistyles/semanticColors.ts`

Tasks:

- Add base `screen-header-bg`, `screen-header-fg`, `screen-header-border` tokens to `chrome.json`.
- Add base `brand-accent-bg`, `brand-accent-fg`, `brand-accent-border` tokens to `chrome.json`.
- Add per-theme `theme.semantic` overrides for the six new keys.
- Extend the `Chrome` category key list in `build-unistyles.js` so generated `ChromeColors` includes the new properties.
- Run `cd packages/design-tokens && bun run build`.

### Commit 2 — `feat(design-tokens): emit per-theme shadow roles`

Files likely touched:

- `packages/design-tokens/src/themes/*.json`
- `packages/design-tokens/build-unistyles.js`
- generated `packages/design-tokens/build/unistyles/tokens.ts` or a new generated shadow module
- `packages/design-tokens/build/unistyles/index.ts`
- `apps/native-rd/src/themes/adapter.ts`
- `apps/native-rd/src/themes/tokens.ts`
- `apps/native-rd/src/themes/compose.ts`
- `apps/native-rd/src/themes/variants.ts` if variant shadow overrides become explicit

Tasks:

- Teach `build-unistyles.js` to parse shadow token strings from base `spacing.shadow` plus `theme.shadow` overrides.
- Export enough shape for native-rd to compose theme-specific shadow values (`light`/`dark` plus variant overrides, analogous to colors/narrative/chrome).
- Author hard-shadow overrides in theme JSON:
  - dark hard/elevation resolves to dark `lg`,
  - high-contrast / autism-friendly / low-vision resolve to no shadow,
  - preserve or explicitly document the intended low-info behavior.
- Move native-rd semantic shadow composition (`cardElevation`, `cardElevationSmall`, `modalElevation`) to use the per-theme package shadow values instead of app-only dark/variant inference.
- Keep existing `shadowStyle(theme, key)` call sites working.

### Commit 3 — `feat(native-rd): consume screen-header and brand-accent tokens`

Files likely touched:

- `apps/native-rd/src/components/ScreenHeader/ScreenHeader.styles.ts`
- `apps/native-rd/src/navigation/FocusPillTabBar.tsx`
- possibly `apps/native-rd/src/components/ScreenHeader/ScreenHeader.stories.tsx`

Tasks:

- Update `ScreenHeader` band styles to use:
  - `theme.chrome.screenHeaderBg`,
  - `theme.chrome.screenHeaderFg`,
  - `theme.chrome.screenHeaderBorder`.
- Add an explicit bottom border to the header band if missing so the border token is visually exercised.
- Update nav brand surfaces to use `theme.chrome.brandAccentBg/Fg` rather than `theme.colors.accentPurple` / runtime readable-color inference.
- Do not sweep unrelated `accentPurple` usages in this issue unless they are part of header/nav brand chrome; keep the PR focused.

### Commit 4 — `test(themes): cover redesign header and shadow contract`

Files likely touched:

- `apps/native-rd/src/themes/contrastPairs.ts`
- `apps/native-rd/src/themes/__tests__/contrast.test.ts`
- `apps/native-rd/src/themes/__tests__/compose.test.ts`
- possibly `apps/native-rd/src/stories/design-system/ContrastAudit.stories.tsx` if pair labels need display updates

Tasks:

- Add `screenHeader` to `contrastPairs.ts` so the CI contrast gate covers `screenHeaderFg` on `screenHeaderBg` for all seven product themes.
- Add compose/theme tests that assert:
  - every product theme has non-empty `theme.chrome.screenHeader*` and `theme.chrome.brandAccent*`,
  - `brandAccentBg` is not the neutral `backgroundTertiary`/`accent` gray role,
  - shadow-off themes (`light-highContrast`, `light-autismFriendly`, `light-lowVision`) have zero effective elevation,
  - `dark-default` uses the dark `lg` elevation value for the relevant hard/elevation role.

## Intent verification

- [x] `theme.chrome.screenHeaderBg/Fg/Border` exists for all seven product themes.
- [x] `theme.chrome.brandAccentBg/Fg/Border` exists for all seven product themes and brand-accent no longer depends on neutral `semantic.accent` / `backgroundTertiary`.
- [x] `ScreenHeader` renders from `screenHeader*`, not `theme.colors.accentPurple`.
- [x] Primary nav brand surfaces render from `brandAccent*`, not neutral accent.
- [x] `screenHeaderFg` on `screenHeaderBg` passes WCAG AA for all seven product themes.
- [x] Night Ride header is not dark-on-dark.
- [x] Shadow-off themes (Bold Ink / Still Water / Loud & Clear) have zero effective elevation.
- [x] Dark elevation uses the authored dark `lg` shadow treatment.
- [x] Generated Unistyles token outputs are rebuilt locally (`build/` is gitignored after #375's unistyles-only cleanup).
- [x] `bun run type-check` passes from repo root.
- [x] `bun run test` passes from repo root.

## Validation commands

Run focused checks during implementation:

```bash
cd packages/design-tokens && bun run build
```

```bash
bun run type-check
```

```bash
bun run test --testPathPatterns themes/__tests__
```

Final validation:

```bash
bun run type-check
bun run lint
bun run test
```

## Not in scope

| Item                                            | Reason                                                                                 | Follow-up                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Porting redesigned screens S1–S6                | This is the foundation/token issue only.                                               | #377–#382                                         |
| Replacing every `accentPurple` usage in the app | Some usages are badge/theme-picker/accent visuals outside this token-foundation slice. | Audit during relevant screen issues or V1 (#383). |
| Reintroducing Style Dictionary/CSS token builds | Removed by #375; current package is Unistyles-only.                                    | None.                                             |
| Solving badge-wall black surface token          | Called out as a discovered-during-implementation risk for S5, not pre-authored here.   | #381 / #383                                       |

## Discovery log

- [2026-06-28] `/start-issue` setup initially only fetched the issue and branch; this plan fills in the expected research/dev-plan phase.
- [2026-06-28] Issue acceptance still says “Style Dictionary rebuilt,” but `packages/design-tokens/CLAUDE.md` and #375 confirm Style Dictionary was removed. Use `bun run build` in `packages/design-tokens` to regenerate Unistyles outputs instead.
- [2026-06-28] `packages/design-tokens/build/` is ignored by git (`.gitignore:11`), so generated Unistyles files are rebuilt for validation but source JSON + builder changes are the committed artifacts.
- [2026-06-28] Full `bun run lint` and `bun run test` pass; both still print existing repository warnings unrelated to this issue (React act/open-handle test warnings and lint warnings in untouched files).
