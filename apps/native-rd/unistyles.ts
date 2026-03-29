/**
 * Unistyles configuration
 * Must be imported FIRST before any component that uses styles
 */
import { StyleSheet } from "react-native-unistyles";
import { themes } from "./src/themes";

StyleSheet.configure({
  themes,
  settings: {
    initialTheme: "light-default",
  },
});
