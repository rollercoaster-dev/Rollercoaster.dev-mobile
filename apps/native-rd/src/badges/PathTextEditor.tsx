import React, { useCallback } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { PathTextPosition } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PathTextEditorProps {
  enabled: boolean;
  text: string;
  textBottom: string;
  position: PathTextPosition;
  goalTitle: string;
  onToggle: (enabled: boolean) => void;
  onChangeText: (text: string) => void;
  onChangeTextBottom: (text: string) => void;
  onChangePosition: (position: PathTextPosition) => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSITIONS = Object.values(PathTextPosition) as PathTextPosition[];

const POSITION_LABELS: Record<PathTextPosition, string> = {
  top: "Top",
  bottom: "Bottom",
  both: "Both",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PathTextEditor({
  enabled,
  text,
  textBottom,
  position,
  goalTitle,
  onToggle,
  onChangeText,
  onChangeTextBottom,
  onChangePosition,
  accentColor,
  testID = "path-text-editor",
}: PathTextEditorProps) {
  const { theme } = useUnistyles();
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handleToggle = useCallback(
    () => onToggle(!enabled),
    [onToggle, enabled],
  );

  const handlePosition = useCallback(
    (pos: PathTextPosition) => onChangePosition(pos),
    [onChangePosition],
  );

  return (
    <View testID={testID}>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="checkbox"
        accessibilityLabel="Enable path text"
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
          Path Text
        </Text>
      </Pressable>

      {enabled && (
        <>
          {(position === PathTextPosition.top ||
            position === PathTextPosition.both) && (
            <TextInput
              accessibilityLabel="Path text"
              value={text}
              onChangeText={onChangeText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={goalTitle}
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

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Path text position"
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

          {(position === PathTextPosition.bottom ||
            position === PathTextPosition.both) && (
            <TextInput
              accessibilityLabel="Path text bottom"
              value={textBottom}
              onChangeText={onChangeTextBottom}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={goalTitle}
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
    minWidth: 80,
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
