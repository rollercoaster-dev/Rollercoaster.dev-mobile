import React from "react";
import { Pressable, type StyleProp, type TextStyle } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import {
  resolveIconColor,
  styles,
  type IconButtonSize,
  type IconButtonTone,
} from "./IconButton.styles";

export type { IconButtonSize, IconButtonTone };

export interface IconButtonProps {
  // ReactElement (not ReactNode) so callers can't pass strings/fragments/arrays
  // that would silently bypass injectIconColor and leak un-toned icons.
  icon: React.ReactElement;
  onPress: () => void;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

const toneStyleMap = {
  chrome: styles.toneChrome,
  ghost: styles.toneGhost,
  surface: styles.toneSurface,
  primary: styles.tonePrimary,
  destructive: styles.toneDestructive,
} as const;

// Icon elements may receive a `color` prop (Phosphor) or a `style.color`
// (RN <Text>). Inject both unconditionally so call sites stop passing
// theme colors into icons.
interface InjectableIconProps {
  color?: string;
  style?: StyleProp<TextStyle>;
}

function injectIconColor(
  icon: React.ReactElement,
  color: string,
): React.ReactElement {
  const element = icon as React.ReactElement<InjectableIconProps>;
  return React.cloneElement(element, {
    color,
    style: [element.props.style, { color }],
  });
}

export function IconButton({
  icon,
  onPress,
  size = "md",
  tone = "surface",
  disabled = false,
  accessibilityLabel,
  testID,
}: IconButtonProps) {
  const { theme } = useUnistyles();
  const iconColor = resolveIconColor(theme, tone);
  const tonedIcon = injectIconColor(icon, iconColor);

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
        toneStyleMap[tone],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {tonedIcon}
    </Pressable>
  );
}
