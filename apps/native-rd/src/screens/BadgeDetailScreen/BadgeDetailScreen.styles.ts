import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // No horizontal padding: the celebration hero is the first child and must
  // run full-bleed to the screen edges. Everything below it lives in `body`,
  // which carries the gutter instead.
  scrollContent: {
    paddingBottom: theme.space[12],
  },
  body: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
    gap: theme.space[4],
    alignItems: "stretch",
  },
  // Overflow menu host. Fixed top-right offset approximating the prototype's
  // popover under the ⋯ button rather than measuring the button itself.
  overflowBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overflowPopover: {
    position: "absolute",
    top: theme.space[12],
    right: theme.space[4],
  },
  infoSection: {
    width: "100%",
    gap: theme.space[5],
  },
  infoBlock: {
    gap: theme.space[2],
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
  sectionLabel: {
    ...theme.textStyles.label,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  evidenceList: {
    gap: theme.space[2],
    marginTop: theme.space[2],
  },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space[3],
  },
  evidenceIcon: {
    fontSize: theme.size.lg,
    lineHeight: theme.size.lg * 1.4,
  },
  evidenceText: {
    flex: 1,
    gap: theme.space[1] / 2,
  },
  evidenceTypeLabel: {
    color: theme.colors.textSecondary,
  },
  exportCaption: {
    color: theme.colors.textSecondary,
    marginTop: theme.space[1],
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
