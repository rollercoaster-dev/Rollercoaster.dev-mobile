import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { AudioPlayer } from "./AudioPlayer";

const meta: Meta<typeof AudioPlayer> = {
  title: "AudioPlayer",
  component: AudioPlayer,
};

export default meta;

type Story = StoryObj<typeof AudioPlayer>;

// AudioPlayer requires expo-audio (native module). Run these stories on device or simulator only —
// they will crash in a web/JS-only Storybook environment without an expo-audio polyfill.
// Stories show the initial paused UI state (0% progress); actual playback requires a real audio file.
const MOCK_URI = "file:///mock/voice-memo.m4a";

export const Default: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        Audio Player — initial state
      </Text>
      <AudioPlayer uri={MOCK_URI} />
    </View>
  ),
};

export const WithKnownDuration: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        With known duration (2m 30s)
      </Text>
      <AudioPlayer uri={MOCK_URI} durationMs={150000} />
    </View>
  ),
};

export const ShortClip: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="label" style={storyStyles.label}>
        Short clip (15s)
      </Text>
      <AudioPlayer uri={MOCK_URI} durationMs={15000} />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    gap: theme.space[3],
    backgroundColor: theme.colors.background,
  },
  label: {
    color: theme.colors.textMuted,
  },
}));
