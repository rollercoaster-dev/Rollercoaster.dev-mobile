import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { BADGE_CANVAS_BACKGROUND } from "../../badges/constants";

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  container: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.space[3],
  },
  title: {
    color: theme.colors.text,
  },
  scrollContent: {
    paddingBottom: theme.space[2],
    gap: theme.space[3],
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    padding: theme.space[3],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "cardElevation"),
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    backgroundColor: BADGE_CANVAS_BACKGROUND,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  thumbnailInitial: {
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textMuted,
  },
  versionMeta: {
    flex: 1,
    gap: theme.space[1],
  },
  versionLabel: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.bold,
  },
  versionDate: {
    color: theme.colors.textSecondary,
  },
  currentBadge: {
    paddingHorizontal: theme.space[2],
    paddingVertical: 2,
    backgroundColor: theme.colors.accentPurple,
  },
  currentBadgeText: {
    color: theme.colors.accentPurpleFg,
    fontWeight: theme.fontWeight.bold,
    textTransform: "uppercase",
    fontSize: theme.size.xs,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space[2],
  },
  credentialBox: {
    padding: theme.space[3],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    maxHeight: 360,
  },
  credentialText: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.text,
  },
  closeRow: {
    marginTop: theme.space[3],
  },
}));
