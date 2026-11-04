import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    alignSelf: "stretch",
  },
  // Invisible unclamped twin of the title. It only exists to report how many
  // lines the full text needs at the current width and type size.
  measure: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  toggle: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: theme.space[2],
  },
  toggleText: {
    color: theme.colors.accentPrimary,
    textDecorationLine: "underline",
  },
}));
