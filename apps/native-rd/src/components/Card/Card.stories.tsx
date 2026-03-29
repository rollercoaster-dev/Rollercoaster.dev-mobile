import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { Card, type CardSize } from "./Card";

const sizes: CardSize[] = ["compact", "normal", "spacious"];

const meta: Meta<typeof Card> = {
  title: "Card",
  component: Card,
};

export default meta;

type Story = StoryObj<typeof Card>;

export const AllSizes: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {sizes.map((size) => (
        <View key={size} style={storyStyles.row}>
          <Text variant="label" style={storyStyles.label}>
            {size}
          </Text>
          <Card size={size}>
            <Text variant="title">Card Title</Text>
            <Text variant="body">Card content goes here.</Text>
          </Card>
        </View>
      ))}
    </View>
  ),
};

export const Pressable: Story = {
  render: () => (
    <Card onPress={() => {}} onLongPress={() => {}}>
      <Text variant="title">Pressable Card</Text>
      <Text variant="body">Tap or long-press me.</Text>
    </Card>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
  row: {
    gap: theme.space[2],
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
}));
