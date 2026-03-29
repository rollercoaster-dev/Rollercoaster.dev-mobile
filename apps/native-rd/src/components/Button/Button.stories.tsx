import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { Button, type ButtonVariant, type ButtonSize } from "./Button";

const variants: ButtonVariant[] = [
  "primary",
  "secondary",
  "ghost",
  "destructive",
];
const sizes: ButtonSize[] = ["sm", "md", "lg"];

const meta: Meta<typeof Button> = {
  title: "Button",
  component: Button,
  argTypes: {
    variant: { control: "select", options: variants },
    size: { control: "select", options: sizes },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const AllVariants: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {variants.map((variant) => (
        <View key={variant} style={storyStyles.row}>
          <Text variant="label" style={storyStyles.label}>
            {variant}
          </Text>
          <Button
            label={`${variant} button`}
            variant={variant}
            onPress={() => {}}
          />
        </View>
      ))}
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {sizes.map((size) => (
        <View key={size} style={storyStyles.row}>
          <Text variant="label" style={storyStyles.label}>
            {size}
          </Text>
          <Button label={`${size} button`} size={size} onPress={() => {}} />
        </View>
      ))}
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Button label="Normal" onPress={() => {}} />
      <Button label="Disabled" onPress={() => {}} disabled />
      <Button label="Loading" onPress={() => {}} loading />
    </View>
  ),
};

export const Interactive: Story = {
  args: {
    label: "Press me",
    onPress: () => {},
    variant: "primary",
    size: "md",
    disabled: false,
    loading: false,
  },
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
