import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { TimelineNode } from "./TimelineNode";
import { NODE_SIZE } from "./TimelineNode.styles";
import {
  stepStateColorMap,
  stepStateNodeBg,
  stepStateNodeFg,
  type StepStateMapKey,
} from "./stepStateColorMap";
import {
  themes,
  themeNames,
  type ComposedTheme,
  type ThemeName,
} from "../../themes/compose";

const meta: Meta<typeof TimelineNode> = {
  title: "TimelineNode",
  component: TimelineNode,
};

export default meta;

type Story = StoryObj<typeof TimelineNode>;

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={storyStyles.row}>
    <Text variant="label" style={storyStyles.label}>
      {label}
    </Text>
    <View style={storyStyles.nodeWrap}>{children}</View>
  </View>
);

export const Pending: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Pending — Step 1">
        <TimelineNode
          status="pending"
          stepNumber={1}
          accessibilityLabel="Step 1: pending"
        />
      </Row>
      <Row label="Pending — Step 5">
        <TimelineNode
          status="pending"
          stepNumber={5}
          accessibilityLabel="Step 5: pending"
        />
      </Row>
    </View>
  ),
};

export const InProgress: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="In Progress — Step 2">
        <TimelineNode
          status="in-progress"
          stepNumber={2}
          accessibilityLabel="Step 2: in progress"
        />
      </Row>
      <Row label="In Progress — with state badge">
        <TimelineNode
          status="in-progress"
          stepNumber={2}
          showStateBadge
          accessibilityLabel="Step 2: in progress"
        />
      </Row>
    </View>
  ),
};

export const Completed: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Completed — Step 3">
        <TimelineNode
          status="completed"
          stepNumber={3}
          accessibilityLabel="Step 3: completed"
        />
      </Row>
    </View>
  ),
};

export const GoalNode: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Goal Node (star, yellow)">
        <TimelineNode
          status="completed"
          isGoalNode
          accessibilityLabel="Goal finish line"
        />
      </Row>
    </View>
  ),
};

export const PressableVsStatic: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Pressable (with onPress)">
        <TimelineNode
          status="in-progress"
          stepNumber={1}
          onPress={() => {}}
          accessibilityLabel="Step 1, tap to navigate"
        />
      </Row>
      <Row label="Static (no onPress)">
        <TimelineNode
          status="pending"
          stepNumber={2}
          accessibilityLabel="Step 2: pending"
        />
      </Row>
    </View>
  ),
};

export const Paused: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Paused — pause glyph">
        <TimelineNode status="paused" accessibilityLabel="Step 4: paused" />
      </Row>
      <Row label="Paused — with state badge">
        <TimelineNode
          status="paused"
          showStateBadge
          accessibilityLabel="Step 4: paused"
        />
      </Row>
    </View>
  ),
};

// All 4 states × 7 product themes (OQ-3, #406). Unistyles' theme is a global
// runtime singleton, so a reactive <TimelineNode> can only ever render the
// active theme. Like ContrastAudit.stories.tsx, this matrix reads each composed
// `themes[name]` statically and paints node-shaped cells inline, resolving every
// bg/fg THROUGH `stepStateColorMap` — which both demonstrates the re-skin across
// themes and validates the map resolves correctly in each one (e.g. active node
// is black in Bold Ink / highContrast, teal in Night Ride / dark).
const MATRIX_STATES: StepStateMapKey[] = [
  "pending",
  "in-progress",
  "paused",
  "completed",
];

const STATE_LABELS: Record<StepStateMapKey, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  paused: "Paused",
  completed: "Completed",
};

const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

function MatrixNode({
  theme,
  state,
  stepNumber,
}: {
  theme: ComposedTheme;
  state: StepStateMapKey;
  stepNumber: number;
}) {
  const bg = stepStateNodeBg(theme, state);
  const fg = stepStateNodeFg(theme, state);
  // Mirror TimelineNode.styles: in-progress/completed are solid (border == bg);
  // pending/paused keep a neutral border from the same theme.
  const solid = state === "in-progress" || state === "completed";
  const borderColor = solid ? bg : theme.colors.border;
  const glyph = stepStateColorMap[state].nodeGlyph ?? String(stepNumber);
  return (
    <View style={storyStyles.matrixCell}>
      <View
        style={[storyStyles.matrixNode, { backgroundColor: bg, borderColor }]}
      >
        <Text style={[storyStyles.matrixNodeText, { color: fg }]}>{glyph}</Text>
      </View>
    </View>
  );
}

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView contentContainerStyle={storyStyles.matrixContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={storyStyles.matrixRow}>
            <View style={storyStyles.matrixRowLabel}>
              <Text variant="label" style={storyStyles.matrixHeaderText}>
                Theme
              </Text>
            </View>
            {MATRIX_STATES.map((state) => (
              <View key={state} style={storyStyles.matrixCell}>
                <Text variant="label" style={storyStyles.matrixHeaderText}>
                  {STATE_LABELS[state]}
                </Text>
              </View>
            ))}
          </View>
          {themeNames.map((name) => (
            <View key={name} style={storyStyles.matrixRow}>
              <View style={storyStyles.matrixRowLabel}>
                <Text style={storyStyles.matrixThemeName}>
                  {MOOD_NAMES[name]}
                </Text>
                <Text style={storyStyles.matrixThemeKey}>{name}</Text>
              </View>
              {MATRIX_STATES.map((state, i) => (
                <MatrixNode
                  key={state}
                  theme={themes[name]}
                  state={state}
                  stepNumber={i + 1}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    gap: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[4],
  },
  label: {
    color: theme.colors.textMuted,
    width: 180,
  },
  nodeWrap: {
    alignItems: "center",
    justifyContent: "center",
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
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: theme.borderWidth.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  matrixNodeText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
  },
}));
