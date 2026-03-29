import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { StatusBadge, type StatusBadgeVariant } from "./StatusBadge";

const variants: StatusBadgeVariant[] = [
  "active",
  "completed",
  "locked",
  "earned",
];

const meta: Meta<typeof StatusBadge> = {
  title: "StatusBadge",
  component: StatusBadge,
  argTypes: {
    variant: { control: "select", options: variants },
  },
};

export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const AllVariants: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {variants.map((variant) => (
        <View key={variant} style={storyStyles.row}>
          <Text variant="label" style={storyStyles.label}>
            {variant}
          </Text>
          <StatusBadge variant={variant} />
        </View>
      ))}
    </View>
  ),
};

export const CustomLabels: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <StatusBadge variant="active" label="In Progress" />
      <StatusBadge variant="completed" label="Complete!" />
      <StatusBadge variant="earned" label="3 of 5" />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[3],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    width: 80,
  },
}));
