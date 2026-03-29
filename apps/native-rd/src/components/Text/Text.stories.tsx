import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text, type TextVariant } from "./Text";

const variants: TextVariant[] = [
  "display",
  "headline",
  "title",
  "body",
  "caption",
  "label",
  "mono",
];

const meta: Meta<typeof Text> = {
  title: "Text",
  component: Text,
  argTypes: {
    variant: {
      control: "select",
      options: variants,
    },
  },
};

export default meta;

type Story = StoryObj<typeof Text>;

export const AllVariants: Story = {
  render: () => (
    <View style={styles.grid}>
      {variants.map((variant) => (
        <View key={variant} style={styles.row}>
          <Text variant="label" style={styles.variantLabel}>
            {variant}
          </Text>
          <Text variant={variant}>
            {variant === "mono"
              ? 'const theme = composeTheme("light", "default");'
              : variant === "display"
                ? "Display"
                : variant === "headline"
                  ? "Headline Text"
                  : variant === "title"
                    ? "Title Text"
                    : variant === "body"
                      ? "Body text is used for paragraphs and general content. It should be easy to read at length."
                      : variant === "caption"
                        ? "Caption text for metadata and supplementary information"
                        : "LABEL TEXT"}
          </Text>
        </View>
      ))}
    </View>
  ),
};

export const SingleVariant: Story = {
  args: {
    variant: "body",
    children: "The quick brown fox jumps over the lazy dog.",
  },
};

const styles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
  row: {
    gap: theme.space[1],
  },
  variantLabel: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
}));
