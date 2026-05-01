import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View, Text as RNText } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import {
  IconButton,
  type IconButtonSize,
  type IconButtonTone,
} from "./IconButton";

const tones: IconButtonTone[] = [
  "chrome",
  "ghost",
  "surface",
  "primary",
  "destructive",
];
const sizes: IconButtonSize[] = ["sm", "md", "lg"];

const meta: Meta<typeof IconButton> = {
  title: "IconButton",
  component: IconButton,
};

export default meta;

type Story = StoryObj<typeof IconButton>;

// Renders chrome tones over a purple band so the transparent container reads
// against the same surface they sit on in the app.
function ChromeBand({ children }: { children: React.ReactNode }) {
  return <View style={storyStyles.chromeBand}>{children}</View>;
}

export const AllTones: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {tones.map((tone) => {
        const button = (
          <IconButton
            icon={<RNText>+</RNText>}
            tone={tone}
            onPress={() => {}}
            accessibilityLabel={`${tone} button`}
          />
        );
        return (
          <View key={tone} style={storyStyles.row}>
            <Text variant="label" style={storyStyles.label}>
              {tone}
            </Text>
            {tone === "chrome" ? <ChromeBand>{button}</ChromeBand> : button}
          </View>
        );
      })}
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
  chromeBand: {
    backgroundColor: theme.colors.accentPurple,
    padding: theme.space[2],
    borderRadius: theme.radius.sm,
  },
}));
