import React, { useState } from "react";
import { View, TextInput, Text, type TextInputProps } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { FieldError } from "../FieldError";
import { styles } from "./Input.styles";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  testID?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { label, placeholder, value, onChangeText, error, testID, ...rest },
  ref,
) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const accessibilityHint = error ?? rest.accessibilityHint;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
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
        // The current error takes precedence over a normal field hint.
        accessibilityHint={accessibilityHint}
      />
      {error && <FieldError message={error} />}
    </View>
  );
});
