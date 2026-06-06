import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

import { Text } from "../../components/Text";
import { ACCENT_COLORS } from "../../badges/ColorPicker";
import { styles } from "./BadgeColorsAccordion.styles";

type AccentSwatchId = (typeof ACCENT_COLORS)[number]["id"];

export interface SentinelConfig {
  label: string;
  previewColor: string;
  /** Hollow ring preview (Border/Frame) vs filled disc (Icon Auto). */
  hollow: boolean;
  selected: boolean;
  onPress: () => void;
}

export interface ChannelPaletteProps {
  a11yLabel: string;
  /** Returns the visible label for a swatch id, e.g. `"Purple"`. */
  getSwatchLabel: (id: AccentSwatchId) => string;
  /** Returns the a11y label for a swatch, e.g. `"Purple border color"`. */
  getSwatchA11y: (label: string) => string;
  customLabel: string;
  customHint: string;
  sentinel: SentinelConfig;
  selectedHex: string | null;
  onSelectHex: (hex: string) => void;
  onOpenCustom: () => void;
}

export function ChannelPalette({
  a11yLabel,
  getSwatchLabel,
  getSwatchA11y,
  customLabel,
  customHint,
  sentinel,
  selectedHex,
  onSelectHex,
  onOpenCustom,
}: ChannelPaletteProps) {
  const { theme } = useUnistyles();

  const isCustomSelected =
    selectedHex !== null && !ACCENT_COLORS.some((c) => c.hex === selectedHex);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={a11yLabel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.paletteRow}
      >
        <Pressable
          onPress={sentinel.onPress}
          style={styles.cell}
          accessibilityRole="radio"
          accessibilityLabel={sentinel.label}
          accessibilityState={{ checked: sentinel.selected }}
        >
          <View
            style={[
              styles.swatch,
              sentinel.hollow
                ? {
                    backgroundColor: "transparent",
                    borderColor: sentinel.selected
                      ? theme.colors.accentPrimary
                      : sentinel.previewColor,
                    borderWidth: sentinel.selected ? 4 : 3,
                  }
                : {
                    backgroundColor: sentinel.previewColor,
                    borderColor: sentinel.selected
                      ? theme.colors.accentPrimary
                      : "transparent",
                    borderWidth: sentinel.selected ? 4 : 3,
                  },
            ]}
          />
          <Text
            variant="caption"
            style={{
              color: sentinel.selected
                ? theme.colors.text
                : theme.colors.textSecondary,
              fontWeight: sentinel.selected ? "700" : "500",
            }}
            numberOfLines={1}
          >
            {sentinel.label}
          </Text>
        </Pressable>

        {ACCENT_COLORS.map(({ id, hex }) => {
          const isSelected = hex === selectedHex;
          const label = getSwatchLabel(id);
          return (
            <Pressable
              key={`${id}-${hex}`}
              onPress={() => onSelectHex(hex)}
              accessibilityRole="radio"
              accessibilityLabel={getSwatchA11y(label)}
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
                variant="caption"
                style={{
                  color: isSelected
                    ? theme.colors.text
                    : theme.colors.textSecondary,
                  fontWeight: isSelected ? "700" : "500",
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={onOpenCustom}
          style={styles.cell}
          accessibilityRole="button"
          accessibilityLabel={customLabel}
          accessibilityHint={customHint}
        >
          <View
            style={[
              styles.swatch,
              styles.customSwatch,
              {
                backgroundColor: isCustomSelected
                  ? (selectedHex as string)
                  : theme.colors.background,
                borderColor: isCustomSelected
                  ? theme.colors.accentPrimary
                  : theme.colors.border,
                borderWidth: isCustomSelected ? 4 : 3,
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
            variant="caption"
            style={{
              color: isCustomSelected
                ? theme.colors.text
                : theme.colors.textSecondary,
              fontWeight: isCustomSelected ? "700" : "500",
            }}
            numberOfLines={1}
          >
            {customLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
