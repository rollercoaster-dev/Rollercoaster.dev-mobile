# Development Plan: Issue #405

## Issue Summary

**Title**: [Integrate] BadgesScreen thin container
**Type**: feature (integration step of Epic #384, Track A)
**Complexity**: SMALL
**Estimated Lines**: ~180 lines (mostly rewritten, net small)

## Intent Verification

- [ ] With ≥1 earned badge, `BadgesScreen` renders `BadgesWall` full-bleed with `spotlight` = the most recently created badge (`rows[0]`, query is `createdAt DESC`), `gallery` = every other earned badge, and `count` = total badge count — **no purple `ScreenHeader`** above it.
- [ ] With 0 earned badges, `BadgesScreen` renders a plain `ScreenHeader` titled "Badges" above `BadgesWall`'s own built-in empty state (ghost badge + copy + CTA) — the old `EmptyState` component/copy path is gone.
- [ ] Tapping the spotlight card or any gallery cell calls `navigation.navigate("BadgeDetail", { badgeId })` with that badge's id.
- [ ] Tapping the empty-state "See my goals" CTA navigates to `GoalsTab` → `Goals`, identical to the pre-existing empty-state action.
- [ ] A badge whose goal was deleted (`goalTitle` null) falls back to `badges:card.untitledFallback` in both the spotlight and gallery.
- [ ] `bun run test --testPathPatterns BadgesScreen` green; `bun run type-check` + `bun run lint` clean.

## Dependencies

| Issue | Title                                       | Status          | Type                                 |
| ----- | ------------------------------------------- | --------------- | ------------------------------------ |
| #404  | [Storybook] BadgesWall view + story         | ✅ Met (CLOSED) | Blocker (implicit — wall must exist) |
| #403  | [Storybook] BadgeWallCell primitive + story | ✅ Met (CLOSED) | Blocker (implicit — cell must exist) |

No `Blocked by` / `Depends on` / `After` markers in the issue body; labeled `dep:independent`. Both prerequisite Storybook components are built and closed.

**Status**: ✅ All dependencies met

## Objective

Replace `BadgesScreen`'s current `BadgeList`/`BadgeCard`/`FlatList` implementation with a thin container that queries `badgesWithGoalsQuery`, maps rows to the already-built `BadgesWall` presentational component's props, and wires navigation — no new visual UI, per the issue's "no un-storied UI" constraint.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                | Alternatives Considered                                                                                                                                             | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `ScreenHeader` renders **only** in the empty branch (`count === 0`), inside the same container component that owns the query — not in the outer `BadgesScreen` wrapper. When populated, no `ScreenHeader` is rendered at all; `BadgesWall`'s own `listHeader` (count tally + overline, `BadgesWall.tsx:198-256`) is the only header.    | Always render `ScreenHeader` (old behavior); conditionally change only its title text (GoalsScreen's literal pattern, `GoalsScreen.tsx:176-185`)                    | Issue explicitly states the populated wall is full-bleed and "owns its own count header — no purple `ScreenHeader` over it," while the empty mock still shows a plain "Badges" header. GoalsScreen is cited for the _structural_ pattern (header lives in the container, conditional on state) — not for keeping the header present in both states, which doesn't apply here since `BadgesWall` (unlike `GoalsCockpit`) renders its own header when populated.                                                                                                                                                                                                                                                                                                                                                             |
| D2  | The spotlight's `earnedAt` is the **raw resolved ISO string** — `(row.completedAt ?? row.createdAt) as string \| null` — passed straight into `BadgesWallSpotlight.earnedAt`, not pre-formatted.                                                                                                                                        | Pre-format via `formatDate(..., i18n.language)` in the container, matching the issue body's literal phrasing.                                                       | `BadgesWall.tsx` already calls `formatDate(spotlight.earnedAt, i18n.language)` internally (line 245), and its own doc comment says `earnedAt` is a "Resolved ISO date string (container applies `completedAt ?? createdAt`)" (`BadgesWall.tsx:37-39`). Pre-formatting in the container would double-format (and `formatDate` on an already-formatted string like "Jan 28, 2026" returns it unchanged only by luck of `Date` parsing — not a safe assumption). Code precedent (the actual consumer) overrides the issue's shorthand phrasing.                                                                                                                                                                                                                                                                               |
| D3  | Gallery items map to `{ id, title, design }` only — no date field, matching `BadgesWallGalleryItem` (`BadgesWall.tsx:41-46`).                                                                                                                                                                                                           | N/A — interface has no date field                                                                                                                                   | The type is prescriptive; gallery cells don't show a date (`BadgeWallCell.tsx`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D4  | `onSeeGoals` reuses the exact navigation the old empty-state action used: `navigation.getParent<NativeStackNavigationProp<RootTabParamList>>()?.navigate("GoalsTab", { screen: "Goals" })` (current `BadgesScreen.tsx:37-44`).                                                                                                          | Navigate directly on the screen's own `Nav` type (`BadgesStackParamList`), which has no `GoalsTab` route.                                                           | `BadgesWallProps.onSeeGoals` is a required prop (`BadgesWall.tsx:57`) the issue's bullet list doesn't explicitly mention wiring, but the component can't render without it. The old screen already solved "jump to the Goals tab from within the Badges stack" via `getParent()`; reusing it is the direct precedent and the only nav object with a `GoalsTab` route.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D5  | The old `EmptyState` component and the `badges:empty.*` i18n keys (`title`/`body`/`action`) are left in place, unused by this screen — not deleted.                                                                                                                                                                                     | Delete `EmptyState` import/usage and prune the orphaned `badges:empty.*` keys as cleanup.                                                                           | Out of scope per the issue ("PR is wiring + query + nav only"); `EmptyState` becomes unused _by this screen_ only (the component itself isn't deleted, so no other consumer is affected — grep confirms none exist today, but removing a shared component is a separate, deliberate change). Flagged under Not in Scope below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D6  | No new i18n keys or locale work needed.                                                                                                                                                                                                                                                                                                 | N/A                                                                                                                                                                 | All consumed keys (`badges:header`, `badges:wall.count`, `badges:wall.allVerifiable`, `badges:wall.justEarned`, `badges:wall.empty.*`, `badges:card.untitledFallback`) already exist in `en/`, `de/`, and `pseudo/badges.json` (shipped by #404) — verified present in all three locale files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D7  | Keep the tab-bar inset: the container calls `useTabScreenContentInset()` and threads it into `BadgesWall` via a new **optional** `contentInset?: { paddingBottom: number }` prop, merged into the gallery `FlatList`'s `contentContainerStyle` (`contentContainerStyle={[styles.galleryContent, contentInset]}`, `BadgesWall.tsx:271`). | Drop `useTabScreenContentInset` from this screen and let `BadgesWall`'s fixed `galleryContent` bottom padding (`theme.space[8]`) stand, with no tab-bar accounting. | Threading the inset is the app-wide convention for every screen under `FocusPillTabBar` — `GoalsScreen.tsx:5,218,228` (the issue's explicit structural template) passes it as a `contentInset` prop into its presentational `GoalsCockpitContainer` (`GoalsScreen.tsx:90-92,186`), and `SettingsScreen.tsx:131`, `EditModeScreen.tsx:85`, `CaptureVideoScreen.tsx:46`, `CaptureTextNote.tsx:39`, `IntlProbeScreen.tsx:53` all do the same. The **current** `BadgesScreen.tsx:26` already calls it, so dropping it is a functional regression that hides the last gallery row behind the floating pill bar. An optional layout prop with a default of `undefined` introduces no new visual element, so it does not violate "no un-storied UI" (which targets unverified _visuals_); existing #404 stories render unchanged. |

## Affected Areas

- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`: rewrite `BadgeList`/`FlatList`/`BadgeCard`/`EmptyState` path into a thin container (`BadgesWallContainer`) that queries, maps, and renders `BadgesWall` (+ conditional `ScreenHeader`), keeping the outer `ErrorBoundary`/`Suspense` shell.
- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.styles.ts`: drop now-unused `scrollContent`/`listContent` styles (the `FlatList` they styled is gone); keep `screen`/`loadingIndicator`.
- `apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesScreen.test.tsx`: rewrite for wall-props mapping, nav wiring, and empty state; drop the old `BadgeCard`-rendering assertions (now covered by `BadgesWall.test.tsx`).

- `apps/native-rd/src/screens/BadgesScreen/BadgesWall.tsx`: add the optional `contentInset?: { paddingBottom: number }` prop and merge it into the gallery `FlatList`'s `contentContainerStyle` (D7). Layout-only — no new visual element, no story changes.

No changes to `BadgeWallCell.tsx`, `db/queries.ts`, or any i18n resource files.

## Implementation Plan

### Step 1: Rewrite `BadgesScreen.tsx` as a thin container

**Files**: `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`
**Commit**: `feat(native-rd): wire BadgesScreen container to wall (#405)`
**Changes**:

- [ ] Remove `BadgeList`, the `FlatList` import, `BadgeCard`, `EmptyState` imports/usage.
- [ ] Add a `BadgesWallContainer` function component: `rows = useQuery(badgesWithGoalsQuery)`; `count = rows.length`; `spotlight = rows[0] ?? null`; `gallery = rows.slice(1)`.
- [ ] Map `spotlight` row → `BadgesWallSpotlight`: `{ id, design: parseBadgeDesign(row.design), goalTitle: row.goalTitle ?? t("badges:card.untitledFallback"), earnedAt: (row.completedAt ?? row.createdAt) as string | null }` (D2).
- [ ] Map `gallery` rows → `BadgesWallGalleryItem[]`: `{ id, title: row.goalTitle ?? t("badges:card.untitledFallback"), design: parseBadgeDesign(row.design) }` (D3).
- [ ] `onOpenBadge = (id) => navigation.navigate("BadgeDetail", { badgeId: id })`.
- [ ] `onSeeGoals` per D4 (`getParent<NativeStackNavigationProp<RootTabParamList>>()?.navigate("GoalsTab", { screen: "Goals" })`).
- [ ] Render: `count === 0 ? <><ScreenHeader title={t("badges:header")} /><BadgesWall .../></> : <BadgesWall .../>` (D1).
- [ ] `BadgesScreen` keeps the outer `<View style={styles.screen}><ErrorBoundary><Suspense fallback={...}><BadgesWallContainer /></Suspense></ErrorBoundary></View>` shell, dropping the always-on `ScreenHeader` that used to sit outside `Suspense`.
- [ ] Keep the `BadgeRow`/`Nav` type aliases; drop unused `RootTabParamList`-adjacent imports that no longer apply (re-verify after edit).
- [ ] Keep `useTabScreenContentInset()` (currently `BadgesScreen.tsx:26`) and pass it as `contentInset` to `BadgesWall` (D7).

### Step 1b: Add the `contentInset` prop to `BadgesWall`

**Files**: `apps/native-rd/src/screens/BadgesScreen/BadgesWall.tsx`
**Commit**: same commit as Step 1
**Changes**:

- [ ] Add `contentInset?: { paddingBottom: number }` to `BadgesWallProps` (after `onSeeGoals`, `BadgesWall.tsx:48-58`), documented as the tab-bar clearance the container threads in.
- [ ] Destructure it in the component signature (`BadgesWall.tsx:118-124`) and change the gallery `FlatList` to `contentContainerStyle={[styles.galleryContent, contentInset]}` (`BadgesWall.tsx:271`).
- [ ] No story changes — the prop is optional and `undefined` in existing #404 stories, so they render byte-identically.

### Step 2: Trim `BadgesScreen.styles.ts`

**Files**: `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.styles.ts`
**Commit**: same commit as Step 1 (single cohesive change)
**Changes**:

- [ ] Remove `scrollContent` and `listContent` (only consumed by the removed `FlatList`).
- [ ] Keep `screen` and `loadingIndicator`.

### Step 3: Rewrite `BadgesScreen.test.tsx`

**Files**: `apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesScreen.test.tsx`
**Commit**: `test(native-rd): cover BadgesScreen wall-container wiring (#405)`
**Changes**:

- [ ] Keep the `@react-navigation/native` and `@evolu/react` mocks (`mockUseQuery`, `mockNavigate`, `mockGetParent`) from the current file.
- [ ] Keep `jest.mock("../../../db", ...)` exporting `badgesWithGoalsQuery: { __brand: "badgesWithGoalsQuery" }`; route `mockUseQuery` on that brand (mirrors `GoalsScreen.test.tsx`'s `mockData` helper) so `BadgesWall`'s internal `useAnimationPref` → `useQuery(userSettingsQuery)` call (unbranded, since `userSettingsQuery` isn't exported from the mock) safely falls through to a `[]` default instead of leaking badge rows into the animation-pref hook.
- [ ] Use `design: null` in all row fixtures so gallery/spotlight art render `BadgeWallCell`'s/`BadgesWall`'s plain fallback tiles — avoids needing to mock `BadgeRenderer`/`react-native-svg` (this is a wiring test, not a visual one; visuals are `BadgesWall.test.tsx`'s job per the issue).
- [ ] `describe("empty state")`: `count === 0` → assert `badges:header` (ScreenHeader) **and** `badges:wall.empty.title`/`badges:wall.empty.body` render; press `badges:wall.empty.action` → assert `mockNavigate` called with `("GoalsTab", { screen: "Goals" })` via `mockGetParent`.
- [ ] `describe("populated")`: 3 rows → assert `badges:wall.count` text with `count: 3`; assert `badges-wall-spotlight` testID renders row 0's title; assert `badge-wall-cell-<id>` testIDs render for rows 1 and 2; assert `badges:header` is **not** on screen (no purple header over the wall).
- [ ] `describe("navigation")`: press `badges-wall-spotlight` → `mockNavigate` called with `("BadgeDetail", { badgeId: <row0.id> })`; press a `badge-wall-cell-<id>` → same for that row's id.
- [ ] Keep an `untitledFallback` case: a row with `goalTitle: null` renders `badges:card.untitledFallback` as both spotlight title and (if it's the only other row) a gallery cell's accessibility label.
- [ ] Keep the pseudo-locale `it.each` for `badges:header` and the two `wall.empty.*` keys (drop the old `badges:empty.*` keys, now unreachable from this screen).
- [ ] Drop assertions tied to the removed `BadgeCard`/date-formatting-in-`BadgeCard` path (formatted-date rendering is `BadgesWall.test.tsx`'s job, per D2/the issue's "don't duplicate" instruction).

## Testing Strategy

- [ ] Unit tests for `BadgesScreen` container (Jest 30, `@testing-library/react-native` v13) per Step 3.
- [ ] Test file stays at `apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesScreen.test.tsx` (mirrors existing location).
- [ ] `bun run test --testPathPatterns BadgesScreen` green.
- [ ] `bun run type-check` and `bun run lint` clean.
- [ ] Manual/in-app spot check (per issue Acceptance): Full Ride, Night Ride, and one shadow-off theme (Bold Ink or highContrast) — both empty and populated states, and specifically that the last gallery row clears the floating `FocusPillTabBar` (D7).

## Not in Scope

| Item                                                                     | Reason                                                                                                                              | Follow-up                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Deleting the unused `EmptyState` component or `badges:empty.*` i18n keys | Issue scope is wiring/query/nav only; `EmptyState` may still be intentionally kept as a shared primitive                            | none filed                                   |
| `badge-wall-bg` design token (conditional Step 7 in #381's plan)         | Only needed if the 7-theme Storybook check on `BadgesWall` (already done in #404) surfaces a contrast problem; not this issue's job | #381 Step 7 (conditional, not yet triggered) |
| Bottom-nav / `FocusPillTabBar` redesign                                  | Separate track (#379)                                                                                                               | #379                                         |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
