import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { StepStatus } from "../../types/steps";
import { stepStateColorMap } from "./stepStateColorMap";
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
   * Takes precedence over `stepNumber` but not over goal or status glyphs.
   */
  label?: string;
  /**
   * When true (and not a goal node), render a state-word badge below the node,
   * labelled from the `common` namespace via stepStateColorMap. Default-off so
   * live consumers — which already render a StatusBadge beside each node — stay
   * byte-identical; only stories opt in (#406 D7).
   */
  showStateBadge?: boolean;
}

export function TimelineNode({
  status,
  stepNumber,
  onPress,
  accessibilityLabel,
  isGoalNode = false,
  size = "md",
  label,
  showStateBadge = false,
}: TimelineNodeProps) {
  const isSmall = size === "sm";

  const nodeStyle = [
    styles.node,
    isSmall && styles.smallNode,
    isGoalNode && styles.goalNode,
    !isGoalNode && status === "pending" && styles.pendingNode,
    !isGoalNode && status === "in-progress" && styles.inProgressNode,
    !isGoalNode && status === "completed" && styles.completedNode,
    !isGoalNode && status === "paused" && styles.pausedNode,
  ];

  const textStyle = [
    styles.nodeText,
    isSmall && styles.smallNodeText,
    isGoalNode && styles.goalText,
    !isGoalNode && status === "pending" && styles.pendingText,
    !isGoalNode && status === "in-progress" && styles.inProgressText,
    !isGoalNode && status === "completed" && styles.completedText,
    !isGoalNode && status === "paused" && styles.pausedText,
  ];

  // Interior precedence: goal star → state glyph → label → step number. The
  // number/label fall through to "" (not "0" or "undefined") when a caller
  // supplies neither, so a misconfigured node renders blank rather than a
  // misleading glyph.
  const content = isGoalNode
    ? "★"
    : (stepStateColorMap[status].nodeGlyph ??
      label ??
      (stepNumber != null ? String(stepNumber) : ""));

  // Expand touch target to meet 44×44pt minimum
  const nodeSize = isGoalNode
    ? GOAL_NODE_SIZE
    : isSmall
      ? SMALL_NODE_SIZE
      : NODE_SIZE;
  const hitPad = Math.max(0, Math.ceil((44 - nodeSize) / 2));

  const circle = !onPress ? (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={nodeStyle}
    >
      <Text style={textStyle}>{content}</Text>
    </View>
  ) : (
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

  // Opt-in state-word badge (D7). Goal nodes never carry one. The badge is a
  // label, not a touch target, so it sits outside the Pressable / hitSlop.
  if (!showStateBadge || isGoalNode) {
    return circle;
  }

  return (
    <View style={styles.badgeWrapper}>
      {circle}
      <StateBadge status={status} />
    </View>
  );
}

function StateBadge({ status }: { status: StepStatus }) {
  const { t } = useTranslation(["common"]);

  return (
    <View accessibilityRole="text" style={styles.stateBadge}>
      <Text style={styles.stateBadgeText}>
        {t(stepStateColorMap[status].badgeI18nKey)}
      </Text>
    </View>
  );
}
