import React from "react";
import {
  Pressable,
  View,
  Text,
  Switch,
  type AccessibilityActionEvent,
} from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { styles } from "./SettingsRow.styles";

export interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  toggle?: {
    value: boolean;
    onValueChange: (value: boolean) => void;
  };
}

export function SettingsRow({
  label,
  value,
  onPress,
  onLongPress,
  toggle,
}: SettingsRowProps) {
  const { theme } = useUnistyles();
  const longPressAccessibilityProps = onLongPress
    ? {
        accessibilityActions: [{ name: "longpress", label: "Long press" }],
        onAccessibilityAction: (event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === "longpress") {
            onLongPress();
          }
        },
      }
    : {};

  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      {value && <Text style={styles.value}>{value}</Text>}
      {toggle && (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          accessibilityLabel={label}
          accessibilityRole="switch"
          trackColor={{
            false: theme.colors.backgroundTertiary,
            true: theme.colors.accentPrimary,
          }}
        />
      )}
      {onPress && !toggle && <Text style={styles.chevron}>›</Text>}
    </>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        {...longPressAccessibilityProps}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.container}>{content}</View>;
}
