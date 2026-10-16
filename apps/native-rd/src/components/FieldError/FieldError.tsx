import React, { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { Text } from "../Text";
import { styles } from "./FieldError.styles";

interface FieldErrorProps {
  message: string;
  testID?: string;
}

/** Visible field error; Android announces its live region, iOS needs an explicit announcement. */
export function FieldError({ message, testID }: FieldErrorProps) {
  useEffect(() => {
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);

  return (
    <Text
      variant="caption"
      style={styles.message}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      {message}
    </Text>
  );
}
