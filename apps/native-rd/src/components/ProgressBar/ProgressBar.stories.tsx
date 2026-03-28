import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '../Text';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'ProgressBar',
  component: ProgressBar,
};

export default meta;

type Story = StoryObj<typeof ProgressBar>;

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {[0, 0.25, 0.5, 0.75, 1].map((progress) => (
        <View key={progress} style={storyStyles.row}>
          <Text variant="label" style={storyStyles.label}>
            {Math.round(progress * 100)}%
          </Text>
          <ProgressBar progress={progress} />
        </View>
      ))}
    </View>
  ),
};

export const Interactive: Story = {
  args: {
    progress: 0.6,
  },
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
  row: {
    gap: theme.space[1],
  },
  label: {
    color: theme.colors.textMuted,
  },
}));
