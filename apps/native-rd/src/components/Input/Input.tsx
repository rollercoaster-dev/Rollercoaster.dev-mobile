import React, { useState } from "react";
import { View, TextInput, type TextInputProps } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { styles } from "./Input.styles";
import { Text } from "../Text";
import { FieldError } from "../FieldError";
import { useThemeScale } from "../../hooks/useTypeScale";
import { capFor } from "../../utils/typeScale";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  /** Inline validation message; announced and added to the field's name. */
  error?: string;
  testID?: string;
  /** React 19 passes `ref` as a prop; lets screens focus the field (#693). */
  ref?: React.Ref<TextInput>;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  testID,
  maxFontSizeMultiplier,
  ref,
  ...rest
}: InputProps) {
  const { theme } = useUnistyles();
  const themeScale = useThemeScale();
  const [focused, setFocused] = useState(false);
  const name = label ?? placeholder;

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
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
        accessibilityLabel={error && name ? `${name}, ${error}` : name}
        accessibilityState={{ disabled: rest.editable === false }}
        {...rest}
      />
      {error ? (
        <FieldError
          message={error}
          testID={testID ? `${testID}-error` : undefined}
        />
      ) : null}
    </View>
  );
}
