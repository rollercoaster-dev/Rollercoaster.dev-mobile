import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { BadgeWallCell } from "./BadgeWallCell";
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

// Mirror of the (non-exported) MOOD_NAMES map in ContrastAudit.stories.tsx —
// the human-facing mood label for each of the 7 product themes.
const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof BadgeWallCell> = {
  title: "Iteration B/Badges Wall/BadgeWallCell",
  component: BadgeWallCell,
  args: { onPress: noop },
};

export default meta;
type Story = StoryObj<typeof BadgeWallCell>;

// ---------------------------------------------------------------------------
// Single-state stories — viewable across themes via the web toolbar
// ---------------------------------------------------------------------------

export const WithDesign: Story = {
  args: { badge: { title: "Sample Badge", design: makeDesign() } },
};

export const Undesigned: Story = {
  args: { badge: { title: "Goal Title", design: null } },
};

// ---------------------------------------------------------------------------
// Row — the dense gallery context. The whole point of #403: each badge keeps
// its OWN shape (circle / shield / star / hexagon), with one undesigned tile.
// Nothing is clipped into a circle.
// ---------------------------------------------------------------------------

const ROW_BADGES = [
  { title: "Trophy", design: makeDesign({ iconName: "Trophy" }) },
  {
    title: "Shield",
    design: makeDesign({ shape: BadgeShape.shield, iconName: "ShieldCheck" }),
  },
  {
    title: "Star",
    design: makeDesign({ shape: BadgeShape.star, iconName: "Star" }),
  },
  { title: "Undesigned Goal", design: null },
  {
    title: "Medal",
    design: makeDesign({ shape: BadgeShape.hexagon, iconName: "Medal" }),
  },
];

export const Row: Story = {
  render: () => (
    <View style={styles.row}>
      {ROW_BADGES.map((badge) => (
        <BadgeWallCell key={badge.title} badge={badge} onPress={noop} />
      ))}
    </View>
  ),
};

// ---------------------------------------------------------------------------
// AllThemesMatrix — all 7 product themes side by side at once. Each column
// scopes the *real* BadgeWallCell to one theme via ScopedTheme.
//
// Both rows vary per theme:
//  - designed cell: border thickness (3 vs 4 in highContrast/lowVision) and
//    the hard shadow (present in default/dark, dropped in highContrast /
//    lowVision / autismFriendly) come from BadgeRenderer + the active theme.
//  - undesigned tile: its accentPurple fill + border track the theme.
//
// Label chrome follows the toolbar theme; only the cells are scoped.
// ---------------------------------------------------------------------------

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={styles.matrix}>
        {themeNames.map((name) => (
          <View key={name} style={styles.column}>
            <Text style={styles.columnTitle}>{MOOD_NAMES[name]}</Text>
            <Text style={styles.columnKey}>{name}</Text>
            <ScopedTheme name={name}>
              <View style={styles.cellStack}>
                <BadgeWallCell
                  badge={{ title: name, design: makeDesign() }}
                  onPress={noop}
                />
                <BadgeWallCell
                  badge={{ title: name, design: null }}
                  onPress={noop}
                />
              </View>
            </ScopedTheme>
          </View>
        ))}
      </View>
    </ScrollView>
  ),
};

// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    gap: theme.space[3],
    padding: theme.space[4],
    alignItems: "center",
  },
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
  cellStack: {
    gap: theme.space[3],
    alignItems: "center",
  },
}));
