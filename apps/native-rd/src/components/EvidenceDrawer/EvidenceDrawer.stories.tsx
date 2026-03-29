import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { EvidenceItemData } from "./EvidenceDrawer";

const mockEvidence: EvidenceItemData[] = [
  { id: "1", type: "photo", label: "Lab notebook page" },
  { id: "2", type: "link", label: "Reference paper" },
  { id: "3", type: "text", label: "My observations" },
  { id: "4", type: "video", label: "Experiment recording" },
  { id: "5", type: "voice_memo", label: "Voice memo notes" },
  { id: "6", type: "file", label: "Data export CSV" },
];

const meta: Meta<typeof EvidenceDrawer> = {
  title: "EvidenceDrawer",
  component: EvidenceDrawer,
};

export default meta;

type Story = StoryObj<typeof EvidenceDrawer>;

export const ClosedPeek: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        Closed (Peek) — 3 items
      </Text>
      <EvidenceDrawer
        evidence={mockEvidence.slice(0, 3)}
        isOpen={false}
        onToggle={() => {}}
        onDeleteEvidence={() => {}}
      />
    </View>
  ),
};

export const OpenGrid: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        Open — Evidence Grid
      </Text>
      <EvidenceDrawer
        evidence={mockEvidence}
        isOpen
        onToggle={() => {}}
        onDeleteEvidence={() => {}}
      />
    </View>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        Open — Empty State
      </Text>
      <EvidenceDrawer
        evidence={[]}
        isOpen
        onToggle={() => {}}
        onDeleteEvidence={() => {}}
      />
    </View>
  ),
};

export const GoalDrawer: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        Goal Drawer — Yellow Styling
      </Text>
      <EvidenceDrawer
        evidence={mockEvidence.slice(0, 4)}
        isGoal
        isOpen
        onToggle={() => {}}
        onDeleteEvidence={() => {}}
      />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    height: 400,
    position: "relative",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    padding: theme.space[3],
  },
}));
