import React from "react";
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from "react-native";
import { useThemeScale } from "../../hooks/useTypeScale";
import { capForRole } from "../../utils/typeScale";
import { styles } from "./TextField.styles";

export interface TextFieldProps extends RNTextInputProps {
  /** React 19 passes `ref` as a prop; lets callers focus the field. */
  ref?: React.Ref<RNTextInput>;
}

/**
 * The one place a react-native `TextInput` is rendered (#750). It applies the
 * body type-scaling cap (#741) so typed text and placeholders stop growing at
 * 2.0x instead of ~3.6x at iOS AX5. Styling stays with the caller; use the
 * labelled `Input` for form fields.
 */
export function TextField({
  maxFontSizeMultiplier,
  style,
  ...rest
}: TextFieldProps) {
  const themeScale = useThemeScale();
  return (
    <RNTextInput
      style={[styles.field, style]}
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ?? capForRole("body", themeScale)
      }
      {...rest}
    />
  );
}
