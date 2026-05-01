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
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[sizeMap[size]],
    ...shadowStyle(theme, "cardElevation"),
  }),
  image: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space[3],
  },
  imageText: {
    color: palette.white,
    fontSize: theme.size["3xl"],
    lineHeight: theme.size["3xl"] * 1.3,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
  },
  title: {
    ...theme.textStyles.title,
    color: theme.colors.text,
    marginBottom: theme.space[1],
  },
  date: {
    ...theme.textStyles.caption,
    color: theme.colors.textMuted,
  },
  evidenceCount: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.space[2],
  },
}));
