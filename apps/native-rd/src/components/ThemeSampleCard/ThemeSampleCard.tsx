import { View, type TextStyle, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { themes, parseThemeName, type ThemeName } from "../../themes/compose";
import { variantOverrides } from "../../themes/variants";
import { size } from "../../themes/tokens";
import { shadowStyle } from "../../styles/shadows";
import { Text } from "../Text";
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

  // Fill and border track the real `Card` component (backgroundSecondary +
  // borderWidth.thick), not `colors.background`. WelcomeScreen paints its page
  // in `colors.background`, so the old thin-bordered background-filled card was
  // the same color as the surface behind it — separated by a 1pt hairline and a
  // shadow that the highContrast, autismFriendly and lowInfo variants disable
  // entirely. A preview of "what a card looks like in this theme" has to use
  // the tokens a card actually uses.
  const sampleCard: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cardTheme.colors.backgroundSecondary,
    borderColor: cardTheme.colors.border,
    borderWidth: cardTheme.borderWidth.thick,
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

  // Each text style starts from the *previewed* theme's text role, so shared
  // Text's variant (resolved against the active theme) can't leak the active
  // theme's font, line height or spacing into another theme's sample.
  const badgeText: TextStyle = {
    ...cardTheme.textStyles.label,
    // A single centered glyph: tracking would push it off-center.
    letterSpacing: 0,
    color: cardTheme.colors.accentPurpleFg,
    fontSize: sizeScale.sm,
    fontWeight: "700",
  };

  const sampleTitle: TextStyle = {
    ...cardTheme.textStyles.metadata,
    fontSize: sizeScale.sm,
    fontWeight: "700",
    color: cardTheme.colors.text,
  };

  const sampleMeta: TextStyle = {
    ...cardTheme.textStyles.caption,
    fontSize: sizeScale.xs,
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
    ...cardTheme.textStyles.caption,
    fontSize: sizeScale.xs,
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
    <View testID="theme-sample-card" style={preview.sampleCard}>
      <View style={preview.badge}>
        <Text variant="label" chrome style={preview.badgeText}>
          ★
        </Text>
      </View>
      <View style={styles.sampleTextCol}>
        <Text variant="metadata" style={preview.sampleTitle}>
          {t("common:theme.preview.title")}
        </Text>
        <Text variant="caption" style={preview.sampleMeta}>
          {t("common:theme.preview.progress")}
        </Text>
      </View>
      <View style={preview.ctaPill}>
        <Text variant="caption" chrome style={preview.ctaText}>
          {t("common:theme.preview.cta")}
        </Text>
      </View>
    </View>
  );
}
