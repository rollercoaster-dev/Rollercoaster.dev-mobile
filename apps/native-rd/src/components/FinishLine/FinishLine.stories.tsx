import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { FinishLine } from "./FinishLine";
import { GOAL_NODE_SIZE } from "../TimelineNode/TimelineNode.styles";
import { goalNodeBg, goalNodeFg } from "../TimelineNode/stepStateColorMap";
import { BadgeShape, BadgeFrame, BadgeIconWeight } from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";
import type { EvidenceItemData } from "../EvidenceDrawer";
import {
  themes,
  themeNames,
  type ComposedTheme,
  type ThemeName,
} from "../../themes/compose";

const meta: Meta<typeof FinishLine> = {
  title: "Iteration B/Timeline/FinishLine",
  component: FinishLine,
};

export default meta;

type Story = StoryObj<typeof FinishLine>;

const noop = () => {};

const mockEvidence: EvidenceItemData[] = [
  { id: "1", type: "photo", label: "Completed experiment photo" },
  { id: "2", type: "link", label: "Published paper link" },
];

// Mirrors BadgeWallCell.stories.tsx's fixture helper.
function makeDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.none,
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: BadgeIconWeight.regular,
    title: "Read 12 books",
    centerMode: "icon" as const,
    ...overrides,
  };
}

// Letter-fallback tile + neutral star + a populated goal-evidence list.
export const UndesignedBadge: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FinishLine
        goalTitle="Read 12 books"
        badgeDesign={null}
        allStepsComplete={false}
        onBadgePress={noop}
        goalEvidence={mockEvidence}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// Real BadgeRenderer preview + neutral star. goalEvidence is empty and NO
// evidence text renders at all — visual proof of "render what's present".
export const DesignedBadge: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FinishLine
        goalTitle="Read 12 books"
        badgeDesign={makeDesign()}
        allStepsComplete={false}
        onBadgePress={noop}
        goalEvidence={[]}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// The realistic "just finished, haven't designed yet" moment — the star turns
// celebration yellow while the badge preview is still the letter fallback.
export const AllStepsDoneCelebration: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FinishLine
        goalTitle="Read 12 books"
        badgeDesign={null}
        allStepsComplete
        onBadgePress={noop}
        goalEvidence={mockEvidence}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// Goal-star states × 7 product themes. Like TimelineNode's AllThemesMatrix,
// unistyles' theme is a global runtime singleton, so each composed theme is
// read statically and painted inline through goalNodeBg/Fg — proving the
// neutral star never vanishes into its own screen background and the
// celebration star stays legible (esp. Still Water's muted yellow and Clean
// Signal's near-white one).
const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

function MatrixStar({
  theme,
  celebrate,
}: {
  theme: ComposedTheme;
  celebrate: boolean;
}) {
  const bg = goalNodeBg(theme, celebrate);
  const fg = goalNodeFg(theme, celebrate);
  // Mirror TimelineNode.styles: celebrating is solid (border == bg); neutral
  // keeps the theme's border. Each cell paints ITS theme's screen background
  // behind the star so "disappears into its own background" is a real check.
  const borderColor = celebrate ? bg : theme.colors.border;
  return (
    <View
      style={[
        storyStyles.matrixCell,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[storyStyles.matrixNode, { backgroundColor: bg, borderColor }]}
      >
        <Text style={[storyStyles.matrixNodeText, { color: fg }]}>{"★"}</Text>
      </View>
    </View>
  );
}

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView contentContainerStyle={storyStyles.matrixContainer}>
      <View style={storyStyles.matrixRow}>
        <View style={storyStyles.matrixRowLabel}>
          <Text variant="label" style={storyStyles.matrixHeaderText}>
            Theme
          </Text>
        </View>
        <View style={storyStyles.matrixCell}>
          <Text variant="label" style={storyStyles.matrixHeaderText}>
            Steps left
          </Text>
        </View>
        <View style={storyStyles.matrixCell}>
          <Text variant="label" style={storyStyles.matrixHeaderText}>
            All done
          </Text>
        </View>
      </View>
      {themeNames.map((name) => (
        <View key={name} style={storyStyles.matrixRow}>
          <View style={storyStyles.matrixRowLabel}>
            <Text style={storyStyles.matrixThemeName}>{MOOD_NAMES[name]}</Text>
            <Text style={storyStyles.matrixThemeKey}>{name}</Text>
          </View>
          <MatrixStar theme={themes[name]} celebrate={false} />
          <MatrixStar theme={themes[name]} celebrate />
        </View>
      ))}
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  matrixContainer: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  matrixRowLabel: {
    width: 132,
    paddingVertical: theme.space[2],
    paddingRight: theme.space[2],
    justifyContent: "center",
  },
  matrixHeaderText: {
    color: theme.colors.textMuted,
  },
  matrixThemeName: {
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  matrixThemeKey: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
  matrixCell: {
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.space[2],
  },
  matrixNode: {
    width: GOAL_NODE_SIZE,
    height: GOAL_NODE_SIZE,
    borderRadius: GOAL_NODE_SIZE / 2,
    borderWidth: theme.borderWidth.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  matrixNodeText: {
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.bold,
  },
}));
