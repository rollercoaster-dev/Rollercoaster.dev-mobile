import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create(() => ({
  // Takes the space the default-size View took (every consumer's body is a
  // flex:1 slot above a pinned footer), so the footer stays pinned.
  scroll: {
    flex: 1,
  },
}));
