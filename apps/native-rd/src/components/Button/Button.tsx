import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import { styles, type ButtonVariant, type ButtonSize } from "./Button.styles";

export type { ButtonVariant, ButtonSize };

export interface ButtonProps {
  label: string;
  /**
   * Optional leading icon. Prefer a Phosphor element — `<Play size={20}
   * weight="fill" color={...} />` — for anything conveying an action or state
   * (design system Rule 8); the caller owns its size and color because only the
   * caller knows the variant's foreground.
   *
   * A `string` is still accepted for text-presentation marks (`"+"`, `"✓"`) and
   * gets wrapped in its own <Text> run, separate from the label. Keeping a glyph
   * in a distinct run avoids an Android bug where a glyph + custom font in one
   * Text run can drop the trailing label characters on some devices (the
   * "🔗 Link" chip rendered icon-only).
   *
   * Either way the icon is decorative — excluded from the a11y label, which
   * stays the human-readable `label` text.
   */
  icon?: React.ReactNode;
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
  icon,
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

  // A string icon gets its own <Text> run; an element renders as-is (see the
  // `icon` prop docs). `labelStyle` on that run carries only the variant's color
  // (no fontFamily), so the glyph tracks the label instead of the default text
  // color — invisible on the primary button's dark fill. `length > 0` rather
  // than a truthy check, so an empty string yields `false` — renderable —
  // instead of a bare "" child, which RN rejects outside a <Text>.
  const iconRun =
    typeof icon === "string"
      ? icon.length > 0 && (
          <Text
            style={[styles.icon(size), labelStyle]}
            accessibilityElementsHidden
          >
            {icon}
          </Text>
        )
      : icon;

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
        <>
          {iconRun}
          <Text style={[styles.label(size), labelStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
