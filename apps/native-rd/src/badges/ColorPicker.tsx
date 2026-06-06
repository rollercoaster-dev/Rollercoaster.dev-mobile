import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { selectorStyles } from "./selectorStyles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (hex: string) => void;
  goalColor?: string;
  /**
   * When provided, renders a trailing "Custom…" cell after the palette.
   * Tapping it fires this callback (the parent opens the full picker
   * modal). When omitted, the picker shows only palette swatches and
   * behaves exactly as before.
   */
  onOpenCustomPicker?: () => void;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * `id` keys into `badgeDesigner:color.options.<id>` and is the i18n contract.
 * Drift-guarded by `option-key-parity.test.ts`.
 */
export const ACCENT_COLORS = [
  { id: "purple", hex: "#a78bfa" },
  { id: "mint", hex: "#34d399" },
  { id: "yellow", hex: "#fbbf24" },
  { id: "emerald", hex: "#10b981" },
  { id: "teal", hex: "#06b6d4" },
  { id: "orange", hex: "#f97316" },
  { id: "sky", hex: "#38bdf8" },
] as const;

export type AccentColorId = (typeof ACCENT_COLORS)[number]["id"] | "goal";

const SWATCH_SIZE = 44;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ColorPicker({
  selectedColor,
  onSelectColor,
  goalColor,
  onOpenCustomPicker,
  testID = "color-picker",
}: ColorPickerProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");

  const swatches = useMemo<
    readonly { id: AccentColorId; hex: string }[]
  >(() => {
    if (goalColor) {
      return [{ id: "goal", hex: goalColor }, ...ACCENT_COLORS];
    }
    return ACCENT_COLORS;
  }, [goalColor]);

  const isCustomSelected =
    onOpenCustomPicker !== undefined &&
    !swatches.some((s) => s.hex === selectedColor);

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("color.a11y")}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.row}
      >
        {swatches.map(({ id, hex }) => {
          const isSelected = hex === selectedColor;
          const label = t(`color.options.${id}`);
          return (
            <Pressable
              key={`${id}-${hex}`}
              onPress={() => onSelectColor(hex)}
              accessibilityRole="radio"
              accessibilityLabel={t("color.optionA11y", { label })}
              accessibilityState={{ checked: isSelected }}
              style={styles.cell}
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

        {onOpenCustomPicker && (
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
                    ? selectedColor
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
        )}
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
