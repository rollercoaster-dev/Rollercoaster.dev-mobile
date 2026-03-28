import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '../Text';
import { Confetti } from './Confetti';

const meta: Meta<typeof Confetti> = {
  title: 'Confetti',
  component: Confetti,
};

export default meta;

type Story = StoryObj<typeof Confetti>;

function ConfettiDemo() {
  const [visible, setVisible] = useState(true);
  return (
    <View style={storyStyles.container}>
      {/* Confetti auto-dismisses after CLEANUP_MS (3s) via onComplete — tap button to replay */}
      <Confetti visible={visible} onComplete={() => setVisible(false)} />
      <Pressable
        style={storyStyles.button}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Trigger confetti"
      >
        <Text variant="label" style={storyStyles.buttonLabel}>🎉 Trigger Confetti</Text>
      </Pressable>
    </View>
  );
}

export const Active: Story = {
  render: () => <ConfettiDemo />,
};

export const Hidden: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Text variant="body" style={storyStyles.note}>
        Confetti is hidden (visible=false). Nothing is rendered.
      </Text>
      <Confetti visible={false} />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    minHeight: 300,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space[4],
  },
  button: {
    backgroundColor: theme.colors.accentPrimary,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[6],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.text,
  },
  buttonLabel: {
    color: theme.colors.text,
  },
  note: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
}));
