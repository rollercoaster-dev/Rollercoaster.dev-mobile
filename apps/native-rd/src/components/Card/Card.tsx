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
}

export function Card({
  children,
  size = "normal",
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
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
        style={({ pressed }) => [
          styles.pressable(size),
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={styles.container(size)}>{children}</View>;
}
