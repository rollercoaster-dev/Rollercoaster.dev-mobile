import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "Toast",
  component: Toast,
};

export default meta;

type Story = StoryObj<typeof Toast>;

function ToastDemo({
  message,
  actionLabel,
}: {
  message: string;
  actionLabel?: string;
}) {
  const [visible, setVisible] = useState(true);
  return (
    <View style={storyStyles.container}>
      <Pressable
        style={storyStyles.trigger}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Show toast"
      >
        <Text variant="label">Show Toast</Text>
      </Pressable>
      <Toast
        visible={visible}
        message={message}
        duration={5000}
        onDismiss={() => setVisible(false)}
        action={
          actionLabel
            ? { label: actionLabel, onPress: () => setVisible(false) }
            : undefined
        }
      />
    </View>
  );
}

export const Simple: Story = {
  render: () => <ToastDemo message="Step marked as complete" />,
};

export const WithAction: Story = {
  render: () => <ToastDemo message="Evidence deleted" actionLabel="Undo" />,
};

export const LongMessage: Story = {
  render: () => (
    <ToastDemo message="Your goal has been saved and all evidence has been attached successfully" />
  ),
};

// Hidden: Toast returns null when visible=false, so the canvas intentionally shows only the
// explanatory note — this is not a placeholder, it demonstrates the component's real behaviour.
export const Hidden: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="body" style={storyStyles.note}>
        Toast is hidden (visible=false). Nothing is rendered.
      </Text>
      <Toast visible={false} message="Not visible" />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    minHeight: 200,
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
    justifyContent: "flex-end",
  },
  trigger: {
    alignSelf: "center",
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: theme.space[8],
  },
  note: {
    color: theme.colors.textMuted,
    textAlign: "center",
  },
}));
