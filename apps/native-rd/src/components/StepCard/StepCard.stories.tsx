import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { StepCard, type StepCardStep } from "./StepCard";

const meta: Meta<typeof StepCard> = {
  title: "StepCard",
  component: StepCard,
};

export default meta;

type Story = StoryObj<typeof StepCard>;

const makeStep = (overrides: Partial<StepCardStep> = {}): StepCardStep => ({
  id: "1",
  title: "Review component architecture",
  status: "pending",
  evidenceCount: 0,
  ...overrides,
});

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Text variant="label" style={storyStyles.label}>
        Completed
      </Text>
      <StepCard
        step={makeStep({ status: "completed", evidenceCount: 3 })}
        stepIndex={0}
        totalSteps={5}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <Text variant="label" style={storyStyles.label}>
        In Progress
      </Text>
      <StepCard
        step={makeStep({ status: "in-progress", evidenceCount: 1 })}
        stepIndex={1}
        totalSteps={5}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <Text variant="label" style={storyStyles.label}>
        Pending
      </Text>
      <StepCard
        step={makeStep({ status: "pending" })}
        stepIndex={2}
        totalSteps={5}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
    </View>
  ),
};

export const WithEvidence: Story = {
  render: () => (
    <StepCard
      step={makeStep({ status: "in-progress", evidenceCount: 3 })}
      stepIndex={0}
      totalSteps={3}
      onToggleComplete={() => {}}
      onEvidenceTap={() => {}}
    />
  ),
};

export const WithoutEvidence: Story = {
  render: () => (
    <StepCard
      step={makeStep({ status: "pending", evidenceCount: 0 })}
      stepIndex={0}
      totalSteps={3}
      onToggleComplete={() => {}}
      onEvidenceTap={() => {}}
    />
  ),
};

export const Interactive: Story = {
  args: {
    step: makeStep({ status: "in-progress", evidenceCount: 2 }),
    stepIndex: 0,
    totalSteps: 5,
    onToggleComplete: () => {},
    onEvidenceTap: () => {},
  },
};

export const BlockedRequiresText: Story = {
  render: () => (
    <StepCard
      step={makeStep({
        status: "in-progress",
        evidenceCount: 0,
        plannedEvidenceTypes: ["text"],
        capturedEvidenceTypes: [],
      })}
      stepIndex={0}
      totalSteps={3}
      onToggleComplete={() => {}}
      onEvidenceTap={() => {}}
    />
  ),
};

export const BlockedRequiresPhoto: Story = {
  render: () => (
    <StepCard
      step={makeStep({
        status: "in-progress",
        evidenceCount: 0,
        plannedEvidenceTypes: ["photo"],
        capturedEvidenceTypes: [],
      })}
      stepIndex={0}
      totalSteps={3}
      onToggleComplete={() => {}}
      onEvidenceTap={() => {}}
    />
  ),
};

export const MultiplePlannedTypes: Story = {
  render: () => (
    <StepCard
      step={makeStep({
        status: "in-progress",
        evidenceCount: 0,
        plannedEvidenceTypes: ["photo", "text"],
        capturedEvidenceTypes: [],
      })}
      stepIndex={0}
      totalSteps={3}
      onToggleComplete={() => {}}
      onEvidenceTap={() => {}}
    />
  ),
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
