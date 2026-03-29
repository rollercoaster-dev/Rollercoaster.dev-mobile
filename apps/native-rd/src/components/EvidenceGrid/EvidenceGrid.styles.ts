import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[2],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[3],
  },
  item: {
    width: "48%",
  },
  emptyText: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.space[4],
  },
}));
