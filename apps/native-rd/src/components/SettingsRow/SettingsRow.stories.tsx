import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SettingsRow } from "./SettingsRow";

const meta: Meta<typeof SettingsRow> = {
  title: "SettingsRow",
  component: SettingsRow,
};

export default meta;

type Story = StoryObj<typeof SettingsRow>;

function ToggleRow() {
  const [on, setOn] = useState(false);
  return (
    <SettingsRow
      label="Dark Mode"
      toggle={{ value: on, onValueChange: setOn }}
    />
  );
}

export const AllTypes: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <SettingsRow
        label="Account"
        value="user@example.com"
        onPress={() => {}}
      />
      <SettingsRow label="Notifications" onPress={() => {}} />
      <ToggleRow />
      <SettingsRow label="Version" value="1.0.0" />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: 0,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundSecondary,
  },
}));
