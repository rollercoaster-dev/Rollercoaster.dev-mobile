import React, { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { WarningCircle } from "phosphor-react-native";
import { Text } from "../Text";
import { styles } from "./FieldError.styles";

export interface FieldErrorProps {
  /** Specific, calm explanation of what to change. */
  message: string;
  testID?: string;
}

/**
 * Inline validation message under a field (#693).
 *
 * The icon carries `colors.error`, so color is never the only signal; the
 * message itself stays in `colors.text` because the shared error red is below
 * 4.5:1 as text in Night Ride and Warm Studio. Each new message is announced
 * to screen readers; callers also fold it into the field's accessible name.
 */
export function FieldError({ message, testID }: FieldErrorProps) {
  const { theme } = useUnistyles();

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View style={styles.row} testID={testID}>
      <View
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <WarningCircle size={16} weight="bold" color={theme.colors.error} />
      </View>
      <Text variant="caption" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}
