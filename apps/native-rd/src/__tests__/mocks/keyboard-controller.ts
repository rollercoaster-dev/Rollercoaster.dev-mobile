/**
 * Mock for react-native-keyboard-controller
 *
 * Stubs the native keyboard event system. KeyboardProvider is a passthrough;
 * KeyboardAwareScrollView renders a standard ScrollView;
 * useReanimatedKeyboardAnimation returns SharedValue-shaped zeros so the
 * keyboard appears permanently closed under jest/RNTL. KeyboardAvoidingView
 * renders a plain View with the keyboard-only props stripped, except
 * keyboardVerticalOffset, which stays on the View so tests can read what a
 * consumer (KeyboardAvoidingFrame) computed. KeyboardControllerNative's
 * viewPositionInWindow resolves the library's own web fallback (all zeros);
 * tests that need a real window position override it with mockResolvedValue.
 */
import React from "react";
import { ScrollView, View, type ViewProps } from "react-native";

export const KeyboardProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const KeyboardAwareScrollView = ({
  children,
  ...rest
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement(ScrollView, rest, children);

export const useReanimatedKeyboardAnimation = () => ({
  height: { value: 0 },
  progress: { value: 0 },
});

export const KeyboardControllerNative = {
  viewPositionInWindow: jest.fn(() =>
    Promise.resolve({ x: 0, y: 0, width: 0, height: 0 }),
  ),
};

export const KeyboardAvoidingView = ({
  children,
  behavior: _behavior,
  automaticOffset: _automaticOffset,
  enabled: _enabled,
  ...rest
}: {
  children?: React.ReactNode;
  behavior?: string;
  keyboardVerticalOffset?: number;
  automaticOffset?: boolean;
  enabled?: boolean;
  [key: string]: unknown;
}) => React.createElement(View, rest as ViewProps, children);
