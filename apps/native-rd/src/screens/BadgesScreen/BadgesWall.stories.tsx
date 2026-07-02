import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { BadgesWall } from "./BadgesWall";
import type { BadgesWallGalleryItem } from "./BadgesWall";
import { BadgeShape, BadgeFrame, BadgeIconWeight } from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";
import { themeNames, type ThemeName } from "../../themes/compose";

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

// Mirror of the (non-exported) MOOD_NAMES map in ContrastAudit.stories.tsx and
// BadgeWallCell.stories.tsx — the human-facing mood label per product theme.
const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

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
  // Every 7th tile is undesigned, exercising the null-design fallback.
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
// Single-state stories — viewable across themes via the web toolbar
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

// ---------------------------------------------------------------------------
// AllThemesMatrix — the wall surface in all 7 product themes at once. Each
// column scopes a real BadgesWall (count + celebrationBg header + spotlight +
// a few gallery cells) to one theme via ScopedTheme, so the fixed dark #161616
// surface can be checked for legibility per mood. Label chrome follows the
// toolbar theme; only the wall is scoped. (D4 — mirrors BadgeWallCell.stories.)
// ---------------------------------------------------------------------------

const MATRIX_GALLERY = GALLERY.slice(0, 5);

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={styles.matrix}>
        {themeNames.map((name) => (
          <View key={name} style={styles.column}>
            <Text style={styles.columnTitle}>{MOOD_NAMES[name]}</Text>
            <Text style={styles.columnKey}>{name}</Text>
            <View style={styles.wallBox}>
              <ScopedTheme name={name}>
                <BadgesWall
                  count={6}
                  spotlight={SPOTLIGHT}
                  gallery={MATRIX_GALLERY}
                  onOpenBadge={noop}
                  onSeeGoals={noop}
                />
              </ScopedTheme>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  ),
};

// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  matrix: {
    flexDirection: "row",
    gap: theme.space[4],
    padding: theme.space[4],
  },
  column: {
    alignItems: "center",
    gap: theme.space[1],
  },
  columnTitle: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  columnKey: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.space[2],
  },
  // Bounded box so each scoped wall's FlatList has a finite size to lay out in.
  wallBox: {
    width: 300,
    height: 560,
  },
}));
