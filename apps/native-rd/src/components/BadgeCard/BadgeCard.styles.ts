import { StyleSheet } from "react-native-unistyles";
import { palette } from "../../themes/palette";
import type { space } from "../../themes/tokens";
import { shadowStyle } from "../../styles/shadows";

type CardSize = "compact" | "normal" | "spacious";

const sizeMap: Record<CardSize, keyof typeof space> = {
  compact: "3",
  normal: "4",
  spacious: "5",
};

export const styles = StyleSheet.create((theme) => ({
  pressable: {
    minHeight: 48,
  },
  container: (size: CardSize = "normal") => ({
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[sizeMap[size]],
    ...shadowStyle(theme, "cardElevation"),
  }),
  badgeWrapper: (width: number, height: number) => ({
    width,
    height,
    marginRight: theme.space[4],
  }),
  initials: (badgeSize: number) => ({
    width: badgeSize,
    height: badgeSize,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
  }),
  initialsText: (badgeSize: number) => ({
    color: palette.white,
    fontSize: Math.round(badgeSize * 0.4),
    lineHeight: Math.round(badgeSize * 0.4 * 1.1),
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
  }),
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...theme.textStyles.headline,
    color: theme.colors.text,
  },
  description: {
    ...theme.textStyles.body,
    color: theme.colors.text,
    marginTop: theme.space[1],
  },
  date: {
    ...theme.textStyles.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[2],
  },
  evidenceCount: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.space[2],
  },
}));
