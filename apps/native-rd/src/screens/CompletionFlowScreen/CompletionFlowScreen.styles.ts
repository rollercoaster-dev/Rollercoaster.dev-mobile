import { StyleSheet } from "react-native-unistyles";

// The four Finish*Stage components are each self-contained and full-bleed —
// they own their own padding, header band, and footer. All this screen needs
// is the flex wrapper they fill, plus the pre-hydration fallbacks.
export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
