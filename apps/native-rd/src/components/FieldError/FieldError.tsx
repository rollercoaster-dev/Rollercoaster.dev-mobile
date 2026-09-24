import React, { useEffect } from "react";
import { AccessibilityInfo, Platform, Text } from "react-native";
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
      style={styles.message}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      {message}
    </Text>
  );
}
