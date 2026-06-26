# Development Plan: Issue #375

> ## ⚑ Status & Approach (updated 2026-06-26)
>
> **This issue pivoted from a narrow contrast patch to a harness-first big-bang cleanup of `packages/design-tokens` (Decision A — strip to unistyles-only).** Build the validation gate first, then refactor against it. Original handoff: `/tmp/handoff-design-tokens-cleanup-2026-06-26.md`.
>
> **Phase 0 — the gate — is DONE (uncommitted, branch `feat/issue-375-theme-contrast-fixes`).** Shipped:
>
> - `apps/native-rd/src/themes/contrastPairs.ts` — 10 canonical fg/bg pairs as `ComposedTheme` accessors (the shared source of truth).
> - `apps/native-rd/src/themes/__tests__/contrast.test.ts` — extended with a list-driven audit (7 themes × 10 pairs) gated by a **shrinking `KNOWN_FAILURES` allowlist** (8 reds today). CI-green; each fix PR deletes its line(s). 91 tests pass.
> - `apps/native-rd/src/stories/design-system/ContrastAudit.stories.tsx` — renders all 7 themes × pairs with live ratio + PASS/AMBER/FAIL badges (RN port of Theme Eval's audit).
> - `apps/native-rd/src/themes/colorModes.ts` — declared `highlight`/`highlightForeground` on `Colors` (they already flow at runtime via the adapter; declaring them lets the pair accessor compile).
>
> Verified: `bun run type-check` ✓, `eslint` ✓ (changed files), `bun run test --testPathPatterns themes/__tests__` ✓ (93).
>
> **CRITICAL — two token paths.** The gate measures the **unistyles** path (`build/unistyles → adapter.ts → ComposedTheme`). The issue-researcher's table below (20 cells) traced the **dead CSS** path (`build/css`). They diverge:
>
> - `success`/`warning`/`info` foregrounds **do not exist in the RN theme** — `build-unistyles.js` never emits them; `adapter.ts` re-adds `success/warning/info` as bg-only from the palette. So the gate can't see those rows yet. **Surfacing + theming feedback foregrounds into the unistyles output IS Phase 1** (each pair joins `contrastPairs.ts` in the PR that births its token).
> - `large-text` is not a registered product theme (`themeNames` = 7; it inherits light colors), so the researcher's rows 19–20 collapse into rows 1–2.
> - Source-JSON edits (e.g. darkening `color.primary`) feed BOTH paths, so those recipes still apply; feedback-token edits only reach unistyles after the `build-unistyles.js` change.
>
> **Next: Phase 1.** See "Phase plan" below.

## Issue Summary

**Title**: Tokens: fix theme contrast failures (Prep Spec §1)
**Type**: accessibility / bug
**Complexity**: MEDIUM
**Estimated Lines**: ~120 lines changed in JSON sources + ~80 lines for regression test

## Intent Verification

- [ ] Every fg/bg pair in the §1 table measures >= 4.5:1 when computed by the regression test script.
- [ ] `bun run build` (from `packages/design-tokens/`) completes without error; `build/css/themes.css` and `build/unistyles/*.ts` are regenerated.
- [ ] `bun run type-check` and `bun run test` are both green from the repo root.
- [ ] Re-opening `Theme Eval.dc.html` in a browser (after build) shows no red cells in §1 across all 7 themes.
- [ ] The new regression test in `apps/native-rd/src/themes/__tests__/contrast.test.ts` asserts all 20 resolved pairs >= 4.5:1 and would have caught the pre-fix failures.

## Dependencies

No blocking dependencies. `order:1` label confirms this is a Wave 1 issue.

| Issue | Title | Status | Type |
| ----- | ----- | ------ | ---- |
| none  | —     | —      | —    |

**Status**: All dependencies met.

## Objective

Build a CI-enforced contrast validation gate (done — Phase 0), then drive every theme's fg/bg pairs to ≥4.5:1 against it, then strip the design-tokens package to the unistyles-only path (Decision A).

## Phase plan (harness-first; reviewable PRs ~≤500 LOC each)

- **Phase 0 — the gate. ✅ DONE.** `contrastPairs.ts` + list-driven `contrast.test.ts` (KNOWN_FAILURES ratchet) + `ContrastAudit` story. See status banner.
- **Phase 1 — theme the feedback foregrounds (root-cause).** Teach `build-unistyles.js` to emit `success/warning/info` (+`-foreground`) per-theme into the unistyles `Colors`; replace the bg-only palette re-adds in `adapter.ts`; add `successForeground/warningForeground/infoForeground` to native-rd `Colors`; add the 3 pairs to `contrastPairs.ts`; theme them green per the researcher's D2/D3/D4/D11/D12/D13 recipes. Each new pair lands red→green within this PR.
- **Phase 2 — remaining contrast cells.** Clear the 8 current `KNOWN_FAILURES` (primary, destructive-amber, dyslexia highlight, autism tab bars) via the source-JSON edits in the researcher's recipes (D1/D6/D7/D9/D10 + Bold-Ink destructive). Delete each line from KNOWN_FAILURES as it goes green.
- **Phase 3+ — Decision A strip.** Delete the dead Style Dictionary platforms (css/js/tailwind/tamagui), `build-themes.js`, `css/narrative.css`; reduce `bun run build` to `build-unistyles.js`; drop dead `exports` subpaths + vestigial `publishConfig`/`verify-css.js`; reconcile naming; update `packages/design-tokens/CLAUDE.md`. Pre-deletion: confirm the separate `~/Code/rollercoaster.dev/landing` repo isn't vendoring `/css*`.

## Ground Truth — the gate (unistyles path, 8 reds, 2026-06-26)

These are the live `KNOWN_FAILURES` from the gate (7 product themes × 10 pairs = 70 cells; 8 fail). All are in the primary / destructive-amber / tab-bar family — none are feedback foregrounds (those aren't yet in the RN theme; see banner).

| themeName            | pair        | ratio | fg → bg               |
| -------------------- | ----------- | ----- | --------------------- |
| light-default        | primary     | 3.52  | `#fafafa` → `#3b82f6` |
| light-dyslexia       | primary     | 4.23  | `#fafafa` → `#4e7d9e` |
| light-dyslexia       | destructive | 4.26  | `#333333` → `#b5913a` |
| light-dyslexia       | highlight   | 4.42  | `#ffffff` → `#4e7d9e` |
| light-highContrast   | destructive | 4.31  | `#ffffff` → `#cc5500` |
| light-autismFriendly | destructive | 3.02  | `#333333` → `#8a7a5a` |
| light-autismFriendly | tabActive   | 3.94  | `#ffffff` → `#8a7a9a` |
| light-autismFriendly | tabIdle     | 3.21  | `#333333` → `#8a7a9a` |

## Appendix: Researcher's CSS-path failures + token recipes (re-verify against the gate)

> The 20-cell table and the D1–D13 / Step 1–7 recipes below are the issue-researcher's original CSS-path analysis. They remain the **substantive fix guidance** for Phases 1–2, but: (a) source-JSON edits apply to both paths; (b) feedback-foreground recipes only reach the gate after the Phase 1 `build-unistyles.js` change; (c) re-confirm each post-fix ratio by re-running the gate (`bun run test --testPathPatterns themes/__tests__/contrast`), not the stale `Theme Eval.dc.html` numbers.

## Ground Truth: Current Failures (verified against build output 2026-06-26)

All values resolved by tracing `var()` chains through `build/css/tokens.css` + per-theme CSS. The Prep Spec listed 17 cells; the current codebase has 20 (Prep Spec's Night/success 1.84 and Night/info 2.44 are now fixed by dark.json's color inversions; Still/warning and Still/info are new failures; Warm/primary is also newly failing).

| #   | Theme                           | Pair        | FG        | BG        | Ratio |
| --- | ------------------------------- | ----------- | --------- | --------- | ----- |
| 1   | Full Ride (light)               | primary     | `#fafafa` | `#3b82f6` | 3.52  |
| 2   | Full Ride (light)               | success     | `#fafafa` | `#059669` | 3.61  |
| 3   | Night Ride (dark)               | warning     | `#fafafa` | `#fbbf24` | 1.60  |
| 4   | Bold Ink (high-contrast)        | destructive | `#ffffff` | `#cc5500` | 4.31  |
| 5   | Bold Ink (high-contrast)        | success     | `#fafafa` | `#008866` | 4.27  |
| 6   | Bold Ink (high-contrast)        | warning     | `#262626` | `#cc5500` | 3.51  |
| 7   | Warm Studio (dyslexia-friendly) | primary     | `#ffffff` | `#4e7d9e` | 4.42  |
| 8   | Warm Studio (dyslexia-friendly) | destructive | `#333333` | `#b5913a` | 4.26  |
| 9   | Warm Studio (dyslexia-friendly) | success     | `#fafafa` | `#4a8a62` | 3.94  |
| 10  | Warm Studio (dyslexia-friendly) | highlight   | `#ffffff` | `#4e7d9e` | 4.42  |
| 11  | Still Water (autism-friendly)   | destructive | `#333333` | `#8a7a5a` | 3.02  |
| 12  | Still Water (autism-friendly)   | tab-active  | `#ffffff` | `#8a7a9a` | 3.94  |
| 13  | Still Water (autism-friendly)   | tab-idle    | `#333333` | `#8a7a9a` | 3.21  |
| 14  | Still Water (autism-friendly)   | success     | `#fafafa` | `#5a8a6a` | 3.81  |
| 15  | Still Water (autism-friendly)   | warning     | `#333333` | `#8a7a5a` | 3.02  |
| 16  | Still Water (autism-friendly)   | info        | `#fafafa` | `#5a7a9a` | 4.29  |
| 17  | Loud & Clear (low-vision)       | warning     | `#262626` | `#995500` | 2.63  |
| 18  | Clean Signal (low-info)         | warning     | `#222222` | `#995500` | 2.77  |
| 19  | Large Text (inherits light)     | primary     | `#fafafa` | `#3b82f6` | 3.52  |
| 20  | Large Text (inherits light)     | success     | `#fafafa` | `#059669` | 3.61  |

Rows 19 and 20 are a corollary of rows 1 and 2: `large-text.json` has no color overrides, so fixing the base light tokens automatically fixes large-text.

## Decisions

| ID  | Decision                                                                                                        | Alternatives Considered                                                  | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Darken `color.primary` in `colors.json` from `#3b82f6` → `#2563eb`                                              | (a) keep blue-500, darken in semantic override; (b) flip fg to `#0a0a0a` | `#2563eb` is the already-named `primary-dark` in the palette; no new color introduced. Semantic override would require touching every theme that doesn't override primary-bg. Dark fg on blue also works but changes the neo-brutalist white-on-color button feel.                                                                                                                                                                                                                                          |
| D2  | Darken `color.success` in `colors.json` from `#059669` → `#047857`                                              | (a) flip fg to dark (`#0a0a0a`); (b) per-theme overrides                 | `#047857` is emerald-700, one step darker, preserves the green tone across all themes simultaneously. Dark fg on green contradicts the existing white-text-on-green intent.                                                                                                                                                                                                                                                                                                                                 |
| D3  | Add `warning-foreground: #0a0a0a` to `dark.json` semantic block                                                 | Change `color.gray.800` in dark theme                                    | The warning-foreground is currently inheriting the dark-mode inverted gray-800 (`#fafafa`), which produces white-on-amber (1.60:1). Adding an explicit semantic override is the minimal, surgical fix. Does not affect other tokens that correctly use gray-800 in dark mode.                                                                                                                                                                                                                               |
| D4  | Fix Bold Ink destructive + warning via `color.warning` → `#c25000` and add `warning-foreground: #ffffff`        | Separate fixes for destructive-bg and warning-foreground                 | Bold Ink's `action-destructive-bg` overrides explicitly to `#cc5500` in semantic; `warning` resolves through `color.warning = #cc5500`. To fix both with a single change, darken `color.warning` to `#c25000` (4.73 on white) AND add `warning-foreground: #ffffff` override. This makes warning-fg white on the darker orange.                                                                                                                                                                             |
| D5  | Fix Bold Ink success via `color.success` → `#007755`                                                            | Keep `#008866` and add explicit fg                                       | `#007755` gives 5.34:1 on `#fafafa`. This is a per-theme color override, does not affect the base.                                                                                                                                                                                                                                                                                                                                                                                                          |
| D6  | Fix Warm Studio primary + highlight both via `action-primary-bg` semantic override → `#3a6280`                  | Darken `color.primary` in dyslexia theme                                 | highlight resolves through `interactive.highlight` → `#4e7d9e`; action-primary-bg is in the semantic block → `#4e7d9e`. Adding `action-primary-bg: #3a6280` in semantic (already present) and a new `chrome-top-bar-bg` is NOT needed. The highlight path goes through `interactive.highlight`, not semantic, so add `highlight: #3a6280` to the `interactive` block and update the existing `action-primary-bg` semantic key. Both then share `#3a6280` (existing `color.primary-dark` in dyslexia theme). |
| D7  | Fix Warm Studio destructive via `action-destructive-fg` → `#1a1a1a`                                             | Darken the gold bg                                                       | `#1a1a1a` on `#b5913a` = 5.86:1. The gold amber is part of the dyslexia-friendly warm feel; nudging fg to near-black preserves it.                                                                                                                                                                                                                                                                                                                                                                          |
| D8  | Fix Warm Studio success via `color.success` → `#3a7050` in dyslexia theme                                       | Flip to dark fg                                                          | `#3a7050` on `#fafafa` = 5.57:1. Per-theme override, does not affect base.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D9  | Fix Still Water tab-bar via `chrome-tab-bar-bg → #6d5d7d` + `chrome-tab-bar-fg → #eeeeee`                       | Darken only; keep dark idle fg                                           | `#6d5d7d` (existing `secondary-dark`) gives `#ffffff` active-fg = 5.98:1. Idle `#333333` on `#6d5d7d` = 2.11 (still fails), so idle-fg must also flip to near-white. `#eeeeee` gives 5.15:1. Both active and idle now use light-on-dark, consistent with each other.                                                                                                                                                                                                                                        |
| D10 | Fix Still Water destructive + warning via `action-destructive-fg → #111111` + new `warning-foreground: #111111` | Darken the bg colors                                                     | Both fail on the same `color.warning = #8a7a5a` bg. Darkening that bg would also affect warning's visual identity across the theme. Nudging both foregrounds to `#111111` (4.51:1) is the minimal change.                                                                                                                                                                                                                                                                                                   |
| D11 | Fix Still Water success via `color.success → #446858`                                                           | Flip fg to dark                                                          | `#446858` on `#fafafa` = 5.98:1. This is a per-theme override. Dark fg contradicts the existing white-text-on-green intent.                                                                                                                                                                                                                                                                                                                                                                                 |
| D12 | Fix Still Water info via `color.info → #4a6a8a`                                                                 | Flip fg                                                                  | `#4a6a8a` on `#fafafa` = 5.41:1. Per-theme override.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D13 | Fix Loud & Clear + Clean Signal warning via `warning-foreground: #ffffff` in each theme's semantic block        | Change `color.warning` bg                                                | Both themes use `#995500` (dark amber) as the warning bg; `#ffffff` on `#995500` = 5.75:1. Adding a semantic `warning-foreground` override is cleaner than darkening a color that's already quite dark.                                                                                                                                                                                                                                                                                                     |

## Affected Areas

- `packages/design-tokens/src/tokens/colors.json`: change `color.primary` and `color.success` (fixes rows 1, 2, 19, 20)
- `packages/design-tokens/src/themes/dark.json`: add `warning-foreground` to `semantic` block (fixes row 3)
- `packages/design-tokens/src/themes/high-contrast.json`: change `color.warning`, add `warning-foreground` to semantic block, update `action-destructive-bg` in semantic block, change `color.success` (fixes rows 4, 5, 6)
- `packages/design-tokens/src/themes/dyslexia-friendly.json`: update `interactive.highlight`, update `action-primary-bg` semantic, add `action-destructive-fg` semantic, change `color.success` (fixes rows 7, 8, 9, 10)
- `packages/design-tokens/src/themes/autism-friendly.json`: add `action-destructive-fg` + `warning-foreground` semantic, update `chrome-tab-bar-bg` + `chrome-tab-bar-fg` semantic, change `color.success` + `color.info` (fixes rows 11, 12, 13, 14, 15, 16)
- `packages/design-tokens/src/themes/low-vision.json`: add `warning-foreground` to semantic block (fixes row 17)
- `packages/design-tokens/src/themes/low-info.json`: add `warning-foreground` to semantic block (fixes row 18)
- `apps/native-rd/src/themes/__tests__/contrast.test.ts`: add §1 regression suite asserting all 20 resolved pairs >= 4.5:1

## Exact Token Changes (verified ratios)

### Step 1 source: `colors.json` (base light theme — also affects large-text)

| Key             | Old       | New       | New ratio         | Pair    |
| --------------- | --------- | --------- | ----------------- | ------- |
| `color.primary` | `#3b82f6` | `#2563eb` | 4.95 on `#fafafa` | primary |
| `color.success` | `#059669` | `#047857` | 5.25 on `#fafafa` | success |

### Step 2 source: `dark.json` (Night Ride)

Add to `theme.semantic`:

```json
"warning-foreground": { "$value": "#0a0a0a" }
```

New ratio: 11.86 on `#fbbf24`.

### Step 3 source: `high-contrast.json` (Bold Ink)

| Location         | Key                        | Old       | New       | New ratio         |
| ---------------- | -------------------------- | --------- | --------- | ----------------- |
| `theme.color`    | `color.warning`            | `#cc5500` | `#c25000` | — (bg)            |
| `theme.color`    | `color.success`            | `#008866` | `#007755` | 5.34 on `#fafafa` |
| `theme.semantic` | `action-destructive-bg`    | `#cc5500` | `#c25000` | 4.73 on `#ffffff` |
| `theme.semantic` | `warning-foreground` (new) | —         | `#ffffff` | 4.73 on `#c25000` |

### Step 4 source: `dyslexia-friendly.json` (Warm Studio)

| Location            | Key                           | Old       | New       | New ratio         |
| ------------------- | ----------------------------- | --------- | --------- | ----------------- |
| `theme.interactive` | `highlight`                   | `#4e7d9e` | `#3a6280` | 6.48 on `#ffffff` |
| `theme.color`       | `color.success`               | `#4a8a62` | `#3a7050` | 5.57 on `#fafafa` |
| `theme.semantic`    | `action-primary-bg`           | `#4e7d9e` | `#3a6280` | 6.48 on `#ffffff` |
| `theme.semantic`    | `action-destructive-fg` (new) | —         | `#1a1a1a` | 5.86 on `#b5913a` |

### Step 5 source: `autism-friendly.json` (Still Water)

| Location         | Key                           | Old       | New       | New ratio         |
| ---------------- | ----------------------------- | --------- | --------- | ----------------- |
| `theme.color`    | `color.success`               | `#5a8a6a` | `#446858` | 5.98 on `#fafafa` |
| `theme.color`    | `color.info`                  | `#5a7a9a` | `#4a6a8a` | 5.41 on `#fafafa` |
| `theme.semantic` | `chrome-tab-bar-bg`           | `#8a7a9a` | `#6d5d7d` | — (bg)            |
| `theme.semantic` | `chrome-tab-bar-fg`           | `#333333` | `#eeeeee` | 5.15 on `#6d5d7d` |
| `theme.semantic` | `action-destructive-fg` (new) | —         | `#111111` | 4.51 on `#8a7a5a` |
| `theme.semantic` | `warning-foreground` (new)    | —         | `#111111` | 4.51 on `#8a7a5a` |

### Step 6 source: `low-vision.json` (Loud & Clear)

Add to `theme.semantic`:

```json
"warning-foreground": { "$value": "#ffffff" }
```

New ratio: 5.75 on `#995500`.

### Step 7 source: `low-info.json` (Clean Signal)

Add to `theme.semantic`:

```json
"warning-foreground": { "$value": "#ffffff" }
```

New ratio: 5.75 on `#995500`.

## Inheritance Check

`large-text.json` has no color overrides at all — it only sets font sizes and spacing. Rows 19 and 20 (primary and success failures in large-text) are direct pass-through of the base `colors.json` values. Fixing `color.primary` and `color.success` in `colors.json` (Step 1) automatically resolves them. No additional edits needed in `large-text.json`.

Verified: after applying Step 1, large-text primary = `#fafafa` on `#2563eb` = 4.95:1 and large-text success = `#fafafa` on `#047857` = 5.25:1, both passing.

## Build Output Status

`packages/design-tokens/build/` is **gitignored** (root `.gitignore` has `build/`). The files exist on disk (populated by a local build) but are not tracked. Native-rd's `bun run type-check` and `bun run test` resolve `@rollercoaster-dev/design-tokens/unistyles` through the workspace symlink to the on-disk `build/unistyles/index.ts`, so the build outputs **must exist on disk** for CI to pass — but they do not need to be committed. CI presumably runs `bun install` (which may not rebuild) or a pre-build step.

**Action required**: After each JSON source edit, run `bun run build` from `packages/design-tokens/` and confirm the unistyles output regenerates. The build outputs in `build/` are local-only artifacts; the PR diff will contain only the JSON source changes and the new test file.

Check whether CI runs the build before tests: if `bun run test` in CI references the stale `build/unistyles/`, it will fail on type-check. This is worth confirming — look at `.github/workflows/` for a build step before test. If there is none, the plan should include a CI verification note.

## Implementation Plan

### Step 1: Fix base light theme (`colors.json`) — primary + success

**Files**: `packages/design-tokens/src/tokens/colors.json`
**Commit**: `fix(tokens): darken primary and success base colors for AA contrast`
**Changes**:

- [ ] `color.primary`: `#3b82f6` → `#2563eb` (blue-500 → blue-600; was already named `primary-dark`)
- [ ] `color.success`: `#059669` → `#047857` (emerald-600 → emerald-700)
- [ ] Update `$description` on `color.primary` to note new value
- [ ] Run `bun run build` from `packages/design-tokens/`
- [ ] Verify: primary pair `#fafafa on #2563eb` = 4.95:1, success `#fafafa on #047857` = 5.25:1, large-text inherits both fixes

### Step 2: Fix Night Ride warning (`dark.json`)

**Files**: `packages/design-tokens/src/themes/dark.json`
**Commit**: `fix(tokens/dark): override warning-foreground to near-black for AA`
**Changes**:

- [ ] Add to `theme.semantic` block: `"warning-foreground": { "$value": "#0a0a0a" }`
- [ ] Run `bun run build`
- [ ] Verify: `#0a0a0a on #fbbf24` = 11.86:1

### Step 3: Fix Bold Ink (`high-contrast.json`) — destructive, success, warning

**Files**: `packages/design-tokens/src/themes/high-contrast.json`
**Commit**: `fix(tokens/high-contrast): fix destructive, success, and warning contrast`
**Changes**:

- [ ] `theme.color.warning`: `#cc5500` → `#c25000`
- [ ] `theme.color.success`: `#008866` → `#007755`
- [ ] `theme.semantic.action-destructive-bg`: `#cc5500` → `#c25000`
- [ ] Add to `theme.semantic`: `"warning-foreground": { "$value": "#ffffff" }`
- [ ] Run `bun run build`
- [ ] Verify: destructive `#ffffff on #c25000` = 4.73:1; success `#fafafa on #007755` = 5.34:1; warning `#ffffff on #c25000` = 4.73:1

### Step 4: Fix Warm Studio (`dyslexia-friendly.json`) — primary, highlight, destructive, success

**Files**: `packages/design-tokens/src/themes/dyslexia-friendly.json`
**Commit**: `fix(tokens/dyslexia-friendly): fix primary, highlight, destructive, success contrast`
**Changes**:

- [ ] `theme.interactive.highlight`: `#4e7d9e` → `#3a6280`
- [ ] `theme.color.success`: `#4a8a62` → `#3a7050`
- [ ] `theme.semantic.action-primary-bg`: `#4e7d9e` → `#3a6280`
- [ ] Add to `theme.semantic`: `"action-destructive-fg": { "$value": "#1a1a1a" }`
- [ ] Run `bun run build`
- [ ] Verify: primary+highlight `#ffffff on #3a6280` = 6.48:1; destructive `#1a1a1a on #b5913a` = 5.86:1; success `#fafafa on #3a7050` = 5.57:1

### Step 5: Fix Still Water (`autism-friendly.json`) — 6 cells

**Files**: `packages/design-tokens/src/themes/autism-friendly.json`
**Commit**: `fix(tokens/autism-friendly): fix destructive, tab-bar, success, warning, info contrast`
**Changes**:

- [ ] `theme.color.success`: `#5a8a6a` → `#446858`
- [ ] `theme.color.info`: `#5a7a9a` → `#4a6a8a`
- [ ] `theme.semantic.chrome-tab-bar-bg`: `#8a7a9a` → `#6d5d7d`
- [ ] `theme.semantic.chrome-tab-bar-fg`: `#333333` → `#eeeeee`
- [ ] Add to `theme.semantic`: `"action-destructive-fg": { "$value": "#111111" }`
- [ ] Add to `theme.semantic`: `"warning-foreground": { "$value": "#111111" }`
- [ ] Run `bun run build`
- [ ] Verify: tab-active `#ffffff on #6d5d7d` = 5.98:1; tab-idle `#eeeeee on #6d5d7d` = 5.15:1; destructive `#111111 on #8a7a5a` = 4.51:1; success `#fafafa on #446858` = 5.98:1; warning `#111111 on #8a7a5a` = 4.51:1; info `#fafafa on #4a6a8a` = 5.41:1

### Step 6: Fix Loud & Clear and Clean Signal warning (`low-vision.json`, `low-info.json`)

**Files**: `packages/design-tokens/src/themes/low-vision.json`, `packages/design-tokens/src/themes/low-info.json`
**Commit**: `fix(tokens/low-vision,low-info): override warning-foreground to white for AA`
**Changes**:

- [ ] `low-vision.json` — add to `theme.semantic`: `"warning-foreground": { "$value": "#ffffff" }`
- [ ] `low-info.json` — add to `theme.semantic`: `"warning-foreground": { "$value": "#ffffff" }`
- [ ] Run `bun run build`
- [ ] Verify: `#ffffff on #995500` = 5.75:1 in both themes

### Step 7: Add §1 regression test

**Files**: `apps/native-rd/src/themes/__tests__/contrast.test.ts`
**Commit**: `test(themes): add §1 regression suite asserting all token pairs >= 4.5:1`
**Changes**:

- [ ] Add `import` for `getContrastRatio` (already imported)
- [ ] Add a new `describe("§1 token-source contrast — all pairs >= 4.5:1")` block
- [ ] Use `test.each` over a table of 20 resolved pairs (literal hex values from the post-fix build, NOT CSS var references)
- [ ] Each row asserts `getContrastRatio(fg, bg) >= 4.5`
- [ ] Include a comment: "Values are resolved hex from packages/design-tokens/build — update when token sources change"
- [ ] Run `bun run test --testPathPatterns contrast` and confirm all pass
- [ ] Run `bun run test` from root and confirm green

## Testing Strategy

- [ ] Unit: new `test.each` in `contrast.test.ts` covering all 20 post-fix pairs, >= 4.5:1 each
- [ ] Unit: existing `contrast.test.ts` tests must stay green (no regressions to button/tab tests already there)
- [ ] Build verification: `bun run build` in `packages/design-tokens/` must succeed after each step
- [ ] Manual: re-open `apps/native-rd/prototypes/screen-redesign/Theme Eval.dc.html` in a browser after the full build — §1 table should show all green
- [ ] Type-check: `bun run type-check` from repo root must pass (unistyles types regenerated correctly)

## Not in Scope

| Item                                                   | Reason                                                                                  | Follow-up                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| §2 divergence fixes (43 mismatched cells in App Shell) | Separate PR B scope                                                                     | Issue to be filed                         |
| `action-destructive-bg` amber vs red redesign decision | Already documented as design intent (`action.json` comment); not a contrast issue       | none                                      |
| `large-text.json` explicit color overrides             | Not needed; inherits all fixes from Step 1                                              | none                                      |
| CI build-before-test plumbing                          | Investigate separately; if CI caches stale build outputs this is a separate CI issue    | Check `.github/workflows/` for build step |
| Still Water `chrome-tab-bar-indicator`                 | Not a text-on-background pair; visual indicator only, not subject to WCAG text contrast | none                                      |

## Discovery Log

<!-- Entries added by implement skill:
- [2026-06-26 00:00] Prep Spec listed Night/success (1.84) and Night/info (2.44) as failing. Current dark.json resolves these correctly (10.30 and 7.79 respectively) due to color.white inversion — already fixed before this PR.
- [2026-06-26 00:00] Still Water has 6 failing cells (vs the Prep Spec's implied 3 for tab + 1 destructive); warning and info are additional failures not in the original spec count.
- [2026-06-26 00:00] Warm Studio primary fails (4.42) even though Prep Spec said 4.23 — likely Prep Spec measured from a different build state. The fix is the same direction.
- [2026-06-26 00:00] Bold Ink warning resolves through color.warning (not a semantic override), so fixing color.warning to #c25000 AND adding warning-foreground = #ffffff is required; adding warning-foreground alone keeps the bg at #cc5500 where #ffffff = 4.315 (still fails).
- [2026-06-26 00:00] build/ directory is gitignored (root .gitignore `build/`). Build artifacts are not committed. PR diff is JSON source + test only.
- [2026-06-26 00:00] Existing contrast.test.ts has 20 tests that all pass; none of them cover the §1 token-source pairs — they test lightColors/darkColors adapter properties and the WCAG utility, not the resolved semantic token pairs.
- [2026-06-26 00:00] scripts/verify-css.js compares build output against a reference path that no longer exists (openbadges-ui). It exits cleanly with "verification skipped" when the reference file is absent. Not relevant to this PR.
-->
