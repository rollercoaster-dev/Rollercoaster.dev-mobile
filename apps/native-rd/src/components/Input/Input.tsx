import React, { useState } from "react";
import { View, TextInput, Text, type TextInputProps } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { styles } from "./Input.styles";
import { useTypeScale } from "../../hooks/useTypeScale";
import { capFor } from "../../utils/typeScale";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  testID?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  testID,
  maxFontSizeMultiplier,
  ...rest
}: InputProps) {
  const { theme } = useUnistyles();
  const { themeScale } = useTypeScale();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={styles.label}
          maxFontSizeMultiplier={capFor("label", false, themeScale)}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        maxFontSizeMultiplier={
          maxFontSizeMultiplier ?? capFor("body", false, themeScale)
        }
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
        accessible
        accessibilityLabel={label ?? placeholder}
        accessibilityState={{ disabled: rest.editable === false }}
        {...rest}
      />
      {error && (
        <Text
          style={styles.error}
          maxFontSizeMultiplier={capFor("caption", false, themeScale)}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
