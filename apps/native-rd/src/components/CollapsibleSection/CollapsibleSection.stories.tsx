import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { Checkbox } from "../Checkbox";
import { CollapsibleSection } from "./CollapsibleSection";

const meta: Meta<typeof CollapsibleSection> = {
  title: "CollapsibleSection",
  component: CollapsibleSection,
};

export default meta;

type Story = StoryObj<typeof CollapsibleSection>;

export const Default: Story = {
  render: () => (
    <View style={storyStyles.page}>
      <CollapsibleSection title="Steps">
        <Checkbox checked={true} onToggle={() => {}} label="Set up project" />
        <Checkbox checked={true} onToggle={() => {}} label="Install deps" />
        <Checkbox checked={false} onToggle={() => {}} label="Write tests" />
      </CollapsibleSection>
      <CollapsibleSection title="Evidence" defaultExpanded={false}>
        <Text variant="body">No evidence yet.</Text>
      </CollapsibleSection>
      <CollapsibleSection title="Linked Badge">
        <Text variant="body">React Native Developer</Text>
      </CollapsibleSection>
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  page: {
    gap: theme.space[2],
  },
}));
