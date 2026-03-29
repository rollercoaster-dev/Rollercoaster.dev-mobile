import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { GoalEvidenceCard } from "./GoalEvidenceCard";

const meta: Meta<typeof GoalEvidenceCard> = {
  title: "GoalEvidenceCard",
  component: GoalEvidenceCard,
  argTypes: {
    evidenceCount: { control: "number" },
  },
};

export default meta;

type Story = StoryObj<typeof GoalEvidenceCard>;

export const WithEvidence: Story = {
  render: () => <GoalEvidenceCard evidenceCount={5} onEvidenceTap={() => {}} />,
};

export const Empty: Story = {
  render: () => <GoalEvidenceCard evidenceCount={0} onEvidenceTap={() => {}} />,
};

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Text variant="label" style={storyStyles.label}>
        With Evidence
      </Text>
      <GoalEvidenceCard evidenceCount={5} onEvidenceTap={() => {}} />
      <Text variant="label" style={storyStyles.label}>
        Empty
      </Text>
      <GoalEvidenceCard evidenceCount={0} onEvidenceTap={() => {}} />
    </View>
  ),
};

export const Interactive: Story = {
  args: {
    evidenceCount: 3,
    onEvidenceTap: () => {},
  },
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
}));
