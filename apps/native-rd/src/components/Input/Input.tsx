import React, { useState } from "react";
import { View, type TextInput, type TextInputProps } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { styles } from "./Input.styles";
import { Text } from "../Text";
import { FieldError } from "../FieldError";
import { TextField } from "../TextField";

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
  accessibilityLabel,
  ref,
  ...rest
}: InputProps) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const { t } = useTranslation(["common"]);
  const name = accessibilityLabel ?? label ?? placeholder;

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      <TextField
        ref={ref}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
        accessible
        accessibilityLabel={
          error && name
            ? t("common:a11y.fieldWithError", { label: name, error })
            : name
        }
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
