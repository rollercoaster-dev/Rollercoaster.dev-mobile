import React from "react";
import { Pressable, View } from "react-native";
import { styles, type CardSize } from "./Card.styles";

export type { CardSize };

export interface CardProps {
  children: React.ReactNode;
  size?: CardSize;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  /**
   * Fill the available height of a fixed-height parent (flex: 1) instead of
   * shrink-wrapping to content. Used by the focus-mode carousel so every card
   * keeps the same envelope as the user swipes between them.
   */
  fill?: boolean;
}

export function Card({
  children,
  size = "normal",
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
  fill = false,
}: CardProps) {
  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={({ pressed }) => [
          styles.pressable(size),
          fill && styles.fill,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.container(size), fill && styles.fill]} testID={testID}>
      {children}
    </View>
  );
}
