import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '../Text';
import { TimelineNode } from './TimelineNode';

const meta: Meta<typeof TimelineNode> = {
  title: 'TimelineNode',
  component: TimelineNode,
};

export default meta;

type Story = StoryObj<typeof TimelineNode>;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={storyStyles.row}>
    <Text variant="label" style={storyStyles.label}>{label}</Text>
    <View style={storyStyles.nodeWrap}>{children}</View>
  </View>
);

export const Pending: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Pending — Step 1">
        <TimelineNode status="pending" stepNumber={1} accessibilityLabel="Step 1: pending" />
      </Row>
      <Row label="Pending — Step 5">
        <TimelineNode status="pending" stepNumber={5} accessibilityLabel="Step 5: pending" />
      </Row>
    </View>
  ),
};

export const InProgress: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="In Progress — Step 2">
        <TimelineNode status="in-progress" stepNumber={2} accessibilityLabel="Step 2: in progress" />
      </Row>
    </View>
  ),
};

export const Completed: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Completed — Step 3">
        <TimelineNode status="completed" stepNumber={3} accessibilityLabel="Step 3: completed" />
      </Row>
    </View>
  ),
};

export const GoalNode: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Goal Node (star, yellow)">
        <TimelineNode
          status="completed"
          isGoalNode
          accessibilityLabel="Goal finish line"
        />
      </Row>
    </View>
  ),
};

export const PressableVsStatic: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <Row label="Pressable (with onPress)">
        <TimelineNode
          status="in-progress"
          stepNumber={1}
          onPress={() => {}}
          accessibilityLabel="Step 1, tap to navigate"
        />
      </Row>
      <Row label="Static (no onPress)">
        <TimelineNode
          status="pending"
          stepNumber={2}
          accessibilityLabel="Step 2: pending"
        />
      </Row>
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    gap: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[4],
  },
  label: {
    color: theme.colors.textMuted,
    width: 180,
  },
  nodeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
