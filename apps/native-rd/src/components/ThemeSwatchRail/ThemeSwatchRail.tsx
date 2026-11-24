import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { themeOptions } from "../../hooks/useTheme";
import { themes, type ThemeName } from "../../themes/compose";
import { themeA11yLabel } from "../../i18n/labels";
import { getSwatch, stripeWidths } from "./swatch-utils";
import { Text } from "../Text";
import { styles } from "./ThemeSwatchRail.styles";

interface ThemeSwatchRailProps {
  selectedThemeId: ThemeName;
  onSelect: (id: ThemeName) => void;
}

/**
 * Controlled theme picker: one labeled radio row per theme, each with a
 * 3-stripe swatch, the theme's name and its benefit ("Warm Studio ·
 * Dyslexia-friendly"). Stateless — the parent (Welcome #414 / Settings #415)
 * owns the selected theme; the swatch colors come from the shared
 * `getSwatch`/`stripeWidths`.
 *
 * Every row shows its name and description BEFORE it is picked (#690). The
 * earlier rail showed seven bare circles and only the selected theme's name,
 * so someone looking for dyslexia or low-vision support had to try colors to
 * find it. Rows stack vertically, so all seven stay on screen (no horizontal
 * scroller hiding the 7th) and long names or 1.25x text wrap inside the row.
 */
export function ThemeSwatchRail({
  selectedThemeId,
  onSelect,
}: ThemeSwatchRailProps) {
  const { t } = useTranslation(["common"]);

  return (
    <View>
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
        <View testID="theme-swatch-row" style={styles.list}>
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
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                <View
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
                      style={{
                        width: `${w1}%`,
                        backgroundColor: swatch.stripe1,
                      }}
                    />
                    <View
                      style={{
                        width: `${w2}%`,
                        backgroundColor: swatch.stripe2,
                      }}
                    />
                  </View>
                  {isSelected ? (
                    <Text
                      variant="body"
                      chrome
                      style={[styles.check, { color: colors.accentPurple }]}
                    >
                      ✓
                    </Text>
                  ) : null}
                </View>
                <View style={styles.text}>
                  {/*
                    `selected-theme` is the E2E handle the required theme flows
                    assert on (e2e/flows/settings-theme-switch.yaml,
                    e2e/flows/settings-theme-persists-restart.yaml) with a
                    combined `id` + `text: "Night Ride"` matcher, proving the
                    SELECTED (or persisted) theme, not just that something is
                    selected. It moves with the selection, so it sits on the
                    selected row's name — the row's own a11y label also carries
                    the description and would not match the bare name.
                  */}
                  <Text
                    variant="title"
                    testID={isSelected ? "selected-theme" : undefined}
                    style={styles.label}
                  >
                    {t(`common:theme.options.${id}.label`)}
                  </Text>
                  <Text variant="metadata" style={styles.description}>
                    {t(`common:theme.options.${id}.description`)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
