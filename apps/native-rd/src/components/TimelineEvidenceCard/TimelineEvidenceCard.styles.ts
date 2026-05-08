import { StyleSheet } from "react-native-unistyles";
import { palette } from "../../themes/palette";

export const styles = StyleSheet.create((theme) => ({
  card: (isGoal: boolean) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderLeftWidth: isGoal ? 4 : 2,
    borderLeftColor: isGoal ? palette.yellow300 : theme.colors.border,
    borderRadius: theme.radius.sm,
    marginBottom: theme.space[1],
  }),
  icon: {
    fontSize: theme.size.sm,
  },
  label: {
    flex: 1,
    fontSize: theme.size.xs,
    color: theme.colors.text,
  },
}));
