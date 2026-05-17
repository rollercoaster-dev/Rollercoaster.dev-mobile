import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { GoalEvidenceCard } from "./GoalEvidenceCard";

const SAMPLE_GOAL = {
  goalTitle: "Run my first 5k",
  goalDescription:
    "Build up from couch-to-5k over 8 weeks without aggravating my knee.",
  goalColor: "#FFD400",
  goalDesignJson: null as string | null,
  onBadgePress: () => {},
};

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
  render: () => (
    <GoalEvidenceCard
      {...SAMPLE_GOAL}
      evidenceCount={5}
      onEvidenceTap={() => {}}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <GoalEvidenceCard
      {...SAMPLE_GOAL}
      evidenceCount={0}
      onEvidenceTap={() => {}}
    />
  ),
};

// Goal with no description — card should render cleanly without an empty slot.
export const NoDescription: Story = {
  render: () => (
    <GoalEvidenceCard
      {...SAMPLE_GOAL}
      goalDescription={null}
      evidenceCount={2}
      onEvidenceTap={() => {}}
    />
  ),
};

// Steps still pending — the Mark Complete affordance is absent entirely,
// mirroring how StepCard hides its checkbox when blocked.
export const NotReady: Story = {
  render: () => (
    <GoalEvidenceCard
      {...SAMPLE_GOAL}
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
      {...SAMPLE_GOAL}
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
        {...SAMPLE_GOAL}
        evidenceCount={0}
        onEvidenceTap={() => {}}
        canMarkComplete={false}
        onMarkComplete={() => {}}
      />
      <Text variant="label" style={storyStyles.label}>
        Ready (all steps complete, or stepless)
      </Text>
      <GoalEvidenceCard
        {...SAMPLE_GOAL}
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
    ...SAMPLE_GOAL,
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
