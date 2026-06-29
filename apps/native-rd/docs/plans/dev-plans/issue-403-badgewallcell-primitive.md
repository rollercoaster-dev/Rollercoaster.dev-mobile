# Development Plan: Issue #403

## Issue Summary

**Title**: [Storybook] BadgeWallCell primitive + story
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~230 lines (component + styles + story incl. `AllThemesMatrix` + tests + index)

## Course correction (2026-06-29)

This issue was first built as **`BadgeCircleCell`** — a 60×60 `View` with `borderRadius: 30; overflow: hidden` that clipped **every** badge into a circle. That was wrong. Rollercoaster.dev badges have **distinct shapes** — `circle`, `shield`, `hexagon`, `roundedRect`, `star` (`BadgeShape` in `src/badges/types.ts`, rendered by `BadgeRenderer`/`BadgeShapeView`). The "wall of proof" in `prototypes/screen-redesign/Goals + Badges C Prototype.dc.html` shows a grid of **mixed** shapes, not a grid of circles. Clipping a shield/star/hexagon into a circle destroys the silhouette that makes the wall read.

The whole `BadgeCircleCell` line of work (4 commits) was reset and rebuilt as **`BadgeWallCell`**, which renders each badge in its own shape. The branch was renamed `feat/issue-403-badge-circle-cell` → `feat/issue-403-badge-wall-cell` (no PR was open, so the rename was clean).

## Intent Verification

- [x] When `BadgeWallCell` receives a designed `badge`, it renders `BadgeRenderer` at 60px **with no circular clip** — the badge keeps its own shape (circle / shield / star / hexagon / roundedRect). Border + hard shadow come from `BadgeRenderer` and follow the active theme.
- [x] When `badge.design` is `null`, it shows an initial-letter fallback in a **rounded-square** tile (NOT a circle), styled from theme tokens — an honest placeholder, since a null design has no shape to represent.
- [x] Pressing the cell fires `onPress`; the accessible element has `accessibilityRole="button"` and an `accessibilityLabel` equal to the badge title.
- [x] Touch target is at least 44×44pt (explicit `minWidth`/`minHeight: 44` floor on the `Pressable`; verified by test).
- [x] An `AllThemesMatrix` story renders all 7 product themes side by side via `ScopedTheme`. Both rows vary per theme: the designed cell's shadow (dropped in highContrast/lowVision/autismFriendly) and stroke width (3 vs 4), and the undesigned tile's `accentPurple` fill + border.
- [x] Zero hardcoded hex in `BadgeWallCell.tsx` / `BadgeWallCell.styles.ts` — all colors from `theme.*` tokens + `palette.white`.
- [x] Unit tests pass (10/10); `BadgeWallCell` is not imported by any screen.

## Decisions

| ID  | Decision                                                                                                                                                | Rationale                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Render `<BadgeRenderer design={badge.design} size={60} />` directly inside the `Pressable` — **no** clipping `View`.                                    | The badge's shape IS the design. `BadgeRenderer` already paints shape + border + theme-aware hard shadow; clipping it into a circle defeats the wall. Simpler than the old clip + less code.              |
| D2  | Do **not** pass `showShadow` — let `BadgeRenderer` derive it from the theme.                                                                            | The neo-brutalist wall wants the hard shadow in default/dark themes and none in highContrast/lowVision/autismFriendly. `BadgeRenderer`'s `theme.shadows.opacity > 0` default already does exactly this.   |
| D3  | Null-design fallback is a **rounded square** (`borderRadius: 8`) with the title initial, bg `theme.colors.accentPurple`, 3px `theme.colors.border`.     | A null design has no shape — a square-ish tile is honest and stays visually distinct from real badges. Crucially **not** a circle (the exact mistake this rebuild fixes). Mirrors `BadgeCard`'s initials. |
| D4  | `badge` prop typed `{ title: string; design: BadgeDesign \| null }` — minimal presentational subset.                                                    | Presentational primitive in `src/components/`; must not couple to a query row type. The parent (`BadgesWall`, A2) maps rows to this shape. `design` is nullable in the schema (`nullOr(NonEmptyString)`). |
| D5  | Story title `"Badges/BadgeWallCell"`; `AllThemesMatrix` scopes the **real** component per theme via `ScopedTheme` (verified on web in the prior build). | Groups badge-domain primitives with `BadgeRenderer`. `ScopedTheme` was confirmed to scope per-column on the web Storybook target during the `BadgeCircleCell` build; the mechanism is unchanged.          |

## Affected Areas

- `src/components/BadgeWallCell/BadgeWallCell.tsx` — new component
- `src/components/BadgeWallCell/BadgeWallCell.styles.ts` — new styles
- `src/components/BadgeWallCell/BadgeWallCell.stories.tsx` — new story (`WithDesign`, `Undesigned`, `Row`, `AllThemesMatrix`)
- `src/components/BadgeWallCell/index.ts` — barrel export
- `src/components/BadgeWallCell/__tests__/BadgeWallCell.test.tsx` — 10 unit tests
- `docs/plans/2026-06-29-full-ride-redesign-rescope.md` — A1 row renamed to BadgeWallCell

No existing source files modified. No screen imports this component.

## Testing Strategy

- Unit tests: Jest 30, `@testing-library/react-native` v13, `renderWithProviders`. `BadgeRenderer` mocked to a host `View` with `testID="badge-renderer-mock"` (SVG not rendered by JSDOM) — its presence is the positive proof the shape renderer (not a clip/fallback) is used.
- Run: `bun run test --testPathPatterns BadgeWallCell` (NEVER `bun test`). → 10/10.
- `bun run type-check` → clean. `bun run lint` → no BadgeWallCell findings.
- **Storybook visual gate** (the real shape proof — SVG can't render under JSDOM): `bun run storybook:web` → `Badges/BadgeWallCell` → `Row` confirms circle/shield/star/hexagon render as their true silhouettes (no circular crop); `AllThemesMatrix` confirms per-theme shadow/border variation.

## Not in Scope

| Item                                                  | Owner |
| ----------------------------------------------------- | ----- |
| `BadgesWall` view (count header, spotlight, FlatList) | A2    |
| `BadgesScreen` container wiring                       | A3    |
| `badgeWall` surface token decision                    | A2    |
| Spotlight/glow animation                              | A2    |

## Discovery Log

### 2026-06-29 — rebuilt as BadgeWallCell — COMPLETE

- User flagged that the shipped `BadgeCircleCell` clipped all badges into circles, contradicting the varied-shape badge vocabulary and the prototype's mixed-shape wall. Reset the 4 `BadgeCircleCell` commits, renamed the branch, rebuilt as `BadgeWallCell` (D1–D5).
- Gates green: `type-check` ✓, `lint` (no BadgeWallCell findings) ✓, `test --testPathPatterns BadgeWallCell` → 10/10 ✓.
- Remaining: Storybook web visual confirmation of the shapes (manual gate).
