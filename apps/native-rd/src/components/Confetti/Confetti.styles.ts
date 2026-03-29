import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create(() => ({
  container: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none" as const,
    zIndex: 500,
    overflow: "hidden" as const,
  },
}));
