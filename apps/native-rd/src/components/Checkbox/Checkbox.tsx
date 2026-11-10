import React from "react";
import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "../Text";
import { styles } from "./Checkbox.styles";

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  onLabelPress?: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  onLabelPress,
  disabled = false,
  accessibilityHint,
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
        accessibilityHint={accessibilityHint}
        accessibilityState={{ checked, disabled }}
      >
        <View
          style={[
            styles.box,
            checked && styles.boxChecked,
            disabled && styles.boxDisabled,
          ]}
        >
          {checked && (
            <Text variant="metadata" chrome style={styles.checkmark}>
              ✓
            </Text>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={onLabelPress ?? handleToggle}
        style={styles.labelContainer}
        accessibilityLabel={onLabelPress ? `Edit ${label}` : label}
        accessibilityHint={onLabelPress ? "Tap to edit step title" : undefined}
      >
        <Text
          variant="body"
          style={[styles.label, checked && styles.labelChecked]}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
