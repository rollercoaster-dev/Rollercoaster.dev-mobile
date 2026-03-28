import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '../Text';
import { MiniTimeline, type MiniTimelineStep } from './MiniTimeline';

const meta: Meta<typeof MiniTimeline> = {
  title: 'MiniTimeline',
  component: MiniTimeline,
};

export default meta;

type Story = StoryObj<typeof MiniTimeline>;

function InteractiveWrapper({
  initialSteps,
  initialIndex = 0,
}: {
  initialSteps: MiniTimelineStep[];
  initialIndex?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  return (
    <View style={storyStyles.wrapper}>
      <MiniTimeline
        steps={initialSteps}
        currentIndex={currentIndex}
        onStepTap={(index) => setCurrentIndex(index)}
        onTimelineTap={() => {}}
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
