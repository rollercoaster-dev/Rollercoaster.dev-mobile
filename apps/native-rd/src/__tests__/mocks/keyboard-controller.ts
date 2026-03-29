/**
 * Mock for react-native-keyboard-controller
 *
 * Stubs the native keyboard event system. KeyboardProvider is a
 * passthrough; KeyboardAwareScrollView renders a standard ScrollView.
 */
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
