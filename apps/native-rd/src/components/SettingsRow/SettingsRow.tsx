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
  /**
   * Accessibility role for the pressable row. Defaults to `"button"` (the
   * historical behavior). Pass `"radio"` — together with `checked` — when the
   * row is one option in a `radiogroup` (e.g. SettingsDensityRows), so screen
   * readers announce it as a selectable radio instead of a plain button.
   */
  accessibilityRole?: "button" | "radio";
  /** Selected state for `accessibilityRole="radio"`; ignored for buttons. */
  checked?: boolean;
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
  accessibilityRole = "button",
  checked,
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
    const roleA11yProps =
      accessibilityRole === "radio"
        ? {
            accessibilityRole: "radio" as const,
            accessibilityState: { checked: checked ?? false },
          }
        : { accessibilityRole: "button" as const };

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessible
        accessibilityLabel={label}
        {...roleA11yProps}
        {...longPressAccessibilityProps}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.container}>{content}</View>;
}
