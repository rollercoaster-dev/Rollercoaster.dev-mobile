import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  trigger: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[2],
  },
  triggerText: {
    color: theme.colors.accentPrimary,
    textDecorationLine: "underline",
  },
  triggerTextOnDark: {
    color: theme.chrome.celebrationBg,
  },
  modal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  modalHeading: {
    flex: 1,
  },
  close: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: theme.space[2],
  },
  titleContent: {
    padding: theme.space[4],
  },
}));
