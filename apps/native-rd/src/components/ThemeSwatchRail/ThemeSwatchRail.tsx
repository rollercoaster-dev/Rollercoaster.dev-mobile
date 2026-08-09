import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { themeOptions } from "../../hooks/useTheme";
import { themes, type ThemeName } from "../../themes/compose";
import { themeA11yLabel } from "../../i18n/labels";
import { getSwatch, stripeWidths } from "./swatch-utils";
import { styles } from "./ThemeSwatchRail.styles";

interface ThemeSwatchRailProps {
  selectedThemeId: ThemeName;
  onSelect: (id: ThemeName) => void;
}

/**
 * Controlled rail of circular 3-stripe theme swatches. Stateless — the parent
 * (Welcome #414 / Settings #415) owns the selected theme. Each swatch extracts
 * its colors via the shared `getSwatch`/`stripeWidths`. The selected swatch's
 * name and description render below the rail.
 *
 * The swatches WRAP rather than scroll horizontally. At 7 x 48pt + 6 x 12pt the
 * row is 408pt wide, which overflows the content width of every shipping iPhone
 * (393pt device - 32pt of screen padding = 361pt). A horizontal ScrollView put
 * the 7th theme ~1pt from the edge — indistinguishable from "there are only 6
 * themes" — and `showsHorizontalScrollIndicator={false}` left no cue either.
 * Shrinking to fit is not an option: 44pt is the a11y floor for a touch target
 * and 7 x 44 + 6 x 8 still overflows a 375pt SE. Wrapping keeps all 7 visible
 * and the targets legal on every device and density.
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
        can only reach "the rail" and never the individual swatches. This used
        to be branched on EXPO_PUBLIC_E2E_MODE, which meant production screen
        readers got the broken tree while E2E got the good one.

        Known limitation (#500, verified via `maestro hierarchy`): without
        `accessible`, iOS never materialises this wrapper as an accessibility
        element, so the role and label below do NOT reach VoiceOver — the group
        name is announced by the caller's visible section heading instead
        (SettingsThemeSection's `settings:theme.title`). They are kept because
        (a) Android/TalkBack does read container collection semantics, and
        (b) `accessible` is the only thing that would surface them on iOS and
        it is exactly what re-breaks child reachability. Per-swatch labels carry
        the full contract, same as the shipped badge selectors (ShapeSelector /
        ColorPicker / FrameSelector).
      */}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("common:theme.picker.groupLabel")}
      >
        <View testID="theme-swatch-row" style={styles.swatchRow}>
          {themeOptions.map(({ id }) => {
            const isSelected = selectedThemeId === id;
            const swatch = getSwatch(id);
            const [w1, w2] = stripeWidths[id];
            const { colors } = themes[id];

            return (
              <Pressable
                key={id}
                testID={`theme-swatch-${id}`}
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
        </View>
      </View>

      <View>
        {/*
          `selected-theme` is the E2E handle the required theme flows assert on
          (e2e/flows/settings-theme-switch.yaml,
          e2e/flows/settings-theme-persists-restart.yaml). It lives on the
          caption — not on the selected swatch — because the swatch
          renders no text, and the restart flow needs a combined
          `id` + `text: "Night Ride"` matcher to prove the PERSISTED theme came
          back, not just that something is selected. Inherited from
          ThemeSwitcher, which carried the same testID before #416.
        */}
        <Text testID="selected-theme" style={styles.captionLabel}>
          {t(`common:theme.options.${selectedThemeId}.label`)}
        </Text>
        <Text style={styles.captionDescription}>
          {t(`common:theme.options.${selectedThemeId}.description`)}
        </Text>
      </View>
    </View>
  );
}
