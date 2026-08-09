import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // No horizontal padding: the celebration hero is the first child and must
  // run full-bleed to the screen edges. Everything below it lives in `body`,
  // which carries the gutter instead.
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.space[12],
  },
  // The Share CTA lives outside the scroll body (see BadgeDetailScreen.tsx),
  // so it carries the gutter `body` would otherwise have given it.
  shareCta: {
    marginHorizontal: theme.space[4],
    marginBottom: theme.space[4],
  },
  body: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
    gap: theme.space[4],
    alignItems: "stretch",
  },
  // Overflow menu host. `top` is supplied at render time by the screen, which
  // adds the safe-area inset the Modal's own root view doesn't inherit.
  overflowBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overflowPopover: {
    position: "absolute",
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
