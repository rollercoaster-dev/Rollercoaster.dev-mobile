import React, { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

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

const SHAPE_LABELS: Record<BadgeShape, string> = {
  circle: "Circle",
  shield: "Shield",
  hexagon: "Hexagon",
  roundedRect: "Rounded Rect",
  star: "Star",
  diamond: "Diamond",
};

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
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handlePress = useCallback(
    (shape: BadgeShape) => onSelectShape(shape),
    [onSelectShape],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel="Badge shape"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.row}
      >
        {SHAPES.map((shape) => {
          const isSelected = shape === selectedShape;
          return (
            <Pressable
              key={shape}
              onPress={() => handlePress(shape)}
              accessibilityRole="radio"
              accessibilityLabel={`${SHAPE_LABELS[shape]} shape`}
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
                {SHAPE_LABELS[shape]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
