import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { ModeIndicator } from "./ModeIndicator";
import type { LifecycleMode } from "./ModeIndicator";

// Minimal 1×1 transparent PNG for testing the icon prop code path
const MOCK_ICON = { uri: "https://via.placeholder.com/32" };

const meta: Meta<typeof ModeIndicator> = {
  title: "ModeIndicator",
  component: ModeIndicator,
};

export default meta;

type Story = StoryObj<typeof ModeIndicator>;

const ALL_MODES: LifecycleMode[] = ["edit", "focus", "complete", "timeline"];

export const AllModes: Story = {
  render: () => (
    <View style={storyStyles.container}>
      {ALL_MODES.map((mode) => (
        <View key={mode} style={storyStyles.row}>
          <Text variant="label" style={storyStyles.rowLabel}>
            {mode}
          </Text>
          <ModeIndicator mode={mode} />
        </View>
      ))}
    </View>
  ),
};

export const Edit: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <ModeIndicator mode="edit" />
    </View>
  ),
};

export const Focus: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <ModeIndicator mode="focus" />
    </View>
  ),
};

export const Complete: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <ModeIndicator mode="complete" />
    </View>
  ),
};

export const Timeline: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <ModeIndicator mode="timeline" />
    </View>
  ),
};

export const WithCustomIcon: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.rowLabel}>
        Custom image icon (replaces emoji)
      </Text>
      <ModeIndicator mode="focus" icon={MOCK_ICON} />
    </View>
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
  rowLabel: {
    color: theme.colors.textMuted,
    width: 80,
  },
}));
