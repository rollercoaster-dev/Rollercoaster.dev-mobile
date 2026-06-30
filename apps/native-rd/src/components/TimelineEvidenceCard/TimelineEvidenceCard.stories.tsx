import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { TimelineEvidenceCard } from "./TimelineEvidenceCard";
import type { EvidenceItemData } from "../EvidenceDrawer";

const meta: Meta<typeof TimelineEvidenceCard> = {
  title: "TimelineEvidenceCard",
  component: TimelineEvidenceCard,
};

export default meta;

type Story = StoryObj<typeof TimelineEvidenceCard>;

const noop = () => {};

const photo: EvidenceItemData = {
  id: "p1",
  type: "photo",
  label: "Lab notebook photo",
};
const note: EvidenceItemData = {
  id: "t1",
  type: "text",
  label: "Observation notes",
};
const link: EvidenceItemData = {
  id: "l1",
  type: "link",
  label: "Reference paper",
};

// One chip — the emoji icon from EVIDENCE_TYPE_ICONS plus its label.
export const SinglePhoto: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineEvidenceCard evidence={photo} onPress={noop} />
    </View>
  ),
};

export const SingleLink: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineEvidenceCard evidence={link} onPress={noop} />
    </View>
  ),
};

// isGoal variant — the accentYellow left-border accent (migrated from the old
// palette.yellow300 alias; same resolved colour).
export const GoalEvidence: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineEvidenceCard
        evidence={{ id: "g1", type: "photo", label: "Finish-line photo" }}
        isGoal
        onPress={noop}
      />
    </View>
  ),
};

// Three chips stacked — the component renders one chip each, so the multi-chip
// row is several instances in a containing View.
export const ManyChips: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineEvidenceCard evidence={photo} onPress={noop} />
      <TimelineEvidenceCard evidence={note} onPress={noop} />
      <TimelineEvidenceCard evidence={link} onPress={noop} />
    </View>
  ),
};

// Zero chips — documents the empty state. The empty message lives in TimelineStep
// (not this component), so the story renders it directly to cover the 0-chip case.
export const ZeroChips: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text style={storyStyles.empty}>No evidence yet</Text>
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    gap: theme.space[2],
    backgroundColor: theme.colors.background,
  },
  empty: {
    fontSize: theme.size.xs,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
}));
