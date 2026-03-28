import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { GoalCard, type GoalCardGoal } from './GoalCard';

const meta: Meta<typeof GoalCard> = {
  title: 'GoalCard',
  component: GoalCard,
};

export default meta;

type Story = StoryObj<typeof GoalCard>;

const goals: GoalCardGoal[] = [
  { id: '1', title: 'Learn React Native Navigation', status: 'active', stepsTotal: 5, stepsCompleted: 2 },
  { id: '2', title: 'Build a Storybook component library', status: 'active', stepsTotal: 8, stepsCompleted: 6 },
  { id: '3', title: 'Understand Evolu local-first sync', status: 'completed', stepsTotal: 3, stepsCompleted: 3 },
  { id: '4', title: 'Design neo-brutalist theme system', status: 'active', stepsTotal: 0, stepsCompleted: 0 },
];

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} onPress={() => {}} onLongPress={() => {}} />
      ))}
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[3],
  },
}));
