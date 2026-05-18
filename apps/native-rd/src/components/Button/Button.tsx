import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import { styles, type ButtonVariant, type ButtonSize } from "./Button.styles";

export type { ButtonVariant, ButtonSize };

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  testID,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Look up variant styles at render time. Module-level capture of
  // `styles.variantX` / `styles.labelX` breaks react-native-unistyles
  // reactivity: setTheme() updates the styles object, but a stale ref
  // captured at module load keeps pointing at the previous theme's
  // colors — visible as wrong-colored text after toggling themes.
  const variantStyle = {
    primary: styles.variantPrimary,
    secondary: styles.variantSecondary,
    ghost: styles.variantGhost,
    destructive: styles.variantDestructive,
  }[variant];
  const labelStyle = {
    primary: styles.labelPrimary,
    secondary: styles.labelSecondary,
    ghost: styles.labelGhost,
    destructive: styles.labelDestructive,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.pressable(size),
        variantStyle,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "secondary" || variant === "ghost" ? undefined : "white"
          }
        />
      ) : (
        <Text style={[styles.label(size), labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}
