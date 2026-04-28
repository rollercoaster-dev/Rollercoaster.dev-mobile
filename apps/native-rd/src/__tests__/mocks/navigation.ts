/**
 * Mock for @react-navigation/native
 */
import React from "react";

const useNavigation = jest.fn(() => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  canGoBack: jest.fn(() => true),
}));

const useRoute = jest.fn(() => ({
  key: "test-route",
  name: "TestScreen",
  params: {},
}));

const useFocusEffect = jest.fn((callback: () => void | (() => void)) => {
  // Run the callback once, like useEffect
  React.useEffect(callback, []);
});

const useIsFocused = jest.fn(() => true);

const NavigationContainer = ({ children }: { children: React.ReactNode }) =>
  children;

const DefaultTheme = {
  dark: false,
  colors: {
    background: "#ffffff",
    card: "#ffffff",
    text: "#000000",
    border: "#d8d8d8",
    primary: "#007AFF",
    notification: "#ff3b30",
  },
};

const CommonActions = {
  navigate: (name: string, params?: object) => ({
    type: "NAVIGATE",
    payload: params ? { name, params } : { name },
  }),
};

module.exports = {
  useNavigation,
  useRoute,
  useFocusEffect,
  useIsFocused,
  NavigationContainer,
  DefaultTheme,
  CommonActions,
};
