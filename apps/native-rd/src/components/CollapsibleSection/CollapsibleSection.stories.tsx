import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { CollapsibleSection } from "./CollapsibleSection";

const meta: Meta<typeof CollapsibleSection> = {
  title: "CollapsibleSection",
  component: CollapsibleSection,
};

export default meta;

type Story = StoryObj<typeof CollapsibleSection>;

export const WithSummary: Story = {
  render: () => (
    <View style={storyStyles.page}>
      <CollapsibleSection title="Shape" summary="Shield" defaultExpanded>
        <Text variant="body">Shape selector content goes here.</Text>
      </CollapsibleSection>
      <CollapsibleSection
        title="Frame"
        summary="Bold border"
        defaultExpanded={false}
      >
        <Text variant="body">Frame options.</Text>
      </CollapsibleSection>
      <CollapsibleSection
        title="Inscriptions"
        summary='"EARNED 2026"'
        defaultExpanded={false}
      >
        <Text variant="body">Bottom label, path text, banner.</Text>
      </CollapsibleSection>
    </View>
  ),
};

function ControlledAccordion() {
  const [open, setOpen] = useState<"a" | "b" | "c">("a");
  return (
    <View style={storyStyles.page}>
      {(["a", "b", "c"] as const).map((id) => (
        <CollapsibleSection
          key={id}
          title={`Section ${id.toUpperCase()}`}
          summary={`Item ${id}`}
          expanded={open === id}
          onExpandedChange={(next) => {
            if (next) setOpen(id);
          }}
        >
          <Text variant="body">Body for section {id}.</Text>
        </CollapsibleSection>
      ))}
    </View>
  );
}

export const ControlledSingleOpen: Story = {
  render: () => <ControlledAccordion />,
};

const storyStyles = StyleSheet.create((theme) => ({
  page: {
    gap: theme.space[2],
  },
}));
