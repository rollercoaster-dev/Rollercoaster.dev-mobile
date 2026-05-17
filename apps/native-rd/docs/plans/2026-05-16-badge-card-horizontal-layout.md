# Badge Card Horizontal Layout

**Status:** Planned
**Created:** 2026-05-16
**Branch:** `badge-tiles-layout-rework-id-like-to-clarify-a-few/maximum-height-constraint-2.-responsive-behavior`
**Related:** [2026-02-27-badge-design-system-plan.md](./2026-02-27-badge-design-system-plan.md) — the source of the `BadgeRenderer` + design data model used here.

## Context

`BadgeCard` (apps/native-rd/src/components/BadgeCard/BadgeCard.tsx) currently renders a vertical stack:

```
[BadgeRenderer 64x64]
Title
Date
(evidenceCount, optional)
```

This wastes the right half of the tile on the Badges screen (`apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`). With the design path the card is ~146px tall; in the initials-fallback path ~174px.

We also have no place to surface the goal's description on the Badges list. The data exists (`goal.description` in `apps/native-rd/src/db/schema.ts:92`) but isn't selected by `badgesWithGoalsQuery` (`apps/native-rd/src/db/queries.ts:914`).

## Desired layout

Horizontal: badge on the left at "full content height", text column on the right.

```
┌──────────────────────────────────────────┐
│ ┌─────────┐  Title (headline, 1 line)   │
│ │         │  Description line 1          │
│ │  Badge  │  Description line 2…         │
│ │  ~112px │  May 16, 2026 (caption,      │
│ │         │                muted)        │
│ └─────────┘                              │
└──────────────────────────────────────────┘
```

Behaviour:

- **Title** — `theme.textStyles.headline`, `numberOfLines={1}`, `ellipsizeMode="tail"`.
- **Description** — `theme.textStyles.body`, `numberOfLines={2}`, `ellipsizeMode="tail"`. Hidden when the goal has no description.
- **Date** — `theme.textStyles.caption`, colour `theme.colors.textMuted`. Already small + muted; "lighter" comes from colour, not weight (no `fontWeight.light` token exists today).
- **Badge** — square; size derived from the text-column height so it visually fills the card across themes and accessibility variants (see Responsiveness below).
- **Whole card** — pressable, accessible (existing a11y label preserved).

## Responsiveness

The branch name calls out a max-height constraint and responsive behaviour. The plan covers four axes:

| Axis                                                           | Approach                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Theme variant** (default, largeText, lowVision, dyslexia, …) | Read `textStyles` from the active theme via `useUnistyles()` and compute the badge size from the same `lineHeight` values used in the text column. The badge stays proportional to whatever the theme dictates. No `onLayout` measurement, no first-frame flicker. |
| **iOS Dynamic Type / Android font scale**                      | Snapshot `PixelRatio.getFontScale()` at render and multiply into the computed badge size. Mirrors what RN will do to the `<Text>` heights, so the badge tracks the text. Stale on a system-setting change until the screen re-mounts; acceptable for a list view.  |
| **Phone width**                                                | Card already uses `flex: 1` from the FlatList row; the text column gets `flex: 1` and absorbs extra width. Badge stays square at the computed size. No special breakpoint needed for phones.                                                                       |
| **Tablet / large screens**                                     | Not in scope for this plan. Left as a follow-up — would convert the FlatList to `numColumns={2}` above a width threshold.                                                                                                                                          |

The badge size is computed once per render as:

```ts
const fontScale = PixelRatio.getFontScale();
const { headline, body, caption } = theme.textStyles;
const textColumnHeight =
  headline.lineHeight + // 1 line title
  theme.space[1] +
  body.lineHeight * 2 + // 2-line description (always reserved, even if absent)
  theme.space[2] +
  caption.lineHeight; // 1 line date
const badgeSize = Math.round(textColumnHeight * fontScale);
```

For the default light theme at `fontScale = 1` this resolves to: `31 + 4 + 52 + 8 + 19 = 114` → badge ≈ **114px square**, card total ≈ **150px**.

For `largeText` at `fontScale = 1`: `~39 + 4 + ~66 + 8 + ~24 ≈ 141` → badge ≈ **141px square**, card total ≈ **177px**.

For default theme + system text-size XXL (`fontScale ≈ 1.3`): `114 × 1.3 ≈ 148` → badge ≈ **148px square**, card total ≈ **180px**.

### Max-height constraint

We rely on the `numberOfLines` clamps to bound height. Specifically:

- Title `numberOfLines={1}` — a long goal title cannot push the card taller.
- Description `numberOfLines={2}` — the second line ellipsises.
- Date is always 1 line.

That means the card height is fully determined by `textColumnHeight × fontScale + padding + border`. No `maxHeight` style is needed — the line clamps are the constraint. We deliberately do **not** also enforce a numeric `maxHeight`, because at very large font scales (e.g. lowVision + system XXXL) a hard cap would crop accessibility-relevant text. The line clamps already give a predictable upper bound while respecting the user's chosen font scale.

### Description reserves space even when absent

The badge size depends on a 2-line description. If a goal has no description, we still allow the badge size to assume two body lines so that:

1. Cards in a list have a uniform height (better scan, no jumpy heights).
2. A future description doesn't shrink/grow the badge.

The description `<Text>` simply isn't rendered when `description == null`; the space it would have occupied is left as visual breathing room.

## Open design decisions

| Question                               | Recommended                                                                                                                    | Alternative                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Where does description come from?      | `goal.description` joined via `badgesWithGoalsQuery`. **Decided 2026-05-16.**                                                  | Credential narrative / badge class description — neither is populated on creation today. |
| Description line count                 | **2 lines** (decided 2026-05-16).                                                                                              | 3 lines — taller card, ~176px. Re-evaluate if descriptions skew long.                    |
| Badge sizing strategy                  | Computed from active theme + font scale (this plan).                                                                           | Fixed literal e.g. `112` — simpler, but goes "short" on largeText / Dynamic Type.        |
| Lighter weight for date                | Use existing `textMuted` colour.                                                                                               | Add a `fontWeight.light` token to design-tokens. Out of scope here.                      |
| `evidenceCount` slot                   | Render after date in the right column when provided. The Badges list doesn't pass it; only BadgeDetail-style call sites would. | Drop the prop. Punted — keeps existing API.                                              |
| `size` variants (`compact`/`spacious`) | Keep — they still scale container padding. Badge size is unaffected.                                                           | Remove. Out of scope.                                                                    |
| Tablet multi-column                    | Out of scope.                                                                                                                  | Follow-up: FlatList `numColumns={2}` above a width breakpoint.                           |

## Implementation sketch

### 1. Data: `apps/native-rd/src/db/queries.ts`

`badgesWithGoalsQuery` (line 914):

```ts
.select([
  "badge.id",
  "badge.goalId",
  "badge.imageUri",
  "badge.design",
  "badge.createdAt",
  "goal.title as goalTitle",
  "goal.description as goalDescription",   // NEW
  "goal.completedAt",
])
```

No schema change — `goal.description` already exists (`schema.ts:92`).

### 2. Component: `apps/native-rd/src/components/BadgeCard/BadgeCard.tsx`

- Add `description?: string | null` to `BadgeCardProps`.
- Import `useUnistyles` from `react-native-unistyles` and `PixelRatio` from `react-native`.
- Compute `badgeSize` per the formula above.
- Pass `size={badgeSize}` to `BadgeRenderer`; size the initials fallback `View` to the same dimension.
- Restructure JSX into a two-column row:

```tsx
<Pressable …>
  <View style={styles.container(size)}>
    <View style={styles.badgeWrapper(badgeSize)}>
      {design
        ? <BadgeRenderer design={design} size={badgeSize} showShadow={false} />
        : <View style={styles.initials(badgeSize)}>
            <Text style={styles.initialsText}>{(title.charAt(0) || "?").toUpperCase()}</Text>
          </View>}
    </View>
    <View style={styles.textColumn}>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
      {description ? (
        <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">{description}</Text>
      ) : null}
      <Text style={styles.date}>{earnedDate}</Text>
      {evidenceCount !== undefined && (
        <Text style={styles.evidenceCount}>
          {evidenceCount} {evidenceCount === 1 ? "piece" : "pieces"} of evidence
        </Text>
      )}
    </View>
  </View>
</Pressable>
```

Accessibility label stays `Badge: ${title}, earned ${earnedDate}` — description is decorative repetition of `title` in the most common case (short goals) and shouldn't bloat the screen-reader announcement. Re-evaluate if user feedback says otherwise.

### 3. Styles: `apps/native-rd/src/components/BadgeCard/BadgeCard.styles.ts`

- `container`: add `flexDirection: 'row'`, `alignItems: 'flex-start'`.
- `badgeWrapper(size)`: factory style returning `{ width: size, height: size, marginRight: theme.space[4] }`.
- `initials(size)`: replaces the current static `image` style; same visual but parametric width/height; keep `borderRadius`, border, background.
- `initialsText`: scale `fontSize` to `size * 0.4` so a single uppercase letter looks right at any badge size.
- `textColumn`: `flex: 1`, `minWidth: 0` (RN doesn't strictly need it but keeps text shrinkable).
- `title`: drop `marginBottom: space[1]`, move spacing to the description's `marginTop`.
- `description`: `marginTop: space[1]`, `color: theme.colors.text`, `…theme.textStyles.body`.
- `date`: `marginTop: space[2]`, unchanged otherwise.
- `evidenceCount`: `marginTop: space[2]` (unchanged).

### 4. Screen call site: `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`

```tsx
<BadgeCard
  title={(item.goalTitle as string) ?? "Untitled"}
  description={item.goalDescription as string | null}   // NEW
  earnedDate={formatDate(/* … */)}
  design={parseBadgeDesign(item.design as string | null)}
  onPress={…}
/>
```

### 5. Stories: `apps/native-rd/src/components/BadgeCard/BadgeCard.stories.tsx`

Add stories:

- `WithDescription` — short description, fits in 2 lines.
- `WithLongDescription` — overflows, asserts ellipsis visually.
- `WithoutDescription` — null, confirms the badge still sizes correctly.
- `LargeText` — wrap in the `largeText` theme to visually verify the badge grows with the text column.

## Tests

`apps/native-rd/src/components/BadgeCard/__tests__/BadgeCard.test.tsx`:

- Keep existing onPress, accessibility, evidence-count tests untouched.
- Add: description text renders when provided.
- Add: description is not rendered when prop is null/undefined.
- Add: description `<Text>` has `numberOfLines={2}` and `ellipsizeMode="tail"`.
- Add: title `<Text>` has `numberOfLines={1}`.
- Snapshot or prop-assertion that `BadgeRenderer` is called with a `size > 0` derived from theme (mock theme and assert; don't hard-code `112`).

`apps/native-rd/src/screens/BadgesScreen/__tests__/BadgesScreen.test.tsx`:

- If it asserts on rendered text, extend to include description from a fixture.

Visual verification:

- `npx expo run:ios` and confirm against the photo on file.
- Toggle `largeText` and `lowVision` accessibility themes to confirm the badge grows.
- iOS Settings → Display → Text Size: drag to XXL and reopen the app to confirm the badge tracks system Dynamic Type.

## Follow-ups (not in this plan)

- Tablet multi-column grid for the Badges screen.
- A `fontWeight.light` token in `@rollercoaster-dev/design-tokens` if we want the date visually lighter beyond colour alone.
- A11y label for the description if user testing shows screen-reader users miss context.
- Decide whether `evidenceCount` is still a useful prop after the redesign, or whether it moves to `BadgeDetailScreen` only.
