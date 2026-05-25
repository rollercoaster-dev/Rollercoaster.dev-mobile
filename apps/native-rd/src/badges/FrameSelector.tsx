import React, { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { selectorStyles } from "./selectorStyles";
import { BadgeFrame } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrameSelectorProps {
  selectedFrame: BadgeFrame;
  onSelectFrame: (frame: BadgeFrame) => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAMES = Object.values(BadgeFrame) as BadgeFrame[];

/** Simple visual hint character per frame type */
const FRAME_GLYPHS: Record<BadgeFrame, string> = {
  none: "—",
  boldBorder: "▣",
  guilloche: "◎",
  crossHatch: "╳",
  microprint: "⋮",
  rosette: "✿",
};

const THUMBNAIL_SIZE = 56;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FrameSelector({
  selectedFrame,
  onSelectFrame,
  accentColor,
  testID = "frame-selector",
}: FrameSelectorProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handlePress = useCallback(
    (frame: BadgeFrame) => onSelectFrame(frame),
    [onSelectFrame],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("frame.a11y")}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.row}
      >
        {FRAMES.map((frame) => {
          const isSelected = frame === selectedFrame;
          const label = t(`frame.options.${frame}`);
          return (
            <Pressable
              key={frame}
              onPress={() => handlePress(frame)}
              accessibilityRole="radio"
              accessibilityLabel={t("frame.optionA11y", { label })}
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
              <View
                style={[styles.thumbnail, { borderColor: theme.colors.border }]}
              >
                <Text
                  style={[
                    styles.glyph,
                    { color: isSelected ? resolvedAccent : theme.colors.text },
                  ]}
                >
                  {FRAME_GLYPHS[frame]}
                </Text>
              </View>
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 0,
  },
  glyph: {
    fontSize: 24,
    fontWeight: "700",
  },
}));
