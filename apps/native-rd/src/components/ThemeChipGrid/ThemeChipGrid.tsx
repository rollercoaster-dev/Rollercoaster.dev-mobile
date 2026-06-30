import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemeContext, themeOptions } from "../../hooks/useTheme";
import { themeA11yLabel } from "../../i18n/labels";
import { getSwatch, stripeWidths } from "./swatch-utils";
import { styles, COLUMN_COUNT } from "./ThemeChipGrid.styles";

export function ThemeChipGrid() {
  const { themeName, setTheme } = useThemeContext();
  const { t } = useTranslation(["common"]);

  const rows: (typeof themeOptions)[] = [];
  for (let i = 0; i < themeOptions.length; i += COLUMN_COUNT) {
    rows.push(themeOptions.slice(i, i + COLUMN_COUNT));
  }

  // The radiogroup wrapper collapses descendant Pressables into a single
  // a11y node on iOS, which hides individual chips from Maestro element
  // lookup. Drop the grouping in E2E mode; the Pressables retain their
  // own `accessible+role=radio+label` so screen readers still treat each
  // chip as a discrete radio option in production.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const groupingA11y = isE2E
    ? ({ accessible: false } as const)
    : ({
        accessible: true,
        accessibilityRole: "radiogroup" as const,
        accessibilityLabel: "Theme",
      } as const);

  return (
    <View {...groupingA11y} style={styles.grid}>
      {rows.map((rowOptions, rowIdx) => {
        const placeholderCount = COLUMN_COUNT - rowOptions.length;
        return (
          <View key={rowIdx} style={styles.row}>
            {rowOptions.map((option) => {
              const isSelected = themeName === option.id;
              const swatch = getSwatch(option.id);
              const [w1, w2] = stripeWidths[option.id];
              const label = t(`common:theme.options.${option.id}.label`);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => setTheme(option.id)}
                  accessible
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={themeA11yLabel(t, option.id)}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
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
                  <View
                    style={[
                      styles.nameBar,
                      {
                        backgroundColor: swatch.nameBarBg,
                        borderTopColor: swatch.nameBarBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.nameText, { color: swatch.nameBarText }]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <View key={`placeholder-${i}`} style={styles.chipPlaceholder} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
