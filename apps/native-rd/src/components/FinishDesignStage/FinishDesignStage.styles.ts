import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    paddingVertical: theme.space[4],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.chrome.screenHeaderBg,
    borderBottomColor: theme.chrome.screenHeaderBorder,
    borderBottomWidth: theme.borderWidth.medium,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: theme.chrome.screenHeaderFg,
    fontWeight: theme.fontWeight.bold,
  },
  headerSubtitle: {
    color: theme.chrome.screenHeaderFg,
    opacity: 0.8,
  },
  // Mirrors the back button's touch-target width so the title stays optically
  // centered between the two.
  headerSpacer: {
    width: 44,
  },
  preview: {
    alignItems: "center",
    paddingVertical: theme.space[5],
  },
  sections: {
    flex: 1,
  },
  sectionsContent: {
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[4],
  },
  centerStack: {
    gap: theme.space[3],
  },
  bottomLabelInput: {
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    borderWidth: theme.borderWidth.medium,
    borderRadius: 0,
    ...theme.textStyles.body,
    fontWeight: "600" as const,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  footer: {
    paddingHorizontal: theme.space[5],
    paddingBottom: theme.space[5],
    paddingTop: theme.space[2],
  },
  subcopy: {
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.space[2],
  },
}));
