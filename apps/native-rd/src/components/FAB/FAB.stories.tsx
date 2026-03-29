import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { FAB } from "./FAB";

const meta: Meta<typeof FAB> = {
  title: "FAB",
  component: FAB,
};

export default meta;

type Story = StoryObj<typeof FAB>;

export const ClosedState: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        FAB (Closed)
      </Text>
      <FAB isOpen={false} onToggle={() => {}} />
    </View>
  ),
};

export const OpenState: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        FAB (Open)
      </Text>
      <FAB isOpen onToggle={() => {}} />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    height: 200,
    position: "relative",
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    padding: theme.space[3],
  },
}));
