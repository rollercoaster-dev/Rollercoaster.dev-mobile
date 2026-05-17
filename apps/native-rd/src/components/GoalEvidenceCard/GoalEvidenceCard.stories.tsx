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

// Steps still pending — the Mark Complete affordance is absent entirely,
// mirroring how StepCard hides its checkbox when blocked.
export const NotReady: Story = {
  render: () => (
    <GoalEvidenceCard
      evidenceCount={0}
      onEvidenceTap={() => {}}
      canMarkComplete={false}
      onMarkComplete={() => {}}
    />
  ),
};

// All steps complete (or stepless goal) — Mark Complete is shown.
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

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Text variant="label" style={storyStyles.label}>
        Not Ready (steps still pending)
      </Text>
      <GoalEvidenceCard
        evidenceCount={0}
        onEvidenceTap={() => {}}
        canMarkComplete={false}
        onMarkComplete={() => {}}
      />
      <Text variant="label" style={storyStyles.label}>
        Ready (all steps complete, or stepless)
      </Text>
      <GoalEvidenceCard
        evidenceCount={2}
        onEvidenceTap={() => {}}
        canMarkComplete={true}
        onMarkComplete={() => {}}
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
