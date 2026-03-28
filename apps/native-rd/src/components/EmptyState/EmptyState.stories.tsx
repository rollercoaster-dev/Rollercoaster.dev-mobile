import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'EmptyState',
  component: EmptyState,
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const GoalsEmpty: Story = {
  render: () => (
    <EmptyState
      title="No goals yet"
      body="Add your first learning goal to get started on your journey."
      action={{ label: 'Create Goal', onPress: () => {} }}
    />
  ),
};

export const BadgesEmpty: Story = {
  render: () => (
    <EmptyState
      title="No badges earned"
      body="Complete goals to earn badges and track your achievements."
    />
  ),
};

export const WithIcon: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <EmptyState
        icon="🎯"
        title="No goals yet"
        body="Start by creating your first learning goal."
        action={{ label: 'Get Started', onPress: () => {} }}
      />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
}));
