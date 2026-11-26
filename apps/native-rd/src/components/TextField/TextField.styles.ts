import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create(() => ({
  // No look of its own: every caller styles its field (inline rename, note
  // body, monogram box). Caller styles are applied after this one.
  field: {},
}));
