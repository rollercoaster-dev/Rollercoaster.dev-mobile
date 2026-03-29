import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { palette } from "../../themes/palette";

export const styles = StyleSheet.create((theme) => ({
  container: (isGoal: boolean) => ({
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: theme.space[1],
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[2],
    minHeight: 80,
    width: "100%" as const,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderLeftWidth: isGoal ? 4 : theme.borderWidth.thin,
    borderLeftColor: isGoal ? palette.yellow300 : theme.colors.border,
    ...shadowStyle(theme, "hardSm"),
  }),
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.body,
    textAlign: "center" as const,
  },
}));
