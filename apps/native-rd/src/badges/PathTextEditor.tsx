import React, { useCallback } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { getPathTextMaxChars } from "./text/pathTextLimits";
import { BadgeShape, PathTextPosition } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PathTextEditorProps {
  enabled: boolean;
  text: string;
  textBottom: string;
  position: PathTextPosition;
  shape: BadgeShape;
  goalTitle: string;
  onToggle: (enabled: boolean) => void;
  onChangeText: (text: string) => void;
  onChangeTextBottom: (text: string) => void;
  onChangePosition: (position: PathTextPosition) => void;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSITIONS = Object.values(PathTextPosition) as PathTextPosition[];

/** Show the counter in warning color when fewer chars than this remain. */
const COUNTER_WARNING_REMAINING = 3;

interface CharCounterProps {
  count: number;
  max: number;
  label: string;
  a11y: string;
}

function CharCounter({ count, max, label, a11y }: CharCounterProps) {
  const isNearLimit = max - count <= COUNTER_WARNING_REMAINING;
  return (
    <Text
      style={[styles.counter, isNearLimit && styles.counterWarning]}
      accessibilityLabel={a11y}
    >
      {label}
    </Text>
  );
}

function renderCounterLabel(count: number, max: number): string {
  return `${count}/${max}`;
}

function counterA11y(
  t: TFunction<"badgeDesigner">,
  labelKey: "top" | "bottom",
  count: number,
  max: number,
): string {
  return t("pathText.counter.a11y", {
    label: t(`pathText.counter.${labelKey}`),
    count,
    max,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PathTextEditor({
  enabled,
  text,
  textBottom,
  position,
  shape,
  goalTitle,
  onToggle,
  onChangeText,
  onChangeTextBottom,
  onChangePosition,
  testID = "path-text-editor",
}: PathTextEditorProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");

  const maxTop = getPathTextMaxChars(shape, "top");
  const maxBottom = getPathTextMaxChars(shape, "bottom");

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
        accessibilityLabel={t("pathText.toggleA11y")}
        accessibilityState={{ checked: enabled }}
        style={[
          styles.toggle,
          {
            borderColor: enabled
              ? theme.colors.accentPrimary
              : theme.colors.border,
            borderWidth: enabled ? 4 : 3,
          },
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            {
              color: enabled ? theme.colors.accentPrimary : theme.colors.text,
              fontWeight: enabled ? "700" : "500",
            },
          ]}
        >
          {t("sections.pathText")}
        </Text>
      </Pressable>

      {enabled && (
        <>
          {(position === PathTextPosition.top ||
            position === PathTextPosition.both) && (
            <>
              <TextInput
                accessibilityLabel={t("pathText.topA11y")}
                value={text}
                onChangeText={onChangeText}
                maxLength={maxTop}
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
              <CharCounter
                count={text.length}
                max={maxTop}
                label={renderCounterLabel(text.length, maxTop)}
                a11y={counterA11y(t, "top", text.length, maxTop)}
              />
            </>
          )}

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t("pathText.positionA11y")}
            style={styles.row}
          >
            {POSITIONS.map((pos) => {
              const isSelected = pos === position;
              const label = t(`pathText.positions.${pos}`);
              return (
                <Pressable
                  key={pos}
                  onPress={() => handlePosition(pos)}
                  accessibilityRole="radio"
                  accessibilityLabel={t("pathText.optionA11y", { label })}
                  accessibilityState={{ checked: isSelected }}
                  style={[
                    styles.option,
                    {
                      borderColor: isSelected
                        ? theme.colors.accentPrimary
                        : theme.colors.border,
                      borderWidth: isSelected ? 4 : 3,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isSelected
                          ? theme.colors.accentPrimary
                          : theme.colors.text,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {(position === PathTextPosition.bottom ||
            position === PathTextPosition.both) && (
            <>
              <TextInput
                accessibilityLabel={t("pathText.bottomA11y")}
                value={textBottom}
                onChangeText={onChangeTextBottom}
                maxLength={maxBottom}
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
              <CharCounter
                count={textBottom.length}
                max={maxBottom}
                label={renderCounterLabel(textBottom.length, maxBottom)}
                a11y={counterA11y(t, "bottom", textBottom.length, maxBottom)}
              />
            </>
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
  counter: {
    marginHorizontal: theme.space[4],
    marginTop: theme.space[1],
    fontSize: 12,
    fontFamily: theme.fontFamily.body,
    textAlign: "right",
    color: theme.colors.textMuted,
  },
  counterWarning: {
    color: theme.colors.accentPrimary,
    fontWeight: "700",
  },
}));
