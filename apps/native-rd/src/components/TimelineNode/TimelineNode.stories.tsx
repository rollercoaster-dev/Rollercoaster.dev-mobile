import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { TimelineNode } from "./TimelineNode";
import type { StepStatus } from "../../types/steps";
import { themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof TimelineNode> = {
  title: "Iteration B/Timeline/TimelineNode",
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

const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

// 4 states + the goal node × 7 product themes. Each cell wraps the REAL reactive
// <TimelineNode> in `<ScopedTheme name={name}>` (the proven per-cell idiom — see
// BadgesWall / the Focus family), so every theme genuinely re-renders the node,
// its border, and its glyph ink. The previous version hand-painted look-alike
// circles from stepStateColorMap; this renders the component itself, and adds
// the goal node the reconstruction omitted.
const MATRIX_COLUMNS: {
  key: string;
  label: string;
  status: StepStatus;
  goal?: boolean;
}[] = [
  { key: "pending", label: "Pending", status: "pending" },
  { key: "in-progress", label: "In Progress", status: "in-progress" },
  { key: "paused", label: "Paused", status: "paused" },
  { key: "completed", label: "Completed", status: "completed" },
  { key: "goal", label: "Goal", status: "completed", goal: true },
];

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
            {MATRIX_COLUMNS.map((col) => (
              <View key={col.key} style={storyStyles.matrixCell}>
                <Text variant="label" style={storyStyles.matrixHeaderText}>
                  {col.label}
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
              {MATRIX_COLUMNS.map((col, i) => (
                <View key={col.key} style={storyStyles.matrixCell}>
                  <ScopedTheme name={name}>
                    {col.goal ? (
                      <TimelineNode
                        status="completed"
                        isGoalNode
                        accessibilityLabel="Goal finish line"
                      />
                    ) : (
                      <TimelineNode
                        status={col.status}
                        stepNumber={i + 1}
                        accessibilityLabel={`${col.label} step ${i + 1}`}
                      />
                    )}
                  </ScopedTheme>
                </View>
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
}));
