import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[5],
    paddingHorizontal: theme.space[6],
    backgroundColor: theme.colors.background,
  },
  badgeDim: {
    opacity: 0.5,
  },
  label: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  // Stacks the no-key/error alert above its escape/retry action, mirroring
  // CompletionFlowScreen.styles.ts's `badgeErrorContainer` shape.
  messageContainer: {
    width: "100%",
    alignItems: "center",
    gap: theme.space[3],
  },
  errorText: {
    color: theme.colors.error,
    textAlign: "center",
  },
}));
