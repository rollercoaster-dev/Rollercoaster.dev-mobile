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
  segment: {
    flex: 1,
    height: 3,
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
