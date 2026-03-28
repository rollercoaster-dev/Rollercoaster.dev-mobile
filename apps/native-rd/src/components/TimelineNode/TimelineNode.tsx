import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StepStatus } from '../../types/steps';
import { styles, NODE_SIZE, GOAL_NODE_SIZE } from './TimelineNode.styles';

export interface TimelineNodeProps {
  status: StepStatus;
  /** Step number displayed in the node. Ignored when isGoalNode is true. */
  stepNumber?: number;
  onPress?: () => void;
  accessibilityLabel: string;
  isGoalNode?: boolean;
}

export function TimelineNode({
  status,
  stepNumber = 0,
  onPress,
  accessibilityLabel,
  isGoalNode = false,
}: TimelineNodeProps) {
  const nodeStyle = [
    styles.node,
    isGoalNode && styles.goalNode,
    !isGoalNode && status === 'completed' && styles.completedNode,
    !isGoalNode && status === 'in-progress' && styles.inProgressNode,
  ];

  const textStyle = [
    styles.nodeText,
    isGoalNode && styles.goalText,
    !isGoalNode && status === 'completed' && styles.completedText,
    !isGoalNode && status === 'in-progress' && styles.inProgressText,
  ];

  const content = isGoalNode
    ? '\u2605'
    : status === 'completed'
      ? '\u2713'
      : String(stepNumber);

  // Expand touch target to meet 44×44pt minimum
  const nodeSize = isGoalNode ? GOAL_NODE_SIZE : NODE_SIZE;
  const hitPad = Math.max(0, Math.ceil((44 - nodeSize) / 2));

  if (!onPress) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={nodeStyle}
      >
        <Text style={textStyle}>{content}</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitPad}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [nodeStyle, pressed && styles.pressed]}
    >
      <Text style={textStyle}>{content}</Text>
    </Pressable>
  );
}
