import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  wrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    color: theme.colors.text,
  },
  centerSublabel: {
    color: theme.colors.textMuted,
  },
}));
