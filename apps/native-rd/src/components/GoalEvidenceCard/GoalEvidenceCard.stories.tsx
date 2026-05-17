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
    canMarkComplete: { control: "boolean" },
    pendingStepCount: { control: "number" },
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

export const Ready: Story = {
  render: () => (
    <GoalEvidenceCard
      evidenceCount={2}
      onEvidenceTap={() => {}}
      canMarkComplete={true}
      onMarkComplete={() => {}}
    />
  ),
};

export const Locked: Story = {
  render: () => (
    <GoalEvidenceCard
      evidenceCount={0}
      onEvidenceTap={() => {}}
      canMarkComplete={false}
      onMarkComplete={() => {}}
      pendingStepCount={3}
    />
  ),
};

export const LockedSingleStep: Story = {
  render: () => (
    <GoalEvidenceCard
      evidenceCount={0}
      onEvidenceTap={() => {}}
      canMarkComplete={false}
      onMarkComplete={() => {}}
      pendingStepCount={1}
    />
  ),
};

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Text variant="label" style={storyStyles.label}>
        With Evidence (legacy — no check)
      </Text>
      <GoalEvidenceCard evidenceCount={5} onEvidenceTap={() => {}} />
      <Text variant="label" style={storyStyles.label}>
        Empty (legacy — no check)
      </Text>
      <GoalEvidenceCard evidenceCount={0} onEvidenceTap={() => {}} />
      <Text variant="label" style={storyStyles.label}>
        Ready
      </Text>
      <GoalEvidenceCard
        evidenceCount={2}
        onEvidenceTap={() => {}}
        canMarkComplete={true}
        onMarkComplete={() => {}}
      />
      <Text variant="label" style={storyStyles.label}>
        Locked (3 pending)
      </Text>
      <GoalEvidenceCard
        evidenceCount={0}
        onEvidenceTap={() => {}}
        canMarkComplete={false}
        onMarkComplete={() => {}}
        pendingStepCount={3}
      />
    </View>
  ),
};

export const Interactive: Story = {
  args: {
    evidenceCount: 3,
    onEvidenceTap: () => {},
    canMarkComplete: true,
    onMarkComplete: () => {},
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
