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

  // The menu wrapper's `accessible+role=menu` collapses descendants
  // (each menuitem Pressable) into a single a11y node on iOS, hiding
  // individual labels (e.g. "Note") from Maestro element lookup. Drop
  // the grouping in E2E mode; each Pressable still declares
  // `accessible+role=menuitem+label` so screen readers continue to
  // announce each option as a discrete menu item in production.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const menuA11yProps = isE2E
    ? ({ accessible: false } as const)
    : ({
        accessible: true,
        accessibilityRole: "menu" as const,
        accessibilityLabel: "Add evidence menu",
      } as const);

  return (
    <View style={styles.container} {...menuA11yProps}>
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
