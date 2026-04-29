import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.accentPurple,
  },
  body: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    paddingBottom: theme.space[4],
    backgroundColor: theme.colors.accentPurple,
    zIndex: 1,
    ...shadowStyle(theme, "hardMd"),
  },
  topBarTitle: {
    color: theme.colors.accentPurpleFg,
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPurpleFg,
  },
  spacer: {
    width: 48,
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  header: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.text,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.space[1],
  },
  progressContainer: {
    marginTop: theme.space[3],
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    marginTop: theme.space[1],
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[8],
  },
  timelineContainer: {
    position: "relative",
  },
}));
