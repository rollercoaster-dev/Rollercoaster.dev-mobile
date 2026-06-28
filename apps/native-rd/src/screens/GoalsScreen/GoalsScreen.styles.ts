import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    // flexGrow (not flex) lets the content container fill the viewport when its
    // content is short — so the empty state's `flex: 1` can center vertically —
    // while still growing past the viewport and scrolling once the cockpit is
    // tall enough to overflow.
    flexGrow: 1,
    padding: theme.space[4],
    gap: theme.space[3],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
  headerCount: {
    color: theme.chrome.screenHeaderFg,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
}));
