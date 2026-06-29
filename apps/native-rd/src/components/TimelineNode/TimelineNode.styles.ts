import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { palette } from "../../themes/adapter";
import { stepStateNodeBg, stepStateNodeFg } from "./stepStateColorMap";

export const NODE_SIZE = 32;
export const GOAL_NODE_SIZE = 40;
// Sub-step node: smaller than a top-level node so children read as subordinate
// on the indented sub-spine, while still large enough to carry a letter ordinal
// (matches the prototype's ~24px `.jnode.sm`; #293).
export const SMALL_NODE_SIZE = 24;

export const styles = StyleSheet.create((theme) => ({
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  goalNode: {
    width: GOAL_NODE_SIZE,
    height: GOAL_NODE_SIZE,
    borderRadius: GOAL_NODE_SIZE / 2,
    backgroundColor: palette.yellow300,
    borderColor: theme.colors.text,
  },
  smallNode: {
    width: SMALL_NODE_SIZE,
    height: SMALL_NODE_SIZE,
    borderRadius: SMALL_NODE_SIZE / 2,
  },
  // State colors are resolved through stepStateColorMap — the single source of
  // truth shared with the AllThemesMatrix story (#406). No state hex is hardwired
  // here; the journey-* token (or the paused fallback) lives in the map.
  pendingNode: {
    backgroundColor: stepStateNodeBg(theme, "pending"),
    borderColor: theme.colors.border,
  },
  inProgressNode: {
    backgroundColor: stepStateNodeBg(theme, "in-progress"),
    borderColor: stepStateNodeBg(theme, "in-progress"),
  },
  completedNode: {
    backgroundColor: stepStateNodeBg(theme, "completed"),
    borderColor: stepStateNodeBg(theme, "completed"),
  },
  pausedNode: {
    backgroundColor: stepStateNodeBg(theme, "paused"),
    borderColor: theme.colors.border,
  },
  nodeText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  smallNodeText: {
    fontSize: theme.size.xs,
  },
  pendingText: {
    color: stepStateNodeFg(theme, "pending"),
  },
  inProgressText: {
    color: stepStateNodeFg(theme, "in-progress"),
  },
  completedText: {
    color: stepStateNodeFg(theme, "completed"),
  },
  pausedText: {
    color: stepStateNodeFg(theme, "paused"),
  },
  goalText: {
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
  pressed: {
    transform: [{ scale: 1.1 }],
  },
  // Opt-in state-word badge (showStateBadge, #406 / D7). Wraps the node + label
  // in a column; default-off so live consumers stay byte-identical.
  badgeWrapper: {
    alignItems: "center",
    gap: theme.space[1],
  },
  stateBadge: {
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  stateBadgeText: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
}));
