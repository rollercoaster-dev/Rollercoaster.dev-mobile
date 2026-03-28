import React from 'react';
import { Pressable } from 'react-native';
import { styles, type IconButtonSize, type IconButtonVariant } from './IconButton.styles';

export type { IconButtonSize, IconButtonVariant };

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

const variantStyleMap = {
  default: styles.variantDefault,
  ghost: styles.variantGhost,
  destructive: styles.variantDestructive,
} as const;

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'default',
  disabled = false,
  accessibilityLabel,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.pressable(size),
        variantStyleMap[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
    </Pressable>
  );
}
