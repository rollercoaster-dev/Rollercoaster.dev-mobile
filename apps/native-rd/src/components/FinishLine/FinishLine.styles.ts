import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { palette } from "../../themes/adapter";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    marginTop: theme.space[2],
  },
  nodeColumn: {
    width: 40,
    alignItems: "center",
    marginRight: theme.space[3],
  },
  contentCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderLeftWidth: 5,
    borderLeftColor: palette.yellow300,
    borderRadius: theme.radius.sm,
    padding: theme.space[4],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  heading: {
    fontSize: 18,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.text,
    marginBottom: theme.space[2],
  },
  evidenceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: palette.yellow300,
    borderRadius: theme.radius.sm,
    marginBottom: theme.space[1],
  },
  evidenceIcon: {
    fontSize: 14,
  },
  evidenceLabel: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  noEvidence: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
}));
