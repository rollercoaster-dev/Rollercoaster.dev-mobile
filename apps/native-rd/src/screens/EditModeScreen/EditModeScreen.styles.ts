import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
  },
  spacer: {
    width: 48,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  section: {
    gap: theme.space[2],
  },
  label: {
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    minHeight: 48,
    ...shadowStyle(theme, "hardSm"),
  },
  inputError: {
    borderColor: theme.colors.accentPrimary,
  },
  errorText: {
    color: theme.colors.accentPrimary,
  },
  descriptionInput: {
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    minHeight: 80,
    textAlignVertical: "top",
    ...shadowStyle(theme, "hardSm"),
  },
  buttonSection: {
    marginTop: theme.space[4],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
