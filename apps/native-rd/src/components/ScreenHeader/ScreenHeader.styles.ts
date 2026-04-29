import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

const SPACER_WIDTH = 44;

export const styles = StyleSheet.create((theme) => ({
  band: (insetTop: number) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingTop: insetTop + theme.space[2],
    paddingBottom: theme.space[4],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.colors.accentPurple,
    zIndex: 1,
    ...shadowStyle(theme, "cardElevation"),
  }),
  title: {
    color: theme.colors.accentPurpleFg,
  },
  subLabel: {
    color: theme.colors.accentPurpleFg,
    fontWeight: theme.fontWeight.bold,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.accentPurpleFg,
  },
  spacer: {
    width: SPACER_WIDTH,
  },
}));
