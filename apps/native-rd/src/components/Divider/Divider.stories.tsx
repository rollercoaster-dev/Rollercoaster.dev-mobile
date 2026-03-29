import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { Divider } from "./Divider";

const meta: Meta<typeof Divider> = {
  title: "Divider",
  component: Divider,
};

export default meta;

type Story = StoryObj<typeof Divider>;

export const Default: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="body">Content above</Text>
      <Divider />
      <Text variant="body">Content below</Text>
    </View>
  ),
};

export const Spacings: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label">{'spacing="1"'}</Text>
      <Divider spacing="1" />
      <Text variant="label">{'spacing="3"'}</Text>
      <Divider spacing="3" />
      <Text variant="label">{'spacing="5"'}</Text>
      <Divider spacing="5" />
      <Text variant="label">{'spacing="8"'}</Text>
      <Divider spacing="8" />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[1],
  },
}));
