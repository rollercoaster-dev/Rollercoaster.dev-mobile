/**
 * Icon/monogram color swatch row for badge design.
 *
 * Mirrors `BorderColorPicker`, but the sentinel cell is "Auto" rather than
 * "Match theme" and its fill is the *computed* contrast color of the current
 * badge fill (`getSafeTextColor(fillColor)`) — so when the user changes the
 * fill, the Auto preview updates in lockstep with what the renderer will
 * actually draw.
 *
 * Stored value: `BADGE_COLOR_THEME_SENTINEL` (`'theme'`) means "auto / derived
 * from fill"; the renderer routes that to `getSafeTextColor(design.color)`.
 * A hex string is used verbatim.
 */

import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { ACCENT_COLORS } from "./ColorPicker";
import { selectorStyles } from "./selectorStyles";
import { BADGE_COLOR_THEME_SENTINEL } from "./types";
import { getSafeTextColor } from "../utils/accessibility";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IconColorPickerProps {
  /** Selected value — either the `'theme'` sentinel (Auto) or a hex string. */
  selectedIconColor: typeof BADGE_COLOR_THEME_SENTINEL | string;
  /**
   * Current badge fill — used to compute the "Auto" sentinel swatch preview
   * so the user sees what the icon color will actually be.
   */
  fillColor: string;
  /** Fires when user taps a palette swatch or the "Auto" sentinel. */
  onSelectIconColor: (
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

export function IconColorPicker({
  selectedIconColor,
  fillColor,
  onSelectIconColor,
  onOpenCustomPicker,
  testID = "icon-color-picker",
}: IconColorPickerProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");

  const isAutoSelected = selectedIconColor === BADGE_COLOR_THEME_SENTINEL;
  const isPalettePick = ACCENT_COLORS.some((c) => c.hex === selectedIconColor);
  const isCustomSelected = !isAutoSelected && !isPalettePick;

  const autoPreviewColor = getSafeTextColor(fillColor, "IconColorPicker");

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("iconColor.a11y")}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.row}
      >
        {/* "Auto" sentinel — preview color tracks the fill */}
        <Pressable
          onPress={() => onSelectIconColor(BADGE_COLOR_THEME_SENTINEL)}
          accessibilityRole="radio"
          accessibilityLabel={t("iconColor.optionA11y", {
            label: t("iconColor.matchAuto"),
          })}
          accessibilityHint={t("iconColor.matchAutoHint")}
          accessibilityState={{ checked: isAutoSelected }}
          style={styles.cell}
          testID={`${testID}-auto`}
        >
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: autoPreviewColor,
                borderColor: isAutoSelected
                  ? theme.colors.accentPrimary
                  : "transparent",
                borderWidth: isAutoSelected ? 4 : 3,
              },
            ]}
          />
          <Text
            style={[
              selectorStyles.label,
              {
                color: isAutoSelected
                  ? theme.colors.text
                  : theme.colors.textSecondary,
                fontWeight: isAutoSelected ? "700" : "500",
              },
            ]}
            numberOfLines={1}
          >
            {t("iconColor.matchAuto")}
          </Text>
        </Pressable>

        {/* Palette swatches */}
        {ACCENT_COLORS.map(({ id, hex }) => {
          const isSelected = hex === selectedIconColor;
          const label = t(`iconColor.options.${id}`);
          return (
            <Pressable
              key={`${id}-${hex}`}
              onPress={() => onSelectIconColor(hex)}
              accessibilityRole="radio"
              accessibilityLabel={t("iconColor.optionA11y", { label })}
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
          accessibilityLabel={t("iconColor.custom")}
          accessibilityHint={t("iconColor.customHint")}
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
                  ? selectedIconColor
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
            {t("iconColor.custom")}
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
