/**
 * Border scope selector — picks where a custom `borderColor` applies.
 *
 * Mirrors `CenterModeSelector`: a horizontal row of three pressable chips
 * (Shape / Shape + Frame / All) with `radiogroup` semantics. Always visible
 * in the Colors accordion — the scope governs how `borderColor` is routed
 * regardless of whether the user has picked a custom value.
 */

import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { selectorStyles } from "./selectorStyles";
import { BadgeBorderScope } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BorderScopeSelectorProps {
  selectedScope: BadgeBorderScope;
  onSelectScope: (scope: BadgeBorderScope) => void;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCOPES = Object.values(BadgeBorderScope) as BadgeBorderScope[];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BorderScopeSelector({
  selectedScope,
  onSelectScope,
  testID = "border-scope-selector",
}: BorderScopeSelectorProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");

  const handlePress = useCallback(
    (scope: BadgeBorderScope) => onSelectScope(scope),
    [onSelectScope],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("borderScope.a11y")}
    >
      <View style={[selectorStyles.row, styles.row]}>
        {SCOPES.map((scope) => {
          const isSelected = scope === selectedScope;
          const label = t(`borderScope.options.${scope}`);
          return (
            <Pressable
              key={scope}
              onPress={() => handlePress(scope)}
              accessibilityRole="radio"
              accessibilityLabel={t("borderScope.optionA11y", { label })}
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
              testID={`${testID}-${scope}`}
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
    minWidth: 96,
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderRadius: 0,
  },
  optionText: {
    fontSize: 14,
    fontFamily: theme.fontFamily.body,
  },
}));
