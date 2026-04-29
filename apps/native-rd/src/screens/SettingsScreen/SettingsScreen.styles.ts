import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.accentPurple,
  },
  scrollContainer: {
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.accentPurple,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    paddingBottom: theme.space[4],
    zIndex: 1,
    ...shadowStyle(theme, "hardMd"),
  },
  headerTitle: {
    color: theme.colors.accentPurpleFg,
  },
  version: {
    ...theme.textStyles.caption,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.space[4],
  },
}));
