import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { palette } from "../../themes/adapter";

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
  completedNode: {
    backgroundColor: palette.blue600,
    borderColor: palette.blue600,
  },
  inProgressNode: {
    borderWidth: 4,
    borderColor: palette.blue600,
  },
  nodeText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  smallNodeText: {
    fontSize: theme.size.xs,
  },
  completedText: {
    color: theme.colors.background,
  },
  inProgressText: {
    color: palette.blue600,
  },
  goalText: {
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
  pressed: {
    transform: [{ scale: 1.1 }],
  },
}));
