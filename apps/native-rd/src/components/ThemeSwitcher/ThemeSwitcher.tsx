import {
  View,
  Text,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useThemeContext, themeOptions } from "../../hooks/useTheme";
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick what feels right</Text>

      <View
        accessible
        accessibilityRole="radiogroup"
        accessibilityLabel="Theme selection"
      >
        {themeOptions.map((option) => {
          const isSelected = themeName === option.id;
          const cardTheme = themes[option.id];
          const preview = previewStyles(option.id);

          return (
            <Pressable
              key={option.id}
              onPress={() => setTheme(option.id)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${option.label}. ${option.description}`}
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
                  <Text style={preview.label}>{option.label}</Text>
                  <Text style={preview.description}>{option.description}</Text>
                </View>
                {isSelected ? (
                  <Text style={preview.checkmark} accessibilityLabel="Selected">
                    ✓
                  </Text>
                ) : null}
              </View>

              <View style={preview.sampleCard}>
                <View style={preview.badge}>
                  <Text style={preview.badgeText}>★</Text>
                </View>
                <View style={styles.sampleTextCol}>
                  <Text style={preview.sampleTitle}>Daily reading</Text>
                  <Text style={preview.sampleMeta}>3 of 5 done</Text>
                </View>
                <View style={preview.ctaPill}>
                  <Text style={preview.ctaText}>+ ADD</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
