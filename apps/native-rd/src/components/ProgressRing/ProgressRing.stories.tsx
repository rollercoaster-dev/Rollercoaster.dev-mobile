import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { ProgressRing } from "./ProgressRing";

const meta: Meta<typeof ProgressRing> = {
  title: "ProgressRing",
  component: ProgressRing,
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    size: { control: { type: "range", min: 64, max: 240, step: 8 } },
    strokeWidth: { control: { type: "range", min: 4, max: 28, step: 1 } },
  },
};

export default meta;

type Story = StoryObj<typeof ProgressRing>;

export const Interactive: Story = {
  args: {
    progress: 0.6,
    centerLabel: "60%",
    centerSublabel: "3 / 5 steps",
  },
};

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {[0, 0.5, 1].map((progress) => (
        <View key={progress} style={storyStyles.cell}>
          <ProgressRing
            progress={progress}
            centerLabel={`${Math.round(progress * 100)}%`}
            centerSublabel={`${Math.round(progress * 6)} / 6 steps`}
          />
          <Text variant="label" style={storyStyles.label}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      ))}
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[6],
    alignItems: "center",
  },
  cell: {
    gap: theme.space[2],
    alignItems: "center",
  },
  label: {
    color: theme.colors.textMuted,
  },
}));
