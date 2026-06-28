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
    // Mono caps metric readout — "5 / 9 STEPS" — matching the cockpit prototype.
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: theme.space[1],
  },
}));
