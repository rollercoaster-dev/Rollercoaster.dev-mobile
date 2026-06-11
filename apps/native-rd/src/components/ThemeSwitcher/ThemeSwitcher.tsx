import {
  View,
  Text,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useThemeContext, themeOptions } from "../../hooks/useTheme";
import { themeA11yLabel } from "../../i18n/labels";
import { themes, parseThemeName, type ThemeName } from "../../themes/compose";
import { variantOverrides } from "../../themes/variants";
import { size, lineHeight } from "../../themes/tokens";
import { shadowStyle } from "../../styles/shadows";
import { styles } from "./ThemeSwitcher.styles";

function previewStyles(themeId: ThemeName) {
  const cardTheme = themes[themeId];
  const { variant } = parseThemeName(themeId);
  const def = variantOverrides[variant];

  const sizeScale = def.size ?? size;
  const lhScale = def.lineHeight ?? lineHeight;
  const fontFamily = def.fontFamily;

  const label: TextStyle = {
    fontSize: sizeScale.lg,
    lineHeight: lhScale.lg,
    fontWeight: "600",
    fontFamily,
    color: cardTheme.colors.text,
  };

  const description: TextStyle = {
    fontSize: sizeScale.sm,
    lineHeight: lhScale.sm,
    fontFamily,
    color: cardTheme.colors.textSecondary,
    marginTop: 4,
  };

  const sampleCard: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: cardTheme.colors.background,
    borderColor: cardTheme.colors.border,
    borderWidth: cardTheme.borderWidth.thin,
    borderRadius: cardTheme.radius.md,
    padding: 12,
    marginTop: 12,
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

  const checkmark: TextStyle = {
    fontSize: sizeScale.lg,
    fontWeight: "900",
    color: cardTheme.colors.accentPurple,
  };

  return {
    label,
    description,
    sampleCard,
    badge,
    badgeText,
    sampleTitle,
    sampleMeta,
    ctaPill,
    ctaText,
    checkmark,
  };
}

export function ThemeSwitcher() {
  const { themeName, setTheme } = useThemeContext();
  const { t } = useTranslation(["common"]);

  // The radiogroup wrapper collapses descendant Pressables into a single
  // a11y node on iOS, which hides individual options from Maestro element
  // lookup. Drop the grouping in E2E mode; the Pressables retain their
  // own `accessible+role=radio+label` so screen readers still treat each
  // option as a discrete radio in production. Mirrors ThemeChipGrid.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const groupingA11y = isE2E
    ? ({ accessible: false } as const)
    : ({
        accessible: true,
        accessibilityRole: "radiogroup" as const,
        accessibilityLabel: "Theme selection",
      } as const);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("common:theme.picker.title")}</Text>

      <View {...groupingA11y}>
        {themeOptions.map((option) => {
          const isSelected = themeName === option.id;
          const cardTheme = themes[option.id];
          const preview = previewStyles(option.id);
          const label = t(`common:theme.options.${option.id}.label`);
          const description = t(
            `common:theme.options.${option.id}.description`,
          );

          return (
            <Pressable
              key={option.id}
              onPress={() => setTheme(option.id)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={themeA11yLabel(t, option.id)}
              testID={isSelected ? "selected-theme" : undefined}
              style={[
                styles.option,
                {
                  borderColor: isSelected
                    ? cardTheme.colors.accentPurple
                    : cardTheme.colors.border,
                  backgroundColor: isSelected
                    ? cardTheme.colors.backgroundSecondary
                    : cardTheme.colors.background,
                },
                isSelected && styles.optionSelected,
              ]}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerText}>
                  <Text style={preview.label}>{label}</Text>
                  <Text style={preview.description}>{description}</Text>
                </View>
                {isSelected ? (
                  <Text
                    style={preview.checkmark}
                    accessibilityLabel={t("common:theme.picker.selected")}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>

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
                  <Text style={preview.ctaText}>
                    {t("common:theme.preview.cta")}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
