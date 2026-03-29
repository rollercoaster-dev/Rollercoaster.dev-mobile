import React from "react";
import { Pressable, View, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { styles } from "./Checkbox.styles";

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  onLabelPress?: () => void;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  onLabelPress,
  disabled = false,
}: CheckboxProps) {
  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle();
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleToggle}
        hitSlop={10}
        accessible
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled }}
      >
        <View
          style={[
            styles.box,
            checked && styles.boxChecked,
            disabled && styles.boxDisabled,
          ]}
        >
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <Pressable
        onPress={onLabelPress ?? handleToggle}
        style={styles.labelContainer}
        accessibilityLabel={onLabelPress ? `Edit ${label}` : label}
        accessibilityHint={onLabelPress ? "Tap to edit step title" : undefined}
      >
        <Text style={[styles.label, checked && styles.labelChecked]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
