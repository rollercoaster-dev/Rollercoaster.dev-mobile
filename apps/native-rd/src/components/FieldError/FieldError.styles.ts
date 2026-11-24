import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space[1],
  },
  // Nudges the 16pt icon onto the first text line's optical centre.
  icon: {
    paddingTop: 2,
  },
  message: {
    flex: 1,
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
}));
