import React, { useCallback } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { selectorStyles } from "./selectorStyles";
import { BadgeCenterMode } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CenterModeSelectorProps {
  selectedMode: BadgeCenterMode;
  monogram: string;
  onSelectMode: (mode: BadgeCenterMode) => void;
  onChangeMonogram: (text: string) => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES = Object.values(BadgeCenterMode) as BadgeCenterMode[];

const MODE_LABELS: Record<BadgeCenterMode, string> = {
  icon: "Icon",
  monogram: "Monogram",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CenterModeSelector({
  selectedMode,
  monogram,
  onSelectMode,
  onChangeMonogram,
  accentColor,
  testID = "center-mode-selector",
}: CenterModeSelectorProps) {
  const { theme } = useUnistyles();
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handlePress = useCallback(
    (mode: BadgeCenterMode) => onSelectMode(mode),
    [onSelectMode],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel="Badge center mode"
    >
      <View style={[selectorStyles.row, styles.row]}>
        {MODES.map((mode) => {
          const isSelected = mode === selectedMode;
          return (
            <Pressable
              key={mode}
              onPress={() => handlePress(mode)}
              accessibilityRole="radio"
              accessibilityLabel={`${MODE_LABELS[mode]} center`}
              accessibilityState={{ checked: isSelected }}
              style={[
                styles.option,
                {
                  borderColor: isSelected
                    ? resolvedAccent
                    : theme.colors.border,
                  borderWidth: isSelected ? 4 : 3,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color: isSelected ? resolvedAccent : theme.colors.text,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {MODE_LABELS[mode]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedMode === BadgeCenterMode.monogram && (
        <TextInput
          accessibilityLabel="Monogram text"
          value={monogram}
          onChangeText={onChangeMonogram}
          maxLength={3}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABC"
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.background,
            },
          ]}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderRadius: 0,
  },
  optionText: {
    fontSize: 14,
    fontFamily: theme.fontFamily.body,
  },
  input: {
    marginHorizontal: theme.space[4],
    marginTop: theme.space[2],
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    borderWidth: 3,
    borderRadius: 0,
    fontSize: 16,
    fontFamily: theme.fontFamily.body,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 4,
  },
}));
