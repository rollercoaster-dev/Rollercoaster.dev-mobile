import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text as RNText, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { ScreenHeader } from "./ScreenHeader";
import { ScreenSubHeader } from "./ScreenSubHeader";

const meta: Meta = {
  title: "ScreenHeader",
};

export default meta;

type Story = StoryObj;

export const Tier1Plain: Story = {
  render: () => (
    <View style={storyStyles.full}>
      <ScreenHeader title="Goals" />
      <Body />
    </View>
  ),
};

export const Tier1WithRightAction: Story = {
  render: () => (
    <View style={storyStyles.full}>
      <ScreenHeader
        title="Goals"
        right={
          <IconButton
            icon={<RNText style={storyStyles.addIcon}>+</RNText>}
            onPress={() => {}}
            accessibilityLabel="Create new goal"
          />
        }
      />
      <Body />
    </View>
  ),
};

export const Tier2BackAndLabel: Story = {
  render: () => (
    <View style={storyStyles.full}>
      <ScreenSubHeader label="Focus Mode" onBack={() => {}} />
      <Body />
    </View>
  ),
};

function Body() {
  return (
    <View style={storyStyles.body}>
      <Text variant="body">
        Page content renders below the band. Switch the global theme in the
        Storybook toolbar to verify the band stays solid (no two-tone split)
        across all 14 themes.
      </Text>
    </View>
  );
}

const storyStyles = StyleSheet.create((theme) => ({
  full: {
    backgroundColor: theme.colors.background,
    minHeight: 240,
  },
  body: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  addIcon: {
    fontSize: 24,
    lineHeight: 28,
    color: theme.colors.accentPurpleFg,
  },
}));
