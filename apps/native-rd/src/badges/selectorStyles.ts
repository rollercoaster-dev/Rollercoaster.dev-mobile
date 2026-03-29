import { StyleSheet } from "react-native-unistyles";

export const selectorStyles = StyleSheet.create((theme) => ({
  row: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  label: {
    fontSize: 11,
    fontFamily: theme.fontFamily.body,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[2],
    minWidth: 72,
    height: 88,
    borderRadius: 0,
    gap: theme.space[1],
  },
}));
