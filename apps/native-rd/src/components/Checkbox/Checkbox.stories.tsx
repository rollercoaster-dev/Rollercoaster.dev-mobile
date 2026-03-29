import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Checkbox",
  component: Checkbox,
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

function InteractiveCheckbox() {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      checked={checked}
      onToggle={() => setChecked(!checked)}
      label="Complete this step"
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractiveCheckbox />,
};

export const States: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Checkbox checked={false} onToggle={() => {}} label="Unchecked step" />
      <Checkbox checked={true} onToggle={() => {}} label="Completed step" />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[2],
  },
}));
