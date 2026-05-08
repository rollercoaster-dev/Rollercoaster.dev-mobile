import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { BADGE_CANVAS_BACKGROUND } from "../../badges/constants";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  previewOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: theme.space[2],
    zIndex: 3,
  },
  scrollContent: {
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
    alignItems: "stretch",
  },
  previewContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[4],
    borderRadius: 0,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: BADGE_CANVAS_BACKGROUND,
    ...shadowStyle(theme, "cardElevation"),
  },
  badgeCanvas: {
    backgroundColor: BADGE_CANVAS_BACKGROUND,
  },
  badgeImage: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    ...shadowStyle(theme, "cardElevation"),
  },
  badgeInitial: {
    fontSize: theme.size["5xl"],
    lineHeight: theme.size["5xl"] * 1.3,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.background,
  },
  infoSection: {
    width: "100%",
    gap: theme.space[5],
  },
  infoBlock: {
    gap: theme.space[2],
  },
  title: {
    ...theme.textStyles.headline,
    color: theme.colors.text,
    textAlign: "center",
  },
  description: {
    ...theme.textStyles.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  bodyText: {
    ...theme.textStyles.body,
    color: theme.colors.text,
  },
  identityChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[2],
  },
  chipIcon: {
    fontSize: theme.size.lg,
    lineHeight: theme.size.lg * 1.2,
  },
  chipColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  sectionLabel: {
    ...theme.textStyles.label,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
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
  backIcon: {
    fontSize: 22,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.accentPurpleFg,
  },
}));
