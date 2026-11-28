import React from "react";
import {
  Platform,
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
} from "react-native";
import { textStylesheet } from "./Text.styles";
import { useTypeScale } from "../../hooks/useTypeScale";
import { capFor, cappedSpacing } from "../../utils/typeScale";

export type TextVariant =
  | "screenTitle"
  | "taskTitle"
  | "display"
  | "headline"
  | "title"
  | "body"
  | "caption"
  | "label"
  | "metadata"
  | "mono";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Chrome text (tab labels, pills, counters, overlines) stops growing at 1.3x. */
  chrome?: boolean;
  /** React 19 passes `ref` as a prop; it reaches the host text via `...rest`. */
  ref?: React.Ref<RNText>;
  children: React.ReactNode;
}

export function Text({
  variant = "body",
  chrome = false,
  style,
  children,
  maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  textStylesheet.useVariants({ variant });
  const { fontScale, themeScale } = useTypeScale();
  const cap = maxFontSizeMultiplier ?? capFor(variant, chrome, themeScale);
  // Android only: keep line and letter gaps at the capped size (see cappedSpacing).
  const spacing = cappedSpacing(
    Platform.OS === "android"
      ? StyleSheet.flatten([textStylesheet.text, style])
      : undefined,
    fontScale,
    cap,
    Platform.OS,
  );

  return (
    <RNText
      style={
        spacing
          ? [textStylesheet.text, style, spacing]
          : [textStylesheet.text, style]
      }
      maxFontSizeMultiplier={cap}
      {...rest}
    >
      {children}
    </RNText>
  );
}
