import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

const SPACER_WIDTH = 44;

export const styles = StyleSheet.create((theme) => ({
  band: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    // App.tsx already offsets the navigator by the safe-area inset, so the
    // band only needs symmetric padding around its content — no inset here.
    paddingTop: theme.space[4],
    paddingBottom: theme.space[4],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.chrome.screenHeaderBg,
    borderBottomColor: theme.chrome.screenHeaderBorder,
    borderBottomWidth: theme.borderWidth.medium,
    zIndex: 1,
    ...shadowStyle(theme, "cardElevation"),
  },
  // Opt-in override for detached presentations (e.g. a fullScreen RN Modal
  // with its own SafeAreaProvider) that don't sit under App.tsx's inset
  // offset and so must pay the top inset themselves.
  bandSafeTop: (insetTop: number) => ({
    paddingTop: insetTop + theme.space[4],
  }),
  title: {
    color: theme.chrome.screenHeaderFg,
  },
  subLabel: {
    color: theme.chrome.screenHeaderFg,
    fontWeight: theme.fontWeight.bold,
  },
  spacer: {
    width: SPACER_WIDTH,
  },
}));
