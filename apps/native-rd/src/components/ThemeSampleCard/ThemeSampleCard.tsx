import { View, Text, type TextStyle, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { themes, parseThemeName, type ThemeName } from "../../themes/compose";
import { variantOverrides } from "../../themes/variants";
import { size } from "../../themes/tokens";
import { shadowStyle } from "../../styles/shadows";
import { styles } from "./ThemeSampleCard.styles";

interface ThemeSampleCardProps {
  themeId: ThemeName;
}

/**
 * Per-theme inline styles for the sample card. Threads `themes[themeId]`,
 * the variant's font/scale overrides, and `shadowStyle(..., "cardElevationSmall")`
 * so the card honestly renders each theme's real token output — including its
 * shadow (hard offset, soft blur, vertical drop, or none). Extracted from the
 * preview block in ThemeSwitcher: the per-theme token treatment (colors, scale,
 * font, shadow) is preserved verbatim, but ThemeSwitcher-only layout chrome
 * (header styles, marginTop) is intentionally left behind.
 */
function previewStyles(themeId: ThemeName) {
  const cardTheme = themes[themeId];
  const { variant } = parseThemeName(themeId);
  const def = variantOverrides[variant];

  const sizeScale = def.size ?? size;
  const fontFamily = def.fontFamily;

  const sampleCard: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cardTheme.colors.background,
    borderColor: cardTheme.colors.border,
    borderWidth: cardTheme.borderWidth.thin,
    borderRadius: cardTheme.radius.md,
    padding: 12,
    ...shadowStyle(cardTheme, "cardElevationSmall"),
  };

  const badge: ViewStyle = {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cardTheme.colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: cardTheme.borderWidth.thin,
    borderColor: cardTheme.colors.border,
  };

  const badgeText: TextStyle = {
    color: cardTheme.colors.accentPurpleFg,
    fontSize: sizeScale.sm,
    fontWeight: "700",
  };

  const sampleTitle: TextStyle = {
    fontSize: sizeScale.sm,
    fontFamily,
    fontWeight: "700",
    color: cardTheme.colors.text,
  };

  const sampleMeta: TextStyle = {
    fontSize: sizeScale.xs,
    fontFamily,
    color: cardTheme.colors.textSecondary,
  };

  const ctaPill: ViewStyle = {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: cardTheme.radius.sm,
    backgroundColor: cardTheme.colors.accentPrimary,
    borderWidth: cardTheme.borderWidth.thin,
    borderColor: cardTheme.colors.border,
  };

  const ctaText: TextStyle = {
    fontSize: sizeScale.xs,
    fontFamily,
    fontWeight: "700",
    color: cardTheme.colors.background,
    letterSpacing: 0.5,
  };

  return {
    sampleCard,
    badge,
    badgeText,
    sampleTitle,
    sampleMeta,
    ctaPill,
    ctaText,
  };
}

/**
 * Display-only preview of a single theme rendered as a miniature "Daily reading"
 * card. Pure and theme-parametrized — reads from the static `themes` map by
 * `themeId`, so it needs no ThemeProvider and never mutates the active theme.
 * Not interactive: no accessibilityRole, no callbacks.
 */
export function ThemeSampleCard({ themeId }: ThemeSampleCardProps) {
  const { t } = useTranslation(["common"]);
  const preview = previewStyles(themeId);

  return (
    <View style={preview.sampleCard}>
      <View style={preview.badge}>
        <Text style={preview.badgeText}>★</Text>
      </View>
      <View style={styles.sampleTextCol}>
        <Text style={preview.sampleTitle}>
          {t("common:theme.preview.title")}
        </Text>
        <Text style={preview.sampleMeta}>
          {t("common:theme.preview.progress")}
        </Text>
      </View>
      <View style={preview.ctaPill}>
        <Text style={preview.ctaText}>{t("common:theme.preview.cta")}</Text>
      </View>
    </View>
  );
}
