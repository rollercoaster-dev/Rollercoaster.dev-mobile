import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create(() => ({
  // The mark sits in a flex row beside a `flex: 1` text run that can wrap to
  // several lines. `flexShrink: 0` keeps the icon at its own size instead of
  // being squeezed by that text, and top alignment keeps it on the first line's
  // baseline rather than floating to the middle of a wrapped block — which is
  // what the text glyphs it replaced did for free.
  mark: {
    flexShrink: 0,
    alignSelf: "flex-start" as const,
  },
}));
