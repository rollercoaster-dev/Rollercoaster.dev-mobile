import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  content: {
    gap: theme.space[2],
  },
  body: {
    color: theme.colors.textMuted,
  },
  // Wraps rather than squeezes: at large type or in a long locale the decline
  // drops under the start button instead of clipping either label.
  actions: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    marginTop: theme.space[2],
  },
}));
