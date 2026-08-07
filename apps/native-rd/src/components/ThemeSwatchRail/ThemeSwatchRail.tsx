import { View, Text, Pressable, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { themeOptions } from "../../hooks/useTheme";
import { themes, type ThemeName } from "../../themes/compose";
import { themeA11yLabel } from "../../i18n/labels";
import { getSwatch, stripeWidths } from "../ThemeChipGrid/swatch-utils";
import { styles } from "./ThemeSwatchRail.styles";

interface ThemeSwatchRailProps {
  selectedThemeId: ThemeName;
  onSelect: (id: ThemeName) => void;
}

/**
 * Controlled horizontal rail of circular 3-stripe theme swatches. Stateless —
 * the parent (Welcome #414 / Settings #415) owns the selected theme. Each
 * swatch extracts its colors via the shared `getSwatch`/`stripeWidths` so it
 * stays in lockstep with ThemeChipGrid. The selected swatch's name and
 * description render below the rail.
 */
export function ThemeSwatchRail({
  selectedThemeId,
  onSelect,
}: ThemeSwatchRailProps) {
  const { t } = useTranslation(["common"]);

  return (
    <View style={styles.rail}>
      {/*
        `accessible` is deliberately NOT set here. Setting it collapses every
        descendant Pressable into one a11y node on iOS, so VoiceOver/TalkBack
        can only reach "the rail" and never the individual swatches. Role and
        label alone give the group its semantics without swallowing children —
        the same pattern as ShapeSelector / ColorPicker / FrameSelector. This
        used to be branched on EXPO_PUBLIC_E2E_MODE, which meant production
        screen readers got the broken tree while E2E got the good one.
      */}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("common:theme.picker.groupLabel")}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {themeOptions.map(({ id }) => {
            const isSelected = selectedThemeId === id;
            const swatch = getSwatch(id);
            const [w1, w2] = stripeWidths[id];
            const { colors } = themes[id];

            return (
              <Pressable
                key={id}
                onPress={() => onSelect(id)}
                accessible
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={themeA11yLabel(t, id)}
                style={[
                  styles.swatch,
                  {
                    borderWidth: isSelected ? 3 : 1,
                    borderColor: isSelected
                      ? colors.accentPurple
                      : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stripeRow,
                    { backgroundColor: swatch.stripeBg },
                  ]}
                >
                  <View
                    style={{ width: `${w1}%`, backgroundColor: swatch.stripe1 }}
                  />
                  <View
                    style={{ width: `${w2}%`, backgroundColor: swatch.stripe2 }}
                  />
                </View>
                {isSelected ? (
                  <Text style={[styles.check, { color: colors.accentPurple }]}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.captionLabel}>
          {t(`common:theme.options.${selectedThemeId}.label`)}
        </Text>
        <Text style={styles.captionDescription}>
          {t(`common:theme.options.${selectedThemeId}.description`)}
        </Text>
      </View>
    </View>
  );
}
