import React from "react";
import { View, Pressable, Text } from "react-native";
import {
  EVIDENCE_CAPTURE_OPTIONS,
  type EvidenceTypeValue,
} from "../../types/evidence";
import { Card } from "../Card";
import { styles } from "./FABMenu.styles";

export interface FABMenuProps {
  isOpen: boolean;
  onSelectType: (type: EvidenceTypeValue) => void;
}

export function FABMenu({ isOpen, onSelectType }: FABMenuProps) {
  if (!isOpen) return null;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="menu"
      accessibilityLabel="Add evidence menu"
    >
      <Card>
        <View style={styles.itemList}>
          {EVIDENCE_CAPTURE_OPTIONS.map((item) => (
            <Pressable
              key={item.type}
              onPress={() => onSelectType(item.type)}
              accessible
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
            >
              <Text style={styles.menuIcon} accessibilityElementsHidden>
                {item.icon}
              </Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </View>
  );
}
