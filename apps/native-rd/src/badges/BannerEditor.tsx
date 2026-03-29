import React, { useCallback } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { BannerPosition } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BannerEditorProps {
  enabled: boolean;
  text: string;
  position: BannerPosition;
  onToggle: (enabled: boolean) => void;
  onChangeText: (text: string) => void;
  onChangePosition: (position: BannerPosition) => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSITIONS = Object.values(BannerPosition) as BannerPosition[];

const POSITION_LABELS: Record<BannerPosition, string> = {
  center: "Center",
  bottom: "Bottom",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BannerEditor({
  enabled,
  text,
  position,
  onToggle,
  onChangeText,
  onChangePosition,
  accentColor,
  testID = "banner-editor",
}: BannerEditorProps) {
  const { theme } = useUnistyles();
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handleToggle = useCallback(
    () => onToggle(!enabled),
    [onToggle, enabled],
  );

  const handlePosition = useCallback(
    (pos: BannerPosition) => onChangePosition(pos),
    [onChangePosition],
  );

  return (
    <View testID={testID}>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="checkbox"
        accessibilityLabel="Enable banner"
        accessibilityState={{ checked: enabled }}
        style={[
          styles.toggle,
          {
            borderColor: enabled ? resolvedAccent : theme.colors.border,
            borderWidth: enabled ? 4 : 3,
          },
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            {
              color: enabled ? resolvedAccent : theme.colors.text,
              fontWeight: enabled ? "700" : "500",
            },
          ]}
        >
          Banner
        </Text>
      </Pressable>

      {enabled && (
        <>
          <TextInput
            accessibilityLabel="Banner text"
            value={text}
            onChangeText={onChangeText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="BANNER TEXT"
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

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Banner position"
            style={styles.row}
          >
            {POSITIONS.map((pos) => {
              const isSelected = pos === position;
              return (
                <Pressable
                  key={pos}
                  onPress={() => handlePosition(pos)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${POSITION_LABELS[pos]} position`}
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
                    {POSITION_LABELS[pos]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  toggle: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderRadius: 0,
    marginHorizontal: theme.space[4],
  },
  toggleText: {
    fontSize: 14,
    fontFamily: theme.fontFamily.body,
  },
  row: {
    flexDirection: "row",
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
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
    letterSpacing: 2,
  },
}));
