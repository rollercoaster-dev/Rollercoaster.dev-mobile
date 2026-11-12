import React from "react";
import { Pressable } from "react-native";
import { Text } from "../Text";
import { styles } from "./FAB.styles";

export interface FABProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function FAB({ isOpen, onToggle }: FABProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessible
      accessibilityRole="button"
      accessibilityLabel={isOpen ? "Close evidence menu" : "Add evidence"}
      accessibilityState={{ expanded: isOpen }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text
        variant="title"
        chrome
        style={[styles.icon, isOpen && styles.iconOpen]}
      >
        +
      </Text>
    </Pressable>
  );
}
