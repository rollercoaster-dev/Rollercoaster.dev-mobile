import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { styles, type ButtonVariant, type ButtonSize } from './Button.styles';

export type { ButtonVariant, ButtonSize };

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
}

const labelStyleMap = {
  primary: styles.labelPrimary,
  secondary: styles.labelSecondary,
  ghost: styles.labelGhost,
  destructive: styles.labelDestructive,
} as const;

const variantStyleMap = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  ghost: styles.variantGhost,
  destructive: styles.variantDestructive,
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.pressable(size),
        variantStyleMap[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? undefined : 'white'}
        />
      ) : (
        <Text style={[styles.label(size), labelStyleMap[variant]]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
