import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { FinishLine } from "./FinishLine";
import type { EvidenceItemData } from "../EvidenceDrawer";

const meta: Meta<typeof FinishLine> = {
  title: "FinishLine",
  component: FinishLine,
};

export default meta;

type Story = StoryObj<typeof FinishLine>;

const mockEvidence: EvidenceItemData[] = [
  { id: "1", type: "photo", label: "Completed experiment photo" },
  { id: "2", type: "link", label: "Published paper link" },
  { id: "3", type: "voice_memo", label: "Final reflection memo" },
];

export const Empty: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FinishLine goalEvidence={[]} onEvidencePress={() => {}} />
    </View>
  ),
};

export const WithEvidence: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FinishLine goalEvidence={mockEvidence} onEvidencePress={() => {}} />
    </View>
  ),
};

export const SingleItem: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FinishLine goalEvidence={[mockEvidence[0]]} onEvidencePress={() => {}} />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
}));
