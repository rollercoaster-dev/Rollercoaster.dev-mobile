import React from "react";
import { ScrollView } from "react-native";

export const KeyboardProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const KeyboardAwareScrollView = ({
  children,
  ...rest
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement(ScrollView, rest, children);
