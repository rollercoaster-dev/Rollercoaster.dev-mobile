import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { BrandMark } from "./BrandMark";

const meta: Meta<typeof BrandMark> = {
  title: "BrandMark",
  component: BrandMark,
};

export default meta;

type Story = StoryObj<typeof BrandMark>;

export const Default: Story = {
  render: () => <BrandMark />,
};

export const Sizes: Story = {
  render: () => (
    <View style={storyStyles.row}>
      {[32, 56, 96, 128].map((size) => (
        <View key={size} style={storyStyles.cell}>
          <BrandMark size={size} />
          <Text variant="caption">{size}px</Text>
        </View>
      ))}
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    gap: theme.space[4],
    alignItems: "flex-end",
  },
  cell: {
    alignItems: "center",
    gap: theme.space[1],
  },
}));
