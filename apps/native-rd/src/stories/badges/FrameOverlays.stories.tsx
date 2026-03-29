import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { BadgeRenderer } from "../../badges/BadgeRenderer";
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BadgeCenterMode,
} from "../../badges/types";
import type { BadgeDesign, FrameDataParams } from "../../badges/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHAPES: BadgeShape[] = [
  BadgeShape.circle,
  BadgeShape.shield,
  BadgeShape.hexagon,
  BadgeShape.roundedRect,
  BadgeShape.star,
  BadgeShape.diamond,
];

const FRAMES: BadgeFrame[] = [
  BadgeFrame.boldBorder,
  BadgeFrame.guilloche,
  BadgeFrame.crossHatch,
  BadgeFrame.microprint,
  BadgeFrame.rosette,
];

const ACCENT_COLORS = [
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#10b981",
  "#06b6d4",
  "#f97316",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDesign(
  frame: BadgeFrame,
  shape: BadgeShape,
  colorIndex: number,
  params?: Partial<FrameDataParams>,
): BadgeDesign {
  return {
    shape,
    frame,
    color: ACCENT_COLORS[colorIndex % ACCENT_COLORS.length],
    iconName: "Trophy",
    iconWeight: BadgeIconWeight.regular,
    title: `${frame} ${shape}`,
    centerMode: BadgeCenterMode.icon,
    frameParams: {
      variant: 0,
      stepCount: 5,
      evidenceCount: 3,
      daysToComplete: 30,
      evidenceTypes: 2,
      ...params,
    },
  };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: "Badges/FrameOverlays",
};

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// 1. FrameMatrix — 5 frames × 6 shapes = 30 cells
// ---------------------------------------------------------------------------

function FrameMatrixGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Frame × Shape Matrix (30 combos)</Text>
      {FRAMES.map((frame) => (
        <View key={frame}>
          <Text style={styles.subheading}>{frame}</Text>
          <View style={styles.row}>
            {SHAPES.map((shape, i) => (
              <View key={`${frame}-${shape}`} style={styles.cell}>
                <BadgeRenderer
                  design={makeDesign(frame, shape, i)}
                  size={120}
                />
                <Text style={styles.label}>{shape}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export const FrameMatrix: Story = {
  render: () => <FrameMatrixGrid />,
};

// ---------------------------------------------------------------------------
// 2. DataDrivenScaling — same frame, different data params
// ---------------------------------------------------------------------------

const SCALING_CASES: {
  label: string;
  frame: BadgeFrame;
  params: Partial<FrameDataParams>;
}[] = [
  {
    label: "guilloche · 2 steps",
    frame: BadgeFrame.guilloche,
    params: { stepCount: 2 },
  },
  {
    label: "guilloche · 10 steps",
    frame: BadgeFrame.guilloche,
    params: { stepCount: 10 },
  },
  {
    label: "crossHatch · 3 days",
    frame: BadgeFrame.crossHatch,
    params: { daysToComplete: 3 },
  },
  {
    label: "crossHatch · 180 days",
    frame: BadgeFrame.crossHatch,
    params: { daysToComplete: 180 },
  },
];

function DataDrivenGrid() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.heading}>Data-Driven Scaling</Text>
      <View style={styles.row}>
        {SCALING_CASES.map(({ label, frame, params }) => (
          <View key={label} style={styles.cell}>
            <BadgeRenderer
              design={makeDesign(frame, BadgeShape.circle, 0, params)}
              size={140}
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const DataDrivenScaling: Story = {
  render: () => <DataDrivenGrid />,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  grid: {
    padding: theme.space[6],
    gap: theme.space[6],
  },
  heading: {
    ...theme.textStyles.headline,
    color: theme.colors.text,
    marginBottom: theme.space[2],
  },
  subheading: {
    ...theme.textStyles.body,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    marginBottom: theme.space[2],
    marginTop: theme.space[4],
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[4],
  },
  cell: {
    alignItems: "center",
    gap: theme.space[2],
  },
  label: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
  },
}));
