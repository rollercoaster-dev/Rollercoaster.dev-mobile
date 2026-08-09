import React from "react";
import { Pressable, Text, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import type { StepStatus } from "../../types/steps";
import { stepStateColorMap, stepStateNodeFg } from "./stepStateColorMap";
import {
  styles,
  NODE_SIZE,
  GOAL_NODE_SIZE,
  SMALL_NODE_SIZE,
} from "./TimelineNode.styles";

export interface TimelineNodeProps {
  status: StepStatus;
  /**
   * Optional stable id for E2E addressing. The Timeline is the one surface
   * where the *ordinal* is under test (reorder/reparent change it), so callers
   * compose index-derived ids like `timeline-node-2-a` rather than deriving
   * them from Evolu step ids, which a pre-written flow can never construct.
   */
  testID?: string;
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
   * labelled from `timelineJourney` via stepStateColorMap (#453). Default-off so
   * live consumers — which already render a StatusBadge beside each node — stay
   * byte-identical; only stories opt in (#406 D7).
   */
  showStateBadge?: boolean;
  /**
   * Only meaningful when `isGoalNode`: paints the star celebration yellow once
   * every step is complete. Neutral (card-background) otherwise (#452).
   */
  celebrate?: boolean;
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
  celebrate = false,
  testID,
}: TimelineNodeProps) {
  const isSmall = size === "sm";
  const { theme } = useUnistyles();

  const nodeStyle = [
    styles.node,
    isSmall && styles.smallNode,
    isGoalNode && styles.goalNode,
    isGoalNode && celebrate && styles.goalNodeCelebrate,
    !isGoalNode && status === "pending" && styles.pendingNode,
    !isGoalNode && status === "in-progress" && styles.inProgressNode,
    !isGoalNode && status === "completed" && styles.completedNode,
    !isGoalNode && status === "paused" && styles.pausedNode,
  ];

  const textStyle = [
    styles.nodeText,
    isSmall && styles.smallNodeText,
    isGoalNode && styles.goalText,
    isGoalNode && celebrate && styles.goalTextCelebrate,
    !isGoalNode && status === "pending" && styles.pendingText,
    !isGoalNode && status === "in-progress" && styles.inProgressText,
    !isGoalNode && status === "completed" && styles.completedText,
    !isGoalNode && status === "paused" && styles.pausedText,
  ];

  // A Phosphor icon for states whose marker would otherwise need an
  // emoji-presentation codepoint — `paused` is the only one today. Goal nodes
  // never take a state icon; they own the star. Sized to match the text glyphs
  // below (`✓` uses the same tokens) so the two states have one optical weight,
  // and colored from the same `stepStateNodeFg` the text styles resolve — which
  // is the whole point: the old `⏸` emoji ignored it (design system Rule 8).
  const StateIcon = isGoalNode ? undefined : stepStateColorMap[status].nodeIcon;

  // Interior precedence: goal star → state icon → state glyph → label → step
  // number. The number/label fall through to "" (not "0" or "undefined") when a
  // caller supplies neither, so a misconfigured node renders blank rather than a
  // misleading glyph.
  const content = StateIcon ? (
    <StateIcon
      size={isSmall ? theme.size.xs : theme.size.sm}
      weight="bold"
      color={stepStateNodeFg(theme, status)}
      // The interior marker is not text, so it cannot be asserted with
      // getByText the way `✓` and the step number are.
      testID={`timeline-node-state-icon-${status}`}
    />
  ) : (
    <Text style={textStyle}>
      {isGoalNode
        ? "★"
        : (stepStateColorMap[status].nodeGlyph ??
          label ??
          (stepNumber != null ? String(stepNumber) : ""))}
    </Text>
  );

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
      testID={testID}
    >
      {content}
    </View>
  ) : (
    <Pressable
      onPress={onPress}
      hitSlop={hitPad}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [nodeStyle, pressed && styles.pressed]}
      testID={testID}
    >
      {content}
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
  const { t } = useTranslation(["timelineJourney"]);

  return (
    <View accessibilityRole="text" style={styles.stateBadge}>
      <Text style={styles.stateBadgeText}>
        {t(stepStateColorMap[status].stateWordI18nKey)}
      </Text>
    </View>
  );
}
