import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { selectorStyles } from './selectorStyles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (hex: string) => void;
  goalColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT_COLORS: { hex: string; label: string }[] = [
  { hex: '#a78bfa', label: 'Purple' },
  { hex: '#34d399', label: 'Mint' },
  { hex: '#fbbf24', label: 'Yellow' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#06b6d4', label: 'Teal' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#38bdf8', label: 'Sky' },
];

const SWATCH_SIZE = 44;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ColorPicker({
  selectedColor,
  onSelectColor,
  goalColor,
  testID = 'color-picker',
}: ColorPickerProps) {
  const { theme } = useUnistyles();

  const swatches = useMemo(() => {
    const list = [...ACCENT_COLORS];
    if (goalColor) {
      list.unshift({ hex: goalColor, label: 'Goal' });
    }
    return list;
  }, [goalColor]);

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel="Badge color"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.row}
      >
        {swatches.map(({ hex, label }) => {
          const isSelected = hex === selectedColor;
          return (
            <Pressable
              key={`${label}-${hex}`}
              onPress={() => onSelectColor(hex)}
              accessibilityRole="radio"
              accessibilityLabel={`${label} color`}
              accessibilityState={{ checked: isSelected }}
              style={styles.cell}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: hex,
                    borderColor: isSelected
                      ? theme.colors.border
                      : 'transparent',
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
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  cell: {
    alignItems: 'center',
    minWidth: 56,
    minHeight: 72,
    gap: theme.space[1],
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
  },
}));
