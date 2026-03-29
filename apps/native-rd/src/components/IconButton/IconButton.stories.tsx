import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View, Text as RNText } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import {
  IconButton,
  type IconButtonVariant,
  type IconButtonSize,
} from "./IconButton";

const variants: IconButtonVariant[] = ["default", "ghost", "destructive"];
const sizes: IconButtonSize[] = ["sm", "md", "lg"];

const meta: Meta<typeof IconButton> = {
  title: "IconButton",
  component: IconButton,
};

export default meta;

type Story = StoryObj<typeof IconButton>;

export const AllVariants: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {variants.map((variant) => (
        <View key={variant} style={storyStyles.row}>
          <Text variant="label" style={storyStyles.label}>
            {variant}
          </Text>
          <IconButton
            icon={<RNText>+</RNText>}
            variant={variant}
            onPress={() => {}}
            accessibilityLabel={`${variant} button`}
          />
        </View>
      ))}
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View style={storyStyles.row}>
      {sizes.map((size) => (
        <IconButton
          key={size}
          icon={
            <RNText>{size === "sm" ? "×" : size === "md" ? "+" : "⚙"}</RNText>
          }
          size={size}
          onPress={() => {}}
          accessibilityLabel={`${size} button`}
        />
      ))}
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
  row: {
    flexDirection: "row",
    gap: theme.space[3],
    alignItems: "center",
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    width: 100,
  },
}));
