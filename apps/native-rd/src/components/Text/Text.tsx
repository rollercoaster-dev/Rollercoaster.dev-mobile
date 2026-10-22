import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { textStylesheet } from "./Text.styles";

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
  children: React.ReactNode;
}

export function Text({
  variant = "body",
  style,
  children,
  ...rest
}: TextProps) {
  textStylesheet.useVariants({ variant });

  return (
    <RNText style={[textStylesheet.text, style]} {...rest}>
      {children}
    </RNText>
  );
}
