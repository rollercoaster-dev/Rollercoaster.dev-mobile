import type { Meta, StoryObj } from "@storybook/react";
import { BadgesWall } from "./BadgesWall";
import type { BadgesWallGalleryItem } from "./BadgesWall";
import { BadgeShape, BadgeFrame, BadgeIconWeight } from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.none,
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: BadgeIconWeight.regular,
    title: "Sample Badge",
    centerMode: "icon" as const,
    ...overrides,
  };
}

const noop = () => {};

// A dense, mixed-shape gallery — mirrors BadgeWallCell.stories' ROW_BADGES
// variety (circle / shield / star / hexagon / roundedRect / diamond + one
// undesigned tile) so the wall shows distinct shapes, not a grid of circles.
const SHAPES = [
  BadgeShape.circle,
  BadgeShape.shield,
  BadgeShape.star,
  BadgeShape.hexagon,
  BadgeShape.roundedRect,
  BadgeShape.diamond,
] as const;
const ICONS = ["Trophy", "ShieldCheck", "Star", "Medal", "Rocket", "Heart"];
const COLORS = [
  "#a78bfa",
  "#ca8a04",
  "#00d4aa",
  "#ff6b35",
  "#38bdf8",
  "#f472b6",
];

const GALLERY: BadgesWallGalleryItem[] = Array.from({ length: 15 }, (_, i) => {
  // Every 7th tile is undesigned, exercising the null-design fallback tile and
  // its accentPurpleFg ink (dark ink on the accentPurple tile — HIGH-1 fix).
  if (i % 7 === 6) {
    return { id: `g-${i}`, title: `Undesigned ${i}`, design: null };
  }
  return {
    id: `g-${i}`,
    title: `Badge ${i}`,
    design: makeDesign({
      shape: SHAPES[i % SHAPES.length],
      iconName: ICONS[i % ICONS.length],
      color: COLORS[i % COLORS.length],
    }),
  };
});

const SPOTLIGHT = {
  id: "spotlight-1",
  design: makeDesign({
    shape: BadgeShape.star,
    iconName: "Star",
    color: "#ffe50c",
  }),
  goalTitle: "Rewire the workshop",
  earnedAt: "2026-06-18T00:00:00.000Z",
};

// Null-design spotlight — a badge earned before a design was chosen. Exercises
// the spotlightArtFallback tile + its accentPurpleFg ink, which the designed
// SPOTLIGHT above never renders (so it was previously unverified across themes).
const SPOTLIGHT_NULL = {
  id: "spotlight-null",
  design: null,
  goalTitle: "Rewire the workshop",
  earnedAt: "2026-06-18T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof BadgesWall> = {
  title: "Iteration B/Badges Wall/BadgesWall",
  component: BadgesWall,
  args: { onOpenBadge: noop, onSeeGoals: noop },
};

export default meta;
type Story = StoryObj<typeof BadgesWall>;

// ---------------------------------------------------------------------------
// Single-state stories — reviewed across all 7 product themes via the
// Storybook theme toolbar (top bar), NOT a per-cell `<ScopedTheme>` matrix.
//
// Why no 7-cell matrix like BadgeWallCell? BadgesWall re-renders after mount:
// it measures its own width via `onLayout` (`setSurfaceWidth`, guaranteed to
// fire on any populated wall) and calls `useAnimationPref` (async
// AccessibilityInfo probes that `setState`). On web, `<ScopedTheme>` scopes
// only the initial render pass; the post-mount re-render recomputes styles
// against the *active* theme, so every cell would silently revert to the
// toolbar theme — the "null matrix" false-green this epic exists to kill (see
// docs/quality/2026-07-05-theme-matrix-token-audit.md). Same trap, same
// resolution as EditGoalView. The component honours the active theme correctly,
// so the toolbar switcher is the reliable way to review all 7 themes here.
//
// The one genuinely per-theme-varying element — accentPurpleFg ink on the
// null-design fallback tile — is verified honestly in BadgeWallCell.stories'
// `AllThemesMatrix` (BadgeWallCell IS prop-driven, so its ScopedTheme matrix
// does NOT revert). `NullDesign` below renders BadgesWall's own spotlight +
// gallery fallback tiles so that ink can also be spot-checked here per theme.
// ---------------------------------------------------------------------------

export const Populated: Story = {
  args: { count: 24, spotlight: SPOTLIGHT, gallery: GALLERY },
};

export const SingleBadge: Story = {
  args: { count: 1, spotlight: SPOTLIGHT, gallery: [] },
};

export const Empty: Story = {
  args: { count: 0, spotlight: null, gallery: [] },
};

// Null-design branch: the spotlight fallback-art tile and the gallery's
// undesigned tiles — where accentPurpleFg ink shows. Switch the theme toolbar
// to check the ink across all 7 product themes.
export const NullDesign: Story = {
  args: { count: 3, spotlight: SPOTLIGHT_NULL, gallery: GALLERY },
};
