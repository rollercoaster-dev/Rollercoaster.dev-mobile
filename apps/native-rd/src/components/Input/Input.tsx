import React, { useState } from "react";
import { View, TextInput, Text, type TextInputProps } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { styles } from "./Input.styles";

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
  ...rest
}: InputProps) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
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
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
