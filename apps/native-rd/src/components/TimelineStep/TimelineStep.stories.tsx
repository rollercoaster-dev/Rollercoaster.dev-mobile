import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { TimelineStep } from "./TimelineStep";
import type { TimelineStepData } from "./TimelineStep";
import type { EvidenceItemData } from "../EvidenceDrawer";

const meta: Meta<typeof TimelineStep> = {
  title: "TimelineStep",
  component: TimelineStep,
};

export default meta;

type Story = StoryObj<typeof TimelineStep>;

const mockEvidence: EvidenceItemData[] = [
  { id: "1", type: "photo", label: "Lab notebook photo" },
  { id: "2", type: "link", label: "Reference paper" },
  { id: "3", type: "text", label: "Observation notes" },
];

const pendingStep: TimelineStepData = {
  id: "step-1",
  title: "Set up the experiment environment",
  status: "pending",
  evidenceCount: 0,
};

const activeStep: TimelineStepData = {
  id: "step-2",
  title: "Run the primary experiment and record results",
  status: "in-progress",
  evidenceCount: 2,
};

const completedStep: TimelineStepData = {
  id: "step-3",
  title: "Analyse and document findings",
  status: "completed",
  evidenceCount: 3,
};

const completedNoEvidence: TimelineStepData = {
  id: "step-4",
  title: "Analyse and document findings",
  status: "completed",
  evidenceCount: 0,
};

export const PendingCollapsed: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={pendingStep}
        stepIndex={0}
        evidence={[]}
        onNodePress={() => {}}
        onEvidencePress={() => {}}
      />
    </View>
  ),
};

export const InProgressCollapsed: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={activeStep}
        stepIndex={1}
        evidence={mockEvidence.slice(0, 2)}
        onNodePress={() => {}}
        onEvidencePress={() => {}}
      />
    </View>
  ),
};

export const CompletedCollapsed: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={completedStep}
        stepIndex={2}
        evidence={mockEvidence}
        onNodePress={() => {}}
        onEvidencePress={() => {}}
      />
    </View>
  ),
};

export const ExpandedWithEvidence: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={completedStep}
        stepIndex={2}
        evidence={mockEvidence}
        onNodePress={() => {}}
        onEvidencePress={() => {}}
        defaultExpanded
      />
    </View>
  ),
};

export const ExpandedEmpty: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={completedNoEvidence}
        stepIndex={0}
        evidence={[]}
        onNodePress={() => {}}
        onEvidencePress={() => {}}
        defaultExpanded
      />
    </View>
  ),
};

export const LongTitle: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={{
          ...activeStep,
          title:
            "This is a very long step title that should wrap gracefully across multiple lines without breaking the layout",
        }}
        stepIndex={0}
        evidence={mockEvidence}
        onNodePress={() => {}}
        onEvidencePress={() => {}}
      />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
}));
