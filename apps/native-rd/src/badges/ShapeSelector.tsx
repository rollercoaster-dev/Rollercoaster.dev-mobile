import React, { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { selectorStyles } from "./selectorStyles";
import { BadgeShapeView } from "./shapes/BadgeShapeView";
import { BadgeShape } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShapeSelectorProps {
  selectedShape: BadgeShape;
  onSelectShape: (shape: BadgeShape) => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHAPES = Object.values(BadgeShape) as BadgeShape[];

const THUMBNAIL_SIZE = 56;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShapeSelector({
  selectedShape,
  onSelectShape,
  accentColor,
  testID = "shape-selector",
}: ShapeSelectorProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handlePress = useCallback(
    (shape: BadgeShape) => onSelectShape(shape),
    [onSelectShape],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("shape.a11y")}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.row}
      >
        {SHAPES.map((shape) => {
          const isSelected = shape === selectedShape;
          const label = t(`shape.options.${shape}`);
          return (
            <Pressable
              key={shape}
              onPress={() => handlePress(shape)}
              accessibilityRole="radio"
              accessibilityLabel={t("shape.optionA11y", { label })}
              accessibilityState={{ checked: isSelected }}
              style={[
                selectorStyles.cell,
                {
                  borderColor: isSelected
                    ? resolvedAccent
                    : theme.colors.border,
                  borderWidth: isSelected ? 4 : 3,
                },
              ]}
            >
              <BadgeShapeView
                shape={shape}
                fillColor={resolvedAccent}
                size={THUMBNAIL_SIZE}
                strokeWidth={2}
                showShadow={false}
              />
              <Text
                style={[
                  selectorStyles.label,
                  { color: theme.colors.textSecondary, fontWeight: "500" },
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
