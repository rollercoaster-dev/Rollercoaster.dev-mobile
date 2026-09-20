import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // KeyboardAvoidingFrame frame around the body + footer: flex:1 so it owns the
  // space under the header and shrinks with the soft keyboard, lifting the
  // footer CTA above it instead of leaving it covered.
  keyboardFrame: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  // ScrollView content container: no `flex: 1` here, or the content would
  // shrink to the viewport instead of overflowing into a scroll. The tab-bar
  // inset is merged in at the call site and wins on paddingBottom.
  content: {
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
