import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '../Text';
import { ProgressDots, type ProgressDotsStep } from './ProgressDots';

const meta: Meta<typeof ProgressDots> = {
  title: 'ProgressDots',
  component: ProgressDots,
};

export default meta;

type Story = StoryObj<typeof ProgressDots>;

function InteractiveWrapper({
  initialSteps,
  initialIndex = 0,
  showGoalDot = true,
}: {
  initialSteps: ProgressDotsStep[];
  initialIndex?: number;
  showGoalDot?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  return (
    <View style={storyStyles.wrapper}>
      <ProgressDots
        steps={initialSteps}
        currentIndex={currentIndex}
        onDotTap={(index) => setCurrentIndex(index)}
        showGoalDot={showGoalDot}
      />
      <Text variant="caption" style={storyStyles.label}>
        Current: {currentIndex < initialSteps.length ? `Step ${currentIndex + 1}` : 'Goal'}
      </Text>
    </View>
  );
}

export const MixedStatuses: Story = {
  render: () => (
    <InteractiveWrapper
      initialSteps={[
        { status: 'completed' },
        { status: 'completed' },
        { status: 'in-progress' },
        { status: 'pending' },
        { status: 'pending' },
      ]}
      initialIndex={2}
    />
  ),
};

export const AllCompleted: Story = {
  render: () => (
    <InteractiveWrapper
      initialSteps={[
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
      ]}
      initialIndex={3}
    />
  ),
};

export const AllPending: Story = {
  render: () => (
    <InteractiveWrapper
      initialSteps={[
        { status: 'pending' },
        { status: 'pending' },
        { status: 'pending' },
        { status: 'pending' },
      ]}
      initialIndex={0}
    />
  ),
};

export const WithoutGoalDot: Story = {
  render: () => (
    <InteractiveWrapper
      initialSteps={[
        { status: 'completed' },
        { status: 'in-progress' },
        { status: 'pending' },
      ]}
      initialIndex={1}
      showGoalDot={false}
    />
  ),
};

export const SingleStep: Story = {
  render: () => (
    <InteractiveWrapper
      initialSteps={[{ status: 'in-progress' }]}
      initialIndex={0}
    />
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  wrapper: {
    gap: theme.space[3],
  },
  label: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
}));
