import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: theme.space[2],
  },
  icon: {
    fontSize: 16,
  },
  iconImage: {
    width: 20,
    height: 20,
  },
  label: {
    fontWeight: theme.fontWeight.semibold,
    letterSpacing: 0.02,
  },
}));
