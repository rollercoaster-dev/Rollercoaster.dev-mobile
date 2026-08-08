import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create(() => ({
  // Fills the parent celebration surface; individual glyphs are positioned
  // absolutely within it (see the layouts in CelebrationSparkles.tsx).
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: "absolute",
  },
}));
