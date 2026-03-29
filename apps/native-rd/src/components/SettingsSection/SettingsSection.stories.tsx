import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SettingsRow } from "../SettingsRow";
import { SettingsSection } from "./SettingsSection";

const meta: Meta<typeof SettingsSection> = {
  title: "SettingsSection",
  component: SettingsSection,
};

export default meta;

type Story = StoryObj<typeof SettingsSection>;

function DarkModeToggle() {
  const [on, setOn] = useState(false);
  return (
    <SettingsRow
      label="Dark Mode"
      toggle={{ value: on, onValueChange: setOn }}
    />
  );
}

export const SettingsPage: Story = {
  render: () => (
    <View style={storyStyles.page}>
      <SettingsSection title="Preferences">
        <DarkModeToggle />
        <SettingsRow label="Theme Variant" value="Default" onPress={() => {}} />
        <SettingsRow label="Language" value="English" onPress={() => {}} />
      </SettingsSection>
      <SettingsSection title="About">
        <SettingsRow label="Version" value="1.0.0" />
        <SettingsRow label="Licenses" onPress={() => {}} />
      </SettingsSection>
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  page: {
    gap: theme.space[6],
  },
}));
