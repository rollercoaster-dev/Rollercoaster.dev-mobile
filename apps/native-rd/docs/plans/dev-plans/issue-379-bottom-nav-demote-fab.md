# Development Plan: Issue #379

## Issue Summary

**Title**: Bottom Nav: demote + new goal, resolve secondary tensions (S5 owns resume)
**Type**: enhancement / needs:design
**Complexity**: MEDIUM
**Estimated Lines**: ~200 lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a
user/system perspective — not generic checklists.

- [x] The yellow circular FAB (`testID="tab-fab-new-goal"`) no longer occupies the center slot
      of the main pill — the FAB is removed outright and the slot reclaimed by the 3-slot track.
- [x] `+ new goal` is still reachable — relocated to the Goals list header as an `IconButton`
      (`testID="goals-header-new-goal"`, a11y label `goals:actions.newGoal`).
- [x] SettingsTab is visible in the nav bar without a detached separate pill — folded into the
      single pill as an equal third slot (D5).
- [x] The bar is visually and functionally identical across Goals, Badges, and Settings contexts
      (only the active-knob slide + colour through-line change on the active tab).
- [x] No duplicate global resume control. The bar adds no "resume goal" action — that stays with
      S5 (#381).
- [x] No hardcoded hex in the nav bar's own styles — verified (`#0a0a0a` plus-ink left with the
      FAB; the knob ink is token-driven). Contrast gate is green across all 7 themes. _On-device /
      Storybook visual sweep across the 7 themes remains as a manual pre-merge check._
- [x] `PILL_LIFT` constant and `useTabScreenContentInset` are unchanged — neither was touched.
- [x] `EvidenceDrawer` coupling holds: the bar's outer geometry (container bg,
      `marginTop: -PILL_LIFT`, pill `PILL_HEIGHT`) is unchanged, so
      `DRAWER_CLOSED_HEIGHT = PEEK_HEIGHT + PILL_LIFT` stays correct. _On-device
      peek-alignment confirmation remains a manual check._
- [x] All existing `FocusPillTabBar` a11y contract tests pass; new behavior (D9 colour matrix,
      Settings reachable, header new-goal) has coverage in `FocusPillTabBar.test.tsx` /
      `GoalsScreen.test.tsx`.

## Dependencies

| Issue | Title                                                              | Status          | Type    |
| ----- | ------------------------------------------------------------------ | --------------- | ------- |
| #375  | Tokens: fix theme contrast failures (Prep Spec §1)                 | ✅ Met (CLOSED) | Blocker |
| #376  | Tokens: extend contract for redesign — screen-header, brand-accent | ✅ Met (CLOSED) | Blocker |

**Status**: ✅ All dependencies met — F1 (#375) and F2 (#376) are both closed.

The tokens this issue needs are in the built output:

- `theme.chrome.brandAccentBg/Fg/Border` — the purple pill surface (already used).
- `theme.chrome.screenHeaderBg/Fg/Border` — landed in F2; available per all 7 themes.
- `theme.chrome.chromeTopBarBg/Fg` — yellow top bar tokens; available.

Note: `theme.colors.accentYellow` (used for the FAB `backgroundColor` at line 284 of
`FocusPillTabBar.tsx`) is not a semantic chrome token — it is a raw palette value that does
not adapt across themes. This pre-existed F2. See D1.

## Objective

Demote the `+ new goal` FAB from the loud central slot in the pill tab bar. Resolve the five
secondary tensions in the Bottom Nav handoff brief (Badges peer-status, Settings detachment,
label-morph/lift complexity vs. low-load mandate, bar stability across contexts). Preserve the
`PILL_LIFT` / `useTabScreenContentInset` / `EvidenceDrawer` coupling. Do not add a global
resume control (that belongs to S5, issue #381).

## Current Implementation (verified against source)

### `FocusPillTabBar.tsx` — key facts

- **PILL_HEIGHT** = 64 (line 26). **PILL_LIFT** = `PILL_HEIGHT / 2 + borderWidth.medium` = 34
  (approximately, depending on theme borderWidth; line 32). Exported for consumers.
- **Layout**: `<View style={styles.bar}>` has `marginTop: -PILL_LIFT` (line 237). Bar contains
  `styles.pill` (flex: 1, the main pill) and `styles.settingsPill` (a separate smaller pill for
  Settings, line 239).
- **Center slot**: `<View style={styles.center}>` is `width: 56` (line 249). It holds the FAB
  when `showFab` is true (line 111: `showFab = activeName !== "SettingsTab"`).
- **FAB**: `Pressable` at lines 177–195. Navigates to `GoalsTab → NewGoal`. `testID="tab-fab-new-goal"`.
- **FAB color problem**: `backgroundColor: theme.colors.accentYellow` (line 284). The `plusIcon`
  text color is hardcoded `"#0a0a0a"` (line 296) with an inline comment explaining the contrast
  choice. This is the one existing hardcoded hex. It is a pre-existing condition — not introduced
  by this issue — but if the FAB is removed or restyled, the comment becomes moot.
- **Settings pill**: separate rounded pill at `styles.settingsPill` (line 240). The "detached
  afterthought" the brief calls out.
- **Label morph**: active tab expands, inactive tabs are 48×48 circles. `LayoutAnimation` at
  220 ms, respects `useAnimationPref`.
- **i18n keys used**: `navigation.tabs.goals`, `navigation.tabs.badges`,
  `navigation.tabs.settings`, `navigation.fab.newGoal` (line 179).

### `TabNavigator.tsx` — key facts

- Registers three screens: `GoalsTab`, `BadgesTab`, `SettingsTab` (lines 25–27).
- `tabBarStyle` is transparent/no-border; all visual styling is in `FocusPillTabBar`.
- The FAB dispatches to `GoalsTab → NewGoal` (a route in `GoalsStack`; type confirmed at
  `src/navigation/types.ts` line 39).

### `useTabScreenContentInset.ts` — coupling

Returns `{ paddingBottom: 2 * PILL_LIFT + insets.bottom + space[4] }`. Consumed by 6+ screens
and components. Any change to `PILL_LIFT` ripples here; any change to the bar's physical height
or lift could break scroll clearance.

### `EvidenceDrawer.styles.ts` — coupling

`DRAWER_CLOSED_HEIGHT = PEEK_HEIGHT + PILL_LIFT` (line 11). The drawer's closed bottom sits
hidden behind the lifted pill; visible peek = 56 px. If `PILL_LIFT` changes or the bar's
positioning changes, the drawer will show a gap or overlap.

### Consumers of `PILL_LIFT` / `useTabScreenContentInset`

Files that must stay correct after any structural change to the bar:

1. `src/navigation/useTabScreenContentInset.ts` — computes bottom padding
2. `src/components/EvidenceDrawer/EvidenceDrawer.styles.ts` — `DRAWER_CLOSED_HEIGHT`
3. `src/screens/GoalsScreen/GoalsScreen.tsx`
4. `src/screens/BadgesScreen/BadgesScreen.tsx`
5. `src/screens/SettingsScreen/SettingsScreen.tsx`
6. `src/screens/EditModeScreen/EditModeScreen.tsx`
7. `src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`
8. `src/screens/CaptureTextNote/CaptureTextNote.tsx`
9. `src/components/VideoRecorder/VideoRecorder.tsx`
10. `src/dev/IntlProbeScreen.tsx`
11. `src/components/EvidenceDrawer/EvidenceDrawer.tsx` (via `DRAWER_CLOSED_HEIGHT`)

If `PILL_LIFT` is not changed, none of these need touching.

## Decisions

This issue is labeled `needs:design`. The brief left five secondary tensions unresolved. They
were **resolved with the maintainer in-session (2026-06-28)** — see D4–D8. D7 (active-tab
treatment) is now **decided: B — The Slide** (chosen by eye across the 7 themes from the
Storybook comparison). The **next phase implements The Slide into the app** — see the
Implementation Plan.

| ID  | Decision                                                                                                                                                                                                                                                                                              | Alternatives Considered                                                                                                     | Rationale                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The `plusIcon` hardcoded `"#0a0a0a"` disappears with the FAB                                                                                                                                                                                                                                          | Token it via an on-accent fg token                                                                                          | The FAB is being removed outright (D4), so its locked-ink comment is moot. (The Slide treatment, D7-B, reintroduces the same dark-on-accent problem on its knob — see token gap below.)                                                                                                                                                                                             |
| D2  | Do NOT add a global resume control to the nav bar                                                                                                                                                                                                                                                     | Resume prompt in center slot                                                                                                | S5 (issue #381) owns resume. S3 and S5 must be designed coherently. Adding resume here would duplicate S5's cockpit and split attention.                                                                                                                                                                                                                                            |
| D3  | Keep `PILL_LIFT` constant unchanged                                                                                                                                                                                                                                                                   | Rework bar height                                                                                                           | Changing the lift cascades to 11 consumers. Both candidate treatments keep the lift, so none of the consumers need touching.                                                                                                                                                                                                                                                        |
| D4  | **Drop the `+ new goal` FAB**; relocate `+ new` to the **Goals list header** (in-screen, not in the bar)                                                                                                                                                                                              | Overflow on Goals tab; collapsed secondary pill                                                                             | New-goal is a rare action; the prototypes (`Bottom Nav Directions` / `Cool Directions`) consistently put `+ new` in the Goals list. Keeps the bar to pure switching.                                                                                                                                                                                                                |
| D5  | **Fold Settings into the main pill** as a 3rd equal segment; remove the detached `settingsPill`                                                                                                                                                                                                       | Retain detached pill; relocate to profile/overflow                                                                          | Resolves the "afterthought" tension with the least disruption; ≤3 destinations preserved (Goals / Badges / Settings).                                                                                                                                                                                                                                                               |
| D6  | **Badges stays an equal peer**; keep the half-lifted pill + label morph as the brand character                                                                                                                                                                                                        | Demote Badges to a quiet icon; flatten the bar                                                                              | Maintainer prefers the current bar's feel ("big fan of what we have"); low-risk, no geometry change.                                                                                                                                                                                                                                                                                |
| D7  | **Active-tab treatment: B — The Slide** (chosen 2026-06-28). A chunky knob snapping over a 3-slot track, carrying the active label, with a per-destination colour through-line: Goals=`accentYellow`, Badges=`accentMint`, Settings=`accentPurple`, each with dark ink (`KNOB_INK`) for icon + label. | A — Updated current (morph capsule, 3 tabs); Continue bar; resume-in-center (rejected — lead with resume, which D2 forbids) | Maintainer chose The Slide by eye across the 7 themes — the distinctive "feel" play. Ships hex-clean once the on-accent fg tokens land (Step 0).                                                                                                                                                                                                                                    |
| D8  | Bar stays **globally stable** across contexts                                                                                                                                                                                                                                                         | Adapt inside Focus Mode                                                                                                     | Predictability is better for this ND audience; the FAB-hides-on-Settings rule is removed (no FAB).                                                                                                                                                                                                                                                                                  |
| D9  | **Conditional colour through-line** (2026-06-28, Phase 2). Per-destination hue (Goals=yellow / Badges=mint / Settings=purple) in `default` (light+dark), `highContrast`, `lowVision`; a **single calm `brandAccent` active fill** in `dyslexia`, `autismFriendly`, `lowInfo`.                         | Universal hue in all 7; uniform fill in all 7                                                                               | Phase-2 contrast pass found the bright `accentYellow`/`accentMint` **don't** mute in the calm variants (only `accentPurple` does), so a 3-hue knob there breaks the muted/reduced-noise mandate **and** the chip edge vanishes (`border` vs bg < 2:1). `brandAccent` is gate-verified, calm, and gives a visible edge (vsBg ≥ 4.5). Maintainer confirmed against the measured spec. |

## Design Comparison Artifact

Two candidate treatments are built side by side as a throwaway Storybook story so the D7 choice
can be made by eye across all 7 themes:

- **File**: `apps/native-rd/src/navigation/BottomNavRedesign.stories.tsx`
- **Story**: `Navigation/Bottom Nav Redesign (#379)` → `Compare`
- View with `bun run storybook:web` (port 6006) and flip the theme toolbar.

Both candidates share D4–D6/D8 (no FAB, Settings folded into the pill, lift kept, Badges peer)
and import the real `PILL_LIFT`/`PILL_HEIGHT` to prove the coupling is untouched. They differ
only in the active treatment:

- **A — Updated current**: the existing label-morph capsule, now with 3 tabs. `LayoutAnimation`
  is a no-op under react-native-web, so it renders as static snap states in web Storybook — an
  honest preview (the morph only animates on native).
- **B — The Slide**: a knob carrying the active label with a per-destination colour through-line —
  Goals=`accentYellow`, Badges=`accentMint`, Settings=`accentPurple`, each with locked dark ink
  (`KNOB_INK`) for the icon + label. The accent tokens hold their hue across light/dark so the ink
  stays readable in every theme. The glide is a web-only CSS transition (native snaps,
  like the morph). NOTE: the RN `Animated` API breaks the story under react-native-web + the
  unistyles babel plugin — avoid it here; a native implementation can use `Animated`/Reanimated.

**Token gap surfaced by B (The Slide):** the coloured knob needs dark ink for contrast on
yellow/mint/white in _both_ color modes. There is an `accentPurpleFg` precedent but **no**
`accentYellowFg` / `accentMintFg` on-accent foreground tokens. The prototype locks `#0a0a0a`
(mirroring the current FAB hack) and flags it. **If B is chosen, shipping it hex-clean across
7 themes requires adding those on-accent fg tokens first** (a small `design-tokens` change,
possibly a sub-task). A — Updated current — has no such gap; it reuses `chrome.brandAccentFg`.

**Decision: B — The Slide** (2026-06-28), with Settings on `accentPurple`. **Phase 2 then refined
the colour model** from "one dark ink on three hue knobs everywhere" to a **conditional
through-line** (D9) after measuring the real tokens — see _Phase 2 — Results_. It graduates into
`FocusPillTabBar.tsx` in Phase 3 (see Implementation Plan); the stories file is then deleted.

## Affected Areas

- `apps/native-rd/src/navigation/FocusPillTabBar.tsx`: Remove or relocate the center FAB;
  resolve structural questions about Settings pill and label morph per design answer.
- `apps/native-rd/src/navigation/TabNavigator.tsx`: Likely unchanged unless a new navigator
  pattern is introduced.
- `apps/native-rd/src/__tests__/FocusPillTabBar.test.tsx`: Update FAB visibility tests;
  add/update tests for new affordance placement.
- Possibly `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx`: If `+ new goal` moves
  to an in-screen header button, the trigger lives here, not in the tab bar.
- Possibly `apps/native-rd/src/i18n/locales/en/common.json` (and other locales): If the FAB
  key `navigation.fab.newGoal` is removed from the tab bar, ensure the key either stays
  (used elsewhere) or is cleaned up and synced across all locale files.

**Note:** `PILL_LIFT`, `useTabScreenContentInset`, and `EvidenceDrawer` should NOT be modified
unless the design answer changes the bar's physical lift.

## Implementation Plan

**Phase 1 — research + design comparison (DONE).** Built the Storybook comparison
(`BottomNavRedesign.stories.tsx`); D7 decided = **B (The Slide)** with Settings on `accentPurple`.
Colours so far are designed for the **Full Ride (default)** theme only.

**Phase 2 — theme design pass (DONE, 2026-06-28).** Validated The Slide across the **7 product
themes** (not "14 combos" — variants are a _light-only_ axis; see Phase 2 Results). The Phase-1
"locked dark ink on three hue knobs in every theme" assumption is **false** against the real
tokens. Resolved to a **conditional through-line** (D9): per-destination hue in
default/highContrast/lowVision, a single calm `brandAccent` fill in dyslexia/autismFriendly/lowInfo.
Output = the locked per-theme colour spec below. No app code changes (probe test computed the
spec, then deleted). See **Phase 2 — Results**.

**Phase 3 — integration (DONE, 2026-06-28).** Landed the tokens (Phase-2 spec) and ported The
Slide into the real `FocusPillTabBar.tsx`: demoted the FAB, relocated `+ new goal` to the Goals
header, folded Settings into the pill, replaced the morph with the snapping knob, added the D9
colour matrix tests, deleted the prototype story. Shipped as three commits (token addition →
FAB relocation → bar redesign). Steps 0–5 below assumed locked decisions D4–D9, treatment B, and
the Phase-2 colour spec. Full suite green (9153 tests); contrast gate green ×7. See Discovery Log.

---

## Phase 2 — Results (locked per-theme colour spec)

**Goal:** confirm The Slide reads correctly — and is _appropriate_ — in every theme, and design
the right colours where the Full Ride palette doesn't transfer. **Deliverable (below):** a locked
per-theme colour spec that becomes the token values in Phase 3. No production code changes (a
throwaway probe test computed every ratio off the real composed themes, then was deleted).

### Scope correction: 7 product themes, not 14 combos

The plan originally assumed "7 variants × light/dark = 14 combos." **That is wrong.** Variants are
a **light-only** product axis (`compose.ts` → `productThemeEntries`): the runtime registry is
exactly **7 themes** — `light-default`, **`dark-default`**, and the six light variants
`light-{highContrast,dyslexia,autismFriendly,lowVision,lowInfo}`. There is no `dark-highContrast`
etc. in the product, and the CI contrast gate (`contrast.test.ts`) loops those same 7. (`largeText`
appears in `variantOptions` but is **not** registered and not reachable via `ThemeSwitcher` — a
pre-existing dead option, out of scope for #379.) Phase 2 therefore validated **7 themes**.

### Method

The Slide's knob ink/contrast was computed deterministically with the CI gate's own
`getContrastRatio` (`src/utils/accessibility.ts`) over the real `composeTheme()` output for all 7
product themes × 3 active states — more rigorous than eyeballing Storybook (where the native
animation can't render anyway). Thresholds: AA 4.5:1 (normal) / 3:1 (large + non-text), **AAA
7:1 / 4.5:1** for `highContrast` + `lowVision`. The knob **label is bold 14px = "large text"**;
the knob **icon is a graphical object = non-text 3:1**.

### What the measurements overturned

The Phase-1 prototype hard-locked one dark ink (`KNOB_INK #0a0a0a`) on three raw-accent knobs in
every theme. Against the resolved tokens that fails three ways:

1. **Ink is not universally dark.** `accentMint` flips to dark green `#1a3a2a` in **dark mode**
   (dark ink = 1.6:1, illegible → needs **white**). `accentPurple` is muted to mid-greys
   (`#606060` / `#555555` / `#666666`) in highContrast / lowVision / lowInfo where dark ink fails
   and **white** is required. The existing **`accentPurpleFg`** token already encodes the correct
   on-purple ink per theme — so Settings needs **no new token**.
2. **The bright accents don't mute in the calm themes.** `accentYellow` (#ffe50c) and `accentMint`
   (#d4f4e7) stay full-brightness in dyslexia / autismFriendly / lowInfo (only `accentPurple` is
   muted per-variant). A loud 3-hue knob there violates the muted / reduced-noise mandate.
3. **The knob loses its shape in the calm themes.** Raw accent fill vs the pill bg is ~1.1:1
   (luminance), so the chip relies on its `border` — but `border` vs bg also fails 3:1 in dyslexia
   (1.6), autismFriendly (1.3), lowInfo (1.6). The "chunky knob" dissolves in exactly those three.

→ Resolution: **conditional through-line (D9)**.

### Spec A — through-line themes (per-destination hue)

`default` (light+dark), `highContrast`, `lowVision`. Ratios are knob-ink-on-knob-bg.

| Theme                      | Goals knob (bg · ink)                                    | Badges knob (bg · ink)                               | Settings knob (bg · ink)                                |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `light-default`            | `accentYellow` #ffe50c · `accentYellowFg` #0a0a0a (15.5) | `accentMint` #d4f4e7 · `accentMintFg` #0a0a0a (16.9) | `accentPurple` #a78bfa · `accentPurpleFg` #0a0a0a (7.3) |
| `dark-default`             | #ffe50c · #0a0a0a (15.5)                                 | #1a3a2a · `accentMintFg` **#fafafa** (12.5)          | #8d7eb0 · `accentPurpleFg` #0a0a0a (5.4 ¹)              |
| `light-highContrast` (AAA) | #ffe50c · #0a0a0a (15.5)                                 | #d4f4e7 · #0a0a0a (16.9)                             | #606060 · `accentPurpleFg` **#ffffff** (6.3 ¹)          |
| `light-lowVision` (AAA)    | #ffe50c · #0a0a0a (15.5)                                 | #d4f4e7 · #0a0a0a (16.9)                             | #555555 · `accentPurpleFg` **#ffffff** (7.5)            |

¹ Settings label is bold/large, so AA-large 3:1 / AAA-large 4.5:1 applies — 5.4 and 6.3 pass; the
icon (non-text 3:1) also clears. Chip edge in these themes is carried by `colors.border`
(borderVsBg: default 14.5, HC 21, LV 7.5) since the bright fill has low luminance contrast.

### Spec B — uniform-fill themes (single calm active treatment, all destinations)

`dyslexia`, `autismFriendly`, `lowInfo`. One `brandAccent` fill regardless of destination — already
gate-verified, calm, and (unlike the raw accents) gives the knob a **visible edge**.

| Theme                  | Active fill (`chrome.brandAccentBg`) | Ink (`chrome.brandAccentFg`) | ink ratio | knob vs pill bg |
| ---------------------- | ------------------------------------ | ---------------------------- | --------- | --------------- |
| `light-dyslexia`       | #8860a0                              | #ffffff                      | 5.0       | 4.5             |
| `light-autismFriendly` | #6d5d7d                              | #ffffff                      | 6.0       | 5.6             |
| `light-lowInfo`        | #222222                              | #ffffff                      | 15.9      | 15.9            |

### Always-on (every theme)

- **Idle slot icon** = `colors.textSecondary` on the pill bg: ≥ 4.4:1 in all 7 (non-text 3:1
  cleared) — no change needed.

### Phase-3 token impact (feeds Step 0)

- **Add `accentYellowFg`** = `#0a0a0a` in all 7 themes (yellow is #ffe50c everywhere; passes AAA).
- **Add `accentMintFg`** = `#0a0a0a` in the 6 light themes; **`#fafafa` in `dark-default`** (the
  one genuinely mode-dependent value — mint flips to a dark surface there).
- **`accentPurpleFg` unchanged** — already the correct on-purple ink per theme.
- **No muted-accent _background_ tokens needed** — `brandAccent*` (existing) supplies the uniform
  fill for the three calm themes. This collapses the plan's earlier "muted accent backgrounds"
  worry and means **no Phase-2 sub-issue** — the 2 fg tokens stay within #379.

---

## Phase 3 — Integration

Steps 0–5 port The Slide into the app using the Phase-2 colour spec.

### Step 0: Add on-accent foreground tokens (prerequisite for hex-clean ship)

**Files**: `packages/design-tokens/` (+ regenerate), `src/themes/colorModes.ts` / adapter
**Commit**: `feat(design-tokens): add accentYellowFg / accentMintFg on-accent fg tokens`
**Changes**:

- [ ] Add `accentYellowFg` = `#0a0a0a` across all 7 product themes (Phase-2 value).
- [ ] Add `accentMintFg` = `#0a0a0a` in the 6 light themes, **`#fafafa` in `dark-default`**
      (Phase-2 value — the one mode-dependent ink). The Slide's knob ink then comes from tokens
      instead of the prototype's locked `#0a0a0a` (`KNOB_INK`).
- [ ] **`accentPurpleFg` unchanged** — Phase 2 confirmed it already carries the correct on-purple
      ink per theme (white in highContrast/lowVision, dark in default/dark).
- [ ] **No muted-accent background tokens** — Phase 2 resolved the calm themes
      (dyslexia/autismFriendly/lowInfo) to the existing `chrome.brandAccent*` uniform fill (D9), so no
      new background tokens are needed.

> If splitting work: this 2-token addition can be its own small sub-task/PR landing before the
> nav change, keeping the `FocusPillTabBar` PR hex-clean from the first commit.

---

### Step 1: Demote the FAB from center slot

**Files**: `apps/native-rd/src/navigation/FocusPillTabBar.tsx`
**Commit**: `feat(native-rd/nav): demote + new goal FAB from center pill slot`
**Changes**:

- [ ] Remove the `<View style={styles.center}>` block and its FAB `Pressable` from the pill
      layout (lines 175–195).
- [ ] Remove or repurpose the `styles.center` style (line 248–252). If center space is
      reclaimed by the pill tabs, update `styles.leftGroup` / `styles.rightGroup` flex allocation.
- [ ] Remove the `showFab` variable (line 111) if no longer needed.
- [ ] Remove the `styles.fab` and `styles.plusIcon` style blocks (lines 280–297) if the FAB
      is not relocated within this file.
- [ ] Remove the `t("navigation.fab.newGoal")` call if the FAB leaves the tab bar entirely.
      Verify the i18n key is not used elsewhere before removal.
- [ ] Keep `PILL_LIFT`, `PILL_HEIGHT`, and the pill's outer dimensions unchanged — the
      `EvidenceDrawer` coupling must not be disturbed.

> **Settled (D4)**: `+ new goal` leaves the bar entirely and is relocated to the **Goals list
> header** (an in-screen control owned by `GoalsScreen`, see Affected Areas) — so the FAB is
> removed outright here, not re-placed within the bar.

---

### Step 2: Resolve Settings pill placement

**Files**: `apps/native-rd/src/navigation/FocusPillTabBar.tsx`
**Commit**: `feat(native-rd/nav): consolidate Settings into main pill / resolve detachment`
**Changes** (D5 — merge):

- [ ] Collapse `styles.settingsPill` into `styles.pill`: one flex row with all three tabs
      (Goals / Badges / Settings) and no center FAB slot.
- [ ] Remove the separate `<View style={styles.settingsPill}>` block (lines 203–208) and the
      `styles.settingsPill` style (line 240).
- [ ] Distribute the three tabs evenly in the single pill (e.g. `justifyContent: space-between`),
      replacing the old `leftGroup` / `center` / `rightGroup` split.

---

### Step 3: Build The Slide active-tab treatment (D7 = B)

**Files**: `apps/native-rd/src/navigation/FocusPillTabBar.tsx`
**Commit**: `feat(native-rd/nav): slide-knob active-tab treatment with colour through-line`
**Changes**:

- [ ] Replace the per-tab label-morph (`TabButton` + `tabActive`/`tabCollapsed` + the 220 ms
      `LayoutAnimation`) with a single knob over a 3-slot track. Port the structure from
      `BottomNavRedesign.stories.tsx` (`SlideVariant`): track + absolutely-positioned knob carrying
      the active icon + label.
- [ ] Animate the knob's `translateX` on the **native** path with `Animated`/Reanimated (gated by
      `useAnimationPref` — reduce-motion just snaps). The prototype's web-only CSS-transition hack is
      a Storybook concession; native gets a real driven animation. Keep `useNativeDriver: true` for
      `translateX`.
- [ ] **Conditional colour treatment per D9** (gate on `theme.variant`):
  - through-line themes (`default` light+dark, `highContrast`, `lowVision`) → per-destination hue
    via tokens: Goals=`accentYellow`/`accentYellowFg`, Badges=`accentMint`/`accentMintFg`,
    Settings=`accentPurple`/`accentPurpleFg`.
  - calm themes (`dyslexia`, `autismFriendly`, `lowInfo`) → single uniform knob fill
    `chrome.brandAccentBg` / `chrome.brandAccentFg`, identical for all three destinations.
  - No `KNOB_INK` hex in production. (See the Phase-2 Spec A/B tables for the exact per-theme
    values and the measured ratios each must preserve.)
- [ ] Keep each slot's hit target ≥ 44×44; preserve `accessibilityRole="tab"` + `selected`
      state + label on every destination (a11y contract).
- [ ] Keep `PILL_HEIGHT` / `PILL_LIFT` unchanged.
- [ ] After porting, **delete `BottomNavRedesign.stories.tsx`** (throwaway comparison artifact).

---

### Step 4: Update tests

**Files**: `apps/native-rd/src/__tests__/FocusPillTabBar.test.tsx`
**Commit**: `test(native-rd/nav): update FAB and layout contract tests after tab bar redesign`
**Changes**:

- [ ] Remove or replace the three FAB visibility tests (`it.each` at lines 101–117`) that
assert the old `tab-fab-new-goal` `testID` behavior.
- [ ] Remove the "FAB has correct accessibility label" test (line 119) if the FAB leaves the
      bar.
- [ ] Remove the "FAB navigates to NewGoal" dispatch test (line 127) if the FAB leaves the
      bar.
- [ ] Add test(s) for the new `+ new goal` affordance location (wherever it lands).
- [ ] Add test for Settings tab being reachable in the consolidated layout (if merged into main
      pill).
- [ ] Verify the three original tab role/label tests (lines 66–79) still pass unchanged —
      the accessibility contract for navigation must not regress.

---

### Step 5: 7-theme visual verification

**Files**: None (verification only)
**Commit**: N/A — part of implementation commit or a verification note in the Discovery Log
**Changes**:

- [ ] Run Storybook ThemeSwitcher across all 7 themes on the nav bar.
- [ ] Confirm no hardcoded hex remains in `FocusPillTabBar.tsx` after the FAB removal (the
      `#0a0a0a` on `plusIcon` goes away with the FAB; `accentYellow` ref also goes away).
- [ ] Confirm no hardcoded hex introduced by new affordances.
- [ ] Confirm `EvidenceDrawer` peek alignment is unchanged in at least one theme on device or
      simulator.

## Testing Strategy

- [ ] Unit tests: `src/__tests__/FocusPillTabBar.test.tsx` (Jest 30, `@testing-library/react-native` v13)
- [ ] Test file mirrors the existing file (no rename needed).
- [ ] Use `test.each` for per-theme or per-tab FAB-visibility equivalents of the removed tests.
- [ ] Do NOT delete the a11y contract tests for tab role, label, and selected state — those are
      accessibility regression anchors.
- [ ] Manual testing steps:
  1. Run `npx expo run:ios` on simulator.
  2. Confirm the center slot is empty (no yellow FAB).
  3. Tap Goals, Badges, Settings — confirm bar is stable (no per-context mutation).
  4. Find and tap `+ new goal` in its new location; confirm navigation to `NewGoal` screen.
  5. Open an evidence drawer while on the Goals tab — confirm the peek height aligns flush
     with the pill bottom (no transparent strip, no overlap).
  6. Switch between all 7 themes via Settings; confirm bar renders correctly in each.
  7. Toggle `shouldReduceMotion = true` (or set animation pref to "none"); confirm no morph
     animation fires.

## Not in Scope

Items explicitly deferred from this issue.

| Item                                                     | Reason                                                                                                              | Follow-up                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Global "resume current goal" control in nav              | S5 (#381) owns the momentum cockpit; duplicating it here splits attention                                           | #381                                          |
| Adapting bar per context (inside Focus Mode)             | Brief says "stable across contexts" is preferred for this ND audience; if a variation case emerges, file separately | none yet                                      |
| Replacing `accentYellow` FAB color with a semantic token | FAB is being demoted; fixing the raw palette ref is moot once it's gone                                             | If FAB persists, file token hygiene follow-up |
| Set B & C / planning features                            | Out of scope for whole redesign milestone                                                                           | Separate epic                                 |
| V1 redesign-verify (7-theme walkthrough audit)           | That is issue #383, blocked by all S1–S6                                                                            | #383                                          |
| Badge Detail redesign                                    | Issue #380                                                                                                          | #380                                          |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-28] **Phase 2 done.** Product registry is **7 themes**, not 14 (variants are light-only;
  `dark-default` is the only dark theme). `largeText` is in `variantOptions` but unregistered/
  unreachable — pre-existing dead option, out of scope.
- [2026-06-28] The Phase-1 Slide assumption (one dark ink on three hue knobs in every theme) is
  **false** vs real tokens: `accentMint` → dark green in dark mode (needs white ink); `accentPurple`
  → mid-grey in HC/LV/lowInfo (needs white ink); bright yellow/mint **don't** mute in the calm
  themes and the knob border vanishes there (border vs bg < 2:1).
- [2026-06-28] Resolved to **conditional through-line (D9)** — hue in default/HC/LV, uniform
  `brandAccent` fill in dyslexia/autismFriendly/lowInfo. Phase-3 tokens reduced to **2 fg tokens**
  (`accentYellowFg`, `accentMintFg`); `accentPurpleFg` already correct; **no** muted-bg tokens. No
  sub-issue needed. Computed via a throwaway probe test (deleted), not screenshots.
- [2026-06-28] **Phase 3 shipped.** Three commits:
  1. `feat(design-tokens)` — added `accentYellowFg`/`accentMintFg` (colors.json + dark.json flip +
     build-unistyles wiring) and locked them into the contrast gate (`knobGoals`/`knobBadges`,
     green ×7). The build emits the Phase-2 values exactly (light `#0a0a0a`; dark mint-fg `#fafafa`).
  2. `feat(native-rd/nav)` relocation — FAB removed; `+ new goal` moved to the Goals `ScreenHeader`
     right slot as an `IconButton`. The `newGoal` label moved `common:navigation.fab` →
     `goals:actions` across en/de + regenerated pseudo. FAB tests dropped; GoalsScreen header-button
     tests added.
  3. `feat(native-rd/nav)` redesign — Settings folded into one pill; morph replaced by the slide
     knob (native `Animated` translateX, `useNativeDriver`, gated by `useAnimationPref`); D9
     conditional colour; prototype story deleted.
- [2026-06-28] **Two implementation discoveries vs the plan:**
  (a) D4's relocation was load-bearing, not optional — the FAB was the **only** new-goal entry from
  a _populated_ Goals list (the empty state has its own CTA), so a `GoalsScreen` header button had
  to be built, not just "the FAB removed."
  (b) The slide knob is correctly **hidden from the a11y tree** (the slots own role/label/selected),
  so RNTL's `getByText` can't see the knob's visible label by default — the active-label test opts
  into `includeHiddenElements: true`. `gen:pseudo` also surfaced pre-existing padding-dot drift in
  three unrelated pseudo files; reverted those to keep the diff scoped.
- [2026-06-28] **Remaining manual check (not blocking the code):** on-device / Storybook visual
  sweep of the bar across all 7 themes + EvidenceDrawer peek alignment. Code-level coupling
  (`PILL_LIFT`/`PILL_HEIGHT`/outer geometry) is provably untouched; the visual confirmation is a
  pre-merge eyeball, not a code change.
