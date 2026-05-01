import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { EvidenceThumbnail, type Evidence } from "./EvidenceThumbnail";

const meta: Meta<typeof EvidenceThumbnail> = {
  title: "EvidenceThumbnail",
  component: EvidenceThumbnail,
};

export default meta;

type Story = StoryObj<typeof EvidenceThumbnail>;

const evidences: Evidence[] = [
  { id: "1", title: "Progress photo", type: "photo" },
  { id: "2", title: "Voice memo reflection", type: "voice_memo" },
  { id: "3", title: "Written notes", type: "text" },
  { id: "4", title: "Tutorial link", type: "link" },
  { id: "5", title: "Project export", type: "file" },
];

export const AllTypes: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {evidences.map((e) => (
        <View key={e.id} style={storyStyles.item}>
          <EvidenceThumbnail evidence={e} onPress={() => {}} />
        </View>
      ))}
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[3],
  },
  item: {
    width: "48%",
  },
}));
