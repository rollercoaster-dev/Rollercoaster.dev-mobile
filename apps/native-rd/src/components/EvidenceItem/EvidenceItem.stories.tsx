import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { EvidenceItem } from "./EvidenceItem";

const meta: Meta<typeof EvidenceItem> = {
  title: "EvidenceItem",
  component: EvidenceItem,
};

export default meta;

type Story = StoryObj<typeof EvidenceItem>;

export const Photo: Story = {
  render: () => (
    <EvidenceItem
      id="1"
      type="photo"
      label="Lab notebook page"
      onLongPress={() => {}}
    />
  ),
};

export const GoalItem: Story = {
  render: () => (
    <EvidenceItem
      id="2"
      type="link"
      label="Reference paper"
      isGoal
      onLongPress={() => {}}
    />
  ),
};

export const LongLabel: Story = {
  render: () => (
    <EvidenceItem
      id="3"
      type="text"
      label="This is a very long evidence label that should truncate"
      onLongPress={() => {}}
    />
  ),
};

export const AllTypes: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Text variant="label" style={storyStyles.label}>
        All Evidence Types
      </Text>
      {(
        [
          "photo",
          "screenshot",
          "video",
          "text",
          "voice_memo",
          "link",
          "file",
        ] as const
      ).map((type) => (
        <EvidenceItem
          key={type}
          id={type}
          type={type}
          label={type.replace("_", " ")}
          onLongPress={() => {}}
        />
      ))}
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[2],
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
}));
