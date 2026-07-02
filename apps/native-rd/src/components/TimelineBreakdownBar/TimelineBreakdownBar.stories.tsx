import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { TimelineBreakdownBar, SEGMENT_ORDER } from "./TimelineBreakdownBar";
import { TRACK_HEIGHT } from "./TimelineBreakdownBar.styles";
import { stepStateNodeBg } from "../TimelineNode/stepStateColorMap";
import { themes, themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof TimelineBreakdownBar> = {
  title: "Iteration B/Timeline/TimelineBreakdownBar",
  component: TimelineBreakdownBar,
};

export default meta;

type Story = StoryObj<typeof TimelineBreakdownBar>;

const Frame = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={storyStyles.frame}>
    <Text variant="label" style={storyStyles.frameLabel}>
      {label}
    </Text>
    {children}
  </View>
);

// Representative mix mirroring tl-mid.png: 3 done, 1 in motion, 3 to come,
// 1 set aside — all four segments + all four legend chips visible.
export const Mixed: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Frame label="Mixed — 3 done · 1 in motion · 3 to come · 1 set aside">
        <TimelineBreakdownBar
          counts={{ completed: 3, "in-progress": 1, pending: 3, paused: 1 }}
        />
      </Frame>
    </View>
  ),
};

// All-done: only the "done" chip renders — no "0 in motion / 0 to come /
// 0 set aside" chips (the zero-count drop-out contract).
export const AllDone: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Frame label="All done — only the 'done' chip shows">
        <TimelineBreakdownBar
          counts={{ completed: 6, "in-progress": 0, pending: 0, paused: 0 }}
        />
      </Frame>
    </View>
  ),
};

export const AllToCome: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Frame label="All to come — a fresh goal, nothing started">
        <TimelineBreakdownBar
          counts={{ completed: 0, "in-progress": 0, pending: 6, paused: 0 }}
        />
      </Frame>
    </View>
  ),
};

// Same base mix, contrasting the "set aside" chip's presence vs absence.
export const WithSetAside: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Frame label="With set-aside — paused = 2, chip present">
        <TimelineBreakdownBar
          counts={{ completed: 2, "in-progress": 1, pending: 3, paused: 2 }}
        />
      </Frame>
    </View>
  ),
};

export const WithoutSetAside: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Frame label="Without set-aside — paused = 0, chip absent">
        <TimelineBreakdownBar
          counts={{ completed: 2, "in-progress": 1, pending: 3, paused: 0 }}
        />
      </Frame>
    </View>
  ),
};

// All 7 product themes' segment colors side by side. Unistyles' theme is a
// global runtime singleton, so a reactive <TimelineBreakdownBar> can only render
// the active theme. Like TimelineNode's AllThemesMatrix, this reads each composed
// `themes[name]` statically and paints bar segments inline via stepStateNodeBg,
// proving the map resolves in every theme (incl. paused → accentPurpleLight).
const MATRIX_COUNTS: Record<(typeof SEGMENT_ORDER)[number], number> = {
  completed: 3,
  "in-progress": 1,
  pending: 3,
  paused: 1,
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

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView contentContainerStyle={storyStyles.matrixContainer}>
      {themeNames.map((name) => (
        <View key={name} style={storyStyles.matrixRow}>
          <View style={storyStyles.matrixRowLabel}>
            <Text style={storyStyles.matrixThemeName}>{MOOD_NAMES[name]}</Text>
            <Text style={storyStyles.matrixThemeKey}>{name}</Text>
          </View>
          <View
            style={[
              storyStyles.matrixTrack,
              { borderColor: themes[name].colors.border },
            ]}
          >
            {SEGMENT_ORDER.map((state) => (
              <View
                key={state}
                style={[
                  { flex: MATRIX_COUNTS[state] },
                  { backgroundColor: stepStateNodeBg(themes[name], state) },
                ]}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    gap: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  frame: {
    gap: theme.space[2],
  },
  frameLabel: {
    color: theme.colors.textMuted,
  },
  matrixContainer: {
    padding: theme.space[4],
    gap: theme.space[3],
    backgroundColor: theme.colors.background,
  },
  matrixRow: {
    gap: theme.space[1],
  },
  matrixRowLabel: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.space[2],
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
  matrixTrack: {
    flexDirection: "row",
    height: TRACK_HEIGHT,
    borderWidth: theme.borderWidth.medium,
    overflow: "hidden",
  },
}));
