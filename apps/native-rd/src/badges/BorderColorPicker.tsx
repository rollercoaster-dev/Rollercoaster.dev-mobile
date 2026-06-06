/**
 * Border color swatch row for badge design
 *
 * Like `ColorPicker`, plus a "Match theme" sentinel swatch at the front
 * (selects `BADGE_COLOR_THEME_SENTINEL` and shows `theme.colors.border`
 * as its fill) and a "Custom…" trigger cell at the end that opens the
 * full-screen `ColorPickerModal`.
 */

import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { ACCENT_COLORS } from "./ColorPicker";
import { selectorStyles } from "./selectorStyles";
import { BADGE_COLOR_THEME_SENTINEL } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BorderColorPickerProps {
  /** Selected value — either the `'theme'` sentinel or a hex string. */
  selectedBorderColor: typeof BADGE_COLOR_THEME_SENTINEL | string;
  /** Fires when user taps a palette swatch or the "Match theme" sentinel. */
  onSelectBorderColor: (
    value: typeof BADGE_COLOR_THEME_SENTINEL | string,
  ) => void;
  /** Fires when user taps the "Custom…" trigger to open the modal picker. */
  onOpenCustomPicker: () => void;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SWATCH_SIZE = 44;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BorderColorPicker({
  selectedBorderColor,
  onSelectBorderColor,
  onOpenCustomPicker,
  testID = "border-color-picker",
}: BorderColorPickerProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");

  const isThemeSelected = selectedBorderColor === BADGE_COLOR_THEME_SENTINEL;
  const isPalettePick = ACCENT_COLORS.some(
    (c) => c.hex === selectedBorderColor,
  );
  // Anything that's neither the sentinel nor a palette swatch is a custom hex
  const isCustomSelected = !isThemeSelected && !isPalettePick;

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("borderColor.a11y")}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.row}
      >
        {/* "Match theme" sentinel */}
        <Pressable
          onPress={() => onSelectBorderColor(BADGE_COLOR_THEME_SENTINEL)}
          accessibilityRole="radio"
          accessibilityLabel={t("borderColor.optionA11y", {
            label: t("borderColor.matchTheme"),
          })}
          accessibilityState={{ checked: isThemeSelected }}
          style={styles.cell}
          testID={`${testID}-theme`}
        >
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: theme.colors.border,
                borderColor: isThemeSelected
                  ? theme.colors.accentPrimary
                  : "transparent",
                borderWidth: isThemeSelected ? 4 : 3,
              },
            ]}
          />
          <Text
            style={[
              selectorStyles.label,
              {
                color: isThemeSelected
                  ? theme.colors.text
                  : theme.colors.textSecondary,
                fontWeight: isThemeSelected ? "700" : "500",
              },
            ]}
            numberOfLines={1}
          >
            {t("borderColor.matchTheme")}
          </Text>
        </Pressable>

        {/* Palette swatches */}
        {ACCENT_COLORS.map(({ id, hex }) => {
          const isSelected = hex === selectedBorderColor;
          const label = t(`borderColor.options.${id}`);
          return (
            <Pressable
              key={`${id}-${hex}`}
              onPress={() => onSelectBorderColor(hex)}
              accessibilityRole="radio"
              accessibilityLabel={t("borderColor.optionA11y", { label })}
              accessibilityState={{ checked: isSelected }}
              style={styles.cell}
              testID={`${testID}-${id}`}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: hex,
                    borderColor: isSelected
                      ? theme.colors.accentPrimary
                      : "transparent",
                    borderWidth: isSelected ? 4 : 3,
                  },
                ]}
              />
              <Text
                style={[
                  selectorStyles.label,
                  {
                    color: isSelected
                      ? theme.colors.text
                      : theme.colors.textSecondary,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}

        {/* "Custom…" trigger — opens the modal picker */}
        <Pressable
          onPress={onOpenCustomPicker}
          accessibilityRole="button"
          accessibilityLabel={t("borderColor.custom")}
          accessibilityHint={t("borderColor.customHint")}
          style={styles.cell}
          testID={`${testID}-custom`}
        >
          <View
            style={[
              styles.swatch,
              styles.customSwatch,
              {
                borderColor: isCustomSelected
                  ? theme.colors.accentPrimary
                  : theme.colors.border,
                borderWidth: isCustomSelected ? 4 : 3,
                backgroundColor: isCustomSelected
                  ? selectedBorderColor
                  : theme.colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.customGlyph,
                {
                  color: isCustomSelected
                    ? theme.colors.background
                    : theme.colors.text,
                },
              ]}
              accessibilityElementsHidden
            >
              +
            </Text>
          </View>
          <Text
            style={[
              selectorStyles.label,
              {
                color: isCustomSelected
                  ? theme.colors.text
                  : theme.colors.textSecondary,
                fontWeight: isCustomSelected ? "700" : "500",
              },
            ]}
            numberOfLines={1}
          >
            {t("borderColor.custom")}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  cell: {
    alignItems: "center",
    minWidth: 56,
    minHeight: 72,
    gap: theme.space[1],
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
  },
  customSwatch: {
    justifyContent: "center",
    alignItems: "center",
  },
  customGlyph: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: theme.fontFamily.body,
  },
}));
