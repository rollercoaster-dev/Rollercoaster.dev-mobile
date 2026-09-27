import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import type { ComposedTheme } from "../../themes/compose";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonSurface = "default" | "celebration";

/** The same semantic foreground/background pairs used by the contrast audit. */
export function resolveButtonColors(
  theme: ComposedTheme,
  variant: ButtonVariant,
  surface: ButtonSurface = "default",
) {
  if (surface === "celebration" && variant === "primary") {
    return {
      background: theme.chrome.celebrationBg,
      foreground: theme.chrome.celebrationFg,
    };
  }
  switch (variant) {
    case "primary":
      return {
        background: theme.action.actionPrimaryBg,
        foreground: theme.action.actionPrimaryFg,
      };
    case "secondary":
      return {
        background: theme.action.actionSecondaryBg,
        foreground: theme.action.actionSecondaryFg,
      };
    case "destructive":
      return {
        background: theme.action.actionDestructiveBg,
        foreground: theme.action.actionDestructiveFg,
      };
    case "ghost":
      return { background: "transparent", foreground: theme.colors.text };
  }
}

const sizeMap = {
  sm: { paddingH: "3", paddingV: "1", fontSize: "sm", minHeight: 36 },
  md: { paddingH: "4", paddingV: "2", fontSize: "md", minHeight: 44 },
  lg: { paddingH: "5", paddingV: "3", fontSize: "lg", minHeight: 54 },
} as const;

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: ButtonSize = "md") => ({
    // Filled actions use at least 48pt; inline ghost keeps a 44pt touch target.
    minHeight: Math.max(sizeMap[size].minHeight, 48),
    borderRadius: theme.radius.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: theme.space[sizeMap[size].paddingH],
    paddingVertical: theme.space[sizeMap[size].paddingV],
    gap: theme.space[2],
  }),
  variantPrimary: (surface: ButtonSurface = "default") => ({
    backgroundColor: resolveButtonColors(theme, "primary", surface).background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "cardElevation"),
  }),
  variantSecondary: {
    backgroundColor: theme.action.actionSecondaryBg,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "cardElevation"),
  },
  variantGhost: {
    backgroundColor: "transparent",
    borderWidth: theme.borderWidth.thick,
    borderColor: "transparent",
  },
  variantDestructive: {
    backgroundColor: theme.action.actionDestructiveBg,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.text,
    ...shadowStyle(theme, "cardElevation"),
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 1, height: 1 },
  },
  disabled: {
    opacity: 0.4,
  },
  inlineGhost: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
    minHeight: 44,
    paddingHorizontal: 0,
    borderWidth: 0,
    shadowOpacity: 0,
  },
  // Leading emoji icon. Deliberately omits fontFamily so the glyph renders in
  // the system emoji font on its own, rather than being pulled into the body
  // font's run — the mixed-run case that drops trailing label glyphs on Android.
  icon: (size: ButtonSize = "md") => ({
    fontSize: theme.size[sizeMap[size].fontSize],
  }),
  label: (size: ButtonSize = "md") => ({
    fontSize: theme.size[sizeMap[size].fontSize],
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    lineHeight: theme.size[sizeMap[size].fontSize] * 1.3,
    flexShrink: 1,
    textAlign: "center" as const,
  }),
  labelPrimary: (surface: ButtonSurface = "default") => ({
    color: resolveButtonColors(theme, "primary", surface).foreground,
  }),
  labelSecondary: {
    color: theme.action.actionSecondaryFg,
  },
  labelGhost: {
    color: theme.colors.text,
  },
  labelDestructive: {
    color: theme.action.actionDestructiveFg,
  },
}));
