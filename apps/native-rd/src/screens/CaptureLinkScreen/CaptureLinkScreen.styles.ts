import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // KeyboardAvoidingView frame around the body + footer: flex:1 so it owns the
  // space under the header and shrinks with the soft keyboard, lifting the
  // footer CTA above it instead of leaving it covered.
  keyboardFrame: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.space[4],
    gap: theme.space[4],
  },
  inputSection: {
    gap: theme.space[3],
  },
  previewCard: {
    padding: theme.space[4],
    gap: theme.space[2],
  },
  previewIcon: {
    fontSize: 32,
    textAlign: "center",
  },
  previewUrl: {
    color: theme.colors.accentPrimary,
    textAlign: "center",
  },
  actions: {
    gap: theme.space[3],
    marginTop: theme.space[2],
  },
}));
