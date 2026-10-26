import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { textStylesheet } from "./Text.styles";
import { useThemeScale } from "../../hooks/useTypeScale";
import { capFor } from "../../utils/typeScale";

export type TextVariant =
  | "display"
  | "headline"
  | "title"
  | "body"
  | "caption"
  | "label"
  | "mono";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Chrome text (tab labels, pills, counters, overlines) stops growing at 1.3x. */
  chrome?: boolean;
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
  const themeScale = useThemeScale();

  return (
    <RNText
      style={[textStylesheet.text, style]}
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ?? capFor(variant, chrome, themeScale)
      }
      {...rest}
    >
      {children}
    </RNText>
  );
}
