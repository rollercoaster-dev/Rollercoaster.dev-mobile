import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
  },
  title: {
    flex: 1,
    ...theme.textStyles.title,
    color: theme.colors.text,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    marginTop: theme.space[3],
  },
  progressBar: {
    flex: 1,
  },
  progressLabel: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
    minWidth: 60,
    textAlign: "right",
  },
}));
