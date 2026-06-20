import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  track: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    height: 24,
  },
  node: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    backgroundColor: theme.colors.backgroundSecondary,
    zIndex: 1,
  },
  nodeCompleted: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.accentPrimary,
  },
  nodeCurrent: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: theme.colors.accentPrimary,
  },
  // Sub-step node: smaller than a top-level node, visually subordinate. Keeps
  // the base node's border weight and (when completed) accent fill (#292).
  nodeChild: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Current sub-step: bumps back up to the standard node size with the accent
  // ring so the active leaf reads clearly within its group.
  nodeChildCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: theme.colors.accentPrimary,
  },
  nodeGoal: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning,
    zIndex: 1,
  },
  nodeGoalCompleted: {
    borderColor: theme.colors.border,
  },
  // Parent + its children, grouped under a bottom-border "shelf" so the
  // sub-spine reads as subordinate without offsetting children to a second row
  // (#292, prototype `grp-indent`).
  groupIndent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 3,
    paddingBottom: 4,
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  segment: {
    flex: 1,
    height: 3,
  },
  // Short connector between a parent and its inline children (vs the flex:1
  // long segment between top-level steps).
  segmentShort: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 7,
  },
  segmentCompleted: {
    backgroundColor: theme.colors.accentPrimary,
  },
  segmentPending: {
    backgroundColor: "transparent" as const,
    borderTopWidth: 3,
    borderStyle: "dashed" as const,
    borderColor: theme.colors.textMuted,
    height: 0,
  },
  hintText: {
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
    textAlign: "center" as const,
    marginTop: 4,
    fontFamily: theme.fontFamily.body,
  },
}));
