import React from "react";
import { Pressable, Text } from "react-native";
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
      <Text style={[styles.icon, isOpen && styles.iconOpen]}>+</Text>
    </Pressable>
  );
}
