import React from "react";
import { Pressable, Text, View } from "react-native";
import type { StepStatus } from "../../types/steps";
import {
  styles,
  NODE_SIZE,
  GOAL_NODE_SIZE,
  SMALL_NODE_SIZE,
} from "./TimelineNode.styles";

export interface TimelineNodeProps {
  status: StepStatus;
  /** Step number displayed in the node. Ignored when isGoalNode or label is set. */
  stepNumber?: number;
  onPress?: () => void;
  accessibilityLabel: string;
  isGoalNode?: boolean;
  /** Node size. 'sm' renders the smaller sub-step node on the child sub-spine (#293). */
  size?: "md" | "sm";
  /**
   * Glyph override for the node interior, e.g. a child's letter ordinal ("a").
   * Takes precedence over `stepNumber` but not over the goal star or done check.
   */
  label?: string;
}

export function TimelineNode({
  status,
  stepNumber = 0,
  onPress,
  accessibilityLabel,
  isGoalNode = false,
  size = "md",
  label,
}: TimelineNodeProps) {
  const isSmall = size === "sm";

  const nodeStyle = [
    styles.node,
    isSmall && styles.smallNode,
    isGoalNode && styles.goalNode,
    !isGoalNode && status === "completed" && styles.completedNode,
    !isGoalNode && status === "in-progress" && styles.inProgressNode,
  ];

  const textStyle = [
    styles.nodeText,
    isSmall && styles.smallNodeText,
    isGoalNode && styles.goalText,
    !isGoalNode && status === "completed" && styles.completedText,
    !isGoalNode && status === "in-progress" && styles.inProgressText,
  ];

  const content = isGoalNode
    ? "\u2605"
    : status === "completed"
      ? "\u2713"
      : (label ?? String(stepNumber));

  // Expand touch target to meet 44×44pt minimum
  const nodeSize = isGoalNode
    ? GOAL_NODE_SIZE
    : isSmall
      ? SMALL_NODE_SIZE
      : NODE_SIZE;
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
