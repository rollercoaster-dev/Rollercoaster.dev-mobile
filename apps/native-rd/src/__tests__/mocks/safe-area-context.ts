/**
 * Mock for react-native-safe-area-context
 */
import React from "react";
import { View } from "react-native";

const insets = { top: 0, right: 0, bottom: 0, left: 0 };

const SafeAreaProvider = ({ children }: { children: React.ReactNode }) =>
  children;

const SafeAreaView = View;

const useSafeAreaInsets = jest.fn(() => insets);

const SafeAreaInsetsContext = {
  Consumer: ({
    children,
  }: {
    children: (value: typeof insets) => React.ReactNode;
  }) => children(insets),
};

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  SafeAreaInsetsContext,
};
